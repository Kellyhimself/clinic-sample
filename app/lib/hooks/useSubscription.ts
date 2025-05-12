import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';

export type PlanType = 'free' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';

export interface Subscription {
  plan: PlanType;
  status: SubscriptionStatus;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

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
        } else {
          setSubscription(null);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  return { subscription, loading, error };
} 