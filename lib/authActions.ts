'use server';
import { getSupabaseClient } from './supabase-server';
import type { Database } from '../types/supabase';
import type {
  Patient,
  Medication,
  PatientSummaryData,
  InventoryItem,
  ReceiptData,
  Supplier,
  Sale
} from '../types/supabase';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Define types from database schema
type MedicationBatchRow = Database['public']['Tables']['medication_batches']['Row'];

export type Appointment = {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  services: { name: string; price: number; duration: number } | null;
  patient: { full_name: string } | null;
  doctor: { full_name: string } | null;
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  payment_method?: 'mpesa' | 'cash' | 'bank';
  transaction_id: string | null;
};

function formatReceipt(data: ReceiptData): string {
  // Format the receipt content based on the data
  return `Receipt #${data.receipt_number}
Date: ${data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'}

Medication Details:
${data.items?.map(item => 
  `- ${item.medication.name} (${item.quantity} x ${item.unit_price}) = ${item.total_price}`
).join('\n') || 'No medications'}

Medication Total: KSh ${data.medication_total?.toFixed(2) || '0.00'}

Appointment/Services:
${data.appointments?.map(app => 
  `- ${app.services?.name || 'Service'} = ${app.services?.price || '0'}`
).join('\n') || 'No appointments'}

Appointment Total: KSh ${data.appointment_total?.toFixed(2) || '0.00'}

----------------------------------------
Grand Total: KSh ${data.amount.toFixed(2)}
Payment Method: ${data.payment_method}
----------------------------------------`;
}

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

export async function login(email: string, password: string) {
  try {
    const supabase = await getSupabaseClient();
    
    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      console.error('Login error:', error);
      return { error };
    }

    if (!data.session) {
      console.error('No session created after login');
      return { error: new Error('No session created') };
    }

    // Explicitly set session to ensure cookies are set properly
    try {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      
      if (sessionError) {
        console.error('Error setting session:', sessionError);
        return { error: sessionError };
      }
    } catch (sessionSetError) {
      console.error('Exception setting session:', sessionSetError);
      return { error: sessionSetError instanceof Error ? sessionSetError : new Error('Failed to set session') };
    }

    // Return success with session data
    return { 
      error: null, 
      session: data.session,
      user: data.user,
      redirect: '/dashboard'
    };
  } catch (error) {
    console.error('Unexpected login error:', error);
    return { error: error instanceof Error ? error : new Error('Login failed') };
  }
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

