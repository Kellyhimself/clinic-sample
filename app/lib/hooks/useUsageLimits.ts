'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { useAuth } from '@/app/lib/auth/client';
import { PLAN_LIMITS, PlanType } from '@/app/lib/config/usageLimits';

export type LimitType = 'appointments' | 'patients' | 'medications' | 'sales' | 'transactions' | 'inventory' | 'users';

export interface UsageLimit {
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isWithinLimit: boolean;
}

export function useUsageLimits() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<Record<LimitType, UsageLimit>>({
    appointments: { current: 0, limit: PLAN_LIMITS.free.appointments, remaining: PLAN_LIMITS.free.appointments, percentage: 0, isWithinLimit: true },
    patients: { current: 0, limit: PLAN_LIMITS.free.patients, remaining: PLAN_LIMITS.free.patients, percentage: 0, isWithinLimit: true },
    medications: { current: 0, limit: PLAN_LIMITS.free.inventory, remaining: PLAN_LIMITS.free.inventory, percentage: 0, isWithinLimit: true },
    sales: { current: 0, limit: PLAN_LIMITS.free.sales, remaining: PLAN_LIMITS.free.sales, percentage: 0, isWithinLimit: true },
    transactions: { current: 0, limit: PLAN_LIMITS.free.transactions, remaining: PLAN_LIMITS.free.transactions, percentage: 0, isWithinLimit: true },
    inventory: { current: 0, limit: PLAN_LIMITS.free.inventory, remaining: PLAN_LIMITS.free.inventory, percentage: 0, isWithinLimit: true },
    users: { current: 0, limit: PLAN_LIMITS.free.users, remaining: PLAN_LIMITS.free.users, percentage: 0, isWithinLimit: true }
  });

  const { user, loading: authLoading } = useAuth();

  const checkUsage = async (type: LimitType): Promise<UsageLimit> => {
    if (!user) {
      return { 
        current: 0, 
        limit: PLAN_LIMITS.free[type as keyof typeof PLAN_LIMITS.free] || -1, 
        remaining: PLAN_LIMITS.free[type as keyof typeof PLAN_LIMITS.free] || -1, 
        percentage: 0,
        isWithinLimit: true 
      };
    }

    try {
      const supabase = await createClient();
      
      // Get tenant context
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('Failed to get tenant context');
      }

      // Get tenant plan type
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('plan_type')
        .eq('id', profile.tenant_id)
        .single();

      if (tenantError) {
        throw new Error('Failed to fetch tenant settings');
      }

      // Get current usage
      let current = 0;
      switch (type) {
        case 'appointments':
          const { count: appointmentCount, error: appointmentError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id);
          if (appointmentError) {
            throw new Error('Failed to count appointments');
          }
          current = appointmentCount || 0;
          break;
        case 'patients':
          const { count: patientCount, error: patientError } = await supabase
            .from('guest_patients')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id)
            .not('patient_type', 'eq', 'quicksale');
          if (patientError) {
            throw new Error('Failed to count patients');
          }
          current = patientCount || 0;
          break;
        case 'medications':
          const { count: medicationCount, error: medicationError } = await supabase
            .from('medications')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id);
          if (medicationError) {
            throw new Error('Failed to count medications');
          }
          current = medicationCount || 0;
          break;
        case 'inventory':
          const { count: inventoryCount, error: inventoryError } = await supabase
            .from('medications')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id);
          if (inventoryError) {
            throw new Error('Failed to count inventory');
          }
          current = inventoryCount || 0;
          break;
        case 'sales':
        case 'transactions':
          const { count: salesCount, error: salesError } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id);
          if (salesError) {
            throw new Error('Failed to count sales');
          }
          current = salesCount || 0;
          break;
        case 'users':
          const { count: userCount, error: userError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id);
          if (userError) {
            throw new Error('Failed to count users');
          }
          current = userCount || 0;
          break;
      }

      // Get limit based on plan type
      const planType = tenant?.plan_type as PlanType || 'free';
      
      // Ensure medications uses the inventory limit for consistency
      let limit: number;
      if (type === 'medications') {
        limit = PLAN_LIMITS[planType]['inventory'];
      } else {
        limit = PLAN_LIMITS[planType][type as keyof typeof PLAN_LIMITS[typeof planType]] || -1;
      }
      
      const remaining = limit === -1 ? -1 : Math.max(0, limit - current);
      const percentage = limit === -1 ? 0 : (current / limit) * 100;
      const isWithinLimit = limit === -1 || current < limit;

      return {
        current,
        limit,
        remaining,
        percentage,
        isWithinLimit
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check usage');
      return { 
        current: 0, 
        limit: PLAN_LIMITS.free[type as keyof typeof PLAN_LIMITS.free] || -1, 
        remaining: PLAN_LIMITS.free[type as keyof typeof PLAN_LIMITS.free] || -1, 
        percentage: 0,
        isWithinLimit: true 
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchAllLimits = async () => {
      if (!user || authLoading) return;

      try {
        setLoading(true);
        const types: LimitType[] = ['appointments', 'patients', 'medications', 'sales', 'transactions', 'inventory', 'users'];
        const newLimits = { ...limits };
        
        for (const type of types) {
          if (!mounted) break;
          newLimits[type] = await checkUsage(type);
        }
        
        if (mounted) {
          setLimits(newLimits);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch usage limits');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAllLimits();

    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  return {
    limits,
    loading: loading || authLoading,
    error,
    checkUsage
  };
} 