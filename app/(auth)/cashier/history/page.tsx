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
  Info,
} from 'lucide-react';
import { fetchPaymentHistory } from '@/lib/authActions';
import { cn } from '@/lib/utils';

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
  const [showDetails, setShowDetails] = useState<string | null>(null);

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

  const toggleDetails = (id: string) => {
    setShowDetails(prev => prev === id ? null : id);
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

  // Mobile payment list card
  const PaymentCard = ({ payment }: { payment: Payment }) => {
    return (
      <div className={cn(
        "p-3 border rounded-lg mb-3",
        payment.type === 'combined' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200',
        showDetails === payment.id ? 'ring-2 ring-blue-300' : ''
      )}>
        <div className="flex justify-between items-start mb-1">
          <div className="font-medium truncate mr-2">{payment.patient_name}</div>
          <div className="text-right">
            <div className="font-semibold text-sm">{formatCurrency(payment.amount)}</div>
            <div className="text-xs text-gray-500">{formatDate(payment.date)}</div>
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <div className="truncate mr-2">{payment.reference}</div>
          <div className="capitalize">{payment.payment_method}</div>
        </div>
        
        <div className="flex mt-2 gap-2">
          {payment.type === 'combined' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleRowExpansion(payment.id)}
              className="text-xs h-7 w-auto flex-1"
            >
              {expandedRows.has(payment.id) ? 'Hide Items' : 'View Items'}
              {expandedRows.has(payment.id) ? 
                <ChevronUp className="h-3 w-3 ml-1" /> : 
                <ChevronDown className="h-3 w-3 ml-1" />
              }
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleDetails(payment.id)}
            className="text-xs h-7 w-auto flex-1"
          >
            Details
            <Info className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        {/* Expanded payment details */}
        {showDetails === payment.id && (
          <div className="text-xs mt-2 p-2 bg-gray-50 rounded-md border border-gray-200 space-y-1">
            <div className="grid grid-cols-2">
              <span className="text-gray-500">Payment ID:</span>
              <span>{payment.id}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-gray-500">Transaction ID:</span>
              <span>{payment.transaction_id || '-'}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-gray-500">Type:</span>
              <span className="capitalize">{payment.type}</span>
            </div>
          </div>
        )}
        
        {/* Expanded items for combined payments */}
        {payment.type === 'combined' && expandedRows.has(payment.id) && payment.related_items && (
          <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
            <div className="text-xs font-medium mb-1">Payment Items:</div>
            {payment.related_items.map((item, index) => (
              <div key={index} className="text-xs py-1 flex justify-between border-t border-gray-100">
                <div className="text-gray-600 truncate mr-2">{item.reference}</div>
                <div>{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <Label htmlFor="search" className="text-sm">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by patient, ref, or transaction ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 sm:h-10 text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="date-filter" className="text-sm">Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger id="date-filter" className="h-8 sm:h-10 text-sm">
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
                <Label htmlFor="type-filter" className="text-sm">Payment Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter" className="h-8 sm:h-10 text-sm">
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
              <>
                {/* Mobile view */}
                <div className="md:hidden space-y-2">
                  {filteredPayments.map((payment) => (
                    <PaymentCard 
                      key={`mobile-${payment.type}-${payment.id}`} 
                      payment={payment} 
                    />
                  ))}
                </div>
              
                {/* Desktop table view */}
                <div className="hidden md:block rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead className="whitespace-nowrap">Patient</TableHead>
                          <TableHead className="whitespace-nowrap">Reference</TableHead>
                          <TableHead className="whitespace-nowrap">Amount</TableHead>
                          <TableHead className="whitespace-nowrap">Method</TableHead>
                          <TableHead className="whitespace-nowrap">Transaction ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <>
                            <TableRow 
                              key={`${payment.type}-${payment.id}`}
                              className={payment.type === 'combined' ? 'bg-blue-50' : ''}
                            >
                              <TableCell className="p-2">
                                {payment.type === 'combined' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleRowExpansion(payment.id)}
                                    className="h-7 w-7"
                                  >
                                    {expandedRows.has(payment.id) ? 
                                      <ChevronUp className="h-4 w-4" /> : 
                                      <ChevronDown className="h-4 w-4" />
                                    }
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="p-2">{formatDate(payment.date)}</TableCell>
                              <TableCell className="p-2">{payment.patient_name}</TableCell>
                              <TableCell className="p-2">{payment.reference}</TableCell>
                              <TableCell className="p-2 font-medium">{formatCurrency(payment.amount)}</TableCell>
                              <TableCell className="p-2 capitalize">{payment.payment_method}</TableCell>
                              <TableCell className="p-2 text-gray-500">{payment.transaction_id || '-'}</TableCell>
                            </TableRow>
                            
                            {/* Expanded details for combined payments */}
                            {payment.type === 'combined' && expandedRows.has(payment.id) && 
                              payment.related_items?.map((item, index) => (
                                <TableRow key={`${payment.id}-item-${index}`} className="bg-gray-50">
                                  <TableCell className="p-2"></TableCell>
                                  <TableCell className="p-2" colSpan={2}></TableCell>
                                  <TableCell className="pl-8 text-sm text-gray-600 p-2">
                                    {item.reference}
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600 p-2">
                                    {formatCurrency(item.amount)}
                                  </TableCell>
                                  <TableCell className="p-2" colSpan={2}></TableCell>
                                </TableRow>
                              ))
                            }
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 sm:py-10">
                <p className="text-gray-500 text-sm sm:text-base">No payments found matching your filters</p>
                <Button 
                  variant="outline" 
                  className="mt-4 text-sm h-8 sm:h-10"
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
                className="text-sm h-8 sm:h-10"
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