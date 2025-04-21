'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { fetchSales, generateReceipt } from '@/lib/authActions';
import { Download, Eye, BarChart, Banknote, TrendingUp, ChevronRight, Activity, Clock, Package, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import NewSaleForm from './NewSaleForm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function SalesManager() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string | null>(null);
  const [showNewSaleForm, setShowNewSaleForm] = useState(false);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics>({
    totalRevenue: 0,
    totalSales: 0,
    paidSales: 0,
    pendingSales: 0,
    totalItems: 0,
    averageSaleValue: 0
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  // Fetch sales data when component mounts or filters change
  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate, searchTerm]);

  async function fetchSalesData() {
    try {
      setLoading(true);
      const data = await fetchSales();
      setSales(data as unknown as Sale[]);
      calculateAnalytics(data as unknown as Sale[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching sales');
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calculates analytics from sales data
   */
  function calculateAnalytics(salesData: Sale[]) {
    // Filter by date range if applicable
    let filteredSales = salesData;
    if (startDate && endDate) {
      filteredSales = salesData.filter(sale => {
        const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
        return saleDate >= startDate && saleDate <= endDate;
      });
    }

    // Calculate totals
    const totalRevenue = filteredSales.reduce((sum, sale) => 
      sum + calculateTotal(sale), 0);
    
    const totalItems = filteredSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    const paidSales = filteredSales.filter(sale => 
      sale.payment_status === 'paid').length;
    
    const pendingSales = filteredSales.filter(sale => 
      sale.payment_status === 'pending').length;
    
    setSalesAnalytics({
      totalRevenue,
      totalSales: filteredSales.length,
      paidSales,
      pendingSales,
      totalItems,
      averageSaleValue: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0
    });
  }

  /**
   * Calculates the total amount for a sale
   */
  function calculateTotal(sale: Sale): number {
    return sale.items.reduce((total, item) => total + item.total_price, 0);
  }

  /**
   * Gets the appropriate badge variant for payment status
   */
  function getPaymentStatusVariant(status: string) {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'refunded':
        return 'destructive';
      default:
        return 'default';
    }
  }

  const handleViewReceipt = async (saleId: string) => {
    try {
      const receipt = await generateReceipt(saleId);
      setReceiptContent(receipt);
      setShowReceipt(true);
    } catch (error) {
      toast.error('Failed to generate receipt');
      console.error('Error generating receipt:', error);
    }
  };

  const downloadReceipt = (receiptText: string) => {
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Set date filter based on timeframe
  const setTimeframe = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    const today = new Date().toISOString().split('T')[0];
    
    switch (timeframe) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'week':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setStartDate(weekAgo);
        setEndDate(today);
        break;
      case 'month':
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setStartDate(monthAgo);
        setEndDate(today);
        break;
      case 'all':
      default:
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Sales Management</h2>
        <Button 
          onClick={() => setShowNewSaleForm(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
        >
          New Sale
        </Button>
      </div>

      {/* Quick Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
          <CardContent className="p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-blue-600">Total Revenue</p>
              <Banknote className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(salesAnalytics.totalRevenue)}</p>
            <p className="text-xs text-blue-600 mt-1">{salesAnalytics.totalSales} total sales</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
          <CardContent className="p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-green-600">Average Sale</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(salesAnalytics.averageSaleValue)}</p>
            <p className="text-xs text-green-600 mt-1">{salesAnalytics.totalItems} items sold</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardContent className="p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-purple-600">Paid Sales</p>
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">{salesAnalytics.paidSales}</p>
            <p className="text-xs text-purple-600 mt-1">{salesAnalytics.paidSales > 0 ? ((salesAnalytics.paidSales / salesAnalytics.totalSales) * 100).toFixed(1) + '%' : '0%'} of total</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm">
          <CardContent className="p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-amber-600">Pending Sales</p>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold">{salesAnalytics.pendingSales}</p>
            <p className="text-xs text-amber-600 mt-1">{salesAnalytics.pendingSales > 0 ? ((salesAnalytics.pendingSales / salesAnalytics.totalSales) * 100).toFixed(1) + '%' : '0%'} of total</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Analysis & Navigation Links */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700 hover:bg-indigo-200"
          onClick={() => router.push('/pharmacy/reports')}
        >
          <BarChart className="h-4 w-4" /> Sales Reports <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
        
        <Button
          variant="outline"
          size="sm" 
          className="flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200"
          onClick={() => router.push('/pharmacy/inventory')}
        >
          <Package className="h-4 w-4" /> Inventory Status <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200"
          onClick={() => router.push('/pharmacy/top-selling')}
        >
          <TrendingUp className="h-4 w-4" /> Top-Selling Items <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-gradient-to-r from-rose-50 to-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200"
          onClick={() => router.push('/pharmacy/profit-analysis')}
        >
          <DollarSign className="h-4 w-4" /> Profit Analysis <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
        <Tabs 
          defaultValue="all"
          value={selectedTimeframe}
          onValueChange={setTimeframe}
          className="mb-4"
        >
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search sales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
          />
        </div>

        {error && <p className="text-red-500">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading sales...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="hidden sm:table-cell">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="hidden sm:table-cell">
                      {format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sale.patient.full_name}</div>
                        <div className="text-sm text-gray-500">
                          {sale.patient.phone_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      KSh {calculateTotal(sale).toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {sale.payment_method}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusVariant(sale.payment_status)}>
                        {sale.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewReceipt(sale.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {receiptContent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadReceipt(receiptContent)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showNewSaleForm && (
        <NewSaleForm 
          initialPatients={[]}
          initialMedications={[]}
        />
      )}

      {/* Receipt Dialog */}
      {showReceipt && receiptContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">Receipt</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReceipt(receiptContent)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReceipt(false);
                    setReceiptContent(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {receiptContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 