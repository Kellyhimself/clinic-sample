"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { generateReceipt, processMpesaPayment, processCashPayment } from '@/lib/cashier';
import type { Appointment } from '@/types/supabase';
import type { AppointmentWithDetails } from '@/types/appointments';
import type { Patient } from '@/types/supabase';
import { getUnpaidItemsForPatient } from '@/lib/actions/cashier';

interface SaleItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_id: string;
  medication_id: string;
  sale_id: string;
  created_at: string;
  medication?: {
    id: string;
    name: string;
    dosage_form: string;
    strength: string;
  };
  batch?: {
    batch_number: string;
    expiry_date: string;
  };
}

interface ExtendedSale {
  id: string;
  patient_id?: string;
  guest_patient_id?: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  created_by: string;
  payment_method: string;
  transaction_id: string;
  updated_at: string;
  tenant_id: string | null;
  patient?: {
    full_name: string;
    phone_number: string | null;
  };
  sale_items?: SaleItem[];
}

interface ExtendedAppointment extends AppointmentWithDetails {
  service: {
    name: string;
    price: number;
    duration: number;
  };
}

interface CashierFormProps {
  initialPatients: Patient[];
  initialUnpaidItems: {
    appointments: ExtendedAppointment[];
    sales: ExtendedSale[];
  };
}

