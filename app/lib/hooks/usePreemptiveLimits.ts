import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { LimitType, UsageLimit, PLAN_LIMITS } from '@/app/lib/config/usageLimits';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_UPDATE_INTERVAL = 60 * 1000; // 1 minute
const FORCE_UPDATE_DEBOUNCE = 1000; // 1 second

// Initial empty limits state
const initialLimits: Record<LimitType, UsageLimit> = {
  patients: { type: 'patients', current: 0, limit: 0, isWithinLimit: true },
  appointments: { type: 'appointments', current: 0, limit: 0, isWithinLimit: true },
  inventory: { type: 'inventory', current: 0, limit: 0, isWithinLimit: true },
  users: { type: 'users', current: 0, limit: 0, isWithinLimit: true },
  transactions: { type: 'transactions', current: 0, limit: 0, isWithinLimit: true }
};

// Default limits for free plan
const defaultFreeLimits = {
  max_patients: PLAN_LIMITS.free.patients,
  max_appointments_per_month: PLAN_LIMITS.free.appointments,
  max_inventory_items: PLAN_LIMITS.free.inventory,
  max_users: PLAN_LIMITS.free.users,
  max_transactions_per_month: PLAN_LIMITS.free.transactions
};

// Helper function to check if a limit is unlimited
const isUnlimited = (limit: number | null): boolean => limit === -1;

// Helper function to format limit for display
const formatLimit = (limit: number | null): number => isUnlimited(limit) ? Infinity : (limit || 0);

// Helper function to check if within limit
const isWithinLimit = (current: number, limit: number | null): boolean => {
  if (isUnlimited(limit)) return true;
  return (current || 0) <= (limit || 0);
};

