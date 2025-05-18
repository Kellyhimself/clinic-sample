'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
  Search,
} from 'lucide-react';
import { fetchPaymentHistory } from '@/lib/cashier';
import { cn } from '@/lib/utils';
import React from 'react';

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
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isSmallMediumMobile, setIsSmallMediumMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);

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
        "p-3 border rounded-lg mb-3 bg-white/80 backdrop-blur-sm",
        payment.type === 'combined' ? 'bg-blue-50 border-blue-200' : 'border-gray-200',
        showDetails === payment.id ? 'ring-2 ring-blue-300' : ''
      )}>
        <div className="flex justify-between items-start mb-1">
          <div className={`font-medium truncate mr-2 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''}`}>
            {payment.patient_name}
          </div>
          <div className="text-right">
            <div className={`font-semibold ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`}>
              {formatCurrency(payment.amount)}
            </div>
            <div className={`text-gray-500 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs'}`}>
              {formatDate(payment.date)}
            </div>
          </div>
        </div>
        
        <div className={`flex justify-between text-gray-500 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs'}`}>
          <div className="truncate mr-2">{payment.reference}</div>
          <div className="capitalize">{payment.payment_method}</div>
        </div>
        
        <div className="flex mt-2 gap-2">
          {payment.type === 'combined' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleRowExpansion(payment.id)}
              className={`${isNarrowMobile ? 'pharmacy-button-xs' : isSmallMediumMobile ? 'pharmacy-button-xsm' : isMediumMobile ? 'pharmacy-button-sm' : 'text-xs h-7'} w-auto flex-1 border-gray-300 hover:bg-blue-50`}
            >
              {expandedRows.has(payment.id) ? 'Hide Items' : 'View Items'}
              {expandedRows.has(payment.id) ? 
                <ChevronUp className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3 w-3'} ml-1`} /> : 
                <ChevronDown className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3 w-3'} ml-1`} />
              }
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleDetails(payment.id)}
            className={`${isNarrowMobile ? 'pharmacy-button-xs' : isSmallMediumMobile ? 'pharmacy-button-xsm' : isMediumMobile ? 'pharmacy-button-sm' : 'text-xs h-7'} w-auto flex-1 border-gray-300 hover:bg-blue-50`}
          >
            Details
            <Info className={`${isNarrowMobile ? 'pharmacy-icon-xs' : isSmallMediumMobile ? 'pharmacy-icon-xsm' : isMediumMobile ? 'pharmacy-icon-sm' : 'h-3 w-3'} ml-1`} />
          </Button>
        </div>
        
        {/* Expanded payment details */}
        {showDetails === payment.id && (
          <div className={`mt-2 p-2 bg-gray-50 rounded-md border border-gray-200 space-y-1 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs'}`}>
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
          <div className={`mt-2 p-2 bg-gray-50 rounded-md border border-gray-200 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-xs'}`}>
            <div className="font-medium mb-1">Payment Items:</div>
            {payment.related_items.map((item, index) => (
              <div key={index} className="py-1 flex justify-between border-t border-gray-100">
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
    <div className="inventory-container min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50">
      <Card className="shadow-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2 sm:pb-4 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-t-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
            <div>
              <CardTitle className={`${isNarrowMobile ? 'xs-heading' : isSmallMediumMobile ? 'xsm-heading' : isMediumMobile ? 'sm-heading' : 'text-xl md:text-2xl'} font-bold text-gray-800 leading-tight`}>
                Payment History
              </CardTitle>
              <CardDescription className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm sm:text-base'} text-gray-600`}>
                View and manage payment records for appointments and pharmacy sales
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className={`${isNarrowMobile ? 'xs-padding' : isSmallMediumMobile ? 'xsm-padding xsm-filter-container' : isMediumMobile ? 'sm-padding' : 'p-2 md:p-4'} border-b flex flex-col sm:flex-row gap-2 md:gap-4 bg-gradient-to-r from-gray-50 to-blue-50/50`}>
            <div className="relative flex-1">
              <Search className={`absolute left-2 top-2.5 ${isNarrowMobile ? 'h-3 w-3' : isSmallMediumMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-gray-400`} />
              <Input
                placeholder={isNarrowMobile || isSmallMediumMobile ? "Search..." : "Search by patient, ref, or transaction ID"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 ${isNarrowMobile ? 'h-7 xs-text' : isSmallMediumMobile ? 'h-7 xsm-text' : 'h-8 text-xs'} border-gray-300 focus:border-blue-500 bg-white/80 backdrop-blur-sm`}
              />
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className={`w-full sm:w-[180px] ${isNarrowMobile ? 'h-7 xs-text' : isSmallMediumMobile ? 'h-7 xsm-text xsm-filter-dropdown' : 'h-8 text-xs'} border-gray-300 focus:border-blue-500 bg-white/80 backdrop-blur-sm`}>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>All Time</SelectItem>
                <SelectItem value="today" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>Today</SelectItem>
                <SelectItem value="week" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>Last 7 Days</SelectItem>
                <SelectItem value="month" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className={`w-full sm:w-[180px] ${isNarrowMobile ? 'h-7 xs-text' : isSmallMediumMobile ? 'h-7 xsm-text xsm-filter-dropdown' : 'h-8 text-xs'} border-gray-300 focus:border-blue-500 bg-white/80 backdrop-blur-sm`}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>All Types</SelectItem>
                <SelectItem value="appointment" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>Appointments</SelectItem>
                <SelectItem value="sale" className={isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : ''}>Pharmacy Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Payment history table */}
          {loading ? (
            <div className={`text-center py-10 ${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : ''} text-gray-600`}>
              Loading payment history...
            </div>
          ) : filteredPayments.length > 0 ? (
            <>
              {/* Mobile view */}
              <div className="md:hidden space-y-2 p-2 bg-gradient-to-br from-gray-50 to-blue-50/30">
                {filteredPayments.map((payment) => (
                  <PaymentCard 
                    key={`mobile-${payment.type}-${payment.id}`} 
                    payment={payment} 
                  />
                ))}
              </div>
            
              {/* Desktop table view */}
              <div className="hidden md:block rounded-md border overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50/30">
                <div className="overflow-x-auto">
                  <Table className={`${isMediumMobile ? 'inventory-table-mobile' : 'mobile-table mobile-table-compact'} bg-white/80 backdrop-blur-sm`}>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-500/10 to-teal-500/10">
                        <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                          Date
                        </TableHead>
                        <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                          Patient
                        </TableHead>
                        <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                          Reference
                        </TableHead>
                        <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                          Amount
                        </TableHead>
                        <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                          Method
                        </TableHead>
                        <TableHead className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} font-medium text-gray-700 mobile-table-cell`}>
                          Transaction ID
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <React.Fragment key={`payment-${payment.id}`}>
                          <TableRow 
                            className={payment.type === 'combined' ? 'bg-blue-50' : 'hover:bg-blue-50/50 transition-colors'}
                          >
                            <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} p-2`}>
                              {formatDate(payment.date)}
                            </TableCell>
                            <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} p-2`}>
                              {payment.patient_name}
                            </TableCell>
                            <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} p-2`}>
                              {payment.reference}
                            </TableCell>
                            <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} p-2 font-medium`}>
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} p-2 capitalize`}>
                              {payment.payment_method}
                            </TableCell>
                            <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} p-2 text-gray-500`}>
                              {payment.transaction_id || '-'}
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded details for combined payments */}
                          {payment.type === 'combined' && expandedRows.has(payment.id) && 
                            payment.related_items?.map((item, index) => (
                              <TableRow key={`${payment.id}-item-${index}`} className="bg-gray-50">
                                <TableCell className="p-2" colSpan={3}></TableCell>
                                <TableCell className={`pl-8 ${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} text-gray-600 p-2`}>
                                  {item.reference}
                                </TableCell>
                                <TableCell className={`${isMediumMobile ? 'sm-text' : 'mobile-text-xs text-xs md:text-sm'} text-gray-600 p-2`}>
                                  {formatCurrency(item.amount)}
                                </TableCell>
                                <TableCell className="p-2"></TableCell>
                              </TableRow>
                            ))
                          }
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 sm:py-10">
              <p className={`${isNarrowMobile ? 'xs-text' : isSmallMediumMobile ? 'xsm-text' : isMediumMobile ? 'sm-text' : 'text-sm sm:text-base'} text-gray-500`}>
                No payments found matching your filters
              </p>
              <Button 
                variant="outline" 
                className={`mt-4 ${isNarrowMobile ? 'pharmacy-button-xs' : isSmallMediumMobile ? 'pharmacy-button-xsm' : isMediumMobile ? 'pharmacy-button-sm' : 'text-sm h-8 sm:h-10'} border-gray-300 hover:bg-blue-50`}
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
              className={`${isNarrowMobile ? 'pharmacy-button-xs' : isSmallMediumMobile ? 'pharmacy-button-xsm' : isMediumMobile ? 'pharmacy-button-sm' : 'text-sm h-8 sm:h-10'} border-gray-300 hover:bg-blue-50`}
            >
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 