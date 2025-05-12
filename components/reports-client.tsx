'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PharmacyReportsDashboard from '@/components/pharmacy/PharmacyReportsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  ShoppingBag, 
  Users,
  DollarSign,
  Download,
  BarChart,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ServicesReportsSection from '@/components/services/ServicesReportsSection';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';

interface ReportsClientProps {
  showReport: boolean;
}

export default function ReportsClient({ showReport }: ReportsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
      params.set('tab', activeTab);
    router.push(`?${params.toString()}`);
  }, [activeTab, router, searchParams]);

  const handleExport = () => {
    console.log('Exporting report...');
  };

  if (!showReport) {
    return (
      <div className="pharmacy-analytics-container">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight mb-4">
          Reports Dashboard
        </h2>
        
        <UpgradePrompt
          requiredPlan="pro"
          features={[
            "Real-time analytics dashboard",
            "Revenue tracking",
            "Patient statistics",
            "Appointment analytics"
          ]}
          variant="card"
          popoverPosition="top-right"
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700">$0.00</div>
                  <p className="text-xs text-emerald-600">+0% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pharmacy Sales</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-700">$0.00</div>
                  <p className="text-xs text-indigo-600">+0% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Patient Visits</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">0</div>
                  <p className="text-xs text-blue-600">+0% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appointment Rate</CardTitle>
                  <Activity className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700">0%</div>
                  <p className="text-xs text-amber-600">+0% from last month</p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="pharmacy">Pharmacy Sales</TabsTrigger>
                  <TabsTrigger value="services">Clinical Services</TabsTrigger>
                  <TabsTrigger value="appointments">Appointments</TabsTrigger>
                </TabsList>
                <Button onClick={handleExport} variant="outline" size="sm" disabled>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>

              <div className="mt-4">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Overview Dashboard</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart className="h-5 w-5 text-emerald-600" />
                            <span>Revenue Overview</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-md border border-emerald-200">
                            <div className="text-center">
                              <BarChart className="h-12 w-12 text-emerald-600 mx-auto" />
                              <p className="text-emerald-700 mt-2">Revenue chart preview</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span>Patient Statistics</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-md border border-blue-200">
                            <div className="text-center">
                              <Users className="h-12 w-12 text-blue-600 mx-auto" />
                              <p className="text-blue-700 mt-2">Patient statistics preview</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
                {activeTab === 'pharmacy' && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart className="h-5 w-5 text-emerald-600" />
                          <span>Recent Sales</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px] flex items-center justify-center bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-md border border-emerald-200">
                          <div className="text-center">
                            <BarChart className="h-16 w-16 text-emerald-600 mx-auto" />
                            <p className="text-emerald-700 mt-2">Sales trend chart preview</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-indigo-600" />
                            <span>Revenue</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-md border border-indigo-200">
                            <div className="text-center">
                              <DollarSign className="h-12 w-12 text-indigo-600 mx-auto" />
                              <p className="text-indigo-700 mt-2">Revenue chart preview</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-amber-600" />
                            <span>Top Selling Medications</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center bg-gradient-to-r from-amber-50 to-amber-100 rounded-md border border-amber-200">
                            <div className="text-center">
                              <TrendingUp className="h-12 w-12 text-amber-600 mx-auto" />
                              <p className="text-amber-700 mt-2">Top medications chart preview</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
                {activeTab === 'services' && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-600" />
                          <span>Services Revenue Analysis</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px] flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-md border border-blue-200">
                          <div className="text-center">
                            <Activity className="h-16 w-16 text-blue-600 mx-auto" />
                            <p className="text-blue-700 mt-2">Services revenue trend preview</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            <span>Most Popular Services</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {['General Consultation', 'Laboratory Tests', 'Vaccinations', 'Dental Services', 'Physiotherapy'].map((service, i) => (
                              <li key={i} className="flex justify-between items-center p-2 hover:bg-emerald-50 rounded-md border border-emerald-100">
                                <span className="text-emerald-700">{service}</span>
                                <span className="text-emerald-600 text-sm">Preview Data</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-indigo-600" />
                            <span>Revenue by Department</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {['General Practice', 'Laboratory', 'Radiology', 'Dental', 'Pediatrics'].map((dept, i) => (
                              <li key={i} className="flex justify-between items-center p-2 hover:bg-indigo-50 rounded-md border border-indigo-100">
                                <span className="text-indigo-700">{dept}</span>
                                <span className="text-indigo-600 text-sm">Preview Data</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
                {activeTab === 'appointments' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Appointment Reports</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-amber-600" />
                            <span>Appointment Statistics</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center bg-gradient-to-r from-amber-50 to-amber-100 rounded-md border border-amber-200">
                            <div className="text-center">
                              <Activity className="h-12 w-12 text-amber-600 mx-auto" />
                              <p className="text-amber-700 mt-2">Appointment statistics preview</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span>Doctor Performance</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-md border border-blue-200">
                            <div className="text-center">
                              <Users className="h-12 w-12 text-blue-600 mx-auto" />
                              <p className="text-blue-700 mt-2">Doctor performance preview</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            </Tabs>
          </div>
        </UpgradePrompt>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pharmacy Sales</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$23,456.00</div>
            <p className="text-xs text-muted-foreground">+15.3% from last month</p>
          </CardContent>
        </Card>
              <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Visits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
            <div className="text-2xl font-bold">2,350</div>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
                </CardContent>
              </Card>
              <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointment Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">+4.2% from last month</p>
                </CardContent>
              </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pharmacy">Pharmacy Sales</TabsTrigger>
            <TabsTrigger value="services">Clinical Services</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        <div className="mt-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Overview Dashboard</h3>
            </div>
          )}
          {activeTab === 'pharmacy' && <PharmacyReportsDashboard />}
          {activeTab === 'services' && <ServicesReportsSection />}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Appointment Reports</h3>
            </div>
          )}
        </div>
        </Tabs>
      </div>
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