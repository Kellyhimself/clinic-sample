// app/pharmacy/reports/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/app/lib/auth/client';
import { usePreemptiveLimits } from '@/app/lib/hooks/usePreemptiveLimits';
import PharmacyReportsDashboard from '@/components/pharmacy/PharmacyReportsDashboard';

export default function PharmacyReportsPage() {
  const { user } = useAuth();
  const { limits, loading: limitsLoading } = usePreemptiveLimits();
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) {
    return (
      <div className="p-4 text-red-500">
        Please log in to access this page
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Pharmacy Reports</h1>
      <PharmacyReportsDashboard />
    </div>
  );
}