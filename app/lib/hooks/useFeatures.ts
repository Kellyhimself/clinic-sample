import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { getFeatureDetails } from '../utils/featureCheck';

export function useFeatures() {
  const { user } = useAuthContext();
  const { tenantId } = useTenant();

  const isFeatureEnabled = (featureId: string) => {
    // Get subscription from user metadata or tenant data
    const subscription = user?.user_metadata?.subscription || { plan: 'free' };
    const feature = getFeatureDetails(featureId, subscription.plan);
    return feature?.enabled === true;
  };

  return {
    isFeatureEnabled,
    userId: user?.id,
    tenantId
  };
} 
 