'use server';
import { getSupabaseClient } from './supabase';
import { Database } from '../types/supabase';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Define Appointment type (single source of truth)
export type Appointment = {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  services: { name: string; price: number; duration: number } | null;
  profiles: { full_name: string } | null;
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  payment_method?: 'mpesa' | 'cash' | 'bank';
  transaction_id?: string;
};

type RawAppointment = Database['public']['Tables']['appointments']['Row'] & {
  service: Database['public']['Tables']['services']['Row'] | null;
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  payment_method?: 'mpesa' | 'cash' | 'bank';
  transaction_id?: string;
};

export async function signup(formData: FormData) {
  console.log('Signup function called with formData:', Object.fromEntries(formData));

  const supabase = await getSupabaseClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const phoneNumberInput = formData.get('phoneNumber') as string | null;
  const role = (formData.get('role') as string) || 'patient';

  // Validate required fields
  if (!email || !password || !fullName) {
    console.error('Validation failed: Missing required fields', { email, password, fullName });
    throw new Error('Missing required fields: ' + JSON.stringify({ email, password, fullName }));
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Validation failed: Invalid email format', { email });
    throw new Error('Invalid email format');
  }

  // Validate password length
  if (password.length < 6) {
    console.error('Validation failed: Password too short', { passwordLength: password.length });
    throw new Error('Password must be at least 6 characters');
  }

  // Validate role
  const validRoles = ['patient', 'admin', 'doctor', 'staff', 'pharmacist'];
  if (!validRoles.includes(role)) {
    console.error('Validation failed: Invalid role', { role });
    throw new Error('Invalid role');
  }

  // Format and validate phone number
  let phoneNumber: string | null = null;
  if (phoneNumberInput?.trim()) {
    const cleanedPhone = phoneNumberInput.replace(/[^0-9+]/g, '');
    if (cleanedPhone.startsWith('0')) {
      phoneNumber = '+254' + cleanedPhone.slice(1);
    } else if (cleanedPhone.startsWith('+254')) {
      phoneNumber = cleanedPhone;
    } else {
      console.error('Validation failed: Invalid phone number prefix', { cleanedPhone });
      throw new Error('Phone number must start with 0 or +254');
    }
    if (!/^\+254[0-9]{9}$/.test(phoneNumber)) {
      console.error('Validation failed: Invalid phone number format', { phoneNumber });
      throw new Error('Phone number must be +254 followed by 9 digits (e.g., +254712345678)');
    }
  }

  console.log('Signup Input:', { email, fullName, phoneNumber, role, password: '[hidden]' });

  try {
    // Check for existing email in auth.users
    console.log('Checking auth.users for email:', email);
    const { data: authUsers, error: authCheckError } = await supabase.rpc('get_auth_users_by_email', { email_input: email });
    if (authCheckError) {
      console.error('Auth users check error:', authCheckError);
      throw new Error('Failed to verify auth user existence: ' + authCheckError.message);
    }
    if (authUsers && authUsers.length > 0) {
      console.error('User already exists in auth.users:', email);
      throw new Error('Email already registered');
    }

    // Check for existing email or phone number in profiles
    console.log('Checking profiles for email:', email);
    if (email) {
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (emailCheckError) {
        console.error('Email check error:', emailCheckError);
        throw new Error('Failed to verify email uniqueness: ' + emailCheckError.message);
      }
      if (existingEmail) {
        console.error('Email already in use in profiles:', email);
        throw new Error('Email already in use');
      }
    }

    if (phoneNumber) {
      console.log('Checking profiles for phone number:', phoneNumber);
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
      if (phoneCheckError) {
        console.error('Phone check error:', phoneCheckError);
        throw new Error('Failed to verify phone number uniqueness: ' + phoneCheckError.message);
      }
      if (existingPhone) {
        console.error('Phone number already in use:', phoneNumber);
        throw new Error('Phone number already in use');
      }
    }

    // Perform signup
    console.log('Attempting auth.signup...');
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
          role,
        },
      },
    });

    if (authError) {
      console.error('Auth Signup Error:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        details: authError,
      });
      throw new Error(`Signup failed: ${authError.message}`);
    }

    if (!user) {
      console.error('No user returned from signup');
      throw new Error('Signup failed: No user created');
    }

    console.log('User created:', { userId: user.id, email: user.email });

    // Insert profile
    console.log('Inserting profile for user:', user.id);
    const { error: insertProfileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email,
        full_name: fullName,
        phone_number: phoneNumber,
        role,
        created_at: new Date().toISOString(),
      });

    if (insertProfileError) {
      console.error('Profile insert error:', insertProfileError);
      try {
        console.log('Cleaning up: Deleting auth user:', user.id);
        await supabase.auth.admin.deleteUser(user.id);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      throw new Error(`Failed to create user profile: ${insertProfileError.message}`);
    }

    // Verify profile
    console.log('Verifying profile for user:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, email, full_name, phone_number')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile verification error:', profileError);
      try {
        console.log('Cleaning up: Deleting auth user:', user.id);
        await supabase.auth.admin.deleteUser(user.id);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      throw new Error(`Failed to verify profile: ${profileError?.message || 'No profile found'}`);
    }

    console.log('Profile created:', profile);

    // Insert into role-specific table
    if (role === 'patient') {
      console.log('Inserting patient for user:', user.id);
      const patientData: Database['public']['Tables']['patients']['Insert'] = {
        id: user.id,
        full_name: fullName,
        phone_number: phoneNumber,
        date_of_birth: null,
        created_at: new Date().toISOString(),
      };

      const { error: patientError } = await supabase
        .from('patients')
        .insert(patientData);

      if (patientError) {
        console.error('Patient Insert Error:', {
          message: patientError.message,
          details: patientError.details,
          hint: patientError.hint,
          code: patientError.code,
        });
        try {
          console.log('Cleaning up: Deleting profile and auth user:', user.id);
          await supabase.from('profiles').delete().eq('id', user.id);
          await supabase.auth.admin.deleteUser(user.id);
        } catch (cleanupError) {
          console.error('Cleanup failed:', cleanupError);
        }
        throw new Error(`Failed to create patient profile: ${patientError.message}`);
      }
    }

    console.log('Signup successful for user:', user.id);
    return { user };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Signup Unexpected Error:', {
      message: errorMessage,
      error: error instanceof Error ? error.stack : error,
    });
    throw new Error(`Unexpected error during signup: ${errorMessage}`);
  }
}
export async function login(formData: FormData) {
  const supabase = await getSupabaseClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function fetchUserRole(): Promise<string> {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('User not authenticated');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError?.message);
    return 'patient'; // Default to patient if profile fetch fails
  }

  return profile.role || 'patient';
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
  const doctorId = formData.get('doctorId') as string;

  if ((!serviceId && !customService) || !date || !time || !doctorId) {
    throw new Error('Service (or custom service), date, time, and doctor are required');
  }

  let finalServiceId = serviceId;
  if (customService && !serviceId) {
    const { data: newService, error: serviceError } = await supabase
      .from('services')
      .insert({
        name: customService,
        price: 0,
        duration: 30,
        category: 'Custom',
      })
      .select('id')
      .single();
    if (serviceError) throw new Error(serviceError.message);
    finalServiceId = newService.id;
  }

  if (!finalServiceId) throw new Error('Service ID is required');

  const { data: existingAppointments, error: checkError } = await supabase
    .from('appointments')
    .select('id')
    .eq('service_id', finalServiceId)
    .eq('date', date)
    .eq('time', time)
    .eq('doctor_id', doctorId); // Check doctor availability

  if (checkError) throw new Error(checkError.message);
  if (existingAppointments.length > 0) throw new Error('This time slot is already booked');

  const appointmentData: Database['public']['Tables']['appointments']['Insert'] = {
    patient_id: user.id,
    service_id: finalServiceId,
    doctor_id: doctorId,
    date,
    time,
    status: 'pending',
    notes: customService || (formData.get('notes') as string) || '',
    id: uuidv4(), // Explicitly generate ID
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();

  if (error) {
    console.error('Appointment Insert Error:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function fetchAppointments(userRole?: string) {
  const supabase = await getSupabaseClient();

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
      service:services(id, name, price, duration),
      profile:profiles(id, full_name)
    `)
    .order('date', { ascending: false });

  if (userRole === 'patient' && patientId) {
    query.eq('patient_id', patientId);
  }

  const { data: appointments, error } = await query;
  if (error) throw new Error(error.message);

  const transformedAppointments: Appointment[] = (appointments as unknown as RawAppointment[]).map((appt) => ({
    id: appt.id,
    date: appt.date,
    time: appt.time,
    status: appt.status as 'pending' | 'confirmed' | 'cancelled',
    notes: appt.notes || '',
    payment_status: appt.payment_status,
    payment_method: appt.payment_method,
    transaction_id: appt.transaction_id,
    services: appt.service
      ? { name: appt.service.name, price: appt.service.price, duration: appt.service.duration }
      : { name: 'Custom', price: 0, duration: 0 },
    profiles: appt.profile
      ? { full_name: appt.profile.full_name || 'Unknown' }
      : { full_name: 'Unknown' },
  }));

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
      service:services(name, price),
      profile:profiles(full_name)
    `)
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) throw new Error('Appointment not found');

  // Type-safe access
  const service = appointment.service as { name: string; price: number } | null;
  const profile = appointment.profile as { full_name: string } | null;

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
