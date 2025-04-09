'use server';
import { getSupabaseClient } from './supabase';
import { Database } from '../types/supabase';
import axios, { AxiosError } from 'axios';

// Define Appointment type (single source of truth)
export type Appointment = {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  services: { name: string; price: number; duration: number };
  profiles: { full_name: string };
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  payment_method?: 'mpesa' | 'cash' | 'bank';
  transaction_id?: string;
};


type RawAppointment = Database['public']['Tables']['appointments']['Row'] & {
  services: Database['public']['Tables']['services']['Row'][] | null; // Array of services
  profiles: Database['public']['Tables']['profiles']['Row'][] | null; // Array of profiles
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  payment_method?: 'mpesa' | 'cash' | 'bank';
  transaction_id?: string;
};

export async function signup(formData: FormData) {
  const supabase = await getSupabaseClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const phoneNumber = formData.get('phoneNumber') as string;

  const { data: { user }, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone_number: phoneNumber } },
  });

  if (authError || !user) throw new Error(authError?.message || 'Signup failed');
}

export async function login(formData: FormData) {
  const supabase = await getSupabaseClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function setUserRole(formData: FormData) {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in to set roles');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError || profile?.role !== 'admin') throw new Error('Only admins can set user roles');

  const userId = formData.get('userId') as string;
  const newRole = formData.get('role') as string;

  if (!userId || !newRole || !['admin', 'staff', 'patient'].includes(newRole)) {
    throw new Error('Invalid user ID or role');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

export async function fetchAllProfiles() {
  const supabase = await getSupabaseClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone_number, role')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);
  
  return profiles || [];
}

export async function fetchServices() {
  const supabase = await getSupabaseClient();
  const { data: services, error } = await supabase
    .from('services')
    .select('id, name, price, duration')
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch services: ${error.message}`);

  return services as { id: string; name: string; price: number; duration: number }[];
}

export async function bookAppointment(formData: FormData) {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in to book an appointment');

  const serviceId = formData.get('serviceId') as string;
  const customService = formData.get('customService') as string;
  const date = formData.get('date') as string;
  const time = formData.get('time') as string;

  if ((!serviceId && !customService) || !date || !time) {
    throw new Error('Service (or custom service), date, and time are required');
  }

  if (serviceId) {
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('service_id', serviceId)
      .eq('date', date)
      .eq('time', time);

    if (checkError) throw new Error(checkError.message);
    if (existingAppointments.length > 0) throw new Error('This time slot is already booked');
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: user.id,
      service_id: serviceId || null,
      date,
      time,
      status: 'pending',
      notes: customService || (formData.get('notes') as string) || '',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchAppointments(userRole?: string) {
  const supabase = await getSupabaseClient();

  // Get the current user if userRole is 'patient'
  let patientId: string | null = null;
  if (userRole === 'patient') {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('User not authenticated');
    patientId = user.id;
  }

  const query = supabase
    .from('appointments')
    .select(`
      id,
      date,
      time,
      status,
      notes,
      payment_status,
      payment_method,
      transaction_id,
      services ( id, name, price, duration ),
      profiles ( id, full_name )
    `)
    .order('date', { ascending: false });

  // Filter by patient_id if userRole is 'patient'
  if (userRole === 'patient' && patientId) {
    query.eq('patient_id', patientId);
  }

  const { data: appointments, error } = await query;
  if (error) throw new Error(error.message);
  

  const transformedAppointments: Appointment[] = (appointments as unknown as RawAppointment[]).map((appt) => {
    // Handle services as either an array or a single object
    let service: Database['public']['Tables']['services']['Row'] | null = null;
    if (Array.isArray(appt.services) && appt.services.length > 0) {
      service = appt.services[0];
    } else if (appt.services && !Array.isArray(appt.services)) {
      service = appt.services as Database['public']['Tables']['services']['Row'];
    }
  
    // Handle profiles as either an array or a single object
    let profile: Database['public']['Tables']['profiles']['Row'] | null = null;
    if (Array.isArray(appt.profiles) && appt.profiles.length > 0) {
      profile = appt.profiles[0];
    } else if (appt.profiles && !Array.isArray(appt.profiles)) {
      profile = appt.profiles as Database['public']['Tables']['profiles']['Row'];
    }

    return {
      id: appt.id,
      date: appt.date,
      time: appt.time,
      status: appt.status as 'pending' | 'confirmed' | 'cancelled',
      notes: appt.notes || '',
      payment_status: appt.payment_status,
      payment_method: appt.payment_method,
      transaction_id: appt.transaction_id,
      services: service
        ? { name: service.name, price: service.price, duration: service.duration }
        : { name: 'Custom', price: 0, duration: 0 },
      profiles: profile
        ? { full_name: profile.full_name || 'Unknown' }
        : { full_name: 'Unknown' },
    };
  });

  return transformedAppointments;
}

export async function generateReceipt(appointmentId: string): Promise<string> {
  const supabase = await getSupabaseClient();
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      id,
      date,
      time,
      payment_status,
      payment_method,
      transaction_id,
      services ( name, price ),
      profiles ( full_name )
    `)
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) throw new Error('Appointment not found');

  // Extract the first service (assuming one-to-one in practice)
  const servicesArray = appointment.services as { name: string; price: number }[] | null;
  const service = servicesArray && servicesArray.length > 0 ? servicesArray[0] : null;

  // Extract the first profile (assuming one-to-one in practice)
  const profilesArray = appointment.profiles as { full_name: string }[] | null;
  const profile = profilesArray && profilesArray.length > 0 ? profilesArray[0] : null;

  const receipt = `
    --- Payment Receipt ---
    Appointment ID: ${appointment.id}
    Patient: ${profile?.full_name || 'Unknown'}
    Service: ${service?.name || 'N/A'}
    Date: ${appointment.date} at ${appointment.time}
    Amount: KSh ${service?.price || 0}
    Payment Method: ${appointment.payment_method || 'N/A'}
    Transaction ID: ${appointment.transaction_id || 'N/A'}
    Status: ${appointment.payment_status || 'N/A'}
    Issued on: ${new Date().toLocaleString()}
    ----------------------
  `;
  return receipt;
}
export async function processMpesaPayment(formData: FormData): Promise<{ success: boolean; checkoutRequestId: string }> {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  console.log('Server-side FormData:', Object.fromEntries(formData.entries()));

  const appointmentId = formData.get('id') as string;
  const amount = Number(formData.get('amount'));
  const phoneNumber = formData.get('phone') as string;

  if (!appointmentId || !amount || !phoneNumber) {
    const missing = [];
    if (!appointmentId) missing.push('id');
    if (!amount) missing.push('amount');
    if (!phoneNumber) missing.push('phone');
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

  const formattedPhone = phoneNumber.startsWith('0') ? `254${phoneNumber.slice(1)}` : phoneNumber;
  if (!formattedPhone.match(/^2547\d{8}$/)) throw new Error('Invalid phone number format');

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortCode = process.env.MPESA_SHORT_CODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!consumerKey || !consumerSecret || !shortCode || !passkey) {
    throw new Error('Missing M-Pesa environment variables');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const { data: tokenData } = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  ).catch((err: AxiosError) => {
    console.error('Token generation failed:', err.response?.data || err.message);
    throw err;
  });
  const accessToken = tokenData.access_token;

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
    AccountReference: `Appointment-${appointmentId}`,
    TransactionDesc: `Payment for appointment ${appointmentId}`,
  };

  console.log('STK Push Payload:', stkPushPayload);

  try {
    const { data } = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushPayload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (data.ResponseCode === '0') {
      console.log('STK Push succeeded:', data);
      await supabase
        .from('appointments')
        .update({
          payment_method: 'mpesa',
          transaction_id: data.CheckoutRequestID,
        })
        .eq('id', appointmentId);
      return { success: true, checkoutRequestId: data.CheckoutRequestID as string };
    } else {
      throw new Error(`M-Pesa failed: ${data.ResponseDescription || 'Unknown error'}`);
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('STK Push failed:', error.response?.data || error.message);
      throw new Error(`STK Push request failed: ${error.response?.data?.errorMessage || error.message}`);
    } else {
      console.error('STK Push failed with unexpected error:', error);
      throw new Error('An unexpected error occurred during STK Push');
    }
  }
}
export async function processCashPayment(formData: FormData) {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const appointmentId = formData.get('id') as string;
  const receiptNumber = formData.get('receiptNumber') as string;

  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'paid',
      payment_method: 'cash',
      transaction_id: receiptNumber || `CASH-${Date.now()}`,
    })
    .eq('id', appointmentId);

  if (error) throw new Error(error.message);

  const receipt = await generateReceipt(appointmentId);
  return { success: true, receipt };
}
