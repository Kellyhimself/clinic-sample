import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { LimitType, UsageLimit, PLAN_LIMITS } from '@/app/lib/config/usageLimits';

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const BACKGROUND_UPDATE_INTERVAL = 30 * 1000; // 30 seconds
const FORCE_UPDATE_DEBOUNCE = 500; // 0.5 seconds

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
  const [retryCount, setRetryCount] = useState(0);

  const resetState = useCallback(() => {
    setIsFetching(false);
    setLoading(false);
    setError(null);
    setRetryCount(0);
  }, []);

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
    // Always reset state when starting a new fetch
    resetState();

    // If not forcing update and cache is still valid, skip
    if (!force && Date.now() - lastUpdated < CACHE_DURATION) {
      console.log('📦 Using cached limits:', limits);
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⚠️ No session found');
        resetState();
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
        resetState();
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
        resetState();
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
    } catch (err) {
      console.error('❌ Error fetching limits:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch limits'));
      setLastUpdated(Date.now() - CACHE_DURATION + 15000);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [lastUpdated, createDefaultLimits, resetState]);

  // Function to force an immediate update
  const forceUpdate = useCallback(() => {
    console.log('🔄 Force updating limits');
    resetState();
    
    // Clear any existing timeout
    if (forceUpdateTimeout) {
      clearTimeout(forceUpdateTimeout);
    }

    // Set a new timeout to debounce multiple rapid updates
    const timeout = setTimeout(() => {
      fetchLimits(true);
    }, FORCE_UPDATE_DEBOUNCE);

    setForceUpdateTimeout(timeout);
  }, [fetchLimits, forceUpdateTimeout, resetState]);

  useEffect(() => {
    let isMounted = true;
    console.log('🔄 Initial limits fetch');
    
    const fetchData = async () => {
      if (isMounted) {
        await fetchLimits(true); // Always force initial fetch
      }
    };
    
    fetchData();

    // Set up background updates
    const updateInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdated > CACHE_DURATION && isMounted) {
        console.log('🔄 Background update triggered');
        fetchLimits(true); // Force background updates
      }
    }, BACKGROUND_UPDATE_INTERVAL);

    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(updateInterval);
      if (forceUpdateTimeout) {
        clearTimeout(forceUpdateTimeout);
      }
      resetState();
    };
  }, [fetchLimits, forceUpdateTimeout, resetState]);

  // Separate effect for visibility changes
  useEffect(() => {
    let isMounted = true;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        console.log('👁️ Page became visible, checking limits');
        resetState();
        fetchLimits(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchLimits, resetState]);

  // Separate effect for retry mechanism
  useEffect(() => {
    let isMounted = true;
    
    if (retryCount > 0 && retryCount <= 3) {
      const timeout = setTimeout(() => {
        if (isMounted) {
          console.log(`🔄 Retrying limits fetch (attempt ${retryCount})`);
          fetchLimits(true);
        }
      }, 1000 * retryCount);
      return () => {
        isMounted = false;
        clearTimeout(timeout);
      };
    }
  }, [retryCount, fetchLimits]);

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
    forceUpdate,
    retryCount,
    resetState
  };
} 