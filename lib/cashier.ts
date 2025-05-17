'use server';

import type {
    Sale, 
    ReceiptData,
    Appointment
} from '@/types/supabase';
import { createClient } from '@/app/lib/supabase/server';
import axios, { AxiosError } from 'axios';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

interface AppointmentWithDoctor extends Omit<Appointment, 'doctor'> {
  doctor?: {
    user_id: string;
    profiles?: {
      full_name: string;
    };
  };
  service?: {
    name: string;
    price: number;
    duration: number;
  };
}

// Define the type for the RPC function
type RPCFunction = {
  set_tenant_context: (params: { p_tenant_id: string }) => Promise<void>;
};

// Define the TransformedPayment type
type TransformedPayment = {
  id: string;
  type: 'appointment' | 'sale';
  patient_name: string;
  amount: number;
  date: string;
  payment_method: string;
  transaction_id: string | null;
  reference: string;
};

// Fetch all pending payments
export async function getAllPendingPayments() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { appointmentsCount: 0, salesCount: 0, total: 0 };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'cashier'].includes(profile.role)) {
        return { appointmentsCount: 0, salesCount: 0, total: 0 };
    }

    if (!profile.tenant_id) {
        return { appointmentsCount: 0, salesCount: 0, total: 0 };
    }
    
    try {
        // Set tenant context
        const { error: contextError } = await supabase.rpc('set_tenant_context', {
            p_tenant_id: profile.tenant_id
        });

        if (contextError) {
            throw contextError;
        }

        // Get tenant ID from context
        const { data: tenantId, error: getTenantError } = await supabase
            .rpc('get_tenant_id');

        if (getTenantError || !tenantId) {
            throw new Error('Failed to get tenant ID');
        }

        const { data: appointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select('id')
            .eq('payment_status', 'unpaid')
            .eq('tenant_id', tenantId);
        
        if (appointmentsError) {
            throw appointmentsError;
        }
        
        const { data: saleItems, error: saleItemsError } = await supabase
            .from('sale_items')
            .select(`
                id,
                sale_id,
                quantity,
                unit_price,
                total_price,
                medication:medications (
                    id,
                    name,
                    dosage_form,
                    strength
                ),
                batch:medication_batches (
                    batch_number,
                    expiry_date
                )
            `)
            .eq('tenant_id', profile.tenant_id);

        if (saleItemsError) {
            throw saleItemsError;
        }
        
        const { data: sales, error: salesError } = await supabase
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
                tenant_id,
                guest_patient:guest_patients!fk_sales_patient_id (
                    full_name,
                    phone_number,
                    tenant_id
                )
            `)
            .eq('payment_status', 'unpaid')
            .eq('tenant_id', profile.tenant_id);
        
        if (salesError) {
            throw salesError;
        }
        
        // Only filter by tenant_id of the sale itself
        const filteredSales = sales?.filter(sale => sale.tenant_id === profile.tenant_id) || [];

        // Attach sale items to their respective sales
        const salesWithItems = filteredSales.map(sale => ({
            ...sale,
            sale_items: saleItems?.filter(item => item.sale_id === sale.id) || []
        }));

        const result = {
            appointmentsCount: appointments?.length || 0,
            salesCount: salesWithItems.length,
            total: (appointments?.length || 0) + salesWithItems.length
        };
        return result;
    } catch (error) {
        throw error;
    }
}

export async function fetchPaymentHistory() {
    console.log('=== fetchPaymentHistory START ===');
    const supabase = await createClient();
    console.log('Supabase client created');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('No user found');
        throw new Error('User not authenticated');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'cashier'].includes(profile.role)) {
        console.log('Unauthorized role:', profile?.role);
        throw new Error('Unauthorized: Only admins and cashiers can view payment history');
    }

    if (!profile.tenant_id) {
        console.log('No tenant ID found');
        throw new Error('No tenant ID found');
    }

    try {
        // Set tenant context
        const { error: contextError } = await supabase.rpc('set_tenant_context', {
            p_tenant_id: profile.tenant_id
        });

        if (contextError) {
            console.error('Error setting tenant context:', contextError);
            throw contextError;
        }

        // Get tenant ID from context
        const { data: tenantId, error: getTenantError } = await supabase
            .rpc('get_tenant_id');

        if (getTenantError || !tenantId) {
            console.error('Failed to get tenant ID:', getTenantError);
            throw new Error('Failed to get tenant ID');
        }

        console.log('Fetching paid appointments...');
        const { data: appointmentPayments, error: appointmentError } = await supabase
            .from('appointments')
            .select(`
                id,
                date,
                payment_status,
                payment_method,
                transaction_id,
                patient_id,
                services:service_id (name, price)
            `)
            .eq('payment_status', 'paid')
            .eq('tenant_id', tenantId);
  
        if (appointmentError) {
            console.error('Error fetching appointments:', appointmentError);
            throw appointmentError;
        }
        console.log(`Found ${appointmentPayments?.length || 0} paid appointments`);
  
        console.log('Fetching paid sales...');
        const { data: salePayments, error: saleError } = await supabase
            .from('sales')
            .select(`
                id,
                created_at,
                payment_status,
                payment_method,
                transaction_id,
                total_amount,
                patient_id
            `)
            .eq('payment_status', 'paid')
            .eq('tenant_id', tenantId);
  
        if (saleError) {
            console.error('Error fetching sales:', saleError);
            throw saleError;
        }
        console.log(`Found ${salePayments?.length || 0} paid sales`);
  
        // Get unique patient IDs
        const patientIds = new Set<string>();
        appointmentPayments?.forEach(app => {
            if (app.patient_id) patientIds.add(app.patient_id);
        });
        salePayments?.forEach(sale => {
            if (sale.patient_id) patientIds.add(sale.patient_id);
        });
        console.log(`Found ${patientIds.size} unique patients to fetch`);
  
        // Fetch patient data
        console.log('Fetching patient data...');
        const patientMap = new Map<string, { full_name: string }>();
        for (const patientId of patientIds) {
            try {
                const { data: patient, error: patientError } = await supabase
                    .from('guest_patients')
                    .select('id, full_name')
                    .eq('id', patientId)
                    .eq('tenant_id', tenantId)
                    .single();
                
                if (!patientError && patient) {
                    patientMap.set(patientId, { full_name: patient.full_name });
                }
            } catch (e) {
                console.error(`Error fetching patient ${patientId}:`, e);
            }
        }
        console.log(`Successfully fetched ${patientMap.size} patient records`);
  
        // Transform and combine data
        console.log('Transforming payment data...');
        const transformedAppointments = (appointmentPayments || []).map(app => {
            let serviceName = 'service';
            let servicePrice = 0;
            try {
                if (app.services) {
                    if (Array.isArray(app.services) && app.services.length > 0) {
                        serviceName = app.services[0].name || 'service';
                        servicePrice = app.services[0].price || 0;
                    } else if (typeof app.services === 'object' && app.services !== null) {
                        const services = app.services as { name?: string; price?: number };
                        serviceName = services.name || 'service';
                        servicePrice = services.price || 0;
                    }
                }
            } catch (e) {
                console.error('Error extracting service data:', e);
            }
  
            return {
                id: app.id,
                type: 'appointment',
                patient_name: patientMap.get(app.patient_id || '')?.full_name || 'Unknown Patient',
                amount: servicePrice,
                date: app.date,
                payment_method: app.payment_method || 'unknown',
                transaction_id: app.transaction_id,
                reference: `Appointment - ${serviceName}`
            };
        });
  
        const transformedSales = (salePayments || []).map(sale => ({
            id: sale.id,
            type: 'sale',
            patient_name: patientMap.get(sale.patient_id || '')?.full_name || 'Unknown Patient',
            amount: sale.total_amount,
            date: sale.created_at || new Date().toISOString(),
            payment_method: sale.payment_method || 'unknown',
            transaction_id: sale.transaction_id,
            reference: `Sale #${sale.id}`
        }));

        const allPayments = [...transformedAppointments, ...transformedSales].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
  
        console.log(`=== fetchPaymentHistory SUCCESS === Found ${allPayments.length} total payments`);
        return allPayments;
    } catch (error) {
        console.error('=== fetchPaymentHistory ERROR ===', error);
        throw error;
    }
}

