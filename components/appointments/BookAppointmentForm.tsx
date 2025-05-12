import { useState, useEffect } from 'react';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';

interface BookAppointmentFormProps {
  tenantId?: string;
}

export default function BookAppointmentForm({ tenantId }: BookAppointmentFormProps) {
  const { subscription } = useSubscription();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(true);
  const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(false);
  const [isEnterpriseEnabled, setIsEnterpriseEnabled] = useState(false);

  useEffect(() => {
    const feature = getFeatureDetails('appointment_booking', subscription?.plan || 'free');
    setIsFeatureEnabled(feature?.enabled === true);

    // Check advanced booking feature
    const advancedFeature = getFeatureDetails('advanced_booking', subscription?.plan || 'free');
    setIsAdvancedEnabled(advancedFeature?.enabled === true);

    // Check enterprise booking feature
    const enterpriseFeature = getFeatureDetails('enterprise_booking', subscription?.plan || 'free');
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