export default function CashierForm({ 
  initialPatients = [], 
  initialUnpaidItems = { appointments: [], sales: [] } 
}: CashierFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [unpaidAppointments, setUnpaidAppointments] = useState<ExtendedAppointment[]>(initialUnpaidItems.appointments);
  const [unpaidSales, setUnpaidSales] = useState<ExtendedSale[]>(initialUnpaidItems.sales);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(initialPatients);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Filter patients based on search query
  useEffect(() => {
    if (!initialPatients) {
      setFilteredPatients([]);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setFilteredPatients(initialPatients);
      return;
    }

    const filtered = initialPatients.filter(patient => {
      const nameMatch = patient.full_name?.toLowerCase().includes(query);
      const phoneMatch = patient.phone_number?.toLowerCase().includes(query);
      return nameMatch || phoneMatch;
    });
    setFilteredPatients(filtered);
  }, [searchQuery, initialPatients]);

  // Update unpaid items when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      const patientUnpaidItems = {
        appointments: initialUnpaidItems.appointments.filter(app => app.patient_id === selectedPatient.id),
        sales: initialUnpaidItems.sales.filter(sale => 
          sale.patient_id === selectedPatient.id || sale.guest_patient_id === selectedPatient.id
        )
      };
      setUnpaidAppointments(patientUnpaidItems.appointments);
      setUnpaidSales(patientUnpaidItems.sales);
    } else {
      setUnpaidAppointments([]);
      setUnpaidSales([]);
    }
  }, [selectedPatient, initialUnpaidItems]);

  const calculateTotals = () => {
    console.log('Calculating totals with:', {
      appointments: unpaidAppointments,
      sales: unpaidSales
    });

    const appointmentsTotal = unpaidAppointments.reduce((sum, app) => {
      const price = app.service?.price || 0;
     
      return sum + price;
    }, 0);
    
    const salesTotal = unpaidSales.reduce((sum, sale) => {
      // If sale_items is not available, use total_amount
      if (!sale.sale_items || sale.sale_items.length === 0) {
         return sum + (sale.total_amount || 0);
      }

      // Calculate from sale items
      const saleTotal = sale.sale_items.reduce((itemSum, item) => {
        const itemTotal = item.quantity * item.unit_price;
       return itemSum + itemTotal;
      }, 0);
       return sum + saleTotal;
    }, 0);

    

    return {
      appointmentsTotal,
      salesTotal,
      grandTotal: appointmentsTotal + salesTotal
    };
  };

  const formatPhoneNumber = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.startsWith('254')) {
      return digitsOnly;
    } else if (digitsOnly.startsWith('0')) {
      return `254${digitsOnly.substring(1)}`;
    } else if (digitsOnly.startsWith('7') || digitsOnly.startsWith('1')) {
      return `254${digitsOnly}`;
    }
    
    return digitsOnly;
  };

  const handlePayment = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    setIsProcessing(true);
    try {
      if (selectedPaymentMethod === 'mpesa') {
        const formattedPhoneNumber = formatPhoneNumber(selectedPatient.phone_number || '');
        
        if (!formattedPhoneNumber || formattedPhoneNumber.length < 10) {
          toast.error('Invalid phone number. Please update patient details with a valid phone number.');
          setIsProcessing(false);
          return;
        }

        // Process M-Pesa payments
        for (const appointment of unpaidAppointments) {
          const formData = new FormData();
          formData.append('id', appointment.id);
          formData.append('type', 'appointment');
          formData.append('amount', appointment.service?.price?.toString() || '0');
          formData.append('phone', formattedPhoneNumber);
          
          await processMpesaPayment(formData);
        }

        for (const sale of unpaidSales) {
          const formData = new FormData();
          formData.append('id', sale.id);
          formData.append('type', 'sale');
          formData.append('amount', sale.total_amount.toString());
          formData.append('phone', formattedPhoneNumber);
          
          await processMpesaPayment(formData);
        }
      } else if (selectedPaymentMethod === 'cash') {
        // Process cash payments
        for (const appointment of unpaidAppointments) {
          const formData = new FormData();
          formData.append('id', appointment.id);
          formData.append('type', 'appointment');
          
          await processCashPayment(formData);
        }

        for (const sale of unpaidSales) {
          const formData = new FormData();
          formData.append('id', sale.id);
          formData.append('type', 'sale');
          
          await processCashPayment(formData);
        }
      }

      // Calculate totals for receipt
      const appointmentsTotal = unpaidAppointments.reduce((sum, app) => {
        return sum + (app.service?.price || 0);
      }, 0);

      const salesTotal = unpaidSales.reduce((sum, sale) => {
        if (!sale.sale_items || sale.sale_items.length === 0) {
          return sum + (sale.total_amount || 0);
        }
        return sum + sale.sale_items.reduce((itemSum, item) => {
          return itemSum + (item.quantity * item.unit_price);
        }, 0);
      }, 0);

      // Generate and show receipt
      const receipt = `
==========================================
           PHARMACY RECEIPT
==========================================
Date: ${new Date().toLocaleString()}
Receipt #: ${unpaidSales[0]?.id || 'N/A'}
Payment Method: ${selectedPaymentMethod.toUpperCase()}
Payment Status: PAID
------------------------------------------
ITEMS:
${unpaidSales.map((sale, index) => `
${index + 1}. ${sale.sale_items?.map(item => `
   ${item.medication?.name || 'Unknown Medication'}
   Batch: ${item.batch?.batch_number || 'N/A'}
   Quantity: ${item.quantity} x ${item.unit_price.toFixed(2)}
   Subtotal: ${item.total_price.toFixed(2)}
`).join('\n') || `Total Amount: ${sale.total_amount.toFixed(2)}`}
`).join('\n')}
------------------------------------------
TOTAL AMOUNT: ${grandTotal.toFixed(2)}
==========================================
Thank you for your business!
==========================================
`;

      setReceiptContent(receipt);
      setShowReceipt(true);
      toast.success('Payment processed successfully');
      
      // Clear the form
      setSelectedPatient(null);
      setSearchQuery('');
      setUnpaidAppointments([]);
      setUnpaidSales([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePatientSelect = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.full_name);
    setUnpaidAppointments([]);
    setUnpaidSales([]);
    setIsLoadingItems(true);

    try {
      const result = await getUnpaidItemsForPatient(patient.id);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch unpaid items');
      }

      
      // Transform appointments to match ExtendedAppointment type
      const transformedAppointments = result.data.appointments.map(app => ({
        ...app,
        created_at: app.created_at || new Date().toISOString(),
        updated_at: app.updated_at || new Date().toISOString(),
        service: app.service || { name: '', price: 0, duration: 0 }
      }));

      // Transform sales to match ExtendedSale type
      const transformedSales = result.data.sales.map(sale => ({
        ...sale,
        patient_id: sale.patient_id || undefined,
        guest_patient_id: sale.guest_patient_id || undefined,
        sale_items: sale.sale_items?.map(item => ({
          ...item,
          medication: item.medication || undefined,
          batch: item.batch || undefined
        }))
      }));

          // Update the state with the transformed data
      setUnpaidAppointments(transformedAppointments as ExtendedAppointment[]);
      setUnpaidSales(transformedSales as ExtendedSale[]);

      
      } catch (error) {
      console.error('Error fetching unpaid items:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch unpaid items');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const { appointmentsTotal, salesTotal, grandTotal } = calculateTotals();


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-xl sm:text-2xl">Cashier Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Patient Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Patient</Label>
                  <Input
                    type="text"
                    placeholder="Search by name, email, or phone"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                  />
                  
                  <div className="max-h-[300px] overflow-y-auto mt-1 sm:mt-2">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`p-1 border rounded-lg mb-0.5 cursor-pointer hover:bg-blue-50 flex flex-col ${
                            selectedPatient?.id === patient.id ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' : ''
                          }`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="font-medium text-xs">{patient.full_name}</div>
                          <div className="text-[10px] text-gray-500">
                            {patient.patient_type === 'guest' && <span className="bg-amber-100 text-amber-800 px-1 rounded-sm mr-1">Guest</span>}
                            {patient.phone_number || 'No phone'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-[11px] text-gray-500 italic p-4 border rounded-lg border-dashed">
                        No patients found matching &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedPatient && (
                  <div className="space-y-1 sm:space-y-2">
                    <h3 className="font-medium text-sm sm:text-base">Patient Details</h3>
                    <div className="text-xs sm:text-sm p-1.5 sm:p-2 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                      <p>Name: {selectedPatient.full_name}</p>
                      <p>Phone: {selectedPatient.phone_number}</p>
                      <p>Email: {selectedPatient.email}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Payment Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Payment Method</Label>
                  <Select
                    value={selectedPaymentMethod}
                    onValueChange={(value: 'cash' | 'mpesa') => setSelectedPaymentMethod(value)}
                  >
                    <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {selectedPaymentMethod === 'mpesa' && selectedPatient && (
                    <div className="text-xs sm:text-sm text-amber-600 mt-1">
                      <p>M-Pesa will be sent to: {formatPhoneNumber(selectedPatient.phone_number || '')}</p>
                      {!formatPhoneNumber(selectedPatient.phone_number || '').match(/^254\d{9,10}$/) && (
                        <p className="font-medium text-red-500 mt-1">
                          Warning: Phone number appears to be invalid for M-Pesa. Please update patient details.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm sm:text-base">Payment Summary</h3>
                  <div className="text-xs sm:text-sm space-y-1 p-1.5 sm:p-2 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    {isLoadingItems ? (
                      <div className="flex items-center justify-center space-x-2 py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-blue-600">Loading payment details...</span>
                      </div>
                    ) : (
                      <>
                        <p>Services Total Cost: KSh {appointmentsTotal.toFixed(2)}</p>
                        <p>Medication Total Cost: KSh {salesTotal.toFixed(2)}</p>
                        {(appointmentsTotal > 0 || salesTotal > 0) ? (
                          <p className="font-semibold">Grand Total: KSh {grandTotal.toFixed(2)}</p>
                        ) : (
                          <p className="text-gray-500 italic">No unpaid items found</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={!selectedPatient || isProcessing || grandTotal === 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 text-sm sm:text-base py-1.5 sm:py-2"
                >
                  {isProcessing ? 'Processing...' : 'Process Payment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showReceipt && receiptContent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm sm:max-w-2xl max-h-[90vh] overflow-auto">
              <div className="p-3 sm:p-4 border-b flex justify-between items-center">
                <h2 className="text-base sm:text-lg font-semibold">Payment Receipt</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowReceipt(false);
                    setReceiptContent(null);
                  }}
                  className="h-8 w-8 sm:h-10 sm:w-10 p-0"
                >
                  Close
                </Button>
              </div>
              <div className="p-3 sm:p-4">
                <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm">
                  {receiptContent}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 