export async function processCashPayment(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const type = formData.get('type') as 'appointment' | 'sale';
    
    if (!id || !type) {
      throw new Error('Missing required fields');
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'cashier', 'pharmacist', 'doctor'].includes(profile.role)) {
        console.log('Unauthorized role:', profile?.role);
        throw new Error('Unauthorized: Only admins, cashiers, pharmacists, and doctors can process payments');
    }

    if (!profile.tenant_id) {
        console.log('No tenant ID found');
        throw new Error('No tenant ID found');
    }

    if (type === 'appointment') {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          payment_status: 'paid',
          payment_method: 'cash',
          payment_date: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    } else if (type === 'sale') {
      const { error } = await supabase
        .from('sales')
        .update({ 
          payment_status: 'paid',
          payment_method: 'cash',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error in processCashPayment:', error);
    throw error;
  }
}
  
export async function processMpesaPayment(formData: FormData, isStaffPayment = false): Promise<{ success: boolean; checkoutRequestId: string }> {
  console.log('=== processMpesaPayment START ===');
  const supabase = await createClient();
  console.log('Supabase client created');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('No user found');
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

  if (!profile || !['admin', 'cashier', 'pharmacist', 'doctor'].includes(profile.role)) {
    console.log('Unauthorized role:', profile?.role);
    throw new Error('Unauthorized: Only admins, cashiers, pharmacists, and doctors can process payments');
  }

  if (!profile.tenant_id) {
    console.log('No tenant ID found');
    throw new Error('No tenant ID found');
  }

  const id = formData.get('id') as string;
  const type = formData.get('type') as 'appointment' | 'sale';
  const amount = Number(formData.get('amount'));
  const phoneNumber = formData.get('phone') as string;

  console.log('Payment details:', { id, type, amount, phoneNumber });

  if (!id || !type || !amount || !phoneNumber) {
    const missing = [];
    if (!id) missing.push('id');
    if (!type) missing.push('type');
    if (!amount) missing.push('amount');
    if (!phoneNumber) missing.push('phone');
    console.log('Missing required fields:', missing);
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  if (isNaN(amount) || amount <= 0) {
    console.log('Invalid amount:', amount);
    throw new Error('Invalid amount');
  }

  // Phone number formatting
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  console.log('Original phone:', phoneNumber, 'Formatted phone:', formattedPhone);
  
  if (formattedPhone.startsWith('254')) {
    // Already in international format
  } else if (formattedPhone.startsWith('0')) {
    formattedPhone = `254${formattedPhone.substring(1)}`;
  } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
    formattedPhone = `254${formattedPhone}`;
  }
  
  if (!formattedPhone.match(/^254\d{9,10}$/)) {
    console.log('Invalid phone format:', formattedPhone);
    throw new Error('Invalid phone number format. Please use format 07XXXXXXXX or 254XXXXXXXXX');
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortCode = process.env.MPESA_SHORT_CODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!consumerKey || !consumerSecret || !shortCode || !passkey) {
    console.log('Missing M-Pesa environment variables');
    throw new Error('Missing M-Pesa environment variables');
  }

  console.log('Getting M-Pesa access token...');
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const { data: tokenData } = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  ).catch((err: AxiosError) => {
    console.error('Token generation failed:', err.response?.data || err.message);
    throw err;
  });
  const accessToken = tokenData.access_token;
  console.log('Access token received');

  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

  const stkPushPayload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.floor(amount),
    PartyA: formattedPhone,
    PartyB: shortCode,
    PhoneNumber: formattedPhone,
    CallBackURL: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa-callback`,
    AccountReference: `${type}-${id}`,
    TransactionDesc: `Payment for ${type} ${id}`,
  };

  console.log('Sending STK push request...');
  try {
    const { data } = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushPayload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (data.ResponseCode === '0') {
      console.log('STK push successful, updating payment status...');
      if (type === 'appointment') {
        const { error } = await supabase
          .from('appointments')
          .update({
            payment_status: 'paid',
            payment_method: 'mpesa',
            transaction_id: data.CheckoutRequestID,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('tenant_id', profile.tenant_id);
        if (error) {
          console.error('Error updating appointment:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('sales')
          .update({
            payment_status: 'paid',
            payment_method: 'mpesa',
            transaction_id: data.CheckoutRequestID,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('tenant_id', profile.tenant_id);
        if (error) {
          console.error('Error updating sale:', error);
          throw error;
        }
      }
      
      console.log('=== processMpesaPayment SUCCESS ===');
      return { success: true, checkoutRequestId: data.CheckoutRequestID as string };
    } else {
      console.error('M-Pesa failed:', data.ResponseDescription);
      throw new Error(`M-Pesa failed: ${data.ResponseDescription || 'Unknown error'}`);
    }
  } catch (error: unknown) {
    console.error('=== processMpesaPayment ERROR ===');
    if (axios.isAxiosError(error)) {
      console.error('STK Push failed:', error.response?.data || error.message);
      throw new Error(`STK Push request failed: ${error.response?.data?.errorMessage || error.message}`);
    } else {
      console.error('STK Push failed with unexpected error:', error);
      throw new Error('An unexpected error occurred during STK Push');
    }
  }
}
  
// Generate receipt
export async function generateReceipt(params: { 
    patientId?: string;
    appointments?: Appointment[];
    sales?: Sale[];
  } | string): Promise<string> {
  console.log('=== generateReceipt START ===');
  const supabase = await createClient();
  console.log('Supabase client created');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('No user found');
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

  if (!profile || !['admin', 'cashier'].includes(profile.role)) {
    console.log('Unauthorized role:', profile?.role);
    throw new Error('Unauthorized: Only admins and cashiers can generate receipts');
  }

  if (!profile.tenant_id) {
    console.log('No tenant ID found');
    throw new Error('No tenant ID found');
  }

  let receiptContent = '';

  if (typeof params === 'string') {
    console.log('Generating receipt from ID:', params);
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', params)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (receiptError) {
      console.error('Error fetching receipt:', receiptError);
      throw receiptError;
    }
    console.log('Receipt found:', receipt.id);

    console.log('Fetching sale items...');
    const { data: saleItems, error: saleItemsError } = await supabase
      .from('sale_items')
      .select(`
        quantity,
        unit_price,
        total_price,
        medications (
          name,
          dosage_form,
          strength
        ),
        batch:medication_batches (
          batch_number,
          expiry_date
        )
      `)
      .eq('sale_id', receipt.sale_id)
      .eq('tenant_id', profile.tenant_id);

    if (saleItemsError) {
      console.error('Error fetching sale items:', saleItemsError);
      throw saleItemsError;
    }
    console.log(`Found ${saleItems?.length || 0} sale items`);

    const medicationTotal = saleItems?.reduce((sum: number, item: SaleItem) => sum + item.total_price, 0) || 0;
    console.log('Medication total:', medicationTotal);

    console.log('Fetching appointment details...');
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        services (
          name,
          price,
          duration
        ),
        payment_status,
        payment_method
      `)
      .eq('id', params)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError);
      throw appointmentError;
    }
    console.log('Appointment found:', appointment.id);

    const appointmentTotal = appointment?.services?.price || 0;
    console.log('Appointment total:', appointmentTotal);

    receiptContent = formatReceipt({
      ...receipt,
      created_at: receipt.created_at || new Date().toISOString(),
      items: saleItems?.map((item: SaleItem) => ({
        medication: {
          name: item.medications?.name || 'Unknown Medication',
          dosage_form: item.medications?.dosage_form || '',
          strength: item.medications?.strength || ''
        },
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        batch: {
          batch_number: item.batch?.batch_number || '',
          expiry_date: item.batch?.expiry_date || ''
        }
      })),
      medication_total: medicationTotal,
      appointment_total: appointmentTotal,
      appointments: appointment ? [{
        services: appointment.services ? {
          name: appointment.services.name,
          price: appointment.services.price
        } : null
      }] : undefined
    });
  } else {
    console.log('Generating receipt from object params');
    const { patientId, appointments, sales } = params;

    if (!patientId) {
      console.log('No patient ID provided');
      return 'Error generating receipt. No patient ID provided.';
    }

    console.log('Fetching patient details...');
    const { data: patientData, error: patientError } = await supabase
      .from('guest_patients')
      .select('full_name')
      .eq('id', patientId)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle();

    if (patientError) {
      console.error('Error fetching patient:', patientError);
      throw patientError;
    }
    console.log('Patient found:', patientData?.full_name);

    const appointmentsTotal = appointments?.reduce((sum, app) => 
        sum + (app.services?.price || 0), 0) || 0;
    console.log('Appointments total:', appointmentsTotal);

    const salesTotal = sales?.reduce((sum, sale) => 
      sum + (sale.items?.reduce((itemSum: number, item) => 
        itemSum + (item.quantity * item.unit_price), 0) || 0), 0) || 0;
    console.log('Sales total:', salesTotal);

    const grandTotal = appointmentsTotal + salesTotal;
    console.log('Grand total:', grandTotal);

    receiptContent = formatReceipt({
      id: `REC-${Date.now()}`,
      receipt_number: `REC-${Date.now()}`,
      created_at: new Date().toISOString(),
      amount: grandTotal,
      payment_method: sales?.[0]?.payment_method || appointments?.[0]?.payment_method || 'cash',
      patient: {
        id: patientId,
        full_name: patientData?.full_name || 'Unknown Patient',
        email: '',
        phone_number: ''
      },
      appointments: appointments?.map(app => ({
        id: app.id,
        services: app.services,
        payment_status: app.payment_status,
        payment_method: app.payment_method
      })),
      items: sales?.flatMap(sale => 
        sale.items?.map(item => ({
          medication: {
            name: item.medication?.name || 'Unknown Medication',
            dosage_form: item.medication?.dosage_form || '',
            strength: item.medication?.strength || ''
          },
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          batch: {
            batch_number: item.batch?.batch_number || '',
            expiry_date: item.batch?.expiry_date || ''
          }
        })) || []
      ),
      appointment_total: appointmentsTotal,
      medication_total: salesTotal,
      total_amount: grandTotal
    });
  }

  console.log('=== generateReceipt SUCCESS ===');
  return receiptContent;
}

