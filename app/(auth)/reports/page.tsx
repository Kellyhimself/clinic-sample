'use client';

import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';
import ReportsClient from '@/components/reports-client';

export default function ReportsPage() {
  const { subscription } = useSubscription();

  // Check if user has access to the specific report type
  const showReport = getFeatureDetails('reports', subscription?.plan || 'free')?.enabled === true;

  return <ReportsClient showReport={showReport} />;
} 