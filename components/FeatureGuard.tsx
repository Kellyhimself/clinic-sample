'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth/client';
import { checkFeatureAccess } from '@/app/lib/actions/features';
import { getFeatureForPlan, getUpgradePrompt } from '@/app/lib/config/features/subscriptionFeatures';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface FeatureGuardProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({ featureId, children, fallback }: FeatureGuardProps) {
  const { tenantId } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      if (!tenantId) {
        setError('No tenant ID available');
        setHasAccess(false);
        return;
      }

      try {
        const access = await checkFeatureAccess(featureId);
        setHasAccess(access);
        setError(null);
      } catch (err) {
        console.error('Error checking feature access:', err);
        setError('Failed to check feature access');
        setHasAccess(false);
      }
    }

    checkAccess();
  }, [tenantId, featureId]);

  if (error) {
    return (
      <Card className="p-4 border-dashed border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  if (hasAccess === null) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    const feature = getFeatureForPlan(featureId);
    const upgradePrompt = getUpgradePrompt(featureId);

    return (
      <Card className="p-4 border-dashed border-amber-200">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <p className="font-medium">Feature Not Available</p>
          </div>
          <p className="text-sm text-gray-600">{upgradePrompt}</p>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
} 