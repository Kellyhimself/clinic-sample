'use client';

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
import { createClient } from '@supabase/supabase-js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { generateReceipt, processMpesaPayment, processCashPayment } from '@/lib/authActions';
import type { Patient, UnpaidAppointment, Sale, SaleItem } from '@/types/supabase';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function CashierPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [unpaidAppointments, setUnpaidAppointments] = useState<UnpaidAppointment[]>([]);
  const [unpaidSales, setUnpaidSales] = useState<Sale[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'insurance'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string | null>(null);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);

  // Fetch patient details when search query changes
  useEffect(() => {
    const fetchPatients = async () => {
      if (searchQuery.trim()) {
        const { data: patients, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) {
          console.error('Error fetching patients:', error);
          return;
        }

        setFilteredPatients(patients || []);
      } else {
        setFilteredPatients([]);
      }
    };

    fetchPatients();
  }, [searchQuery]);

  // Fetch unpaid appointments and sales when patient is selected
  useEffect(() => {
    const fetchUnpaidItems = async () => {
      if (selectedPatient) {
        try {
          // Fetch unpaid appointments
          const { data: appointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select(`
              id,
              date,
              time,
              status,
              payment_status,
              services:service_id (
                id,
                name,
                price
              )
            `)
            .eq('patient_id', selectedPatient.id)
            .eq('status', 'confirmed')
            .eq('payment_status', 'unpaid');

          if (appointmentsError) {
            console.error('Error fetching appointments:', appointmentsError);
            toast.error('Failed to fetch appointments');
            setUnpaidAppointments([]);
          } else {
            const transformedAppointments = appointments?.map(app => ({
              id: app.id,
              date: app.date,
              time: app.time,
              services: app.services ? {
                name: app.services.name,
                price: app.services.price
              } : null,
              payment_status: app.payment_status as 'unpaid' | 'paid' | 'refunded' | null
            })) || [];
            setUnpaidAppointments(transformedAppointments);
          }

          // Fetch unpaid sales
          const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select(`
              id,
              patient_id,
              payment_status,
              total_amount,
              created_at,
              created_by,
              payment_method,
              transaction_id,
              updated_at,
              patient:patients!sales_patient_id_fkey (
                full_name,
                phone_number
              ),
              sale_items!sale_items_sale_id_fkey (
                id,
                quantity,
                unit_price,
                total_price,
                batch_id,
                medication_id,
                sale_id,
                created_at,
                medication:medications!sale_items_medication_id_fkey (
                  id,
                  name,
                  dosage_form,
                  strength
                ),
                batch:medication_batches!sale_items_batch_id_fkey (
                  batch_number,
                  expiry_date
                )
              )
            `)
            .eq('patient_id', selectedPatient.id)
            .eq('payment_status', 'unpaid');

          if (salesError) {
            console.error('Error fetching sales:', salesError);
            toast.error('Failed to fetch sales');
            setUnpaidSales([]);
          } else {
            const transformedSales = sales?.map(sale => ({
              id: sale.id,
              patient_id: sale.patient_id,
              payment_status: sale.payment_status,
              total_amount: sale.total_amount,
              created_at: sale.created_at,
              created_by: sale.created_by,
              payment_method: sale.payment_method,
              transaction_id: sale.transaction_id,
              updated_at: sale.updated_at,
              patient: sale.patient ? {
                full_name: sale.patient.full_name,
                phone_number: sale.patient.phone_number
              } : undefined,
              items: sale.sale_items?.map(item => ({
                id: item.id,
                batch_id: item.batch_id,
                medication_id: item.medication_id,
                sale_id: item.sale_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                created_at: item.created_at,
                medication: item.medication ? {
                  id: item.medication.id,
                  name: item.medication.name,
                  dosage_form: item.medication.dosage_form,
                  strength: item.medication.strength
                } : null,
                batch: item.batch ? {
                  batch_number: item.batch.batch_number,
                  expiry_date: item.batch.expiry_date
                } : null
              })) || []
            })) || [];
            setUnpaidSales(transformedSales);
          }
        } catch (error) {
          console.error('Unexpected error during data fetching:', error);
          toast.error('An unexpected error occurred');
          setUnpaidAppointments([]);
          setUnpaidSales([]);
        }
      }
    };

    fetchUnpaidItems();
  }, [selectedPatient]);

  const calculateTotals = () => {
    const appointmentsTotal = unpaidAppointments.reduce((sum, app) => 
      sum + (app.services?.price || 0), 0);
    
    const salesTotal = unpaidSales.reduce((sum, sale) => 
      sum + (sale.items?.reduce((itemSum, item) => 
        itemSum + (item.quantity * item.unit_price), 0) || 0), 0);

    return {
      appointmentsTotal,
      salesTotal,
      grandTotal: appointmentsTotal + salesTotal
    };
  };

  // Format phone number to match M-Pesa requirements
  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digitsOnly.startsWith('254')) {
      // Already in international format
      return digitsOnly;
    } else if (digitsOnly.startsWith('0')) {
      // Convert 07XXXXXXXX to 2547XXXXXXXX
      return `254${digitsOnly.substring(1)}`;
    } else if (digitsOnly.startsWith('7') || digitsOnly.startsWith('1')) {
      // For numbers starting with 7 or 1, add 254 prefix
      return `254${digitsOnly}`;
    }
    
    // If none of the above, assume it's a full number with country code
    return digitsOnly;
  };

  const handlePayment = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    setIsProcessing(true);
    try {
      if (paymentMethod === 'mpesa') {
        // Format the phone number before processing M-Pesa payment
        const formattedPhoneNumber = formatPhoneNumber(selectedPatient.phone_number || '');
        
        if (!formattedPhoneNumber || formattedPhoneNumber.length < 10) {
          toast.error('Invalid phone number. Please update patient details with a valid phone number.');
          setIsProcessing(false);
          return;
        }

        // Process M-Pesa payment for all items
        for (const appointment of unpaidAppointments) {
          const formData = new FormData();
          formData.append('id', appointment.id);
          formData.append('type', 'appointment');
          formData.append('amount', appointment.services?.price?.toString() || '0');
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
      } else if (paymentMethod === 'cash') {
        // Process cash payment for all items
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
      } else if (paymentMethod === 'insurance') {
        // Handle insurance payment
        // This would need to be implemented based on your insurance requirements
        toast.info('Insurance payment processing to be implemented');
        return;
      }

      // Generate and show receipt
      const receipt = await generateReceipt({
        patientId: selectedPatient.id,
        appointments: unpaidAppointments,
        sales: unpaidSales
      });
      
      setReceiptContent(receipt);
      setShowReceipt(true);
      toast.success('Payment processed successfully');
      
      // Clear the form
      setSelectedPatient(null);
      setSearchQuery('');
      setUnpaidAppointments([]);
      setUnpaidSales([]);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.full_name);
  };

  const { appointmentsTotal, salesTotal, grandTotal } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cashier Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient Search */}
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
                  
                  {/* Display Patient Search Results */}
                  {filteredPatients.length > 0 && (
                    <div className="max-h-[150px] overflow-y-auto mt-2">
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`p-2 border rounded-lg mb-1 cursor-pointer hover:bg-blue-50 flex flex-col ${
                            selectedPatient?.id === patient.id ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' : ''
                          }`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="font-medium">{patient.full_name}</div>
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>{patient.email}</span>
                            <span>{patient.phone_number}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedPatient && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Patient Details</h3>
                    <div className="text-sm p-2 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                      <p>Name: {selectedPatient.full_name}</p>
                      <p>Phone: {selectedPatient.phone_number}</p>
                      <p>Email: {selectedPatient.email}</p>
                    </div>
                  </div>
                )}

                {/* Display unpaid items lists */}
                {selectedPatient && (
                  <div className="space-y-4">
                    {unpaidAppointments.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Unpaid Appointments</h3>
                        <div className="max-h-[150px] overflow-y-auto">
                          {unpaidAppointments.map((appointment) => (
                            <div 
                              key={appointment.id}
                              className="p-2 border rounded-lg mb-1 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                            >
                              <div className="font-medium">{appointment.services?.name}</div>
                              <div className="text-xs text-gray-500 flex justify-between">
                                <span>Date: {appointment.date} at {appointment.time}</span>
                                <span>Price: KSh {appointment.services?.price.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {unpaidSales.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Unpaid Sales</h3>
                        <div className="max-h-[150px] overflow-y-auto">
                          {unpaidSales.map((sale) => (
                            <div 
                              key={sale.id}
                              className="p-2 border rounded-lg mb-1 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                            >
                              <div className="font-medium">Pharmacy Sale #{sale.id.substring(0, 8)}</div>
                              <div className="text-xs text-gray-500 flex justify-between">
                                <span>Date: {new Date(sale.created_at || '').toLocaleDateString()}</span>
                                <span>Total: KSh {sale.total_amount.toFixed(2)}</span>
                              </div>
                              <div className="text-xs mt-1">
                                Items: {sale.items?.length || 0}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Summary */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value: 'cash' | 'mpesa' | 'insurance') => setPaymentMethod(value)}
                  >
                    <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {paymentMethod === 'mpesa' && selectedPatient && (
                    <div className="text-sm text-amber-600 mt-1">
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
                  <h3 className="font-medium">Payment Summary</h3>
                  <div className="text-sm space-y-1 p-2 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <p>Appointments Total: KSh {appointmentsTotal.toFixed(2)}</p>
                    <p>Sales Total: KSh {salesTotal.toFixed(2)}</p>
                    <p className="font-semibold">Grand Total: KSh {grandTotal.toFixed(2)}</p>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={!selectedPatient || isProcessing || grandTotal === 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                >
                  {isProcessing ? 'Processing...' : 'Process Payment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Dialog */}
        {showReceipt && receiptContent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">Payment Receipt</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowReceipt(false);
                    setReceiptContent(null);
                  }}
                >
                  Close
                </Button>
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
    </div>
  );
} 