function formatReceipt(data: ReceiptData): string {
    // Format the receipt content based on the data
    const formatAmount = (amount: number) => `KSh ${amount.toFixed(2)}`;
    
    // Calculate totals if not provided
    const medicationTotal = data.medication_total || data.items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
    const appointmentTotal = data.appointment_total || data.appointments?.reduce((sum, app) => sum + (app.services?.price || 0), 0) || 0;
    const grandTotal = data.amount || (medicationTotal + appointmentTotal);
    
    return `Receipt #${data.receipt_number}
Date: ${data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'}

Patient: ${data.patient?.full_name || 'Unknown Patient'}

Medication Details:
${data.items?.map(item => 
    `- ${item.medication.name} (${item.quantity} x ${formatAmount(item.unit_price)}) = ${formatAmount(item.total_price)}`
).join('\n') || 'No medications'}

Medication Total: ${formatAmount(medicationTotal)}

Appointment/Services:
${data.appointments?.map(app => 
    `- ${app.services?.name || 'Service'} = ${formatAmount(app.services?.price || 0)}`
).join('\n') || 'No appointments'}

Appointment Total: ${formatAmount(appointmentTotal)}

----------------------------------------
Grand Total: ${formatAmount(grandTotal)}
Payment Method: ${data.payment_method || 'Cash'}
----------------------------------------`;
}
  
