import { useState, useEffect } from 'react';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';

interface GuestPatientFormProps {
  tenantId?: string;
}

export default function GuestPatientForm({ tenantId }: GuestPatientFormProps) {
  const { subscription } = useSubscription();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(true);
  const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(false);
  const [isEnterpriseEnabled, setIsEnterpriseEnabled] = useState(false);

  useEffect(() => {
    const feature = getFeatureDetails('guest_patients', subscription?.plan || 'free');
    setIsFeatureEnabled(feature?.enabled === true);

    // Check advanced patients feature
    const advancedFeature = getFeatureDetails('advanced_patients', subscription?.plan || 'free');
    setIsAdvancedEnabled(advancedFeature?.enabled === true);

    // Check enterprise patients feature
    const enterpriseFeature = getFeatureDetails('enterprise_patients', subscription?.plan || 'free');
    setIsEnterpriseEnabled(enterpriseFeature?.enabled === true);
    
    // Log feature details for debugging
    console.log('Feature details:', {
      feature,
      enabled: feature?.enabled,
      requiredPlan: feature?.requiredPlan,
      currentPlan: subscription?.plan
    });
  }, [subscription]);

  // ... rest of the existing code ...
} 