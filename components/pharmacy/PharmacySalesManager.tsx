'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Activity, DollarSign, Clock, ChevronRight, Package } from 'lucide-react';

// Import shared components
import SalesMetricCard from '@/components/shared/sales/SalesMetricCard';
import SalesTable from '@/components/shared/sales/SalesTable';
import SalesListCard from '@/components/shared/sales/SalesListCard';
import SalesFilterBar, { TimeframeType, getDateRangeFromTimeframe } from '@/components/shared/sales/SalesFilterBar';
import { StatusBadge } from '@/components/shared/sales/SalesTable';

// Import proper fetch function for pharmacy data
import { fetchSales } from '@/lib/authActions';
import NewSaleForm from './NewSaleForm';

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

interface SalesAnalytics {
  totalRevenue: number;
  totalSales: number;
  paidSales: number;
  pendingSales: number;
  mostSoldMedication: string;
  averageSaleValue: number;
}

export default function PharmacySalesManager() {
  const router = useRouter();
  const [sales, setSales] = useState<PharmacySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('all');
  const [showNewSaleForm, setShowNewSaleForm] = useState(false);
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isSmallMediumMobile, setIsSmallMediumMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);
  const [analytics, setAnalytics] = useState<SalesAnalytics>({
    totalRevenue: 0,
    totalSales: 0,
    paidSales: 0,
    pendingSales: 0,
    mostSoldMedication: '',
    averageSaleValue: 0
  });

  // Check screen size on component mount and resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsNarrowMobile(width <= 358);
      setIsSmallMediumMobile(width > 358 && width <= 409);
      setIsMediumMobile(width > 409 && width <= 480);
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch sales data when component mounts or filters change
  useEffect(() => {
    fetchPharmacySalesData();
  }, [selectedTimeframe, searchTerm]);

  async function fetchPharmacySalesData() {
    try {
      setLoading(true);
      
      // Fetch pharmacy sales data
      const salesData = await fetchSales();
      
      console.log('Sales data:', salesData);
      
      // Apply date filtering based on timeframe
      const { startDate, endDate } = getDateRangeFromTimeframe(selectedTimeframe);
      let filteredData = salesData;
      
      if (startDate && endDate) {
        filteredData = filteredData.filter(sale => {
          const saleDate = new Date(sale.created_at || '').toISOString().split('T')[0];
          return saleDate >= startDate && saleDate <= endDate;
        });
      }
      
      // Apply search term filtering
      if (searchTerm) {
        filteredData = filteredData.filter(sale => {
          const searchLower = searchTerm.toLowerCase();
          return (
            (sale.patient?.full_name?.toLowerCase().includes(searchLower)) ||
            sale.items.some(item => item.medication.name.toLowerCase().includes(searchLower)) ||
            (sale.payment_method?.toLowerCase() || '').includes(searchLower) ||
            sale.items.some((item) => item.batch.batch_number.toLowerCase().includes(searchLower))
          );
        });
      }
      
      setSales(filteredData as PharmacySale[]);
      calculateAnalytics(filteredData as PharmacySale[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching sales');
      console.error('Error fetching pharmacy sales:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calculates analytics from sales data
   */
  function calculateAnalytics(salesData: PharmacySale[]) {
    if (!salesData.length) {
      setAnalytics({
        totalRevenue: 0,
        totalSales: 0,
        paidSales: 0,
        pendingSales: 0,
        mostSoldMedication: 'None',
        averageSaleValue: 0
      });
      return;
    }

    // Calculate totals
    const totalRevenue = salesData.reduce((sum, sale) => 
      sum + (sale.total_amount || calculateTotal(sale)), 0);
    
    const paidSales = salesData.filter(sale => 
      sale.payment_status === 'paid').length;
    
    const pendingSales = salesData.filter(sale => 
      sale.payment_status === 'pending').length;
    
    // Find most sold medication
    const medicationCounts: Record<string, number> = {};
    salesData.forEach(sale => {
      sale.items.forEach(item => {
        if (!medicationCounts[item.medication.name]) {
          medicationCounts[item.medication.name] = 0;
        }
        medicationCounts[item.medication.name] += item.quantity;
      });
    });

    let mostSoldMedication = 'None';
    let maxCount = 0;
    
    Object.entries(medicationCounts).forEach(([medication, count]) => {
      if (count > maxCount) {
        mostSoldMedication = medication;
        maxCount = count;
      }
    });
    
    setAnalytics({
      totalRevenue,
      totalSales: salesData.length,
      paidSales,
      pendingSales,
      mostSoldMedication,
      averageSaleValue: salesData.length > 0 ? totalRevenue / salesData.length : 0
    });
  }

  /**
   * Calculates the total amount for a sale
   */
  function calculateTotal(sale: PharmacySale): number {
    return sale.items.reduce((total, item) => total + item.total_price, 0);
  }

  // Define columns for the pharmacy sales table
  const salesColumns = [
    {
      header: 'Date',
      key: 'date',
      cell: (sale: PharmacySale) => format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')
    },
    {
      header: 'Patient',
      key: 'patient',
      cell: (sale: PharmacySale) => (
        <div>
          <div className="font-medium truncate-text">{sale.patient?.full_name || 'Walk-in Customer'}</div>
          {sale.patient?.phone_number && (
            <div className="text-sm text-gray-500">{sale.patient.phone_number}</div>
          )}
        </div>
      )
    },
    {
      header: 'Medications',
      key: 'medications',
      cell: (sale: PharmacySale) => (
        <div className="space-y-1">
          {sale.items.map((item, index) => (
            <div key={index} className="text-sm truncate-text">
              {item.medication.name} {item.medication.strength} ({item.quantity} units)
            </div>
          ))}
        </div>
      )
    },
    {
      header: 'Total',
      key: 'total',
      cell: (sale: PharmacySale) => (
        <div className="font-medium">
          KSh {(sale.total_amount || calculateTotal(sale)).toFixed(2)}
        </div>
      )
    },
    {
      header: 'Payment',
      key: 'payment',
      cell: (sale: PharmacySale) => sale.payment_method
    },
    {
      header: 'Status',
      key: 'status',
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
    },
  ];

  // After the form is submitted, add an effect to close and refresh
  useEffect(() => {
    // After a sale is created, NewSaleForm will navigate to /pharmacy/sales,
    // which will trigger a re-render of this component
    // We can detect when the form is closed and refresh data
    if (!showNewSaleForm) {
      fetchPharmacySalesData();
    }
  }, [showNewSaleForm]);

  return (
    <div className="pharmacy-manager-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
        <h2 className={`${isNarrowMobile ? 'xs-heading' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-xl md:text-2xl'} font-bold text-gray-800 leading-tight`}>
          Pharmacy Sales Management
        </h2>
        <Button 
          onClick={() => setShowNewSaleForm(true)}
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
          <Button
            variant="outline"
            size="sm"
            className={`${
              isNarrowMobile ? 'xs-text pharmacy-button-xs' : 
              isSmallMediumMobile ? 'xsm-text pharmacy-button-xsm' : 
              isMediumMobile ? 'sm-text pharmacy-button-sm' : 'text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3'
            } flex-shrink-0 whitespace-nowrap min-w-0 flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200`}
            onClick={() => router.push('/pharmacy/reports')}
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
          timeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          aria-label="Sales filter controls"
            customClasses={{
              searchInput: isNarrowMobile ? 'xs-filter-item' : isSmallMediumMobile ? 'xsm-filter-item' : isMediumMobile ? 'sm-search-box' : '',
              timeframeSelect: isNarrowMobile ? 'xs-filter-item' : isSmallMediumMobile ? 'xsm-filter-item' : isMediumMobile ? 'sm-timeframe-select' : '',
              filterItem: isNarrowMobile ? 'xs-filter-item' : isSmallMediumMobile ? 'xsm-filter-item' : isMediumMobile ? 'sm-filter-item' : ''
            }}
        />
        </div>

        {error && <p className={`text-red-500 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs md:text-sm'} mt-2`} role="alert">{error}</p>}

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
              value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(analytics.totalRevenue)}
              icon={<DollarSign className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-emerald-600`} />}
              subValue={`${analytics.totalSales} total sales`}
              colorClass="from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600"
            />
            
            <SalesMetricCard
              title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Avg Sale" : "Average Sale"}
              value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(analytics.averageSaleValue)}
              icon={<Activity className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-blue-600`} />}
              colorClass="from-blue-50 to-blue-100 border-blue-200 text-blue-600"
            />
            
            <SalesMetricCard
              title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Popular" : "Most Sold Medication"}
              value={analytics.mostSoldMedication}
              icon={<Package className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-purple-600`} />}
              colorClass="from-purple-50 to-purple-100 border-purple-200 text-purple-600"
            />
            
            <SalesMetricCard
              title={isNarrowMobile || isSmallMediumMobile || isMediumMobile ? "Pending" : "Pending Payments"}
              value={`${analytics.pendingSales}`}
              icon={<Clock className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3.5 w-3.5 md:h-4 md:w-4'} text-amber-600`} />}
              subValue={analytics.pendingSales > 0 ? ((analytics.pendingSales / analytics.totalSales) * 100).toFixed(1) + '% of total' : '0%'}
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
            {sales.length === 0 ? (
              <div className={`text-center py-4 text-gray-500 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`} role="status">
                No sales found
              </div>
            ) : (
              sales.map((sale) => (
                <SalesListCard<PharmacySale>
                  key={sale.id}
                  item={sale}
                  title={(item: PharmacySale) => item.patient?.full_name || 'Walk-in Customer'}
                  subtitle={(item: PharmacySale) => format(new Date(item.created_at), isNarrowMobile ? 'MM/dd' : isSmallMediumMobile ? 'MM/dd/yy' : 'MMM dd, yyyy')}
                  status={{
                    label: sale.payment_status,
                    variant: sale.payment_status === 'paid' ? 'default' : 
                            sale.payment_status === 'pending' ? 'secondary' : 'destructive'
                  }}
                  lineItems={sale.items.map(item => ({
                    name: `${item.medication.name} ${item.medication.strength}`,
                    quantity: item.quantity,
                    price: item.unit_price
                  }))}
                  totalAmount={sale.total_amount || calculateTotal(sale)}
                  className={`pharmacy-sale-card ${isNarrowMobile ? 'xs-padding xs-card' : isSmallMediumMobile ? 'xsm-padding' : isMediumMobile ? 'sm-padding' : ''}`}
                  titleClassName={`pharmacy-sale-title ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''}`}
                  subtitleClassName={`pharmacy-sale-subtitle ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''}`}
                  badgeClassName={isNarrowMobile ? 'pharmacy-badge-xs' : isSmallMediumMobile ? 'pharmacy-badge-xsm' : isMediumMobile ? 'pharmacy-badge-sm' : ''}
                />
              ))
            )}
          </div>
          
          {/* Desktop table view with responsive adjustments */}
          <div className="mobile-scrollable mt-4 hidden md:block" role="region" aria-label="Sales data table">
            <SalesTable
              data={sales}
              columns={salesColumns}
              isLoading={loading}
              emptyMessage="No sales found"
              className="pharmacy-table-mobile"
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
              <NewSaleForm />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 