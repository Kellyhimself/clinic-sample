'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Activity, DollarSign, Clock, ChevronRight, Package } from 'lucide-react';
import NewSaleFormWrapper from '@/app/(auth)/pharmacy/pharmacy-sales-management/new-sale/NewSaleFormWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/app/lib/utils';
import { Loader2 } from 'lucide-react';
import { Sale } from '@/app/lib/sales';
import { PharmacyAnalyticsDashboard } from './PharmacyAnalyticsDashboard';

// Import shared components
import SalesMetricCard from '@/components/shared/sales/SalesMetricCard';
import SalesTable from '@/components/shared/sales/SalesTable';
import SalesFilterBar, { TimeframeType, getDateRangeFromTimeframe } from '@/components/shared/sales/SalesFilterBar';
import { StatusBadge } from '@/components/shared/sales/SalesTable';

// Import responsive CSS
import './pharmacySalesManager.css';

// Define TypeScript interfaces for our data structures
interface MedicationItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  medication: {
    id: string;
    name: string;
    dosage_form: string;
    strength: string;
  };
  batch: {
    batch_number: string;
    expiry_date: string;
  };
}

interface PharmacySale {
  id: string;
  created_at: string;
  payment_method: 'cash' | 'mpesa' | 'insurance';
  payment_status: 'pending' | 'paid' | 'refunded';
  patient?: {
    full_name: string;
    phone_number?: string;
  };
  items: MedicationItem[];
  total_amount?: number;
  transaction_id?: string | null;
}

interface MedicationSale {
  medication: {
    name: string;
    dosage_form: string;
    strength: string;
  };
  quantity: number;
  total_sales: number;
}

interface PharmacySalesManagerProps {
  initialSales: Sale[];
  isLoading?: boolean;
  error?: string | null;
  medicationSales?: MedicationSale[];
}

// Helper function to calculate total
function calculateTotal(sale: PharmacySale): number {
  return sale.items.reduce((total, item) => total + item.total_price, 0);
}

const salesColumns = [
  {
    key: 'date',
    header: 'Date',
    cell: (sale: PharmacySale) => format(new Date(sale.created_at), 'MMM dd, yyyy')
  },
  {
    key: 'customer',
    header: 'Customer',
    cell: (sale: PharmacySale) => sale.patient?.full_name || 'Walk-in Customer'
  },
  {
    key: 'items',
    header: 'Items',
    cell: (sale: PharmacySale) => sale.items?.map(item => 
      `${item.medication.name} (${item.quantity})`
    ).join(', ') || 'No items'
  },
  {
    key: 'total',
    header: 'Total',
    cell: (sale: PharmacySale) => new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES' 
    }).format(sale.total_amount || calculateTotal(sale))
  },
  {
    key: 'status',
    header: 'Status',
    cell: (sale: PharmacySale) => (
      <StatusBadge 
        status={sale.payment_status}
        variants={{
          paid: 'default',
          pending: 'secondary',
          refunded: 'destructive'
        }}
      />
    )
  }
];