export async function setUserRole(formData: {
  user_id: string;
  role: string;
  full_name: string;
  // Doctor specific
  license_number?: string;
  specialty?: string;
  department?: string;
  // Patient specific
  date_of_birth?: string;
  gender?: string;
  address?: string;
  // Pharmacist specific
  specialization?: string;
  // Admin specific
  permissions?: string[];
}) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Validate required fields
  if (!formData.user_id) {
    throw new Error('User ID is required');
  }

  if (!formData.full_name) {
    throw new Error('Full name is required');
  }

  try {
    // Get the current role from profiles
    const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
      .eq('id', formData.user_id)
    .single();

    if (profileError) {
      throw new Error('Failed to fetch current role');
    }

    // Delete from old role table if exists
    if (currentProfile?.role) {
      switch (currentProfile.role) {
        case 'doctor':
          await supabase.from('doctors').delete().eq('user_id', formData.user_id);
          break;
        case 'patient':
          await supabase.from('patients').delete().eq('user_id', formData.user_id);
          break;
        case 'pharmacist':
          await supabase.from('pharmacists').delete().eq('user_id', formData.user_id);
          break;
        case 'admin':
          await supabase.from('admins').delete().eq('user_id', formData.user_id);
          break;
      }
    }

    // Update profile with new role
    const { error: updateError } = await supabase
    .from('profiles')
      .update({ role: formData.role })
      .eq('id', formData.user_id);

    if (updateError) {
      throw updateError;
    }

    // Insert into new role table
    switch (formData.role) {
      case 'doctor':
        if (!formData.license_number || !formData.specialty) {
          throw new Error('License number and specialty are required for doctors');
        }
        // First delete any existing record
        await supabase.from('doctors').delete().eq('user_id', formData.user_id);
        // Then insert the new record
        const { error: doctorError } = await supabase.from('doctors').insert({
          id: formData.user_id,
          user_id: formData.user_id,
          license_number: formData.license_number,
          specialty: formData.specialty
        });
        if (doctorError) {
          throw doctorError;
        }
        break;

      case 'patient':
        if (!formData.date_of_birth || !formData.gender || !formData.address) {
          throw new Error('Date of birth, gender, and address are required for patients');
        }
        await supabase.from('patients').upsert({
          id: formData.user_id,
          user_id: formData.user_id,
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          address: formData.address
        });
        break;

      case 'pharmacist':
        if (!formData.license_number) {
          throw new Error('License number is required for pharmacists');
        }
        await supabase.from('pharmacists').upsert({
          id: formData.user_id,
          user_id: formData.user_id,
          full_name: formData.full_name,
          license_number: formData.license_number,
          specialization: formData.specialization
        });
        break;

      case 'admin':
        await supabase.from('admins').upsert({
          id: formData.user_id,
          user_id: formData.user_id,
          full_name: formData.full_name,
          permissions: formData.permissions
        });
        break;

      default:
        throw new Error(`Invalid role: ${formData.role}`);
    }

    // Log the role change
    await supabase.from('audit_logs').insert({
      action: 'role_change',
      entity_type: 'user',
      entity_id: formData.user_id,
      details: {
        new_role: formData.role,
        previous_role: currentProfile?.role
      },
      created_by: user.id,
    });

  } catch (error) {
    console.error('Role change error:', error);
    throw new Error(`Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fetchAllProfiles() {
  const supabase = await getSupabaseClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone_number, role, created_at, updated_at')
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

export async function bookAppointment(formData: FormData, options?: { 
  isStaffBooking?: boolean;
  patientId?: string;
  guestPatientData?: {
    full_name: string;
    phone_number: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
  }
}) {
  const supabase = await getSupabaseClient();
  let patientId: string;
  
  // Staff booking flow - can book for existing or guest patients
  if (options?.isStaffBooking) {
    if (options.patientId) {
      // Booking for an existing patient
      patientId = options.patientId;
    } else if (options.guestPatientData) {
      // Create a guest patient and then book for them
      try {
        const newPatient = await createGuestPatient(options.guestPatientData);
        patientId = newPatient.id;
      } catch (error) {
        throw new Error(`Failed to create guest patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('Either patientId or guestPatientData is required for staff bookings');
    }
  } else {
    // Regular user flow - patient books for themselves
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('You must be logged in to book an appointment');

    // Check if user is registered as a patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (patientError || !patient) {
      throw new Error('Please register as a patient first to book an appointment. Contact the administrator for assistance.');
    }
    
    patientId = patient.id;
  }

  // Extract form data
  const serviceId = formData.get('serviceId') as string;
  const customService = formData.get('customService') as string;
  const date = formData.get('date') as string;
  const time = formData.get('time') as string;
  const doctorId = formData.get('doctorId') as string;

  if ((!serviceId && !customService) || !date || !time || !doctorId) {
    throw new Error('Service (or custom service), date, time, and doctor are required');
  }

  // Check if the selected doctor exists and is properly registered
  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('user_id')
    .eq('user_id', doctorId)
    .single();

  if (doctorError || !doctor) {
    throw new Error('Selected doctor is not registered in the system. Please select a valid doctor.');
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
    .eq('doctor_id', doctorId);

  if (checkError) throw new Error(checkError.message);
  if (existingAppointments.length > 0) throw new Error('This time slot is already booked');

  const appointmentData: Database['public']['Tables']['appointments']['Insert'] = {
    patient_id: patientId,
    service_id: finalServiceId,
    doctor_id: doctorId,
    date,
    time,
    status: 'pending',
    notes: customService || (formData.get('notes') as string) || '',
    id: uuidv4(),
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();

  if (error) {
    console.error('Appointment Insert Error:', error);
    throw new Error('Failed to book appointment. Please try again or contact support if the issue persists.');
  }

  return { success: true, data };
}

export async function handleBooking(formData: FormData, options?: { 
  isStaffBooking?: boolean;
  patientId?: string;
  guestPatientData?: {
    full_name: string;
    phone_number: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
  }
}) {
  try {
    const result = await bookAppointment(formData, options);
    if (result.success) {
      revalidatePath("/appointments");
      return { 
        success: true, 
        message: "Appointment booked successfully!",
        data: result.data
      };
    } else {
      return { 
        success: false, 
        message: "Failed to book appointment. Please try again."
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
    };
  }
}

export async function getAuthData() {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();



  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { userRole: 'patient' };
  }

  const userRole = profile.role;
  if (userRole !== "patient") {
    redirect("/appointments");
  }

  return { userRole };
}

export async function getAppointmentData() {
  const services = await fetchServices();
  const doctors = await fetchDoctors();
  return { services, doctors };
}

export async function fetchAppointments(userRole: string, userId?: string) {
  const supabase = await getSupabaseClient();
  
  try {
    let query = supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        notes,
        services (
          name,
          price,
          duration
        ),
        doctor_id,
        payment_status,
        payment_method,
        transaction_id,
        patient:patients (
          full_name
        )
      `);

    if (userRole === 'patient' && userId) {
      query = query.eq('patient_id', userId);
    }

    const { data: appointments, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      return [];
    }

    if (!appointments) {
      return [];
    }

    // Get unique doctor IDs and filter out any null/undefined values
    const doctorIds = [...new Set(appointments
      .map(appt => appt.doctor_id)
      .filter((id): id is string => id !== null && id !== undefined)
    )];

    if (doctorIds.length === 0) {
      return appointments.map((appt) => ({
        id: appt.id,
        date: appt.date,
        time: appt.time,
        status: appt.status as 'pending' | 'confirmed' | 'cancelled',
        notes: appt.notes || '',
        services: appt.services ? {
          name: appt.services.name,
          price: appt.services.price,
          duration: appt.services.duration
        } : null,
        patient: appt.patient ? {
          full_name: appt.patient.full_name
        } : null,
        doctor: null,
        payment_status: appt.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
        payment_method: appt.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
        transaction_id: appt.transaction_id || null
      }));
    }

    // First fetch doctors to get their user_ids
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctors')
      .select('id, user_id')
      .in('id', doctorIds);

    if (doctorsError) {
      console.error('Error fetching doctors:', doctorsError);
      return [];
    }

    if (!doctors || doctors.length === 0) {
      return appointments.map((appt) => ({
        id: appt.id,
        date: appt.date,
        time: appt.time,
        status: appt.status as 'pending' | 'confirmed' | 'cancelled',
        notes: appt.notes || '',
        services: appt.services ? {
          name: appt.services.name,
          price: appt.services.price,
          duration: appt.services.duration
        } : null,
        patient: appt.patient ? {
          full_name: appt.patient.full_name
        } : null,
        doctor: null,
        payment_status: appt.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
        payment_method: appt.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
        transaction_id: appt.transaction_id || null
      }));
    }

    // Get unique user IDs from doctors and filter out any null/undefined values
    const userIds = doctors
      .map(doc => doc.user_id)
      .filter((id): id is string => id !== null && id !== undefined);

    if (userIds.length === 0) {
      return appointments.map((appt) => ({
        id: appt.id,
        date: appt.date,
        time: appt.time,
        status: appt.status as 'pending' | 'confirmed' | 'cancelled',
        notes: appt.notes || '',
        services: appt.services ? {
          name: appt.services.name,
          price: appt.services.price,
          duration: appt.services.duration
        } : null,
        patient: appt.patient ? {
          full_name: appt.patient.full_name
        } : null,
        doctor: null,
        payment_status: appt.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
        payment_method: appt.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
        transaction_id: appt.transaction_id || null
      }));
    }

    // Then fetch profiles using the user_ids
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return [];
    }

    // Create a map of doctor_id to full_name
    const doctorProfileMap = new Map<string, string>();
    doctors.forEach(doctor => {
      const profile = profiles?.find(p => p.id === doctor.user_id);
      if (profile?.full_name) {
        doctorProfileMap.set(doctor.id, profile.full_name);
      }
    });

    return appointments.map((appt) => ({
      id: appt.id,
      date: appt.date,
      time: appt.time,
      status: appt.status as 'pending' | 'confirmed' | 'cancelled',
      notes: appt.notes || '',
      services: appt.services ? {
        name: appt.services.name,
        price: appt.services.price,
        duration: appt.services.duration
      } : null,
      patient: appt.patient ? {
        full_name: appt.patient.full_name
      } : null,
      doctor: appt.doctor_id ? {
        full_name: doctorProfileMap.get(appt.doctor_id) || 'Unknown Doctor'
      } : null,
      payment_status: appt.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
      payment_method: appt.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
      transaction_id: appt.transaction_id || null
    }));
  } catch (error) {
    console.error('Error in fetchAppointments:', error);
    return [];
  }
}

export async function processCashPayment(formData: FormData, isStaffPayment = false) {
  const supabase = await getSupabaseClient();
  
  // Only check auth for user-initiated payments
  if (!isStaffPayment) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('You must be logged in');
  }

  const id = formData.get('id') as string;
  const type = formData.get('type') as 'appointment' | 'sale';
  const receiptNumber = formData.get('receiptNumber') as string;

  if (!id || !type) {
    throw new Error('Missing required fields: id and type');
  }

  if (type === 'appointment') {
    const { error } = await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        payment_method: 'cash',
        transaction_id: receiptNumber || `CASH-${Date.now()}`,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('sales')
      .update({
        payment_status: 'paid',
        payment_method: 'cash',
        transaction_id: receiptNumber || `CASH-${Date.now()}`,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  return { success: true };
}

export async function processMpesaPayment(formData: FormData, isStaffPayment = false): Promise<{ success: boolean; checkoutRequestId: string }> {
  const supabase = await getSupabaseClient();
  
  // Only check auth for user-initiated payments
  if (!isStaffPayment) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('You must be logged in');
  }

  console.log('Server-side FormData:', Object.fromEntries(formData.entries()));

  const id = formData.get('id') as string;
  const type = formData.get('type') as 'appointment' | 'sale';
  const amount = Number(formData.get('amount'));
  const phoneNumber = formData.get('phone') as string;

  if (!id || !type || !amount || !phoneNumber) {
    const missing = [];
    if (!id) missing.push('id');
    if (!type) missing.push('type');
    if (!amount) missing.push('amount');
    if (!phoneNumber) missing.push('phone');
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

  // More robust phone number formatting
  // Remove any non-digit characters first
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  
  // Apply the appropriate formatting based on the input format
  if (formattedPhone.startsWith('254')) {
    // Already in international format - keep as is
  } else if (formattedPhone.startsWith('0')) {
    // Convert 07XXXXXXXX to 2547XXXXXXXX
    formattedPhone = `254${formattedPhone.substring(1)}`;
  } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
    // For numbers starting with 7 or 1, add 254 prefix
    formattedPhone = `254${formattedPhone}`;
  }
  
  // Validate the final format - should be 12 digits for 254XXXXXXXXX format
  // or 13 digits for 254XXXXXXXXXX format (some Kenyan numbers)
  if (!formattedPhone.match(/^254\d{9,10}$/)) {
    throw new Error('Invalid phone number format. Please use format 07XXXXXXXX or 254XXXXXXXXX');
  }

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
    AccountReference: `${type}-${id}`,
    TransactionDesc: `Payment for ${type} ${id}`,
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
      
      if (type === 'appointment') {
      await supabase
        .from('appointments')
        .update({
          payment_method: 'mpesa',
          transaction_id: data.CheckoutRequestID,
        })
          .eq('id', id);
      } else {
        await supabase
          .from('sales')
          .update({
            payment_method: 'mpesa',
            transaction_id: data.CheckoutRequestID,
          })
          .eq('id', id);
      }
      
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

export async function fetchDoctors() {
  const supabase = await getSupabaseClient();
  
  // First get all doctors from profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'doctor');

  if (profilesError) {
    throw new Error(`Failed to fetch doctor profiles: ${profilesError.message}`);
  }

  // Get user IDs
  const userIds = profiles?.map(p => p.id) || [];
  
  // Fetch doctors table data
  const { data: doctors, error: doctorsError } = await supabase
    .from('doctors')
    .select('user_id, license_number, specialty')
    .in('user_id', userIds);

  if (doctorsError) {
    throw new Error(`Failed to fetch doctors table: ${doctorsError.message}`);
  }

  // Create a map of user IDs to doctor data
  const doctorMap = new Map(
    doctors?.map(d => [
      d.user_id,
      { license_number: d.license_number, specialty: d.specialty }
    ]) || []
  );

  return profiles?.map(profile => ({
    id: profile.id,
    full_name: profile.full_name,
    license_number: doctorMap.get(profile.id)?.license_number || '',
    specialty: doctorMap.get(profile.id)?.specialty || ''
  })) || [];
}

// Fetch all patients
export async function fetchPatients(): Promise<Patient[]> {
  const supabase = await getSupabaseClient();
  
  const { data: patients, error } = await supabase
    .from('patients')
    .select('*')
    .order('full_name');

  if (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }

  return patients || [];
}

// Fetch medications with batches
export async function fetchMedications(): Promise<Medication[]> {
  const supabase = await getSupabaseClient();
  
  const { data: medications, error: medError } = await supabase
    .from('medications')
    .select(`
      id,
      name,
      category,
      dosage_form,
      strength,
      unit_price,
      description,
      is_active,
      created_at,
      updated_at,
      batches:medication_batches (
        id,
        batch_number,
        expiry_date,
        quantity,
        unit_price,
        created_at,
        updated_at,
        medication_id
      )
    `)
    .is('is_active', true);

  if (medError) {
    console.error('Error fetching medications:', medError);
    throw medError;
  }

  return (medications || []).map(med => ({
    ...med,
    is_active: med.is_active ?? true,
    created_at: med.created_at || new Date().toISOString(),
    updated_at: med.updated_at || new Date().toISOString(),
    manufacturer: null,
    barcode: null,
    shelf_location: null,
    last_restocked_at: null,
    last_sold_at: null,
    batches: (med.batches || []).map(batch => ({
      id: batch.id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      quantity: batch.quantity,
      unit_price: batch.unit_price,
      supplier_id: undefined // Optional field
    })),
    total_stock: (med.batches || []).reduce((total, batch) => total + (batch.quantity || 0), 0)
  }));
}

// Generate receipt
export async function generateReceipt(params: { 
  patientId?: string;
  appointments?: Appointment[];
  sales?: Sale[];
} | string): Promise<string> {
  const supabase = await getSupabaseClient();
  let receiptContent = '';

  if (typeof params === 'string') {
    // Handle string parameter (backward compatibility)
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', params)
      .single();

    if (receiptError) {
      console.error('Error generating receipt:', receiptError);
      return 'Error generating receipt. Please contact support.';
    }

    // Fetch sale items and medications
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
      .eq('sale_id', receipt.sale_id);

    if (saleItemsError) {
      console.error('Error fetching sale items:', saleItemsError);
    }

    const medicationTotal = saleItems?.reduce((sum, item) => sum + item.total_price, 0) || 0;

    // Fetch appointment details with services
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
      .single();

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError);
    }

    const appointmentTotal = appointment?.services?.price || 0;

    receiptContent = formatReceipt({
      ...receipt,
      created_at: receipt.created_at || new Date().toISOString(),
      items: saleItems?.map(item => ({
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
    // Handle object parameter with patientId, appointments, and sales
    const { patientId, appointments, sales } = params;

    if (!patientId) {
      return 'Error generating receipt. No patient ID provided.';
    }

    // Fetch patient details
    const { data: patient, error: patientError } = await supabase
      .from('profiles')
        .select('*')
      .eq('id', patientId)
        .single();

    if (patientError) {
      console.error('Error fetching patient:', patientError);
      return 'Error generating receipt. Patient not found.';
    }

    // Calculate totals
    const appointmentsTotal = appointments?.reduce((sum, app) => 
        sum + (app.services?.price || 0), 0) || 0;

    const salesTotal = sales?.reduce((sum, sale) => 
      sum + (sale.items?.reduce((itemSum: number, item) => 
        itemSum + (item.quantity * item.unit_price), 0) || 0), 0) || 0;

    const grandTotal = appointmentsTotal + salesTotal;

      receiptContent = formatReceipt({
      id: `REC-${Date.now()}`,
      receipt_number: `REC-${Date.now()}`,
      created_at: new Date().toISOString(),
      amount: grandTotal,
      payment_method: sales?.[0]?.payment_method || appointments?.[0]?.payment_method || 'cash',
      patient: {
        id: patient.id,
        full_name: patient.full_name,
        email: patient.email,
        phone_number: patient.phone_number
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

  return receiptContent;
}

// Fetch inventory with optional search
export async function fetchInventory(search?: string): Promise<Medication[]> {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can fetch inventory');
  }

  // Define the expected shape of medication data from the query
  interface MedicationData {
    id: string;
    name: string;
    category: string;
    dosage_form: string;
    strength: string;
    unit_price: number;
    description: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
    medication_batches: Array<{
      id: string;
      batch_number: string;
      expiry_date: string;
      quantity: number;
      unit_price: number;
    }>;
  }

  let query = supabase
    .from('medications')
    .select(`
      id,
      name,
      category,
      dosage_form,
      strength,
      unit_price,
      description,
      is_active,
      created_at,
      updated_at,
      medication_batches (
        id,
        batch_number,
        expiry_date,
        quantity,
        unit_price
      )
    `)
    .order('name');

  if (search) {
    query = query.or(`name.ilike.%${search}%,dosage_form.ilike.%${search}%,strength.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }

  // Transform the data to match the Medication type
  return (data as MedicationData[] || []).map(medication => ({
    ...medication,
    is_active: medication.is_active ?? true,
    created_at: medication.created_at || new Date().toISOString(),
    updated_at: medication.updated_at || new Date().toISOString(),
    manufacturer: null,
    barcode: null,
    shelf_location: null,
    last_restocked_at: null,
    last_sold_at: null,
    batches: medication.medication_batches?.map(batch => ({
      id: batch.id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      quantity: batch.quantity,
      unit_price: batch.unit_price
    })) || []
  }));
}

// Add or update inventory item
export async function manageInventory(
  item: InventoryItem
): Promise<{ medication_id: string }> {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Not authenticated');
  }

  // Check user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'pharmacist')) {
    throw new Error('Unauthorized: Only admins and pharmacists can manage inventory');
  }

  // Validate required fields
  if (!item.name || !item.category || !item.dosage_form || !item.strength || !item.unit_price) {
    throw new Error('Missing required fields');
  }

  let medication_id = item.medication_id;

  // If no medication_id provided, create a new medication
  if (!medication_id) {
    const { data: newMedication, error: medicationError } = await supabase
      .from('medications')
      .insert({
        name: item.name,
        category: item.category,
        dosage_form: item.dosage_form,
        strength: item.strength,
        unit_price: item.unit_price,
        description: item.description,
        is_active: true
      })
      .select('id')
      .single();

    if (medicationError) throw medicationError;
    medication_id = newMedication.id;
  }

  // If batch information is provided, create a new batch
  if (item.batch_number && item.expiry_date && item.quantity) {
    const { error: batchError } = await supabase
      .from('medication_batches')
      .insert({
        medication_id,
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
        quantity: item.quantity,
        unit_price: item.unit_price
      });

    if (batchError) throw batchError;
  }

  return { medication_id };
}

