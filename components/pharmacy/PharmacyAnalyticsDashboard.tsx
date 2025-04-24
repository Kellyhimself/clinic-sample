'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Activity, Package2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

import SalesFilterBar, { TimeframeType } from '@/components/shared/sales/SalesFilterBar';
import SalesMetricCard from '@/components/shared/sales/SalesMetricCard';

// Import server actions
import { getTopSellingMedications, calculateProfitAndReorders } from '@/lib/rpcActions';

// Define interfaces for the RPC function responses
interface TopSellingMedication {
  medication_id: string;
  medication_name: string;
  total_quantity: number;
}

interface ProfitAndReorderData {
  id: string;
  name: string;
  total_sales: number;
  total_cost: number;
  profit_margin: number;
  reorder_suggested: boolean;
}

export default function PharmacyAnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeType>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [topSellingMeds, setTopSellingMeds] = useState<TopSellingMedication[]>([]);
  const [profitData, setProfitData] = useState<ProfitAndReorderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate analytics from the profit data
  const totalRevenue = profitData.reduce((sum, item) => sum + item.total_sales, 0);
  const totalCost = profitData.reduce((sum, item) => sum + item.total_cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const averageMargin = profitData.length 
    ? profitData.reduce((sum, item) => sum + item.profit_margin, 0) / profitData.length 
    : 0;
  const itemsNeedingReorder = profitData.filter(item => item.reorder_suggested).length;
  
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe, searchTerm]);
  
  async function fetchAnalyticsData() {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch data using server actions
      const [topMeds, profitAndReorders] = await Promise.all([
        getTopSellingMedications(),
        calculateProfitAndReorders()
      ]);
      
      console.log('Top selling medications:', topMeds);
      console.log('Profit and reorder data:', profitAndReorders);
      
      // Filter by search term if needed
      let filteredTopMeds = topMeds;
      let filteredProfitData = profitAndReorders;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredTopMeds = topMeds.filter((med: TopSellingMedication) => 
          med.medication_name.toLowerCase().includes(searchLower)
        );
        
        filteredProfitData = profitAndReorders.filter((item: ProfitAndReorderData) => 
          item.name.toLowerCase().includes(searchLower)
        );
      }
      
      setTopSellingMeds(filteredTopMeds);
      setProfitData(filteredProfitData);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching analytics data');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="space-y-4 p-2 md:p-4 lg:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">Pharmacy Analytics Dashboard</h2>
      
      {/* Filter Controls */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filter Analytics</CardTitle>
          <CardDescription>Select time period and search for specific medications</CardDescription>
        </CardHeader>
        <CardContent>
          <SalesFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </CardContent>
      </Card>
      
      {/* Error message if any */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4" role="alert">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SalesMetricCard
          title="Total Revenue"
          value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalRevenue)}
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          colorClass="from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600"
        />
        
        <SalesMetricCard
          title="Total Profit"
          value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalProfit)}
          icon={<TrendingUp className="h-4 w-4 text-indigo-600" />}
          colorClass="from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600"
        />
        
        <SalesMetricCard
          title="Average Margin"
          value={`${averageMargin.toFixed(1)}%`}
          icon={<Activity className="h-4 w-4 text-blue-600" />}
          colorClass="from-blue-50 to-blue-100 border-blue-200 text-blue-600"
        />
        
        <SalesMetricCard
          title="Items Needing Reorder"
          value={`${itemsNeedingReorder}`}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          colorClass="from-amber-50 to-amber-100 border-amber-200 text-amber-600"
        />
      </div>
      
      {/* Tabs for different analytics views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top-selling">Top Selling</TabsTrigger>
          <TabsTrigger value="profit-margin">Profit Margins</TabsTrigger>
          <TabsTrigger value="reorder">Reorder Alerts</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 5 Selling Medications Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5 text-emerald-600" />
                  <span>Top 5 Selling Medications</span>
                </CardTitle>
                <CardDescription>By quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : topSellingMeds.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No data available</div>
                ) : (
                  <div className="space-y-2">
                    {topSellingMeds.slice(0, 5).map((med, index) => (
                      <div 
                        key={med.medication_id}
                        className="flex items-center justify-between p-2 rounded-md bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center bg-emerald-100 text-emerald-700 h-6 w-6 rounded-full text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium">{med.medication_name}</span>
                        </div>
                        <span>{med.total_quantity} units</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Top Profit Margin Medications Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <span>Top 5 Profit Margin Medications</span>
                </CardTitle>
                <CardDescription>By percentage margin</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : profitData.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No data available</div>
                ) : (
                  <div className="space-y-2">
                    {[...profitData]
                      .sort((a, b) => b.profit_margin - a.profit_margin)
                      .slice(0, 5)
                      .map((item, index) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-md bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 h-6 w-6 rounded-full text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <span>{item.profit_margin.toFixed(1)}%</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Items Needing Reorder Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span>Items Needing Reorder</span>
                </CardTitle>
                <CardDescription>Below reorder threshold</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : profitData.filter(item => item.reorder_suggested).length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No items need reordering</div>
                ) : (
                  <div className="space-y-2">
                    {profitData
                      .filter(item => item.reorder_suggested)
                      .slice(0, 5)
                      .map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-md bg-amber-50"
                        >
                          <span className="font-medium">{item.name}</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Order More
                          </Button>
                        </div>
                      ))}
                    {profitData.filter(item => item.reorder_suggested).length > 5 && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-xs text-amber-700"
                        onClick={() => setActiveTab('reorder')}
                      >
                        View all {profitData.filter(item => item.reorder_suggested).length} items
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Sales vs Costs Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-blue-600" />
                  <span>Revenue Breakdown</span>
                </CardTitle>
                <CardDescription>Sales, costs, and profit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 rounded-md bg-gray-50 flex items-center justify-center">
                  {loading ? (
                    <div>Loading chart data...</div>
                  ) : (
                    <div className="space-y-4 w-full px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Total Revenue</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalRevenue)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-emerald-500 h-2.5 rounded-full" 
                            style={{ width: '100%' }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Total Cost</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalCost)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-red-500 h-2.5 rounded-full" 
                            style={{ width: `${(totalCost / totalRevenue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Total Profit</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalProfit)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-indigo-500 h-2.5 rounded-full" 
                            style={{ width: `${(totalProfit / totalRevenue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Top Selling Tab */}
        <TabsContent value="top-selling">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Medications</CardTitle>
              <CardDescription>Ranked by quantity sold</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : topSellingMeds.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No data available</div>
              ) : (
                <div className="space-y-2">
                  {topSellingMeds.map((med, index) => (
                    <div 
                      key={med.medication_id}
                      className="flex items-center justify-between p-3 rounded-md bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center bg-emerald-100 text-emerald-700 h-7 w-7 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium">{med.medication_name}</div>
                          <div className="text-xs text-gray-500">ID: {med.medication_id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{med.total_quantity} units</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Profit Margin Tab */}
        <TabsContent value="profit-margin">
          <Card>
            <CardHeader>
              <CardTitle>Medication Profit Margins</CardTitle>
              <CardDescription>Revenue, cost, and profit breakdown by medication</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : profitData.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No data available</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 font-medium text-sm px-3 text-gray-500">
                    <div className="col-span-5">Medication</div>
                    <div className="col-span-2 text-right">Sales</div>
                    <div className="col-span-2 text-right">Cost</div>
                    <div className="col-span-2 text-right">Profit</div>
                    <div className="col-span-1 text-right">Margin</div>
                  </div>
                  
                  {[...profitData]
                    .sort((a, b) => b.profit_margin - a.profit_margin)
                    .map((item) => (
                      <div 
                        key={item.id}
                        className="grid grid-cols-12 gap-4 p-3 rounded-md bg-gray-50 border border-gray-100 text-sm"
                      >
                        <div className="col-span-5 font-medium">{item.name}</div>
                        <div className="col-span-2 text-right">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(item.total_sales)}
                        </div>
                        <div className="col-span-2 text-right">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(item.total_cost)}
                        </div>
                        <div className="col-span-2 text-right">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(item.total_sales - item.total_cost)}
                        </div>
                        <div className={`col-span-1 text-right font-medium ${item.profit_margin > 20 ? 'text-emerald-600' : item.profit_margin < 10 ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.profit_margin.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Reorder Tab */}
        <TabsContent value="reorder">
          <Card>
            <CardHeader>
              <CardTitle>Items Needing Reorder</CardTitle>
              <CardDescription>Inventory below reorder threshold</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : profitData.filter(item => item.reorder_suggested).length === 0 ? (
                <div className="text-center py-4 text-gray-500">No items need reordering</div>
              ) : (
                <div className="space-y-3">
                  {profitData
                    .filter(item => item.reorder_suggested)
                    .map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-md bg-amber-50 border border-amber-100"
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-amber-700 mt-1">
                            Low stock - needs reordering
                          </div>
                        </div>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                          Reorder
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 