export function usePreemptiveLimits() {
  const [limits, setLimits] = useState<Record<LimitType, UsageLimit>>(initialLimits);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [forceUpdateTimeout, setForceUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const createDefaultLimits = useCallback(async (tenantId: string) => {
    const supabase = createClient();
    console.log('📝 Creating default limits for tenant:', tenantId);
    
    const { data, error } = await supabase
      .from('subscription_limits')
      .insert({
        tenant_id: tenantId,
        plan_type: 'free',
        max_patients: defaultFreeLimits.max_patients,
        max_appointments_per_month: defaultFreeLimits.max_appointments_per_month,
        max_inventory_items: defaultFreeLimits.max_inventory_items,
        max_users: defaultFreeLimits.max_users,
        max_transactions_per_month: defaultFreeLimits.max_transactions_per_month,
        features: {}
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating default limits:', error);
      return null;
    }

    console.log('✅ Default limits created:', data);
    return data;
  }, []);

  const fetchLimits = useCallback(async (force = false) => {
    // Prevent multiple simultaneous fetches
    if (isFetching) {
      console.log('⏳ Already fetching limits, skipping');
      return;
    }

    // If not forcing update and cache is still valid, skip
    if (!force && Date.now() - lastUpdated < CACHE_DURATION) {
      console.log('📦 Using cached limits:', limits);
      setLoading(false);
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⚠️ No session found');
        setLoading(false);
        setIsFetching(false);
        return;
      }

      // Get tenant_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.tenant_id) {
        console.log('⚠️ No tenant_id found in profile');
        setLoading(false);
        setIsFetching(false);
        return;
      }

      console.log('👤 User profile:', { userId: session.user.id, tenantId: profile.tenant_id });

      // Get current month's date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Get subscription limits
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscription_limits')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .single();

      // If no subscription limits exist, create default ones
      let finalSubscription = subscription;
      if (subscriptionError || !subscription) {
        console.log('⚠️ No subscription limits found, creating defaults');
        finalSubscription = await createDefaultLimits(profile.tenant_id);
      }

      if (!finalSubscription) {
        console.error('❌ Failed to get or create subscription limits');
        setError(new Error('Failed to get or create subscription limits'));
        setLoading(false);
        setIsFetching(false);
        return;
      }

      console.log('📊 Subscription data:', finalSubscription);

      // Get current counts from relevant tables
      const [
        { count: patientCount },
        { count: appointmentCount },
        { count: inventoryCount },
        { count: userCount },
        { count: transactionCount }
      ] = await Promise.all([
        // Count patients
        supabase
          .from('guest_patients')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id),
        
        // Count appointments this month
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth),
        
        // Count inventory items
        supabase
          .from('medications')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id),
        
        // Count users
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id),
        
        // Count transactions this month
        supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth)
      ]);

      console.log('📈 Current counts:', {
        patients: patientCount,
        appointments: appointmentCount,
        inventory: inventoryCount,
        users: userCount,
        transactions: transactionCount
      });

      const newLimits: Record<LimitType, UsageLimit> = {
        patients: {
          type: 'patients',
          current: patientCount || 0,
          limit: formatLimit(finalSubscription.max_patients),
          isWithinLimit: isWithinLimit(patientCount || 0, finalSubscription.max_patients)
        },
        appointments: {
          type: 'appointments',
          current: appointmentCount || 0,
          limit: formatLimit(finalSubscription.max_appointments_per_month),
          isWithinLimit: isWithinLimit(appointmentCount || 0, finalSubscription.max_appointments_per_month)
        },
        inventory: {
          type: 'inventory',
          current: inventoryCount || 0,
          limit: formatLimit(finalSubscription.max_inventory_items),
          isWithinLimit: isWithinLimit(inventoryCount || 0, finalSubscription.max_inventory_items)
        },
        users: {
          type: 'users',
          current: userCount || 0,
          limit: formatLimit(finalSubscription.max_users),
          isWithinLimit: isWithinLimit(userCount || 0, finalSubscription.max_users)
        },
        transactions: {
          type: 'transactions',
          current: transactionCount || 0,
          limit: formatLimit(finalSubscription.max_transactions_per_month),
          isWithinLimit: isWithinLimit(transactionCount || 0, finalSubscription.max_transactions_per_month)
        }
      };

      console.log('🎯 New limits calculated:', newLimits);
      setLimits(newLimits);
      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching limits:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch limits'));
      // Set a minimum cache duration on error to prevent rapid retries
      setLastUpdated(Date.now() - CACHE_DURATION + 30000); // Cache for 30 seconds on error
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [lastUpdated, createDefaultLimits, isFetching]);

  // Function to force an immediate update
  const forceUpdate = useCallback(() => {
    console.log('🔄 Force updating limits');
    // Clear any existing timeout
    if (forceUpdateTimeout) {
      clearTimeout(forceUpdateTimeout);
    }

    // Set a new timeout to debounce multiple rapid updates
    const timeout = setTimeout(() => {
      fetchLimits(true);
    }, FORCE_UPDATE_DEBOUNCE);

    setForceUpdateTimeout(timeout);
  }, [fetchLimits, forceUpdateTimeout]);

  useEffect(() => {
    console.log('🔄 Initial limits fetch');
    fetchLimits();

    // Set up background updates
    const updateInterval = setInterval(() => {
      if (Date.now() - lastUpdated > CACHE_DURATION) {
        console.log('🔄 Background update triggered');
        fetchLimits();
      }
    }, BACKGROUND_UPDATE_INTERVAL);

    return () => {
      clearInterval(updateInterval);
      if (forceUpdateTimeout) {
        clearTimeout(forceUpdateTimeout);
      }
    };
  }, [fetchLimits, forceUpdateTimeout]);

  const isLimitValid = (limitType: LimitType): boolean => {
    const limit = limits[limitType];
    const isValid = limit?.isWithinLimit ?? true;
    console.log('🔍 Checking limit validity:', { limitType, limit, isValid });
    return isValid;
  };

  return {
    limits,
    loading,
    error,
    isLimitValid,
    refetch: fetchLimits,
    forceUpdate
  };
} 