// Update medication details
export async function updateMedication(id: string, updateData: Partial<InventoryItem>) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can update medications');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('medications')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update medication: ${error.message}`);
  }

  return data;
}

// Delete medication (soft delete)
export async function deleteMedication(id: string) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can delete medications');
  }

  const { error } = await supabase
    .from('medications')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete medication: ${error.message}`);
  }

  return { success: true };
}

// Fetch all suppliers
export async function fetchSuppliers(): Promise<Supplier[]> {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can fetch suppliers');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching suppliers:', error);
    throw new Error(`Failed to fetch suppliers: ${error.message}`);
  }

  return data || [];
}

// Add new supplier
export async function addSupplier(formData: FormData): Promise<Supplier> {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can add suppliers');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const supplierData = {
    name: formData.get('name') as string,
    contact_person: formData.get('contact_person') as string,
    phone_number: formData.get('phone_number') as string,
    email: formData.get('email') as string,
    address: formData.get('address') as string,
    created_at: new Date().toISOString(),
    created_by: user.id,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('suppliers')
    .insert(supplierData)
    .select()
    .single();

  if (error) {
    console.error('Error adding supplier:', error);
    throw new Error(`Failed to add supplier: ${error.message}`);
  }

  return data;
}

// Fetch sales with optional filters
export async function fetchSales(patientId?: string): Promise<Sale[]> {
  const supabase = await getSupabaseClient();
  
  let query = supabase
    .from('sales')
    .select(`
      id,
      created_at,
      created_by,
      patient_id,
      payment_method,
      payment_status,
      total_amount,
      transaction_id,
      updated_at,
      patient:patients (
        full_name,
        phone_number
      ),
      items:sale_items (
        id,
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
      )
    `)
    .order('created_at', { ascending: false });

  // If patientId is provided, validate it's a valid UUID
  if (patientId) {
    // Check if the patientId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      console.error('Invalid patient ID format:', patientId);
      throw new Error('Invalid patient ID format');
    }
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }

  if (!data) return [];

  return data.map(sale => ({
    ...sale,
    created_at: sale.created_at || new Date().toISOString(),
    items: sale.items || []
  })) as Sale[];
}

// Create a new sale
export async function createSale(saleData: {
  patient_id: string;
  items: Array<{
    medication_id: string;
    batch_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  payment_method: string;
  payment_status: string;
  total_amount: number;
}) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // Get unpaid appointments for the patient
    const { data: unpaidAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        services:service_id (name, price)
      `)
      .eq('patient_id', saleData.patient_id)
      .eq('payment_status', 'unpaid');

    if (appointmentsError) {
      throw new Error(`Failed to fetch unpaid appointments: ${appointmentsError.message}`);
    }

    // Calculate appointment total
    const appointmentTotal = unpaidAppointments?.reduce((sum, app) => 
      sum + (app.services?.price || 0), 0) || 0;

    // Calculate medication total
    const medicationTotal = saleData.items.reduce((sum, item) => sum + item.total_price, 0);

    // Calculate grand total
    const grandTotal = medicationTotal + appointmentTotal;

    // Start a transaction
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        patient_id: saleData.patient_id,
        payment_method: saleData.payment_method,
        payment_status: saleData.payment_status,
        total_amount: grandTotal,
        created_by: user.id
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Insert sale items and decrement batch quantities
    for (const item of saleData.items) {
      // Insert sale item
      const { error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          medication_id: item.medication_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        });

      if (itemError) throw itemError;

      // Decrement batch quantity
      const { error: decrementError } = await supabase.rpc('decrement_batch_quantity', {
        p_batch_id: item.batch_id,
        p_quantity: item.quantity
      });

      if (decrementError) throw decrementError;
    }

    return { success: true, data: sale };
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
}

