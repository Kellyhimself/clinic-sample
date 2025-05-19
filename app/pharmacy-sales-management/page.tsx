'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/app/providers/TenantProvider';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { useFeatures } from '@/app/lib/hooks/useFeatures';
import { Sale } from '@/lib/sales';
import { fetchCachedSales } from '@/lib/server/salesActions';
import PharmacyAnalyticsDashboard from '@/components/pharmacy/PharmacyAnalyticsDashboard';
import { ErrorBoundary } from 'react-error-boundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h2 className="text-red-800 font-semibold">Something went wrong</h2>
      <p className="text-red-600">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
      >
        Try again
      </button>
    </div>
  );
}

function SalesManagementSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export default function PharmacySalesManagement() {
  const { tenantId } = useTenant();
  const { subscription, loading: isSubscriptionLoading } = useSubscription();
  const { isFeatureEnabled, isSubscriptionLoading: isFeaturesLoading } = useFeatures();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sales');

  // Check if we have all required data before rendering
  const isReady = !isSubscriptionLoading && !isFeaturesLoading && !!tenantId && !!subscription?.plan;
  const isAnalyticsEnabled = isFeatureEnabled('pharmacy_analytics');

  const loadData = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const { data, error } = await fetchCachedSales();
      if (error) {
        setError(error);
        return;
      }
      setSales(data);
    } catch (err) {
      console.error('Error loading sales data:', err);
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Load data when tenant ID is available
  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId, loadData]);

  // Show loading state while checking subscription or loading data
  if (isSubscriptionLoading || loading) {
    return <SalesManagementSkeleton />;
  }

  // Show error if tenant context is missing
  if (!tenantId) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error</h2>
        <p className="text-red-600">Tenant context is missing. Please try refreshing the page.</p>
      </div>
    );
  }

  // Show error if subscription data is missing
  if (!subscription?.plan) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error</h2>
        <p className="text-red-600">Subscription information is not available. Please try refreshing the page.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error loading sales data</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={loadData}>
      <div className="space-y-6">
        <Tabs defaultValue="sales" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales">
            <div className="container mx-auto p-4">
              {/* Sales content */}
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            {isReady && (
              <PharmacyAnalyticsDashboard
                isFeatureEnabled={isAnalyticsEnabled}
                sales={sales}
                medicationSales={[]}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
} 