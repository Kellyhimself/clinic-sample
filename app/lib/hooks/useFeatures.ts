import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { useSubscription } from './useSubscription';
import { getFeatureDetails } from '../utils/featureCheck';

export function useFeatures() {
  const { user } = useAuthContext();
  const { tenantId } = useTenant();
  const { subscription, loading: isSubscriptionLoading } = useSubscription();

  const isFeatureEnabled = (featureId: string) => {
    // Wait for subscription data to be loaded
    if (isSubscriptionLoading || !subscription?.plan) {
      return false;
    }

    const feature = getFeatureDetails(featureId, subscription.plan);
    return feature?.enabled === true;
  };

  return {
    isFeatureEnabled,
    userId: user?.id,
    tenantId,
    isSubscriptionLoading,
    subscription
  };
} 
 