// Update sale status
export async function updateSaleStatus(id: string, updateData: {
  payment_status?: string;
  payment_method?: string;
}): Promise<Sale> {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can update sales');
  }

  const { data, error } = await supabase
    .from('sales')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      patient:patients(full_name, phone_number),
      items:sale_items(
        *,
        medication:medications(id, name, dosage_form, strength),
        batch:medication_batches(batch_number, expiry_date)
      )
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update sale: ${error.message}`);
  }

  return {
    ...data,
    created_at: data.created_at || new Date().toISOString(),
    items: data.items || []
  } as Sale;
}

export async function addBatch(item: {
  medication_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_price: number;
}): Promise<MedicationBatchRow> {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if batch number already exists for this medication
  const { data: existingBatch } = await supabase
    .from('medication_batches')
    .select('*')
    .eq('medication_id', item.medication_id)
    .eq('batch_number', item.batch_number)
    .single();

  if (existingBatch) {
    throw new Error('Batch number already exists for this medication');
  }

  // Create the batch with proper types
  const { data: batch, error: batchError } = await supabase
    .from('medication_batches')
    .insert({
      medication_id: item.medication_id,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      quantity: item.quantity,
      unit_price: item.unit_price
    })
    .select()
    .single();

  if (batchError) {
    throw new Error(batchError.message);
  }

  return batch;
}

export async function fetchBasicMedications(search?: string): Promise<{
  id: string;
  name: string;
  category: string | null;
  dosage_form: string;
  strength: string;
  description: string | null;
}[]> {
  const supabase = await getSupabaseClient();
  
  let query = supabase
    .from('medications')
    .select(`
      id,
      name,
      category,
      dosage_form,
      strength,
      description
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,dosage_form.ilike.%${search}%,strength.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching medications:', error);
    throw new Error(`Failed to fetch medications: ${error.message}`);
  }

  return data || [];
}

