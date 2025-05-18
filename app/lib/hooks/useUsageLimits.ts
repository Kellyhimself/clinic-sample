'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { supabase } from '@/app/lib/auth/client';
import { UsageLimit, LimitType, PlanType, PLAN_LIMITS } from '@/app/lib/config/usageLimits';

export function useUsageLimits() {
  const { user } = useAuthContext();
  const { tenantId } = useTenant();
  const [limits, setLimits] = useState<Record<LimitType, UsageLimit> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkUsage = useCallback(async (type: LimitType): Promise<UsageLimit> => {
    if (!user || !tenantId) {
      return {
        type,
        current: 0,
        limit: PLAN_LIMITS.free[type],
        isWithinLimit: true
      };
    }

    try {
      // Get tenant plan type
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('plan_type')
        .eq('id', tenantId)
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
            .eq('tenant_id', tenantId);
          if (appointmentError) throw new Error('Failed to count appointments');
          current = appointmentCount || 0;
          break;
        case 'patients':
          const { count: patientCount, error: patientError } = await supabase
            .from('guest_patients')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .not('patient_type', 'eq', 'quicksale');
          if (patientError) throw new Error('Failed to count patients');
          current = patientCount || 0;
          break;
        case 'inventory':
          const { count: inventoryCount, error: inventoryError } = await supabase
            .from('medications')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
          if (inventoryError) throw new Error('Failed to count inventory');
          current = inventoryCount || 0;
          break;
        case 'users':
          const { count: userCount, error: userError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
          if (userError) throw new Error('Failed to count users');
          current = userCount || 0;
          break;
        case 'sales':
        case 'transactions':
          const { count: salesCount, error: salesError } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
          if (salesError) throw new Error('Failed to count sales');
          current = salesCount || 0;
          break;
      }

      // Get limit based on plan type
      const planType = (tenant?.plan_type as PlanType) || 'free';
      const limit = PLAN_LIMITS[planType][type];
      const isWithinLimit = limit === -1 || current < limit;

      return {
        type,
        current,
        limit,
        isWithinLimit
      };
    } catch (err) {
      console.error(`Error checking ${type} usage:`, err);
      return {
        type,
        current: 0,
        limit: PLAN_LIMITS.free[type],
        isWithinLimit: true
      };
    }
  }, [user, tenantId]);

  const fetchAllLimits = useCallback(async () => {
    if (!user || !tenantId) {
      setLoading(false);
      return;
    }

    try {
        setLoading(true);
        setError(null);

      const types: LimitType[] = ['appointments', 'patients', 'inventory', 'users', 'sales', 'transactions'];
      const newLimits: Record<LimitType, UsageLimit> = {} as Record<LimitType, UsageLimit>;
      
      for (const type of types) {
        newLimits[type] = await checkUsage(type);
      }
      
      setLimits(newLimits);
      setError(null);
      } catch (err) {
        console.error('Error fetching usage limits:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch usage limits'));
      } finally {
        setLoading(false);
      }
  }, [user, tenantId, checkUsage]);

  useEffect(() => {
    fetchAllLimits();
  }, [fetchAllLimits]);

  return {
    limits,
    loading,
    error,
    checkUsage,
    refetch: fetchAllLimits
  };
} 