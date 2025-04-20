'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

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

  // Fetch sales data when component mounts or filters change
  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate, searchTerm]);

  async function fetchSalesData() {
    try {
      setLoading(true);
      const data = await fetchSales();
      setSales(data as unknown as Sale[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching sales');
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
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
      const receipt = await generateReceipt({ saleId });
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Sales Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="max-w-[200px]"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="max-w-[200px]"
            />
            <Input
              placeholder="Search by patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => router.push('/pharmacy/sales/new')}>
              New Sale
            </Button>
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
        </CardContent>
      </Card>

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