// Delete a batch
export async function deleteBatch(batchId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  
  if (!['admin', 'pharmacist'].includes(role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can delete batches');
  }

  const { error } = await supabase
    .from('medication_batches')
    .delete()
    .eq('id', batchId);

  if (error) {
    console.error('Error deleting batch:', error);
    throw error;
  }
}

export async function fetchSupplier(id: string): Promise<Supplier> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSupplier(id: string, updateData: Partial<Supplier>): Promise<Supplier> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('suppliers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPatientSummary(patientId: string): Promise<PatientSummaryData> {
  const supabase = await getSupabaseClient();
  
  // First get the patient data from the patients table
  const { data: patientData, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (patientError) throw new Error(patientError.message);

  // Get prescriptions with medication details
  const { data: prescriptions, error: prescError } = await supabase
    .from('prescriptions')
    .select('id, dosage, quantity, prescription_date, medication_id')
    .eq('patient_id', patientId);

  // Get medications for prescriptions
  const medicationIds = (prescriptions || [])
    .map(p => p.medication_id)
    .filter((id): id is string => id !== null && id !== undefined);
  const { data: medications, error: medError } = await supabase
    .from('medications')
    .select('id, name')
    .in('id', medicationIds);

  // Get sales with medication details
  const { data: rawPurchases, error: purchError } = await supabase
    .from('sales')
    .select(`
      id,
      sale_items (
        quantity,
        unit_price,
        medication_id
      ),
      created_at
    `)
    .eq('patient_id', patientId);

  // Get medications for sales
  const saleMedicationIds = (rawPurchases || [])
    .flatMap(p => p.sale_items?.map(si => si.medication_id) || [])
    .filter((id): id is string => id !== null && id !== undefined);
  const { data: saleMedications, error: saleMedError } = await supabase
    .from('medications')
    .select('id, name')
    .in('id', saleMedicationIds);

  // Get medical records with doctor details
  const { data: rawMedicalRecords, error: recordError } = await supabase
    .from('medical_records')
    .select('id, diagnosis, treatment, record_date, doctor_id')
    .eq('patient_id', patientId);

  // Get doctors and their profiles
  const doctorIds = (rawMedicalRecords || [])
    .map(r => r.doctor_id)
    .filter((id): id is string => id !== null && id !== undefined);
  const { data: doctors, error: docError } = await supabase
    .from('doctors')
    .select('id, user_id')
    .in('id', doctorIds);

  const userIds = (doctors || [])
    .map(d => d.user_id)
    .filter((id): id is string => id !== null && id !== undefined);
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  if (prescError || medError || purchError || saleMedError || recordError || docError || profError) {
    throw new Error(
      prescError?.message || medError?.message || purchError?.message || 
      saleMedError?.message || recordError?.message || docError?.message || 
      profError?.message || 'Failed to fetch patient data'
    );
  }

  // Create lookup maps
  const medicationMap = new Map(medications?.map(m => [m.id, m]) || []);
  const saleMedicationMap = new Map(saleMedications?.map(m => [m.id, m]) || []);
  const doctorMap = new Map(doctors?.map(d => [d.id, d]) || []);
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Transform prescriptions to match the expected type
  const transformedPrescriptions = (prescriptions || []).map((prescription) => {
    const medication = prescription.medication_id ? medicationMap.get(prescription.medication_id) : null;
    return {
      id: prescription.id,
      medication_name: medication?.name || 'Unknown',
      dosage: prescription.dosage || '',
      quantity: prescription.quantity || 0,
      prescription_date: prescription.prescription_date || new Date().toISOString()
    };
  });

  // Transform purchases to match the expected type
  const purchases = (rawPurchases || []).map((purchase) => {
    const saleItem = purchase.sale_items?.[0];
    const medication = saleItem?.medication_id ? saleMedicationMap.get(saleItem.medication_id) : null;
    return {
      id: purchase.id,
      quantity: saleItem?.quantity || 0,
      unit_price: saleItem?.unit_price || 0,
      sale_date: purchase.created_at || new Date().toISOString(),
      medication: {
        name: medication?.name || 'Unknown'
      }
    };
  });

  // Transform medical_records to match the expected type
  const medical_records = (rawMedicalRecords || []).map((record) => {
    const doctor = record.doctor_id ? doctorMap.get(record.doctor_id) : null;
    const profile = doctor?.user_id ? profileMap.get(doctor.user_id) : null;
    return {
      id: record.id,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      record_date: record.record_date || new Date().toISOString(),
      doctor: {
        full_name: profile?.full_name || 'Unknown'
      }
    };
  });

  // Create base data with all required fields
  const baseData = {
    id: patientData.id,
    full_name: patientData.full_name,
    phone_number: patientData.phone_number,
    date_of_birth: patientData.date_of_birth,
    gender: patientData.gender,
    address: patientData.address
  };

  return {
    ...baseData,
    prescriptions: transformedPrescriptions,
    purchases,
    medical_records
  };
}

export async function getUnpaidAppointments(patientId: string) {
  const supabase = await getSupabaseClient();
  
  let query = supabase
    .from('appointments')
    .select(`
      id,
      date,
      time,
      services:service_id (name, price),
      payment_status
    `)
    .eq('payment_status', 'unpaid');
  
  // If patientId is 'all', we don't filter by patient_id
  // For admin/cashier viewing all unpaid appointments
  if (patientId !== 'all') {
    query = query.eq('patient_id', patientId);
  }

  const { data: appointments, error } = await query;

  if (error) {
    console.error('Error fetching unpaid appointments:', error);
    return [];
  }

  return appointments.map(app => ({
    id: app.id,
    date: app.date,
    time: app.time,
    services: app.services,
    payment_status: app.payment_status as 'unpaid' | 'paid' | 'refunded' | null
  }));
}

// Add a new function to fetch stock alerts
export async function fetchStockAlerts(): Promise<{
  lowStock: Array<{
    medication: Medication;
    batch: {
      batch_number: string;
      quantity: number;
      expiry_date: string;
    };
  }>;
  expiring: Array<{
    medication: Medication;
    batch: {
      batch_number: string;
      quantity: number;
      expiry_date: string;
    };
  }>;
}> {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return { lowStock: [], expiring: [] };
  }

  try {
    const { data: medications, error } = await supabase
      .from('medications')
      .select(`
        *,
        medication_batches (
          id,
          batch_number,
          quantity,
          expiry_date,
          unit_price
        )
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching stock alerts:', error);
      return { lowStock: [], expiring: [] };
    }

    const lowStock: Array<{
      medication: Medication;
      batch: {
        batch_number: string;
        quantity: number;
        expiry_date: string;
      };
    }> = [];
    const expiring: Array<{
      medication: Medication;
      batch: {
        batch_number: string;
        quantity: number;
        expiry_date: string;
      };
    }> = [];

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    medications?.forEach(medication => {
      const mappedMedication: Medication = {
        ...medication,
        batches: medication.medication_batches?.map(batch => ({
          id: batch.id,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          quantity: batch.quantity,
          unit_price: batch.unit_price
        })) || []
      };

      medication.medication_batches?.forEach(batch => {
        // Check for low stock (less than 10 units)
        if (batch.quantity < 10) {
          lowStock.push({
            medication: mappedMedication,
            batch: {
              batch_number: batch.batch_number,
              quantity: batch.quantity,
              expiry_date: batch.expiry_date
            }
          });
        }
        
        // Check for expiring items (within 30 days)
        const expiryDate = new Date(batch.expiry_date);
        if (expiryDate <= thirtyDaysFromNow) {
          expiring.push({
            medication: mappedMedication,
            batch: {
              batch_number: batch.batch_number,
              quantity: batch.quantity,
              expiry_date: batch.expiry_date
            }
          });
        }
      });
    });

    return { lowStock, expiring };
  } catch (error) {
    console.error('Error in fetchStockAlerts:', error);
    return { lowStock: [], expiring: [] };
  }
}

export async function fetchDoctorNames(doctorIds: string[]) {
  const supabase = await getSupabaseClient();
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', doctorIds);

    if (error) {
      console.error('Error fetching doctor names:', error);
      return new Map();
    }

    return new Map(profiles?.map(profile => [profile.id, profile.full_name]) || []);
  } catch (error) {
    console.error('Error in fetchDoctorNames:', error);
    return new Map();
  }
}

export async function getAllPendingPayments() {
  const supabase = await getSupabaseClient();
  
  try {
    // Get all unpaid appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('payment_status', 'unpaid');
    
    if (appointmentsError) {
      console.error('Error fetching unpaid appointments:', appointmentsError);
      return { appointmentsCount: 0, salesCount: 0, total: 0 };
    }
    
    // Get all unpaid sales
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id')
      .eq('payment_status', 'unpaid');
    
    if (salesError) {
      console.error('Error fetching unpaid sales:', salesError);
      return { appointmentsCount: appointments.length, salesCount: 0, total: appointments.length };
    }
    
    return {
      appointmentsCount: appointments.length,
      salesCount: sales.length,
      total: appointments.length + sales.length
    };
  } catch (error) {
    console.error('Error in getAllPendingPayments:', error);
    return { appointmentsCount: 0, salesCount: 0, total: 0 };
  }
}

// Fetch payment history for cashier history page
export async function fetchPaymentHistory() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch user role to ensure only authorized users can access payment history
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'cashier')) {
    throw new Error('Unauthorized: Only admins and cashiers can view payment history');
  }

  try {
    // Fetch paid appointments
    const { data: appointmentPayments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        payment_status,
        payment_method,
        transaction_id,
        profiles:patient_id (full_name),
        services:service_id (name, price)
      `)
      .eq('payment_status', 'paid');

    if (appointmentError) {
      console.error('Error fetching appointment payments:', appointmentError);
      throw new Error('Failed to fetch appointment payment history');
    }

    // Fetch paid sales
    const { data: salePayments, error: saleError } = await supabase
      .from('sales')
      .select(`
        id,
        created_at,
        payment_status,
        payment_method,
        transaction_id,
        total_amount,
        patient:patient_id (full_name)
      `)
      .eq('payment_status', 'paid');

    if (saleError) {
      console.error('Error fetching sale payments:', saleError);
      throw new Error('Failed to fetch sales payment history');
    }

    // Define types for transformed payments
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

    // Transform appointment data
    const transformedAppointments: TransformedPayment[] = (appointmentPayments || []).map(app => {
      // Extract profile name safely
      let profileName = 'Unknown';
      try {
        if (app.profiles) {
          if (Array.isArray(app.profiles) && app.profiles.length > 0) {
            profileName = app.profiles[0].full_name || 'Unknown';
          } else if (typeof app.profiles === 'object') {
            profileName = app.profiles.full_name || 'Unknown';
          }
        }
      } catch (e) {
        console.error('Error extracting profile name:', e);
      }

      // Extract service data safely
      let serviceName = 'service';
      let servicePrice = 0;
      try {
        if (app.services) {
          if (Array.isArray(app.services) && app.services.length > 0) {
            serviceName = app.services[0].name || 'service';
            servicePrice = app.services[0].price || 0;
          } else if (typeof app.services === 'object') {
            serviceName = app.services.name || 'service';
            servicePrice = app.services.price || 0;
          }
        }
      } catch (e) {
        console.error('Error extracting service data:', e);
      }

      return {
        id: app.id,
        type: 'appointment',
        patient_name: profileName,
        amount: servicePrice,
        date: app.date,
        payment_method: app.payment_method || 'Unknown',
        transaction_id: app.transaction_id,
        reference: `Appointment for ${serviceName}`
      };
    });

    // Transform sale data
    const transformedSales: TransformedPayment[] = (salePayments || []).map(sale => {
      // Extract patient name safely
      let patientName = 'Unknown';
      try {
        if (sale.patient) {
          if (Array.isArray(sale.patient) && sale.patient.length > 0) {
            patientName = sale.patient[0].full_name || 'Unknown';
          } else if (typeof sale.patient === 'object') {
            patientName = sale.patient.full_name || 'Unknown';
          }
        }
      } catch (e) {
        console.error('Error extracting patient name:', e);
      }

      return {
        id: sale.id,
        type: 'sale',
        patient_name: patientName,
        amount: sale.total_amount,
        date: sale.created_at || new Date().toISOString(), // Ensure date is never null
        payment_method: sale.payment_method || 'Unknown',
        transaction_id: sale.transaction_id,
        reference: `Pharmacy Sale #${sale.id.substring(0, 8)}`
      };
    });

    // Combine all payments
    const allPayments: TransformedPayment[] = [...transformedAppointments, ...transformedSales];
    
    // Type definition for our combined payment
    type CombinedPayment = {
      id: string;
      type: 'appointment' | 'sale' | 'combined';
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
    };

    // Group payments by transaction_id
    const combinedPayments: CombinedPayment[] = [];
    const transactionGroups: Record<string, TransformedPayment[]> = {};
    
    // Only group items that have a transaction_id and were processed together
    allPayments.forEach(payment => {
      if (payment.transaction_id) {
        if (!transactionGroups[payment.transaction_id]) {
          transactionGroups[payment.transaction_id] = [];
        }
        transactionGroups[payment.transaction_id].push(payment);
      } else {
        // Items without transaction_id are kept as individual payments
        combinedPayments.push(payment);
      }
    });

    // Process transaction groups
    Object.entries(transactionGroups).forEach(([transactionId, items]) => {
      if (items.length > 1) {
        // This is a combined payment with multiple items
        const firstItem = items[0];
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        
        // Create a combined payment entry
        combinedPayments.push({
          id: transactionId,
          type: 'combined',
          patient_name: firstItem.patient_name,
          amount: totalAmount,
          date: firstItem.date,
          payment_method: firstItem.payment_method,
          transaction_id: transactionId,
          reference: `Combined payment (${items.length} items)`,
          related_items: items.map(item => ({
            id: item.id,
            type: item.type,
            reference: item.reference,
            amount: item.amount
          }))
        });
      } else {
        // Single item with a transaction_id
        combinedPayments.push(items[0]);
      }
    });

    // Sort by date (newest first)
    const sortedPayments = combinedPayments.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return sortedPayments;
  } catch (error) {
    console.error('Unexpected error during data fetching:', error);
    throw error;
  }
}

/**
 * Creates a guest patient without requiring authentication
 * This allows for walk-in patients or staff-created patient records
 */
export async function createGuestPatient(patientData: {
  full_name: string;
  phone_number: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
}) {
  const supabase = await getSupabaseClient();
  
  // Validate required fields
  if (!patientData.full_name || !patientData.phone_number) {
    throw new Error('Full name and phone number are required');
  }
  
  // Generate a UUID for the patient
  const patientId = uuidv4();
  
  // Create a typed insert object
  const insertData = {
    id: patientId,
    full_name: patientData.full_name,
    phone_number: patientData.phone_number || null,
    date_of_birth: patientData.date_of_birth || null,
    gender: patientData.gender || null,
    address: patientData.address || null,
    user_id: `guest-${patientId}`, // Use a prefix to identify guest patients
    is_registered_user: false
  };
  
  // Insert the patient record
  const { data, error } = await supabase
    .from('patients')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating guest patient:', error);
    throw new Error(`Failed to create patient: ${error.message}`);
  }
  
  return data;
}

/**
 * Server action to create a guest patient
 * This can be called directly from client components
 */
export async function createGuestPatientAction(formData: FormData) {
  try {
    // Extract data from form
    const patientData = {
      full_name: formData.get('full_name') as string,
      phone_number: formData.get('phone_number') as string,
      email: formData.get('email') as string || undefined,
      date_of_birth: formData.get('date_of_birth') as string || undefined,
      gender: formData.get('gender') as string || undefined,
      address: formData.get('address') as string || undefined,
    };
    
    // Validate required fields
    if (!patientData.full_name || !patientData.phone_number) {
      return { 
        success: false, 
        message: 'Full name and phone number are required' 
      };
    }
    
    // Create the guest patient
    const patient = await createGuestPatient(patientData);
    
    return { 
      success: true, 
      patient 
    };
  } catch (error) {
    console.error('Error creating guest patient:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
}