import { useSubscription } from './useSubscription';
import { getFeatureDetails } from '../utils/featureCheck';

export function useFeatures() {
  const { subscription } = useSubscription();

  const isFeatureEnabled = (featureId: string) => {
    const feature = getFeatureDetails(featureId, subscription?.plan || 'free');
    return feature?.enabled === true;
  };

  return {
    isFeatureEnabled
  };
} 
 