'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { fetchPaymentHistory } from '@/lib/authActions';

// Payment type definitions
type PaymentType = 'appointment' | 'sale' | 'combined';

interface Payment {
  id: string;
  type: PaymentType;
  patient_name: string;
  amount: number;
  date: string;
  payment_method: string;
  transaction_id: string | null;
  reference: string;
  related_items?: Array<{
    id: string;
    type: 'appointment' | 'sale';
    reference: string;
    amount: number;
  }>;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      const paymentData = await fetchPaymentHistory();
      setPayments(paymentData);
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getFilteredPayments = () => {
    return payments.filter(payment => {
      // Filter by search query
      const matchesSearch = 
        payment.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (payment.transaction_id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        // Also search in related items
        (payment.related_items?.some(item => 
          item.reference.toLowerCase().includes(searchQuery.toLowerCase())
        ) || false);
      
      // Filter by date
      let matchesDate = true;
      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        matchesDate = payment.date.includes(today);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = new Date(payment.date) >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = new Date(payment.date) >= monthAgo;
      }
      
      // Filter by type
      let matchesType = typeFilter === 'all';
      if (typeFilter === 'appointment') {
        matchesType = payment.type === 'appointment' || 
          (payment.type === 'combined' && payment.related_items?.some(item => item.type === 'appointment') || false);
      } else if (typeFilter === 'sale') {
        matchesType = payment.type === 'sale' ||
          (payment.type === 'combined' && payment.related_items?.some(item => item.type === 'sale') || false);
      }
      
      return matchesSearch && matchesDate && matchesType;
    });
  };

  const filteredPayments = getFilteredPayments();
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by patient, ref, or transaction ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="date-filter">Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger id="date-filter">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="type-filter">Payment Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="appointment">Appointments</SelectItem>
                    <SelectItem value="sale">Pharmacy Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Payment history table */}
            {loading ? (
              <div className="text-center py-10">Loading payment history...</div>
            ) : filteredPayments.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <>
                        <TableRow 
                          key={`${payment.type}-${payment.id}`}
                          className={payment.type === 'combined' ? 'bg-blue-50' : ''}
                        >
                          <TableCell className="w-10">
                            {payment.type === 'combined' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleRowExpansion(payment.id)}
                                className="h-8 w-8"
                              >
                                {expandedRows.has(payment.id) ? 
                                  <ChevronUp className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />
                                }
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                          <TableCell>{payment.patient_name}</TableCell>
                          <TableCell>{payment.reference}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell className="capitalize">{payment.payment_method}</TableCell>
                          <TableCell>{payment.transaction_id || '-'}</TableCell>
                        </TableRow>
                        
                        {/* Expanded details for combined payments */}
                        {payment.type === 'combined' && expandedRows.has(payment.id) && 
                          payment.related_items?.map((item, index) => (
                            <TableRow key={`${payment.id}-item-${index}`} className="bg-gray-50">
                              <TableCell></TableCell>
                              <TableCell colSpan={2}></TableCell>
                              <TableCell className="pl-8 text-sm text-gray-600">
                                {item.reference}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {formatCurrency(item.amount)}
                              </TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          ))
                        }
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No payments found matching your filters</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('all');
                    setTypeFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
            
            <div className="mt-4 text-right">
              <Button 
                onClick={loadPaymentHistory}
                variant="outline"
              >
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 