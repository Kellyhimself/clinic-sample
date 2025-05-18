import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';

export type PlanType = 'free' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';

export interface Subscription {
  plan: PlanType;
  status: SubscriptionStatus;
}

const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchSubscription = async (retry = false) => {
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      // Get the user's profile to get their tenant_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.tenant_id) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      // Get the tenant's plan type
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('plan_type, subscription_status')
        .eq('id', profile.tenant_id)
        .single();

      if (tenantError) throw tenantError;

      if (tenant) {
        setSubscription({
          plan: tenant.plan_type as PlanType,
          status: tenant.subscription_status as SubscriptionStatus
        });
        setError(null);
        setRetryCount(0);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
      
      // Implement retry logic
      if (retry && retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchSubscription(true);
        }, RETRY_DELAY * (retryCount + 1));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();

    // Set up session refresh interval
    const refreshInterval = setInterval(() => {
      fetchSubscription(true);
    }, SESSION_REFRESH_INTERVAL);

    // Set up auth state change listener
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchSubscription(true);
      } else if (event === 'SIGNED_OUT') {
        setSubscription(null);
      }
    });

    return () => {
      clearInterval(refreshInterval);
      subscription.unsubscribe();
    };
  }, []);

  return { 
    subscription, 
    loading, 
    error,
    retryCount,
    refetch: () => fetchSubscription(true)
  };
} 