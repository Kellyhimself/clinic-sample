// app/pharmacy/sales/page.tsx
'use client';

import PharmacySalesManager from '@/components/pharmacy/PharmacySalesManager';
import PharmacyAnalyticsDashboard from '@/components/pharmacy/PharmacyAnalyticsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PharmacySalesPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('sales');
  
  useEffect(() => {
    // Get tab from URL query parameter if it exists
    const tabParam = searchParams.get('tab');
    if (tabParam && (tabParam === 'sales' || tabParam === 'analytics')) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  
  return (
    <div className="flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Sales Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sales">
          <PharmacySalesManager />
        </TabsContent>
        
        <TabsContent value="analytics">
          <PharmacyAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}