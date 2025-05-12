'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, TrendingUp, Package, DollarSign } from 'lucide-react';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';

interface PharmacyReportsDashboardProps {
  tenantId?: string;
}

export default function PharmacyReportsDashboard({ tenantId }: PharmacyReportsDashboardProps) {
  const { subscription } = useSubscription();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(true);

  useEffect(() => {
    const feature = getFeatureDetails('pharmacy_reports', subscription?.plan || 'free');
    setIsFeatureEnabled(feature?.enabled === true);
    
    // Log feature details for debugging
    console.log('Feature details:', {
      feature,
      enabled: feature?.enabled,
      requiredPlan: feature?.requiredPlan,
      currentPlan: subscription?.plan
    });
  }, [subscription]);

  if (!isFeatureEnabled) {
    return (
      <div className="pharmacy-analytics-container">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight mb-4">
          Pharmacy Analytics Dashboard
        </h2>
        
        <UpgradePrompt
          requiredPlan="pro"
          features={[
            "Real-time sales analytics",
            "Revenue tracking",
            "Top-selling medications",
            "Stock movement analysis"
          ]}
          variant="card"
          popoverPosition="top-right"
        >
          <div className="space-y-6">
            {/* Preview of Recent Sales */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-700">Recent Sales</h3>
              </div>
              <div className="p-4">
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-md">
                  <div className="text-center">
                    <BarChart className="h-16 w-16 text-gray-300 mx-auto" />
                    <p className="text-muted-foreground mt-2">Sales trend chart preview</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview of Analytics Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Revenue Preview */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-700">Revenue</h3>
                </div>
                <div className="p-4">
                  <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-md">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 text-gray-300 mx-auto" />
                      <p className="text-muted-foreground mt-2">Revenue chart preview</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Medications Preview */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-700">Top Selling Medications</h3>
                </div>
                <div className="p-4">
                  <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-md">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-300 mx-auto" />
                      <p className="text-muted-foreground mt-2">Top medications chart preview</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock Movement Preview */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-700">Stock Movement</h3>
                </div>
                <div className="p-4">
                  <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-md">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto" />
                      <p className="text-muted-foreground mt-2">Stock movement chart preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UpgradePrompt>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <BarChart className="h-16 w-16 text-gray-300 mx-auto" />
              <p className="text-muted-foreground mt-2">Sales trend chart will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-md">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="text-muted-foreground mt-2">Revenue chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-md">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="text-muted-foreground mt-2">Top medications chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-md">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="text-muted-foreground mt-2">Stock movement chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 