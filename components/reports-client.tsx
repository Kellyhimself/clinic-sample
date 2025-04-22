'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PharmacyReportsDashboard from '@/components/pharmacy/PharmacyReportsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Activity, 
  ShoppingBag, 
  HeartPulse, 
  CalendarClock, 
  TrendingUp, 
  Package, 
  Users,
  DollarSign,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PharmacyReportsSection from '@/components/pharmacy/PharmacyReportsSection';
import ServicesReportsSection from '@/components/services/ServicesReportsSection';

// Types for the report filters
interface FilterOptions {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string | null;
  endDate: string | null;
  category?: string;
}

// Tab values
const TABS = {
  OVERVIEW: 'overview',
  PHARMACY: 'pharmacy',
  SERVICES: 'services',
  APPOINTMENTS: 'appointments',
  INVENTORY: 'inventory',
  PATIENTS: 'patients',
  FINANCIAL: 'financial',
} as const;

type TabType = typeof TABS[keyof typeof TABS];

export default function ReportsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get the tab from the URL or default to overview
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl && Object.values(TABS).includes(tabFromUrl) 
      ? tabFromUrl 
      : TABS.OVERVIEW
  );
  
  // We'll use this for future implementation of date filtering
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_filters] = useState<FilterOptions>({
    period: 'monthly',
    startDate: null,
    endDate: null,
  });

  // Update the URL when the tab changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTab !== TABS.OVERVIEW) {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, '');
    router.push(newUrl, { scroll: false });
  }, [activeTab, router, searchParams]);

  const handleExportReport = () => {
    // This would be implemented to export reports as CSV/PDF
    console.log('Exporting report:', activeTab);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 sm:p-6 flex-1 overflow-y-auto">
      <div className="container mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              View and analyze clinic performance metrics and statistics
            </p>
          </div>

          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleExportReport}
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>

        <Tabs 
          defaultValue={TABS.OVERVIEW} 
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
          className="w-full"
        >
          <div className="border-b">
            <TabsList className="bg-transparent h-auto p-0 w-full flex flex-wrap">
              <TabTrigger 
                value={TABS.OVERVIEW} 
                icon={<BarChart className="h-4 w-4" />}
                active={activeTab === TABS.OVERVIEW}
              >
                Overview
              </TabTrigger>
              <TabTrigger 
                value={TABS.PHARMACY} 
                icon={<ShoppingBag className="h-4 w-4" />}
                active={activeTab === TABS.PHARMACY}
              >
                Pharmacy Sales
              </TabTrigger>
              <TabTrigger 
                value={TABS.SERVICES} 
                icon={<HeartPulse className="h-4 w-4" />}
                active={activeTab === TABS.SERVICES}
              >
                Clinical Services
              </TabTrigger>
              <TabTrigger 
                value={TABS.APPOINTMENTS} 
                icon={<CalendarClock className="h-4 w-4" />}
                active={activeTab === TABS.APPOINTMENTS}
              >
                Appointments
              </TabTrigger>
              <TabTrigger 
                value={TABS.INVENTORY} 
                icon={<Package className="h-4 w-4" />}
                active={activeTab === TABS.INVENTORY}
              >
                Inventory
              </TabTrigger>
              <TabTrigger 
                value={TABS.PATIENTS} 
                icon={<Users className="h-4 w-4" />}
                active={activeTab === TABS.PATIENTS}
              >
                Patients
              </TabTrigger>
            </TabsList>
          </div>

          {/* Overview Tab - General metrics */}
          {activeTab === TABS.OVERVIEW && (
            <div className="mt-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                  title="Total Revenue" 
                  value="KSh 1,245,300" 
                  trend="+12.5%"
                  trendUp={true}
                  icon={<DollarSign className="h-5 w-5 text-blue-600" />}
                  description="Last 30 days"
                />
                <MetricCard 
                  title="Pharmacy Sales" 
                  value="KSh 485,620" 
                  trend="+8.2%"
                  trendUp={true}
                  icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
                  description="Last 30 days"
                />
                <MetricCard 
                  title="Patient Visits" 
                  value="1,254" 
                  trend="+5.3%"
                  trendUp={true}
                  icon={<Users className="h-5 w-5 text-violet-600" />}
                  description="Last 30 days"
                />
                <MetricCard 
                  title="Appointment Rate" 
                  value="78%" 
                  trend="-2.1%"
                  trendUp={false}
                  icon={<Activity className="h-5 w-5 text-amber-600" />}
                  description="Completion rate"
                />
              </div>

              {/* Dashboard Component */}
              <PharmacyReportsDashboard />
            </div>
          )}

          {/* Pharmacy Sales Tab */}
          {activeTab === TABS.PHARMACY && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <MetricCard 
                  title="Total Medicine Sales" 
                  value="KSh 485,620" 
                  trend="+8.2%"
                  trendUp={true}
                  icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
                  description="Last 30 days"
                />
                <MetricCard 
                  title="Average Sale Value" 
                  value="KSh 1,250" 
                  trend="+3.7%"
                  trendUp={true}
                  icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                  description="Per transaction"
                />
                <MetricCard 
                  title="Top Selling Item" 
                  value="Paracetamol" 
                  trend="324 units"
                  trendUp={true}
                  icon={<Package className="h-5 w-5 text-purple-600" />}
                  description="Most popular medicine"
                />
              </div>
              
              {/* Custom Pharmacy Dashboard would be implemented here */}
              <PharmacyReportsSection />
            </div>
          )}

          {/* Services Tab */}
          {activeTab === TABS.SERVICES && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <MetricCard 
                  title="Total Services" 
                  value="KSh 759,680" 
                  trend="+15.3%"
                  trendUp={true}
                  icon={<HeartPulse className="h-5 w-5 text-red-600" />}
                  description="Last 30 days"
                />
                <MetricCard 
                  title="Most Requested" 
                  value="Consultation" 
                  trend="428 visits"
                  trendUp={true}
                  icon={<Users className="h-5 w-5 text-indigo-600" />}
                  description="Top service category"
                />
                <MetricCard 
                  title="Average Fee" 
                  value="KSh 2,800" 
                  trend="+5.2%"
                  trendUp={true}
                  icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                  description="Per service"
                />
              </div>
              
              {/* Custom Services Dashboard would be implemented here */}
              <ServicesReportsSection />
            </div>
          )}

          {/* Other tabs would be implemented in a similar way */}
          {activeTab === TABS.APPOINTMENTS && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Appointments reporting functionality coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === TABS.INVENTORY && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Inventory reporting functionality coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === TABS.PATIENTS && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Patient demographics and analytics coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </Tabs>
      </div>
    </main>
  );
}

// Tab Trigger component with icon
function TabTrigger({ value, icon, children, active }: { 
  value: string; 
  icon: React.ReactNode;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <TabsTrigger 
      value={value} 
      className={cn(
        "px-4 py-2 flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-none border-b-2 border-transparent rounded-none",
        active ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </TabsTrigger>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  trend, 
  trendUp, 
  icon, 
  description 
}: { 
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="p-2 rounded-full bg-gray-100">{icon}</div>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <span className={cn(
            "text-xs font-medium",
            trendUp ? "text-emerald-600" : "text-red-600"
          )}>
            {trend}
          </span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
} 