// Fetch unpaid items for a patient
export async function fetchUnpaidItems(patientId: string) {
  
  const supabase = await createClient();
  

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

  if (!profile || !['admin', 'pharmacist', 'cashier'].includes(profile.role)) {
    
    throw new Error('Unauthorized: Only admins, pharmacists and cashiers can fetch unpaid items');
  }

  if (!profile.tenant_id) {
  
    throw new Error('No tenant ID found');
  }

  try {
    
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        notes,
        patient_id,
        doctor_id,
        transaction_id,
        service_id,
        payment_status,
        doctor:doctors!appointments_doctor_id_fkey (
          user_id
        ),
        service:services!appointments_service_id_fkey (
          name,
          price,
          duration
        )
      `)
      .eq('payment_status', 'unpaid')
      .eq('status', 'confirmed')
      .eq('patient_id', patientId)
      .eq('tenant_id', profile.tenant_id);

    if (appointmentsError) {
      
      throw appointmentsError;
    }
    

    const doctorIds = appointments?.map(app => app.doctor?.user_id).filter(Boolean) || [];
    

    const { data: doctorProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', doctorIds)
      .eq('tenant_id', profile.tenant_id);

    if (profilesError) {
      
      throw profilesError;
    }
  
    const doctorNameMap = new Map(
      doctorProfiles?.map(profile => [profile.id, profile.full_name]) || []
    );

    const appointmentsWithPatient = appointments?.map((app) => ({
      ...app,
      doctor: { full_name: doctorNameMap.get(app.doctor?.user_id || '') || 'Unknown Doctor' }
    })) || [];

    console.log('Fetching unpaid sales...');
    const { data: sales, error: salesError } = await supabase
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
        tenant_id,
        guest_patient:guest_patients!fk_sales_patient_id (
          full_name,
          phone_number,
          tenant_id
        ),
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
            strength,
            tenant_id
          ),
          batch:medication_batches!sale_items_batch_id_fkey (
            batch_number,
            expiry_date,
            tenant_id
          ),
          tenant_id
        )
      `)
      .eq('payment_status', 'unpaid')
      .eq('tenant_id', profile.tenant_id);

    if (salesError) {
     
      throw salesError;
    }
 

    // Only filter by tenant_id of the sale itself
    const filteredSales = sales?.filter(sale => sale.tenant_id === profile.tenant_id) || [];

   


    
    return {
      appointments: appointmentsWithPatient,
      sales: filteredSales
    };
  } catch (error) {
    
    throw error;
  }
}

