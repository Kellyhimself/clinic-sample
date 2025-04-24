'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, TrendingUp, ChevronRight, Activity, Clock, Package, DollarSign, Banknote } from 'lucide-react';
import NewSaleForm from './NewSaleForm';
import { toast } from 'sonner';

// Import shared components
import SalesMetricCard from '@/components/shared/sales/SalesMetricCard';
import SalesTable, { StatusBadge } from '@/components/shared/sales/SalesTable';
import SalesListCard from '@/components/shared/sales/SalesListCard';
import SalesFilterBar, { TimeframeType, getDateRangeFromTimeframe } from '@/components/shared/sales/SalesFilterBar';

// Import services
import { fetchSales, fetchPatients, fetchMedications } from '@/lib/authActions';
import type { Patient, Medication } from '@/types/supabase';

// Define TypeScript interfaces for our data structures
interface SaleItem {
  id: string;
  quantity: number;
  unit_price: number;
  discount: number;
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

interface Sale {
  id: string;
  created_at: string;
  payment_method: 'cash' | 'mpesa' | 'insurance';
  payment_status: 'pending' | 'paid' | 'refunded';
  notes: string;
  patient: {
    full_name: string;
    phone_number: string;
  };
  items: SaleItem[];
}

interface SalesAnalytics {
  totalRevenue: number;
  totalSales: number;
  paidSales: number;
  pendingSales: number;
  totalItems: number;
  averageSaleValue: number;
}

export default function PharmacySalesManager() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewSaleForm, setShowNewSaleForm] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('all');
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics>({
    totalRevenue: 0,
    totalSales: 0,
    paidSales: 0,
    pendingSales: 0,
    totalItems: 0,
    averageSaleValue: 0
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);

  // Fetch sales data when component mounts or filters change
  useEffect(() => {
    fetchSalesData();
  }, [selectedTimeframe, searchTerm]);

  async function fetchSalesData() {
    try {
      setLoading(true);
      const data = await fetchSales();
      
      // Apply date filtering based on timeframe
      let filteredData = data as unknown as Sale[];
      const { startDate, endDate } = getDateRangeFromTimeframe(selectedTimeframe);
      
      if (startDate && endDate) {
        filteredData = filteredData.filter(sale => {
          const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
          return saleDate >= startDate && saleDate <= endDate;
        });
      }
      
      // Apply search term filtering
      if (searchTerm) {
        filteredData = filteredData.filter(sale => {
          const searchLower = searchTerm.toLowerCase();
          return (
            sale.patient.full_name.toLowerCase().includes(searchLower) ||
            sale.items.some(item => item.medication.name.toLowerCase().includes(searchLower)) ||
            sale.payment_method.toLowerCase().includes(searchLower)
          );
        });
      }
      
      setSales(filteredData);
      calculateAnalytics(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching sales');
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  }

  // Function to handle opening the new sale form
  const handleOpenNewSaleForm = async () => {
    try {
      setIsLoadingFormData(true);
      const [patientsData, medicationsData] = await Promise.all([
        fetchPatients(),
        fetchMedications()
      ]);
      
      setPatients(patientsData);
      setMedications(medicationsData);
      setShowNewSaleForm(true);
    } catch (err) {
      console.error('Error fetching data for new sale form:', err);
      toast.error('Failed to load data for the new sale form');
    } finally {
      setIsLoadingFormData(false);
    }
  };

  /**
   * Calculates analytics from sales data
   */
  function calculateAnalytics(salesData: Sale[]) {
    if (!salesData.length) {
      setSalesAnalytics({
        totalRevenue: 0,
        totalSales: 0,
        paidSales: 0,
        pendingSales: 0,
        totalItems: 0,
        averageSaleValue: 0
      });
      return;
    }
    
    // Calculate totals
    const totalRevenue = salesData.reduce((sum, sale) => 
      sum + calculateTotal(sale), 0);
    
    const totalItems = salesData.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    const paidSales = salesData.filter(sale => 
      sale.payment_status === 'paid').length;
    
    const pendingSales = salesData.filter(sale => 
      sale.payment_status === 'pending').length;
    
    setSalesAnalytics({
      totalRevenue,
      totalSales: salesData.length,
      paidSales,
      pendingSales,
      totalItems,
      averageSaleValue: salesData.length > 0 ? totalRevenue / salesData.length : 0
    });
  }

  /**
   * Calculates the total amount for a sale
   */
  function calculateTotal(sale: Sale): number {
    return sale.items.reduce((total, item) => total + item.total_price, 0);
  }

  // Define columns for the sales table
  const saleColumns = [
    {
      header: 'Date',
      key: 'date',
      cell: (sale: Sale) => format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')
    },
    {
      header: 'Patient',
      key: 'patient',
      cell: (sale: Sale) => (
        <div>
          <div className="font-medium">{sale.patient.full_name}</div>
          <div className="text-sm text-gray-500">{sale.patient.phone_number}</div>
        </div>
      )
    },
    {
      header: 'Items',
      key: 'items',
      cell: (sale: Sale) => (
        <div className="space-y-1">
          {sale.items.map((item) => (
            <div key={item.id} className="text-sm">
              {item.quantity}x {item.medication.name}
              <span className="text-gray-500 ml-2">
                ({item.medication.dosage_form} {item.medication.strength})
              </span>
            </div>
          ))}
        </div>
      )
    },
    {
      header: 'Total',
      key: 'total',
      cell: (sale: Sale) => (
        <div className="font-medium">
          KSh {calculateTotal(sale).toFixed(2)}
        </div>
      )
    },
    {
      header: 'Payment',
      key: 'payment',
      cell: (sale: Sale) => sale.payment_method
    },
    {
      header: 'Status',
      key: 'status',
      cell: (sale: Sale) => (
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

  return (
    <div className="space-y-3 p-2 md:space-y-6 md:p-4 lg:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">Pharmacy Sales Management</h2>
        <Button 
          onClick={handleOpenNewSaleForm}
          disabled={isLoadingFormData}
          className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 py-1 h-9"
        >
          {isLoadingFormData ? 'Loading...' : 'New Sale'}
        </Button>
      </div>

      {/* Quick Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <SalesMetricCard
          title="Total Revenue"
          value={new Intl.NumberFormat('en-KE', { 
            style: 'currency', 
            currency: 'KES',
            maximumFractionDigits: 0
          }).format(salesAnalytics.totalRevenue)}
          icon={<Banknote className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />}
          subValue={`${salesAnalytics.totalSales} sales`}
          colorClass="from-blue-50 to-blue-100 border-blue-200 text-blue-600"
        />
        
        <SalesMetricCard
          title="Average Sale"
          value={new Intl.NumberFormat('en-KE', { 
            style: 'currency', 
            currency: 'KES',
            maximumFractionDigits: 0
          }).format(salesAnalytics.averageSaleValue)}
          icon={<TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />}
          subValue={`${salesAnalytics.totalItems} items`}
          colorClass="from-green-50 to-green-100 border-green-200 text-green-600"
        />
        
        <SalesMetricCard
          title="Paid Sales"
          value={`${salesAnalytics.paidSales}`}
          icon={<Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600" />}
          subValue={salesAnalytics.paidSales > 0 ? ((salesAnalytics.paidSales / salesAnalytics.totalSales) * 100).toFixed(0) + '%' : '0%'}
          colorClass="from-purple-50 to-purple-100 border-purple-200 text-purple-600"
        />
        
        <SalesMetricCard
          title="Pending Sales"
          value={`${salesAnalytics.pendingSales}`}
          icon={<Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600" />}
          subValue={salesAnalytics.pendingSales > 0 ? ((salesAnalytics.pendingSales / salesAnalytics.totalSales) * 100).toFixed(0) + '%' : '0%'}
          colorClass="from-amber-50 to-amber-100 border-amber-200 text-amber-600"
        />
      </div>
      
      {/* Analysis & Navigation Links - Make this scrollable on mobile */}
      <div className="flex overflow-x-auto pb-1 -mx-2 px-2 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 text-[10px] md:text-sm bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700 hover:bg-indigo-200 h-7 md:h-8 px-2 md:px-3"
          onClick={() => router.push('/pharmacy/reports')}
        >
          <BarChart className="h-3 w-3 md:h-4 md:w-4" /> Sales Reports <ChevronRight className="h-2 w-2 md:h-3 md:w-3 ml-1" />
        </Button>
        
        <Button
          variant="outline"
          size="sm" 
          className="flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 text-[10px] md:text-sm bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200 h-7 md:h-8 px-2 md:px-3"
          onClick={() => router.push('/pharmacy/inventory')}
        >
          <Package className="h-3 w-3 md:h-4 md:w-4" /> Inventory Status <ChevronRight className="h-2 w-2 md:h-3 md:w-3 ml-1" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 text-[10px] md:text-sm bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200 h-7 md:h-8 px-2 md:px-3"
          onClick={() => router.push('/pharmacy/top-selling')}
        >
          <TrendingUp className="h-3 w-3 md:h-4 md:w-4" /> Top-Selling Items <ChevronRight className="h-2 w-2 md:h-3 md:w-3 ml-1" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 mr-2 whitespace-nowrap min-w-0 flex items-center gap-1 text-[10px] md:text-sm bg-gradient-to-r from-rose-50 to-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200 h-7 md:h-8 px-2 md:px-3"
          onClick={() => router.push('/pharmacy/profit-analysis')}
        >
          <DollarSign className="h-3 w-3 md:h-4 md:w-4" /> Profit Analysis <ChevronRight className="h-2 w-2 md:h-3 md:w-3 ml-1" />
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-2 sm:p-3 md:p-4 lg:p-6 overflow-hidden">
        <SalesFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          timeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
        />

        {error && <p className="text-red-500 text-xs md:text-sm mt-2">{error}</p>}

        {/* Mobile list view */}
        <div className="md:hidden space-y-2 mt-4">
          {sales.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              No sales found
            </div>
          ) : (
            sales.map((sale) => (
              <SalesListCard<Sale>
                key={sale.id}
                item={sale}
                title={(item: Sale) => item.patient.full_name}
                subtitle={(item: Sale) => format(new Date(item.created_at), 'MMM dd, yyyy')}
                status={{
                  label: sale.payment_status,
                  variant: sale.payment_status === 'paid' ? 'default' : 
                          sale.payment_status === 'pending' ? 'secondary' : 'destructive'
                }}
                lineItems={sale.items.map(item => ({
                  name: item.medication.name,
                  quantity: item.quantity,
                  price: item.unit_price
                }))}
                totalAmount={calculateTotal(sale)}
              />
            ))
          )}
        </div>
        
        {/* Desktop table view */}
        <div className="overflow-auto">
          <SalesTable
            data={sales}
            columns={saleColumns}
            isLoading={loading}
            emptyMessage="No sales found"
          />
        </div>
      </div>

      {/* New Sale Form Dialog */}
      {showNewSaleForm && (
        <div className="fixed inset-0 z-50 bg-white md:bg-black/50 md:p-4 flex items-center justify-center">
          <div className="w-full h-full md:w-auto md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-lg bg-white md:shadow-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-base md:text-lg font-bold">New Sale</h2>
              <Button 
                onClick={() => setShowNewSaleForm(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <NewSaleForm 
                initialPatients={patients}
                initialMedications={medications}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 