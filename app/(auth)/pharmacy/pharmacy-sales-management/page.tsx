// app/pharmacy/sales/page.tsx
'use client';

import PharmacySalesManager from '@/components/pharmacy/PharmacySalesManager';
import PharmacyAnalyticsDashboard from '@/components/pharmacy/PharmacyAnalyticsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState, useCallback } from 'react';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { fetchSales } from '@/lib/sales';
import { Sale } from '@/lib/sales';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';
import Head from 'next/head';

export const dynamic = 'force-dynamic';

// Skeleton loader component
function SalesManagementSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Tabs Skeleton */}
      <div className="flex space-x-2">
        <div className="h-10 w-24 bg-gray-200 rounded-md"></div>
        <div className="h-10 w-24 bg-gray-200 rounded-md"></div>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-gray-200 rounded-md"></div>
          <div className="h-9 w-24 bg-gray-200 rounded-md"></div>
        </div>

        {/* Navigation Links Skeleton */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Filter Bar Skeleton */}
          <div className="h-8 w-full bg-gray-200 rounded mb-4"></div>

          {/* Metrics Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>

          {/* Sales Table Skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-full bg-gray-200 rounded"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PharmacySalesManagementPage() {
  const { subscription } = useSubscription();
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sales');
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the feature check
  useEffect(() => {
    const feature = getFeatureDetails('pharmacy_analytics', subscription?.plan || 'free');
    setIsAnalyticsEnabled(feature?.enabled === true);
  }, [subscription?.plan]);

  // Memoize the loadData function
  const loadData = useCallback(async () => {
    if (!subscription?.plan) return;
    
    try {
      setIsLoading(true);
      
      // Fetch sales data
      const { data, error } = await fetchSales();
      
      if (error) {
        setError(error);
      } else {
        setSales(data || []);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [subscription?.plan]);

  // Load data only when necessary
  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error) {
    return <div>Error loading sales data</div>;
  }

  if (isLoading) {
    return <SalesManagementSkeleton />;
  }

  return (
    <>
      <Head>
        <title>Pharmacy Sales Management</title>
        <meta name="description" content="Manage medication sales and pharmacy transactions" />
      </Head>
      <div className="space-y-4">
        <Tabs defaultValue="sales" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="sales">
            <PharmacySalesManager 
              initialSales={sales}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <PharmacyAnalyticsDashboard 
              isFeatureEnabled={isAnalyticsEnabled}
              sales={sales}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}