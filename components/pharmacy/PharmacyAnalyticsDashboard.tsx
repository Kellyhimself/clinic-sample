'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Activity, Package2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

import SalesFilterBar, { TimeframeType } from '@/components/shared/sales/SalesFilterBar';
import SalesMetricCard from '@/components/shared/sales/SalesMetricCard';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { Sale } from '@/types/pharmacy';

// Import responsive CSS
import './pharmacyAnalytics.css';

// Import server actions
import { getTopSellingMedications, calculateProfitAndReorders } from '@/lib/rpcActions';

// Define interfaces for the RPC function responses
interface TopSellingMedication {
  medication_id: string;
  medication_name: string;
  total_quantity: number;
}

interface ProfitAndReorderData {
  medication_id: string;
  name: string;
  total_sales: number;
  total_cost: number;
  profit_margin: number;
  reorder_suggested: boolean;
}

interface PharmacyAnalyticsDashboardProps {
  isFeatureEnabled: boolean;
  sales: Sale[];
}

export default function PharmacyAnalyticsDashboard({ isFeatureEnabled, sales }: PharmacyAnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<TimeframeType>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [topSellingMeds, setTopSellingMeds] = useState<TopSellingMedication[]>([]);
  const [profitData, setProfitData] = useState<ProfitAndReorderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);
  
  // Check screen size on component mount and resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsNarrowMobile(width <= 358);
      setIsMediumMobile(width > 358 && width <= 480);
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate analytics from the profit data
  const totalRevenue = profitData.reduce((sum, item) => sum + item.total_sales, 0);
  const totalCost = profitData.reduce((sum, item) => sum + item.total_cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const averageMargin = profitData.length 
    ? profitData.reduce((sum, item) => sum + item.profit_margin, 0) / profitData.length 
    : 0;
  const itemsNeedingReorder = profitData.filter(item => item.reorder_suggested).length;
  
  useEffect(() => {
    if (!isFeatureEnabled) {
      return;
    }
    fetchAnalyticsData();
  }, [timeframe, searchTerm, isFeatureEnabled]);
  
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
      let filteredProfitData = profitAndReorders.map(item => ({
        medication_id: item.medication_id,
        name: item.name,
        total_sales: item.total_sales,
        total_cost: item.total_cost,
        profit_margin: item.profit_margin,
        reorder_suggested: item.reorder_suggested
      }));
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredTopMeds = topMeds.filter((med: TopSellingMedication) => 
          med.medication_name.toLowerCase().includes(searchLower)
        );
        
        filteredProfitData = filteredProfitData.filter((item: ProfitAndReorderData) => 
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
  
  if (!isFeatureEnabled) {
    return (
      <div className="pharmacy-analytics-container">
        <h2 className={`${isNarrowMobile ? 'xs-heading' : isMediumMobile ? 'sm-heading' : 'text-xl md:text-2xl'} font-bold text-gray-800 leading-tight mb-4`}>
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
          <div className="space-y-4">
            {/* Preview of Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Total Revenue", value: "KES 0", icon: <DollarSign className="h-4 w-4 text-emerald-600" /> },
                { title: "Total Profit", value: "KES 0", icon: <TrendingUp className="h-4 w-4 text-indigo-600" /> },
                { title: "Average Margin", value: "0%", icon: <Activity className="h-4 w-4 text-blue-600" /> },
                { title: "Items Needing Reorder", value: "0", icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> }
              ].map((metric, index) => (
                <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {metric.icon}
                    <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                  </div>
                  <p className="text-lg font-semibold text-gray-700">{metric.value}</p>
                </div>
              ))}
            </div>

            {/* Preview of Analytics Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex space-x-4 p-4">
                  {["Overview", "Top Selling", "Profit Margins", "Reorder Alerts"].map((tab) => (
                    <button
                      key={tab}
                      className="px-3 py-2 text-sm font-medium text-gray-500"
                      disabled
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Preview Cards */}
                  {[
                    { title: "Top 5 Selling Medications", icon: <Package2 className="h-5 w-5 text-emerald-600" /> },
                    { title: "Top 5 Profit Margin Medications", icon: <TrendingUp className="h-5 w-5 text-indigo-600" /> },
                    { title: "Items Needing Reorder", icon: <AlertTriangle className="h-5 w-5 text-amber-600" /> },
                    { title: "Revenue Breakdown", icon: <BarChart className="h-5 w-5 text-blue-600" /> }
                  ].map((card, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {card.icon}
                        <h3 className="font-medium text-gray-700">{card.title}</h3>
                      </div>
                      <div className="h-32 bg-gray-100 rounded-md flex items-center justify-center">
                        <p className="text-sm text-gray-500">Preview content</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </UpgradePrompt>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Pharmacy Analytics</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pharmacy-analytics-container">
      <h2 className={`${isNarrowMobile ? 'xs-heading' : isMediumMobile ? 'sm-heading' : 'text-xl md:text-2xl'} font-bold text-gray-800 leading-tight mb-4`}>
        Pharmacy Analytics Dashboard
      </h2>
      
      {/* Filter Controls */}
      <Card className={`pharmacy-card ${isNarrowMobile ? 'xs-margin' : isMediumMobile ? 'sm-margin' : 'mb-4'}`}>
        <CardHeader className={`${isNarrowMobile ? 'xs-padding pb-1' : isMediumMobile ? 'sm-padding pb-2' : 'pb-2'}`}>
          <CardTitle className={`${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
            Filter Analytics
          </CardTitle>
          <CardDescription className={isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}>
            Select time period and search for specific medications
          </CardDescription>
        </CardHeader>
        <CardContent className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
          <SalesFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </CardContent>
      </Card>
      
      {/* Key Metrics Cards */}
      <div className={`pharmacy-metrics-grid ${isNarrowMobile ? 'xs-margin' : isMediumMobile ? 'sm-margin' : 'mb-8'}`}>
        <SalesMetricCard
          title="Total Revenue"
          value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalRevenue)}
          icon={<DollarSign className={`${isNarrowMobile ? 'xs-icon' : isMediumMobile ? 'sm-icon' : 'h-4 w-4'} text-emerald-600`} />}
          colorClass="from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600"
        />
        
        <SalesMetricCard
          title="Total Profit"
          value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalProfit)}
          icon={<TrendingUp className={`${isNarrowMobile ? 'xs-icon' : isMediumMobile ? 'sm-icon' : 'h-4 w-4'} text-indigo-600`} />}
          colorClass="from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600"
        />
        
        <SalesMetricCard
          title="Average Margin"
          value={`${averageMargin.toFixed(1)}%`}
          icon={<Activity className={`${isNarrowMobile ? 'xs-icon' : isMediumMobile ? 'sm-icon' : 'h-4 w-4'} text-blue-600`} />}
          colorClass="from-blue-50 to-blue-100 border-blue-200 text-blue-600"
        />
        
        <SalesMetricCard
          title="Items Needing Reorder"
          value={`${itemsNeedingReorder}`}
          icon={<AlertTriangle className={`${isNarrowMobile ? 'xs-icon' : isMediumMobile ? 'sm-icon' : 'h-4 w-4'} text-amber-600`} />}
          colorClass="from-amber-50 to-amber-100 border-amber-200 text-amber-600"
        />
      </div>
      
      {/* Tabs for different analytics views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`pharmacy-tabs-list ${isNarrowMobile ? 'xs-margin' : isMediumMobile ? 'sm-margin' : 'mb-6'}`}>
          <TabsTrigger 
            value="overview" 
            className={`pharmacy-tab-trigger ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="top-selling"
            className={`pharmacy-tab-trigger ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}
          >
            Top Selling
          </TabsTrigger>
          <TabsTrigger 
            value="profit-margin"
            className={`pharmacy-tab-trigger ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}
          >
            Profit Margins
          </TabsTrigger>
          <TabsTrigger 
            value="reorder"
            className={`pharmacy-tab-trigger ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}
          >
            Reorder Alerts
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="pharmacy-grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 5 Selling Medications Card */}
            <Card className="pharmacy-card">
              <CardHeader className={`${isNarrowMobile ? 'xs-padding pb-1' : isMediumMobile ? 'sm-padding pb-2' : 'pb-2'}`}>
                <CardTitle className={`flex items-center gap-2 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                  <Package2 className={`${isNarrowMobile ? 'xs-icon' : isMediumMobile ? 'sm-icon' : 'h-5 w-5'} text-emerald-600`} />
                  <span>Top 5 Selling Medications</span>
                </CardTitle>
                <CardDescription className={isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}>
                  By quantity sold
                </CardDescription>
              </CardHeader>
              <CardContent className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
                {loading ? (
                  <div className={`text-center py-4 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                    Loading...
                  </div>
                ) : topSellingMeds.length === 0 ? (
                  <div className={`text-center py-4 text-gray-500 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                    No data available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topSellingMeds.slice(0, 5).map((med, index) => (
                      <div 
                        key={med.medication_id}
                        className={`pharmacy-list-item p-2 rounded-md bg-gray-50 ${isNarrowMobile ? 'xs-padding' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center justify-center bg-emerald-100 text-emerald-700 ${isNarrowMobile ? 'h-5 w-5 xs-text' : isMediumMobile ? 'h-5 w-5 sm-text' : 'h-6 w-6 text-xs'} rounded-full font-medium`}>
                            {index + 1}
                          </span>
                          <span className={`font-medium ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                            {med.medication_name}
                          </span>
                        </div>
                        <span className={isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}>
                          {med.total_quantity} units
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Top Profit Margin Medications Card */}
            <Card className="pharmacy-card">
              <CardHeader className={`${isNarrowMobile ? 'xs-padding pb-1' : isMediumMobile ? 'sm-padding pb-2' : 'pb-2'}`}>
                <CardTitle className={`flex items-center gap-2 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                  <TrendingUp className={`${isNarrowMobile ? 'xs-icon' : isMediumMobile ? 'sm-icon' : 'h-5 w-5'} text-indigo-600`} />
                  <span>Top 5 Profit Margin Medications</span>
                </CardTitle>
                <CardDescription className={isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}>
                  By percentage margin
                </CardDescription>
              </CardHeader>
              <CardContent className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
                {loading ? (
                  <div className={`text-center py-4 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                    Loading...
                  </div>
                ) : profitData.length === 0 ? (
                  <div className={`text-center py-4 text-gray-500 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                    No data available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...profitData]
                      .sort((a, b) => b.profit_margin - a.profit_margin)
                      .slice(0, 5)
                      .map((item, index) => (
                        <div 
                          key={item.medication_id}
                          className={`pharmacy-list-item p-2 rounded-md bg-gray-50 ${isNarrowMobile ? 'xs-padding' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center justify-center bg-indigo-100 text-indigo-700 ${isNarrowMobile ? 'h-5 w-5 xs-text' : isMediumMobile ? 'h-5 w-5 sm-text' : 'h-6 w-6 text-xs'} rounded-full font-medium`}>
                              {index + 1}
                            </span>
                            <span className={`font-medium ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                              {item.name}
                            </span>
                          </div>
                          <span className={isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}>
                            {item.profit_margin.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Items Needing Reorder Card */}
            <Card className="pharmacy-card">
              <CardHeader className={`${isNarrowMobile ? 'xs-padding pb-1' : isMediumMobile ? 'sm-padding pb-2' : 'pb-2'}`}>
                <CardTitle className={`flex items-center gap-2 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                  <AlertTriangle className={`${isNarrowMobile ? 'xs-icon' : isMediumMobile ? 'sm-icon' : 'h-5 w-5'} text-amber-600`} />
                  <span>Items Needing Reorder</span>
                </CardTitle>
                <CardDescription className={isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}>
                  Below reorder threshold
                </CardDescription>
              </CardHeader>
              <CardContent className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
                {loading ? (
                  <div className={`text-center py-4 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                    Loading...
                  </div>
                ) : profitData.filter(item => item.reorder_suggested).length === 0 ? (
                  <div className={`text-center py-4 text-gray-500 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                    No items need reordering
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profitData
                      .filter(item => item.reorder_suggested)
                      .slice(0, 5)
                      .map((item) => (
                        <div 
                          key={item.medication_id}
                          className={`pharmacy-list-item p-2 rounded-md bg-amber-50 ${isNarrowMobile ? 'xs-padding' : ''}`}
                        >
                          <span className={`font-medium ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                            {item.name}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`${isNarrowMobile ? 'pharmacy-button-xs' : isMediumMobile ? 'pharmacy-button-sm' : 'h-7 text-xs'}`}
                          >
                            Order More
                          </Button>
                        </div>
                      ))}
                    {profitData.filter(item => item.reorder_suggested).length > 5 && (
                      <Button 
                        variant="ghost" 
                        className={`w-full ${isNarrowMobile ? 'xs-text pharmacy-button-xs' : isMediumMobile ? 'sm-text pharmacy-button-sm' : 'text-xs'} text-amber-700`}
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
            <Card className="pharmacy-card">
              <CardHeader className={`${isNarrowMobile ? 'xs-padding pb-1' : isMediumMobile ? 'sm-padding pb-2' : 'pb-2'}`}>
                <CardTitle className={`flex items-center gap-2 ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}`}>
                  <BarChart className={`${isNarrowMobile ? 'xs-icon' : isMediumMobile ? 'sm-icon' : 'h-5 w-5'} text-blue-600`} />
                  <span>Revenue Breakdown</span>
                </CardTitle>
                <CardDescription className={isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}>
                  Sales, costs, and profit
                </CardDescription>
              </CardHeader>
              <CardContent className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
                <div className={`pharmacy-chart-placeholder rounded-md bg-gray-50 flex items-center justify-center ${isNarrowMobile ? 'h-36' : isMediumMobile ? 'h-40' : 'h-48'}`}>
                  {loading ? (
                    <div className={isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''}>
                      Loading chart data...
                    </div>
                  ) : (
                    <div className="space-y-4 w-full px-4">
                      <div className="space-y-1">
                        <div className={`flex justify-between ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`}>
                          <span>Total Revenue</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalRevenue)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ width: '100%' }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className={`flex justify-between ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`}>
                          <span>Total Cost</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalCost)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(totalCost / totalRevenue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className={`flex justify-between ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`}>
                          <span>Total Profit</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalProfit)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-500 h-2 rounded-full" 
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
                        key={item.medication_id}
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
                        key={item.medication_id}
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