// Fetch all unpaid items
export async function fetchAllUnpaidItems() {

  const supabase = await createClient();
 

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
  
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

  if (!profile || !['admin', 'pharmacist', 'cashier'].includes(profile.role)) {
    
    throw new Error('Unauthorized: Only admins, pharmacists and cashiers can fetch unpaid items');
  }

  if (!profile.tenant_id) {
   
    throw new Error('No tenant ID found');
  }

  try {
    // Set tenant context
    const { error: contextError } = await supabase.rpc('set_tenant_context', {
      p_tenant_id: profile.tenant_id
    });

    if (contextError) {
     
      throw contextError;
    }
  

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        notes,
        patient_id,
        doctor_id,
        transaction_id,
        service_id,
        payment_status,
        doctor:doctors!appointments_doctor_id_fkey (
          user_id,
          tenant_id
        ),
        service:services!appointments_service_id_fkey (
          name,
          price,
          duration,
          tenant_id
        )
      `)
      .eq('payment_status', 'unpaid')
      .eq('status', 'confirmed')
      .eq('tenant_id', profile.tenant_id);

    if (appointmentsError) {
     
      throw appointmentsError;
    }
   

    const doctorIds = appointments?.map(app => app.doctor?.user_id).filter(Boolean) || [];
   

    const { data: doctorProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', doctorIds)
      .eq('tenant_id', profile.tenant_id);

    if (profilesError) {
      
      throw profilesError;
    }
    

    const doctorNameMap = new Map(
      doctorProfiles?.map(profile => [profile.id, profile.full_name]) || []
    );

    const appointmentsWithPatient = appointments?.map((app) => ({
      ...app,
      doctor: { full_name: doctorNameMap.get(app.doctor?.user_id || '') || 'Unknown Doctor' }
    })) || [];

    console.log('Fetching unpaid sales...');
    const { data: saleItems, error: saleItemsError } = await supabase
      .from('sale_items')
      .select(`
        id,
        sale_id,
        quantity,
        unit_price,
        total_price,
        medication:medications (
          id,
          name,
          dosage_form,
          strength
        ),
        batch:medication_batches (
          batch_number,
          expiry_date
        )
      `)
      .eq('tenant_id', profile.tenant_id);

    if (saleItemsError) {
     
      throw saleItemsError;
    }
    

    const { data: sales, error: salesError } = await supabase
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
        tenant_id,
        guest_patient:guest_patients!fk_sales_patient_id (
          full_name,
          phone_number,
          tenant_id
        )
      `)
      .eq('payment_status', 'unpaid')
      .eq('tenant_id', profile.tenant_id);

    if (salesError) {
      
      throw salesError;
    }
    

    // Only filter by tenant_id of the sale itself
    const filteredSales = sales?.filter(sale => sale.tenant_id === profile.tenant_id) || [];

    // Attach sale items to their respective sales
    const salesWithItems = filteredSales.map(sale => ({
      ...sale,
      sale_items: saleItems?.filter(item => item.sale_id === sale.id) || []
    }));

    

 

    return {
      appointments: appointmentsWithPatient,
      sales: salesWithItems
    };
  } catch (error) {
    
    throw error;
  }
}
  