export function PharmacySalesManager({ 
  initialSales, 
  isLoading: externalLoading = false,
  error = null,
  medicationSales = []
}: PharmacySalesManagerProps) {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeframe, setTimeframe] = useState('all');
  const [internalLoading, setInternalLoading] = useState(false);
  const [showNewSaleForm, setShowNewSaleForm] = useState(false);
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isSmallMediumMobile, setIsSmallMediumMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);

  const isLoading = externalLoading || internalLoading;

  // Memoize filtered sales data
  const filteredSales = useMemo(() => {
    if (!sales.length) return [];
    
    const { startDate, endDate } = getDateRangeFromTimeframe(timeframe);
    let filteredData = [...sales];
      
    if (startDate && endDate) {
      filteredData = filteredData.filter(sale => {
        const saleDate = new Date(sale.created_at || '');
        return saleDate >= new Date(startDate) && saleDate < new Date(endDate);
      });
    }
      
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredData = filteredData.filter(sale => {
        return (
          (sale.patient?.full_name?.toLowerCase().includes(searchLower)) ||
          (sale.items?.some(item => item.medication?.name?.toLowerCase().includes(searchLower)) || false) ||
          (sale.payment_method?.toLowerCase() || '').includes(searchLower) ||
          (sale.items?.some((item) => item.batch?.batch_number?.toLowerCase().includes(searchLower)) || false)
        );
      });
    }
      
    return filteredData;
  }, [sales, searchTerm, timeframe]);

  // Memoize the resize handler with proper debouncing
  const debouncedResize = useCallback(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    
    const handler = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        setIsNarrowMobile(width <= 358);
        setIsSmallMediumMobile(width > 358 && width <= 409);
        setIsMediumMobile(width > 409 && width <= 480);
      }, 100);
    };

    return handler;
  }, []);

  // Memoize the navigation buttons
  const navigationButtons = useMemo(() => (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`${
          isNarrowMobile ? 'xs-text pharmacy-button-xs' : 
          isSmallMediumMobile ? 'xsm-text pharmacy-button-xsm' : 
          isMediumMobile ? 'sm-text pharmacy-button-sm' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'
        } flex-shrink-0 whitespace-nowrap min-w-0 flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200`}
        onClick={() => router.push('/reports?tab=pharmacy')}
      >
        <BarChart className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
        <span className={isNarrowMobile ? 'xs-truncate xs-content-wrap w-full max-w-[60px]' : isSmallMediumMobile ? 'xsm-truncate' : ''}>
          {isNarrowMobile ? 'Reports' : 'Sales Reports'}
        </span>
        {!isNarrowMobile && <ChevronRight className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />}
      </Button>
      
      <Button
        variant="outline"
        size="sm" 
        className={`${
          isNarrowMobile ? 'xs-text pharmacy-button-xs' : 
          isSmallMediumMobile ? 'xsm-text pharmacy-button-xsm' : 
          isMediumMobile ? 'sm-text pharmacy-button-sm' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'
        } flex-shrink-0 whitespace-nowrap min-w-0 flex items-center gap-1 bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700 hover:bg-indigo-200`}
        onClick={() => router.push('/pharmacy/inventory')}
      >
        <Package className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
        <span className={isNarrowMobile ? 'xs-truncate xs-content-wrap w-full max-w-[60px]' : isSmallMediumMobile ? 'xsm-truncate' : ''}>
          {isNarrowMobile ? 'Inventory' : 'Inventory'}
        </span>
        {!isNarrowMobile && <ChevronRight className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className={`${
          isNarrowMobile ? 'xs-text pharmacy-button-xs' : 
          isSmallMediumMobile ? 'xsm-text pharmacy-button-xsm' : 
          isMediumMobile ? 'sm-text pharmacy-button-sm' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'
        } flex-shrink-0 whitespace-nowrap min-w-0 flex items-center gap-1 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200`}
        onClick={() => router.push('/pharmacy/top-medications')}
      >
        <Activity className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3 w-3 md:h-4 md:w-4'}`} /> 
        <span className={isNarrowMobile ? 'xs-truncate xs-content-wrap w-full max-w-[60px]' : isSmallMediumMobile ? 'xsm-truncate' : ''}>
          {isNarrowMobile ? 'Top Meds' : 'Top Medications'}
        </span>
        {!isNarrowMobile && <ChevronRight className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-2 w-2 md:h-3 md:w-3'} ml-1`} />}
      </Button>
    </>
  ), [isNarrowMobile, isSmallMediumMobile, isMediumMobile, router]);

  // Memoize total revenue calculation
  const totalRevenue = useMemo(() => 
    filteredSales.reduce((sum, sale) => sum + (sale.total_amount || calculateTotal(sale)), 0),
    [filteredSales]
  );

  // Memoize sales counts
  const salesCounts = useMemo(() => ({
    total: filteredSales.length,
    pending: filteredSales.filter(sale => sale.payment_status === 'pending').length
  }), [filteredSales]);

  // Memoize medication counts
  const medicationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        const medicationName = item.medication.name;
        counts[medicationName] = (counts[medicationName] || 0) + item.quantity;
      });
    });
    return counts;
  }, [filteredSales]);

  // Memoize most sold medication
  const mostSoldMedication = useMemo(() => {
    if (!filteredSales.length) return 'None';
    
    let maxCount = 0;
    let mostSold = 'None';
    
    Object.entries(medicationCounts).forEach(([medication, count]) => {
      if (count > maxCount) {
        mostSold = medication;
        maxCount = count;
      }
    });
    
    return mostSold;
  }, [medicationCounts, filteredSales.length]);

  // Memoize average sale value
  const averageSaleValue = useMemo(() => 
    salesCounts.total > 0 ? totalRevenue / salesCounts.total : 0,
    [totalRevenue, salesCounts.total]
  );

  // Memoize all metrics together
  const metrics = useMemo(() => ({
    totalRevenue,
    totalSales: salesCounts.total,
    pendingSales: salesCounts.pending,
    mostSoldMedication,
    averageSaleValue
  }), [totalRevenue, salesCounts, mostSoldMedication, averageSaleValue]);

  // Update sales when initialSales changes
  useEffect(() => {
    if (initialSales && initialSales.length > 0) {
      setSales(initialSales);
      setInternalLoading(false);
    } else {
      setSales([]);
      setInternalLoading(false);
    }
  }, [initialSales]);

  // Check screen size on component mount and resize
  useEffect(() => {
    const handler = debouncedResize();
    handler(); // Initial call
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
    };
  }, [debouncedResize]);

  if (isLoading) {
    return (
      <div className="pharmacy-manager-container animate-pulse">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-9 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 mt-3">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-32 flex-shrink-0"></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 mt-3">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error loading sales data</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="pharmacy-manager-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
        <h2 className={`${isNarrowMobile ? 'xs-heading' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-xl md:text-2xl'} font-bold text-gray-800 leading-tight`}>
          Pharmacy Sales Management
        </h2>
        <Button 
          onClick={() => router.push('/pharmacy/pharmacy-sales-management/new-sale')}
          className={`w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 ${
            isNarrowMobile ? 'pharmacy-button-xs xs-new-sale-button' : 
            isSmallMediumMobile ? 'pharmacy-button-xsm xsm-button' : 
            isMediumMobile ? 'pharmacy-button-sm' : 'py-1 h-9'
          }`}
        >
          New Sale
        </Button>
      </div>

      {/* Skip to content button for accessibility */}
      <a href="#sales-content" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-emerald-100 text-emerald-800 rounded border">
        Skip to content
      </a>

      {/* Analysis & Navigation Links */}
      <div className={`bg-gray-50 rounded-lg border border-gray-100 shadow-sm mt-3 ${
        isNarrowMobile ? 'xs-padding xs-card' : 
        isSmallMediumMobile ? 'xsm-padding' : 
        isMediumMobile ? 'sm-padding' : 'p-2'
      }`}>
        <div className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs'} text-gray-500 mb-1.5 font-medium`}>Quick Navigation</div>
        <div className={`${
          isNarrowMobile ? 'xs-nav-wrapper' : 
          isSmallMediumMobile ? 'pharmacy-scroll-x xsm-scroll-container' : 
          'pharmacy-scroll-x'
        }`}>
          {navigationButtons}
        </div>
      </div>

      <div id="sales-content" className={`bg-white rounded-lg shadow-lg ${
        isNarrowMobile ? 'xs-padding xs-main-content xs-card' : 
        isSmallMediumMobile ? 'xsm-padding' : 
        isMediumMobile ? 'sm-padding' : 'p-2 sm:p-3 md:p-4 lg:p-6'
      } overflow-hidden pharmacy-card mt-3`}>
        {/* SalesFilterBar */}
        <h3 className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} font-medium text-gray-700 mb-2 md:mb-3 hidden md:block`}>Filter Sales Data</h3>
        
        <div className={`${
          isNarrowMobile ? 'xs-filter-container xs-padding' : 
          isSmallMediumMobile ? 'xsm-filter-container xsm-padding' : 
          isMediumMobile ? 'sm-filter-container sm-padding' : ''
        }`}>
          <SalesFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            aria-label="Sales filter controls"
            customClasses={{
              searchInput: isNarrowMobile ? 'xs-filter-item' : isSmallMediumMobile ? 'xsm-filter-item' : isMediumMobile ? 'sm-search-box' : '',
              timeframeSelect: isNarrowMobile ? 'xs-filter-item' : isSmallMediumMobile ? 'xsm-filter-item' : isMediumMobile ? 'sm-timeframe-select' : '',
              filterItem: isNarrowMobile ? 'xs-filter-item' : isSmallMediumMobile ? 'xsm-filter-item' : isMediumMobile ? 'sm-filter-item' : ''
            }}
          />
        </div>

        {/* Quick Analytics Cards */}
        <div className={`mt-4 pt-4 border-t border-gray-100 ${
          isNarrowMobile ? 'xs-margin xs-card' : 
          isSmallMediumMobile ? 'xsm-margin' : 
          isMediumMobile ? 'sm-margin' : ''
        }`}>
          <h3 className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} font-medium text-gray-700 mb-2 md:mb-3`}>
            {isNarrowMobile || isSmallMediumMobile || isMediumMobile ? 'Summary' : 'Sales Summary'}
          </h3>
          <div className="pharmacy-metrics">
            <SalesMetricCard
              title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Revenue" : "Total Revenue"}
              value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(metrics.totalRevenue)}
              icon={<DollarSign className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-emerald-600`} />}
              subValue={`${metrics.totalSales} total sales`}
              colorClass="from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600"
            />
            
            <SalesMetricCard
              title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Avg Sale" : "Average Sale"}
              value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(metrics.averageSaleValue)}
              icon={<Activity className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-blue-600`} />}
              colorClass="from-blue-50 to-blue-100 border-blue-200 text-blue-600"
            />
            
            <SalesMetricCard
              title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Popular" : "Most Sold Medication"}
              value={metrics.mostSoldMedication}
              icon={<Package className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-purple-600`} />}
              colorClass="from-purple-50 to-purple-100 border-purple-200 text-purple-600"
            />
            
            <SalesMetricCard
              title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Pending" : "Pending Payments"}
              value={`${metrics.pendingSales}`}
              icon={<Clock className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-amber-600`} />}
              subValue={metrics.pendingSales > 0 ? ((metrics.pendingSales / metrics.totalSales) * 100).toFixed(1) + '% of total' : '0%'}
              colorClass="from-amber-50 to-amber-100 border-amber-200 text-amber-600"
            />
          </div>
        </div>

        {/* Sales Data Section */}
        <div className={`mt-4 pt-4 border-t border-gray-100 ${
          isNarrowMobile ? 'xs-margin xs-card' : 
          isSmallMediumMobile ? 'xsm-margin' : 
          isMediumMobile ? 'sm-margin' : ''
        }`}>
          <h3 className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'} font-medium text-gray-700 mb-2 md:mb-3`}>
            {isNarrowMobile || isSmallMediumMobile || isMediumMobile ? 'Records' : 'Sales Records'}
          </h3>
          
          {/* Mobile list view - optimized for narrow and medium screens */}
          <div className="md:hidden space-y-2">
            {filteredSales.length === 0 ? (
              <div className={`text-center py-4 text-gray-500 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`} role="status">
                Loading sales data...
              </div>
            ) : (
              filteredSales.map((sale) => (
                <Card key={sale.id} className={`pharmacy-sale-card bg-white border border-gray-200 ${isNarrowMobile ? 'xs-padding xs-card' : isSmallMediumMobile ? 'xsm-padding' : isMediumMobile ? 'sm-padding' : ''}`}>
                  <CardHeader>
                    <CardTitle className={`pharmacy-sale-title text-gray-900 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''}`}>
                      {sale.patient?.full_name || 'Walk-in Customer'}
                    </CardTitle>
                    <CardDescription className={`pharmacy-sale-subtitle text-gray-500 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''}`}>
                      {format(new Date(sale.created_at), isNarrowMobile ? 'MM/dd' : isSmallMediumMobile ? 'MM/dd/yy' : 'MMM dd, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Amount:</span>
                        <span className="font-medium text-gray-900">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(sale.total_amount || calculateTotal(sale))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Items:</span>
                        <span className="text-sm text-gray-600">{sale.items?.length || 0} items</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Payment Method:</span>
                        <span className="text-sm text-gray-600 capitalize">{sale.payment_method}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          {/* Desktop table view with responsive adjustments */}
          <div className="mobile-scrollable mt-4 hidden md:block" role="region" aria-label="Sales data table">
            <SalesTable
              data={filteredSales}
              columns={salesColumns}
              isLoading={false}
              emptyMessage="No sales found"
              className="pharmacy-table-mobile bg-white border border-gray-200"
            />
          </div>
        </div>
      </div>

      {/* New Sale Form Dialog - with responsive adjustments */}
      {showNewSaleForm && (
        <div className={`pharmacy-modal ${isNarrowMobile || isSmallMediumMobile || isMediumMobile ? 'p-0' : 'md:p-4'}`}>
          <div className={`${isNarrowMobile || isSmallMediumMobile || isMediumMobile ? 'w-full h-full' : 'md:w-auto md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-lg'} bg-white md:shadow-xl flex flex-col overflow-hidden`}>
            <div className={`px-4 py-3 border-b flex justify-between items-center sticky top-0 bg-white z-10 ${
              isNarrowMobile ? 'xs-padding' : 
              isSmallMediumMobile ? 'xsm-padding' : 
              isMediumMobile ? 'sm-padding' : ''
            }`}>
              <h2 className={`${isNarrowMobile ? 'xs-heading' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-base md:text-lg'} font-bold`}>
                {isNarrowMobile || isSmallMediumMobile || isMediumMobile ? 'New Sale' : 'Create New Pharmacy Sale'}
              </h2>
              <Button 
                onClick={() => setShowNewSaleForm(false)}
                variant="ghost"
                size="sm"
                className={`${
                  isNarrowMobile ? 'pharmacy-button-xs h-6 w-6 p-0' : 
                  isSmallMediumMobile ? 'pharmacy-button-xsm h-7 w-7 p-0' : 
                  isMediumMobile ? 'pharmacy-button-sm h-8 w-8 p-0' : 'h-8 w-8 p-0'
                } rounded-full`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : isMediumMobile ? 'h-4 w-4' : 'h-4 w-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>
            <div className={`flex-1 overflow-auto ${
              isNarrowMobile ? 'xs-text' : 
              isSmallMediumMobile ? 'xsm-text' : 
              isMediumMobile ? 'sm-text' : ''
            }`}>
              <NewSaleFormWrapper />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}