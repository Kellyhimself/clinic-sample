// app/pharmacy/sales/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/lib/auth/client';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { PharmacySalesManager } from '@/components/pharmacy/PharmacySalesManager';
import PharmacyAnalyticsDashboard from '@/components/pharmacy/PharmacyAnalyticsDashboard';
import { fetchSales, Sale } from '@/lib/sales';
import { ErrorBoundary } from 'react-error-boundary';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';
import Head from 'next/head';
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

export default function PharmacySalesManagementPage() {
  const { user, tenantId } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');

  useEffect(() => {
    const feature = getFeatureDetails('pharmacy_analytics', subscription?.plan || 'free');
    setIsAnalyticsEnabled(feature?.enabled === true);
  }, [subscription?.plan]);

  const loadData = useCallback(async () => {
    if (!user || !tenantId || !subscription?.plan) return;

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await fetchSales('', 'all', 1, 100);
      
      if (fetchError) {
        throw new Error(fetchError);
      }

      setSales(data);
    } catch (err) {
      console.error('Error loading sales data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  }, [user, tenantId, subscription?.plan]);

  useEffect(() => {
    if (!subscriptionLoading && subscription?.plan) {
      loadData();
    }
  }, [subscriptionLoading, subscription?.plan, loadData]);

  if (subscriptionLoading || isLoading) {
    return <SalesManagementSkeleton />;
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
        <Head>
          <title>Pharmacy Sales Management</title>
        </Head>

        <Tabs defaultValue="sales" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales">
            <PharmacySalesManager
              initialSales={sales}
              isLoading={isLoading}
              error={error}
              medicationSales={[]}
            />
          </TabsContent>
          
          <TabsContent value="analytics">
            <PharmacyAnalyticsDashboard
              isFeatureEnabled={isAnalyticsEnabled}
              sales={sales}
              medicationSales={[]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}