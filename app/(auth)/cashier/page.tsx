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
import type { UnpaidAppointment, Sale } from '@/types/supabase';

// Define our own Patient interface to avoid import conflicts
interface PatientWithEmail {
  id: string;
  full_name: string;
  phone_number: string | null;
  email?: string | null;
  patient_type?: string;
}

// Define more specific types for medication and batch
interface MedicationData {
  id: string;
  name: string;
  dosage_form: string;
  strength: string;
}

interface BatchData {
  batch_number: string;
  expiry_date: string;
}

// Replace the existing AllSale interface with this improved one
interface AllSale {
  id: string;
  patient_type?: string;
  guest_patient_id?: string;
  patient_id?: string;
  patient_name?: string;
  patient_phone?: string | null;
  payment_status: string;
  total_amount: number;
  created_at: string | null;
  created_by: string;
  payment_method: string | null;
  transaction_id: string | null;
  updated_at: string | null;
  sale_items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    batch_id: string;
    medication_id: string;
    sale_id: string;
    created_at: string | null;
    medication: MedicationData;
    batch: BatchData;
  }>;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function CashierPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientWithEmail | null>(null);
  const [unpaidAppointments, setUnpaidAppointments] = useState<UnpaidAppointment[]>([]);
  const [unpaidSales, setUnpaidSales] = useState<Sale[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'insurance'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string | null>(null);
  const [filteredPatients, setFilteredPatients] = useState<PatientWithEmail[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch initial patients on component mount
  useEffect(() => {
    fetchInitialPatients();
  }, []);

  const fetchInitialPatients = async () => {
    setIsInitialLoading(true);
    setHasSearched(false);
    try {
      // Get recent/frequent patients - first regular patients
      const { data: regularPatients, error: regularError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (regularError) {
        console.error('Error fetching initial regular patients:', regularError);
      }

      // Then get guest patients
      const { data: guestPatients, error: guestError } = await supabase
        .from('guest_patients')
        .select('id, full_name, phone_number, email, date_of_birth, gender, address')
        .order('created_at', { ascending: false })
        .limit(10);

      if (guestError) {
        console.error('Error fetching initial guest patients:', guestError);
      }

      // Format and combine the results
      const regularPatientsList = (regularPatients || []).map(patient => ({
        ...patient,
        id: patient.id
      }));

      const guestPatientsList = (guestPatients || []).map(patient => ({
        id: `guest_${patient.id}`,
        full_name: patient.full_name,
        phone_number: patient.phone_number,
        email: patient.email,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
        patient_type: 'guest'
      }));

      setFilteredPatients([...regularPatientsList, ...guestPatientsList]);
    } catch (error) {
      console.error('Error fetching initial patients:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Fetch patient details when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      fetchPatients();
    } else {
      // If search query is cleared, show the initial patient list again
      fetchInitialPatients();
    }
  }, [searchQuery]);

  const fetchPatients = async () => {
    setHasSearched(true);
    // Search in regular patients
    const { data: patients, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
      .limit(10);

    if (error) {
      console.error('Error fetching regular patients:', error);
      return;
    }

    // Search in guest patients
    const { data: guestPatients, error: guestError } = await supabase
      .from('guest_patients')
      .select('id, full_name, phone_number, email, date_of_birth, gender, address')
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
      .limit(10);

    if (guestError) {
      console.error('Error fetching guest patients:', guestError);
    }

    // Combine and format both result sets
    const regularPatientsList = (patients || []).map(patient => ({
      ...patient,
      id: patient.id
    }));

    const guestPatientsList = (guestPatients || []).map(patient => ({
      id: `guest_${patient.id}`,
      full_name: patient.full_name,
      phone_number: patient.phone_number,
      email: patient.email,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      address: patient.address,
      patient_type: 'guest'
    }));

    setFilteredPatients([...regularPatientsList, ...guestPatientsList]);
  };

  // Fetch unpaid appointments and sales when patient is selected
  useEffect(() => {
    const fetchUnpaidItems = async () => {
      if (selectedPatient) {
        try {
          setIsDataLoading(true);
          // Special handling for guest patients
          if (selectedPatient.id.startsWith("guest_")) {
            console.log("Guest patient detected, fetching appointments and sales");
            
            // Fetch appointments for guest patients
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
              console.error("Error fetching appointments for guest patient:", appointmentsError);
              toast.error("Failed to fetch appointments");
              setUnpaidAppointments([]);
            } else {
              const transformedAppointments = appointments?.map(app => {
                // Ensure services is an object and not an array
                const serviceObj = Array.isArray(app.services) ? app.services[0] : app.services;
                
                return {
                  id: app.id,
                  date: app.date,
                  time: app.time,
                  services: serviceObj ? {
                    name: serviceObj.name,
                    price: serviceObj.price
                  } : null,
                  payment_status: app.payment_status as 'unpaid' | 'paid' | 'refunded' | null
                };
              }) || [];
              setUnpaidAppointments(transformedAppointments);
            }
            
            // Extract the guest patient ID without the 'guest_' prefix
            const actualGuestId = selectedPatient.id.replace('guest_', '');
            console.log('Looking up sales for guest patient ID:', actualGuestId);
            console.log('Patient object:', selectedPatient);
            
            // Try a more direct debug approach to verify data
            const { data: allSales, error: allSalesError } = await supabase
              .from('all_sales')
              .select('*')
              .eq('payment_status', 'unpaid');
            
            let guestSales: AllSale[] = [];
            
            if (allSalesError) {
              console.error('Error checking all unpaid sales:', allSalesError);
            } else {
              console.log('All unpaid sales count:', allSales?.length);
              console.log('All unpaid sales patient types:', allSales?.map(s => s.patient_type));
              
              guestSales = allSales?.filter(s => s.patient_type === 'guest') || [];
              console.log('All guest unpaid sales:', guestSales.length);
              if (guestSales.length) {
                console.log('Sample guest sale data:', guestSales[0]);
                console.log('Guest sale guest_patient_id:', guestSales.map(s => s.guest_patient_id));
                console.log('Current actualGuestId:', actualGuestId);
                console.log('ID match found:', guestSales.some(s => s.guest_patient_id === actualGuestId));
              }
            }
            
            // Query all_sales view for guest patients
            console.log('Querying all_sales view for guest patient with guest_patient_id =', actualGuestId);
            const { data: sales, error: salesError } = await supabase
              .from('all_sales')
              .select(`
                id,
                patient_id,
                guest_patient_id,
                patient_type,
                payment_status,
                total_amount,
                created_at,
                created_by,
                payment_method,
                transaction_id,
                updated_at,
                patient_name,
                patient_phone,
                sale_items:sale_items!sale_items_sale_id_fkey (
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
              .eq('payment_status', 'unpaid')
              .eq('patient_type', 'guest')
              .eq('guest_patient_id', actualGuestId);

            if (salesError) {
              console.error('Error fetching sales for guest patient:', salesError);
              console.error('Error details:', { 
                patientId: selectedPatient.id, 
                actualGuestId, 
                query: 'all_sales' 
              });
              toast.error('Failed to fetch sales');
              setUnpaidSales([]);
            } else {
              console.log('Guest patient sales found:', sales?.length);
              
              // If no sales found using the direct UUID match, try with a text-based matching approach
              if (!sales || sales.length === 0) {
                console.log('No sales found with direct UUID match, trying text-based comparison');
                
                // Alternative approach - filter guest sales client-side by comparing IDs as text
                if (guestSales && guestSales.length > 0) {
                  // First convert everything to string for comparison
                  const matchingSales = guestSales.filter(sale => 
                    String(sale.guest_patient_id).toLowerCase() === String(actualGuestId).toLowerCase());
                  
                  console.log('Text-based comparison found sales:', matchingSales.length);
                  
                  if (matchingSales.length > 0) {
                    console.log('Found matching sales using text comparison!');
                    
                    // Fetch the sale items for these matching sales
                    const salePromises = matchingSales.map(async (sale) => {
                      const { data: saleDetails, error: saleDetailsError } = await supabase
                        .from('sales')
                        .select(`
                          id,
                          patient_id,
                          guest_patient_id,
                          payment_status,
                          total_amount,
                          created_at,
                          created_by,
                          payment_method,
                          transaction_id,
                          updated_at,
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
                        .eq('id', sale.id)
                        .single();
                      
                      if (saleDetailsError) {
                        console.error('Error fetching sale details:', saleDetailsError);
                        return null;
                      }
                      
                      return {
                        ...sale,
                        sale_items: saleDetails?.sale_items
                      };
                    });
                    
                    const detailedSales = await Promise.all(salePromises);
                    // Filter out null values first
                    const validSales = detailedSales.filter((s): s is NonNullable<typeof s> => 
                      s !== null && !!s.sale_items);
                    
                    console.log('Successfully fetched detailed sale data for', validSales.length, 'sales');
                    
                    // Now transform only the valid sales
                    const transformedSales = validSales.map(sale => {
                      return {
                        id: sale.id,
                        patient_id: sale.patient_id,
                        payment_status: sale.payment_status,
                        total_amount: sale.total_amount,
                        created_at: sale.created_at,
                        created_by: sale.created_by,
                        payment_method: sale.payment_method,
                        transaction_id: sale.transaction_id,
                        updated_at: sale.updated_at,
                        patient: {
                          full_name: sale.patient_name || selectedPatient.full_name,
                          phone_number: sale.patient_phone || selectedPatient.phone_number
                        },
                        items: (sale.sale_items || []).map(item => {
                          // Ensure medication and batch are objects and not arrays
                          const medicationObj = Array.isArray(item.medication) ? item.medication[0] : item.medication;
                          const batchObj = Array.isArray(item.batch) ? item.batch[0] : item.batch;
                          
                          return {
                            id: item.id,
                            batch_id: item.batch_id,
                            medication_id: item.medication_id,
                            sale_id: item.sale_id,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            total_price: item.total_price,
                            created_at: item.created_at,
                            medication: medicationObj ? {
                              id: medicationObj.id,
                              name: medicationObj.name,
                              dosage_form: medicationObj.dosage_form,
                              strength: medicationObj.strength
                            } : {
                              id: '',
                              name: '',
                              dosage_form: '',
                              strength: ''
                            },
                            batch: batchObj ? {
                              batch_number: batchObj.batch_number,
                              expiry_date: batchObj.expiry_date
                            } : {
                              batch_number: '',
                              expiry_date: ''
                            }
                          };
                        })
                      } as Sale;
                    });
                    
                    setUnpaidSales(transformedSales);
                    return;
                  }
                }
                
                // If no matching sales found through either method
                setUnpaidSales([]);
              } else {
                // Process the sales that were found with direct UUID match
                const transformedSales = sales.map(sale => {
                  return {
                    id: sale.id,
                    patient_id: sale.patient_id,
                    payment_status: sale.payment_status,
                    total_amount: sale.total_amount,
                    created_at: sale.created_at,
                    created_by: sale.created_by,
                    payment_method: sale.payment_method,
                    transaction_id: sale.transaction_id,
                    updated_at: sale.updated_at,
                    patient: {
                      full_name: sale.patient_name || selectedPatient.full_name,
                      phone_number: sale.patient_phone || selectedPatient.phone_number
                    },
                    items: (sale.sale_items || []).map(item => {
                      // Ensure medication and batch are objects and not arrays
                      const medicationObj = Array.isArray(item.medication) ? item.medication[0] : item.medication;
                      const batchObj = Array.isArray(item.batch) ? item.batch[0] : item.batch;
                      
                      return {
                        id: item.id,
                        batch_id: item.batch_id,
                        medication_id: item.medication_id,
                        sale_id: item.sale_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        created_at: item.created_at,
                        medication: medicationObj ? {
                          id: medicationObj.id,
                          name: medicationObj.name,
                          dosage_form: medicationObj.dosage_form,
                          strength: medicationObj.strength
                        } : {
                          id: '',
                          name: '',
                          dosage_form: '',
                          strength: ''
                        },
                        batch: batchObj ? {
                          batch_number: batchObj.batch_number,
                          expiry_date: batchObj.expiry_date
                        } : {
                          batch_number: '',
                          expiry_date: ''
                        }
                      };
                    })
                  };
                }) || [];
                setUnpaidSales(transformedSales as Sale[]);
              }
            }
          }
          
          // Regular patient handling - fetch unpaid sales from all_sales view
          const { data: sales, error: salesError } = await supabase
            .from('all_sales')
            .select(`
              id,
              patient_id,
              guest_patient_id,
              patient_type,
              payment_status,
              total_amount,
              created_at,
              created_by,
              payment_method,
              transaction_id,
              updated_at,
              patient_name,
              patient_phone,
              sale_items:sale_items!sale_items_sale_id_fkey (
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
            .eq('payment_status', 'unpaid')
            .eq('patient_type', 'regular')
            .eq('patient_id', selectedPatient.id);

          if (salesError) {
            console.error('Error fetching sales:', salesError);
            console.error('Error details:', { 
              patientId: selectedPatient.id, 
              query: 'all_sales' 
            });
            toast.error('Failed to fetch sales');
            setUnpaidSales([]);
          } else {
            console.log('Regular patient sales found:', sales?.length);
            if (sales && sales.length > 0) {
              console.log('Sample sale data:', sales[0]);
            } else {
              console.log('No sales found for regular patient');
            }
            
            const transformedSales = sales?.map(sale => {
              return {
                id: sale.id,
                patient_id: sale.patient_id,
                payment_status: sale.payment_status,
                total_amount: sale.total_amount,
                created_at: sale.created_at,
                created_by: sale.created_by,
                payment_method: sale.payment_method,
                transaction_id: sale.transaction_id,
                updated_at: sale.updated_at,
                patient: {
                  full_name: sale.patient_name,
                  phone_number: sale.patient_phone
                },
                items: sale.sale_items?.map(item => {
                  // Ensure medication and batch are objects and not arrays
                  const medicationObj = Array.isArray(item.medication) ? item.medication[0] : item.medication;
                  const batchObj = Array.isArray(item.batch) ? item.batch[0] : item.batch;
                  
                  return {
                    id: item.id,
                    batch_id: item.batch_id,
                    medication_id: item.medication_id,
                    sale_id: item.sale_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    created_at: item.created_at,
                    medication: medicationObj ? {
                      id: medicationObj.id,
                      name: medicationObj.name,
                      dosage_form: medicationObj.dosage_form,
                      strength: medicationObj.strength
                    } : {
                      id: '',
                      name: '',
                      dosage_form: '',
                      strength: ''
                    },
                    batch: batchObj ? {
                      batch_number: batchObj.batch_number,
                      expiry_date: batchObj.expiry_date
                    } : {
                      batch_number: '',
                      expiry_date: ''
                    }
                  };
                }) || []
              };
            }) || [];
            setUnpaidSales(transformedSales as Sale[]);
          }
        } catch (error) {
          console.error('Unexpected error during data fetching:', error);
          toast.error('An unexpected error occurred');
          setUnpaidAppointments([]);
          setUnpaidSales([]);
        } finally {
          setIsDataLoading(false);
        }
      }
    };

    fetchUnpaidItems();
  }, [selectedPatient]);

  const calculateTotals = () => {
    const appointmentsTotal = unpaidAppointments.reduce((sum, app) => 
      sum + (app.services?.price || 0), 0);
    
    const salesTotal = unpaidSales.reduce((sum, sale) => {
      // Properly type the items array with a fallback to empty array for type safety
      const items = sale.items || [];
      // Calculate the sum of all items
      return sum + items.reduce((itemSum, item) => 
        itemSum + (item.quantity * item.unit_price), 0);
    }, 0);

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
        appointments: unpaidAppointments.map(app => ({
          ...app,
          status: 'confirmed', // Add missing properties required by Appointment
          notes: '',
          patient: { full_name: selectedPatient.full_name },
          doctor: null,
          transaction_id: null,
          services: app.services ? { 
            ...app.services, 
            duration: 30 // Default duration in minutes
          } : null,
          payment_status: app.payment_status || undefined
        })),
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

  const handlePatientSelect = (patient: PatientWithEmail) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.full_name);
    // Clear previous data when selecting a new patient
    setUnpaidAppointments([]);
    setUnpaidSales([]);
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Patient Search */}
              <div className="space-y-3 sm:space-y-4">
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
                  <div className="max-h-[200px] overflow-y-auto mt-1 sm:mt-2">
                    {isInitialLoading ? (
                      <div className="flex justify-center items-center py-4">
                        <div className="h-6 w-6 border-2 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading patients...</span>
                      </div>
                    ) : filteredPatients.length > 0 ? (
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
                    ) : hasSearched ? (
                      <div className="text-center text-[11px] text-gray-500 italic p-4 border rounded-lg border-dashed">
                        No patients found matching &quot;{searchQuery}&quot;
                      </div>
                    ) : (
                      <div className="text-center text-[11px] text-gray-500 italic p-4 border rounded-lg border-dashed">
                        No recent patients available
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

                {/* Display unpaid items lists */}
                {selectedPatient && (
                  <div className="space-y-3 sm:space-y-4">
                    {isDataLoading ? (
                      <div className="flex justify-center items-center py-4">
                        <div className="h-6 w-6 border-2 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading unpaid items...</span>
                      </div>
                    ) : (
                      <>
                        {unpaidAppointments.length > 0 && (
                          <div className="space-y-1 sm:space-y-2">
                            <h3 className="font-medium text-sm sm:text-base">Unpaid Appointments</h3>
                            <div className="max-h-[120px] sm:max-h-[150px] overflow-y-auto">
                              {unpaidAppointments.map((appointment) => (
                                <div 
                                  key={appointment.id}
                                  className="p-1.5 sm:p-2 border rounded-lg mb-1 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                                >
                                  <div className="font-medium text-xs sm:text-sm">{appointment.services?.name}</div>
                                  <div className="text-xs text-gray-500 flex flex-col sm:flex-row sm:justify-between">
                                    <span>Date: {appointment.date} at {appointment.time}</span>
                                    <span>Price: KSh {appointment.services?.price.toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {unpaidSales.length > 0 && (
                          <div className="space-y-1 sm:space-y-2">
                            <h3 className="font-medium text-sm sm:text-base">Unpaid Sales</h3>
                            <div className="max-h-[120px] sm:max-h-[150px] overflow-y-auto">
                              {unpaidSales.map((sale) => (
                                <div 
                                  key={sale.id}
                                  className="p-1.5 sm:p-2 border rounded-lg mb-1 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                                >
                                  <div className="font-medium text-xs sm:text-sm">Pharmacy Sale #{sale.id.substring(0, 8)}</div>
                                  <div className="text-xs text-gray-500 flex flex-col sm:flex-row sm:justify-between">
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
                        
                        {unpaidAppointments.length === 0 && unpaidSales.length === 0 && (
                          <div className="text-center text-[11px] text-gray-500 italic p-4 border rounded-lg border-dashed">
                            No unpaid items found for this patient
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Summary */}
              <div className="space-y-3 sm:space-y-4 mt-4 lg:mt-0">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-sm sm:text-base">Payment Method</Label>
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

                <div className="space-y-1 sm:space-y-2">
                  <h3 className="font-medium text-sm sm:text-base">Payment Summary</h3>
                  <div className="text-xs sm:text-sm space-y-1 p-1.5 sm:p-2 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <p>Services Total Cost: KSh {appointmentsTotal.toFixed(2)}</p>
                    <p>Medication Total Cost: KSh {salesTotal.toFixed(2)}</p>
                    <p className="font-semibold">Grand Total: KSh {grandTotal.toFixed(2)}</p>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={!selectedPatient || isProcessing || grandTotal === 0 || isDataLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 text-sm sm:text-base py-1.5 sm:py-2"
                >
                  {isProcessing ? 'Processing...' : isDataLoading ? 'Loading data...' : 'Process Payment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Dialog */}
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