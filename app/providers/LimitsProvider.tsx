'use client';

import { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { LimitType, UsageLimit, PLAN_LIMITS } from '@/app/lib/config/usageLimits';
import { useAuthContext } from './AuthProvider';
import { useTenant } from './TenantProvider';

// Cache duration in milliseconds (2 minutes)
const CACHE_DURATION = 2 * 60 * 1000;
// Background refresh interval in milliseconds (30 seconds)
const BACKGROUND_REFRESH_INTERVAL = 30 * 1000;

interface LimitsState {
  limits: Record<LimitType, UsageLimit>;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

type LimitsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Record<LimitType, UsageLimit> }
  | { type: 'FETCH_ERROR'; payload: Error };

const initialState: LimitsState = {
  limits: {} as Record<LimitType, UsageLimit>,
  loading: false,
  error: null,
  lastUpdated: null,
};

function limitsReducer(state: LimitsState, action: LimitsAction): LimitsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        limits: action.payload,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const LimitsContext = createContext<{
  limits: Record<LimitType, UsageLimit>;
  loading: boolean;
  error: Error | null;
  refreshLimits: () => Promise<void>;
} | null>(null);

export function LimitsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(limitsReducer, initialState);
  const { user } = useAuthContext();
  const { tenantId } = useTenant();
  const supabase = createClient();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const fetchLimits = useCallback(async () => {
    if (!user || !tenantId) return;

    try {
      dispatch({ type: 'FETCH_START' });

      // Fetch subscription data
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (subscriptionError) throw subscriptionError;

      // Fetch current counts
      const { data: counts, error: countsError } = await supabase
        .from('usage_counts')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (countsError) throw countsError;

      // Calculate limits based on subscription and current usage
      const limits = Object.entries(PLAN_LIMITS).reduce((acc, [key, limit]) => {
        const type = key as LimitType;
        const maxLimit = subscriptionData[`max_${type}`] || limit.max;
        const current = counts[type] || 0;

        acc[type] = {
          limit: maxLimit,
          current,
          isWithinLimit: current < maxLimit,
        };

        return acc;
      }, {} as Record<LimitType, UsageLimit>);

      if (isMountedRef.current) {
        dispatch({ type: 'FETCH_SUCCESS', payload: limits });
      }
    } catch (error) {
      if (isMountedRef.current) {
        dispatch({ type: 'FETCH_ERROR', payload: error as Error });
      }
    }
  }, [user, tenantId, supabase]);

  const refreshLimits = useCallback(async () => {
    await fetchLimits();
  }, [fetchLimits]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user || !tenantId) return;

    const shouldFetch = !state.lastUpdated || Date.now() - state.lastUpdated > CACHE_DURATION;

    if (shouldFetch) {
      fetchLimits();
    }

    // Set up background refresh
    refreshTimeoutRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLimits();
      }
    }, BACKGROUND_REFRESH_INTERVAL);

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, [user, tenantId, fetchLimits, state.lastUpdated]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.lastUpdated) {
        const timeSinceLastUpdate = Date.now() - state.lastUpdated;
        if (timeSinceLastUpdate > CACHE_DURATION) {
          fetchLimits();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchLimits, state.lastUpdated]);

  return (
    <LimitsContext.Provider
      value={{
        limits: state.limits,
        loading: state.loading,
        error: state.error,
        refreshLimits,
      }}
    >
      {children}
    </LimitsContext.Provider>
  );
}

export function useLimits() {
  const context = useContext(LimitsContext);
  if (!context) {
    throw new Error('useLimits must be used within a LimitsProvider');
  }
  return context;
} 