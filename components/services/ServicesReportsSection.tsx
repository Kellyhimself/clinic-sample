'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Lock } from 'lucide-react';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';

interface ServicesReportsSectionProps {
  tenantId?: string;
}

export default function ServicesReportsSection({ tenantId }: ServicesReportsSectionProps) {
  const router = useRouter();
  const { subscription } = useSubscription();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(true);
  const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(false);
  const [isEnterpriseEnabled, setIsEnterpriseEnabled] = useState(false);

  useEffect(() => {
    const feature = getFeatureDetails('services_reports', subscription?.plan || 'free');
    setIsFeatureEnabled(feature?.enabled === true);

    // Check advanced analytics feature
    const advancedFeature = getFeatureDetails('advanced_analytics', subscription?.plan || 'free');
    setIsAdvancedEnabled(advancedFeature?.enabled === true);

    // Check enterprise analytics feature
    const enterpriseFeature = getFeatureDetails('enterprise_analytics', subscription?.plan || 'free');
    setIsEnterpriseEnabled(enterpriseFeature?.enabled === true);
    
    // Log feature details for debugging
    console.log('Feature details:', {
      feature,
      enabled: feature?.enabled,
      requiredPlan: feature?.requiredPlan,
      currentPlan: subscription?.plan
    });
  }, [subscription]);

  const renderUpgradeBanner = () => {
    if (isFeatureEnabled && isAdvancedEnabled && isEnterpriseEnabled) return null;
    
    return (
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Upgrade to Pro or Enterprise</h3>
              <p className="text-sm text-gray-600">Get access to advanced analytics, detailed reports, and more</p>
            </div>
          </div>
          <Button 
            onClick={() => router.push('/settings/billing')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    );
  };

  const renderFeaturePreview = (content: React.ReactNode, featureId: string) => {
    const feature = getFeatureDetails(featureId, subscription?.plan || 'free');
    const isLocked = !feature?.enabled && feature?.requiredPlan !== 'enterprise';
    
    return (
      <div className={`relative ${isLocked ? 'group' : ''}`}>
        {content}
        {isLocked && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-center p-4">
              <Lock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-800">Available on {feature?.requiredPlan} plan</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isFeatureEnabled) {
    return (
      <UpgradePrompt
        title="Services Reports"
        description="Get comprehensive insights into your clinical services performance with our advanced analytics dashboard."
        features={[
          "Service revenue tracking",
          "Popular services analysis",
          "Doctor performance metrics",
          "Service utilization trends"
        ]}
        requiredPlan="pro"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Services Reports</h1>
        {renderUpgradeBanner()}
      </div>

      {/* Basic Analytics - Available for Free */}
      <Card className="bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-200">
        <CardHeader>
          <CardTitle className="text-gray-800">Services Revenue Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-white/50 rounded-md">
            <div className="text-center">
              <Activity className="h-16 w-16 text-blue-300 mx-auto" />
              <p className="text-gray-600 mt-2">Your services revenue trend will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {renderFeaturePreview(
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardHeader>
              <CardTitle className="text-gray-800">Most Popular Services</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {['General Consultation', 'Laboratory Tests', 'Vaccinations', 'Dental Services', 'Physiotherapy'].map((service, i) => (
                  <li key={i} className="flex justify-between items-center p-2 hover:bg-white/50 rounded-md">
                    <span className="text-gray-700">{service}</span>
                    <span className="text-gray-500 text-sm">Preview Data</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>,
          'advanced_analytics'
        )}

        {renderFeaturePreview(
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
            <CardHeader>
              <CardTitle className="text-gray-800">Revenue by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {['General Practice', 'Laboratory', 'Radiology', 'Dental', 'Pediatrics'].map((dept, i) => (
                  <li key={i} className="flex justify-between items-center p-2 hover:bg-white/50 rounded-md">
                    <span className="text-gray-700">{dept}</span>
                    <span className="text-gray-500 text-sm">Preview Data</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>,
          'enterprise_analytics'
        )}
      </div>
    </div>
  );
} 