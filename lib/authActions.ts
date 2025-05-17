'use server';
import { createClient } from '@/app/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type {
 
  Sale, 
  

  Supplier,
  PatientSummaryData, 
  SaleItem, 
  } from '@/types/supabase';
import { createGuestPatient } from '@/lib/patients';
import { checkUsageLimit } from '@/app/lib/server-utils';
import { TimeframeType } from '@/components/shared/sales/SalesFilterBar';
import { getDateRangeFromTimeframe } from '@/lib/utils/dateUtils';

// Local type for appointments
export type AppointmentData = {
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

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const phoneNumber = formData.get('phoneNumber') as string;
  const invitationToken = formData.get('token') as string;

  try {
    // Verify the invitation token
    const { data: invitationData, error: tokenError } = await supabase
      .rpc('verify_invitation_token', { token_input: invitationToken });

    if (tokenError || !invitationData || invitationData.length === 0) {
      throw new Error('Invalid or expired invitation token');
    }

    const invitation = invitationData[0];
    const { id: invitationId, email: invitedEmail, role } = invitation;

    // Verify email matches the invitation
    if (email !== invitedEmail) {
      throw new Error('Email does not match the invitation');
    }

    // Create the user account
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      throw signUpError;
    }

    if (!user.user) {
      throw new Error('Failed to create user account');
    }

    let tenantId: string;

    // Handle tenant creation for admin role
    if (role === 'admin') {
      // Create new tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: `${fullName}'s Clinic`,
          status: 'active'
        })
        .select()
        .single();

      if (tenantError) {
        throw new Error('Failed to create tenant');
      }

      tenantId = tenant.id;

      // Update invitation with tenant_id
      await supabase
        .from('staff_invitations')
        .update({ 
          tenant_id: tenantId,
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);
    } else {
      // For non-admin roles, get tenant_id from invitation
      tenantId = invitation.tenant_id;
      if (!tenantId) {
        throw new Error('No tenant associated with this invitation');
      }

      // Update invitation status
      await supabase
        .from('staff_invitations')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);
    }

    // Create profile with tenant context
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.user.id,
      email,
          full_name: fullName,
          phone_number: phoneNumber,
          role,
        tenant_id: tenantId
      });

    if (profileError) {
      throw profileError;
    }

    // Create role-specific records based on the assigned role
    if (role === 'doctor') {
      const { error: doctorError } = await supabase
        .from('doctors')
        .insert({
          user_id: user.user.id,
          license_number: formData.get('licenseNumber') as string,
          specialty: formData.get('specialty') as string,
          tenant_id: tenantId
        });

      if (doctorError) {
        throw doctorError;
      }
    } else if (role === 'pharmacist') {
      const { error: pharmacistError } = await supabase
        .from('pharmacists')
      .insert({
          user_id: user.user.id,
          license_number: formData.get('licenseNumber') as string,
          specialization: formData.get('specialization') as string,
          tenant_id: tenantId
        });

      if (pharmacistError) {
        throw pharmacistError;
      }
    } else if (role === 'admin') {
      const permissions = JSON.parse(formData.get('permissions') as string) as string[];
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          user_id: user.user.id,
          department: formData.get('department') as string,
          permissions,
          tenant_id: tenantId
        });

      if (adminError) {
        throw adminError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

export async function login(email: string, password: string) {
  try {
    const supabase = await createClient();
    
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone_number, role, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);
  
  return profiles || [];
}

export async function fetchServices() {
  const supabase = await createClient();
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
  const supabase = await createClient();
  let patientId: string;
  
  // Staff booking flow - can book for existing or guest patients
  if (options?.isStaffBooking) {
    if (options.patientId) {
      // Booking for an existing patient (could be regular or guest)
      patientId = options.patientId;
    } else if (options.guestPatientData) {
      // Create a guest patient and then book for them
      try {
        const result = await createGuestPatient(options.guestPatientData);
        if (!result.success || !result.patient) {
          throw new Error(result.message || 'Failed to create guest patient');
        }
        patientId = result.patient.id;
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
      .from('all_patients')
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
  const doctorId = formData.get('doctorId') as string;
  const date = formData.get('date') as string;
  const time = formData.get('time') as string;
  const notes = formData.get('notes') as string;

  if (!doctorId || (!serviceId && !customService) || !date || !time) {
    throw new Error('Missing required fields for appointment booking');
  }

  // Get the service details
  let serviceName = customService;
  let servicePrice = 0;
  let serviceDuration = 30; // Default duration in minutes

  if (serviceId && !customService) {
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('name, price, duration')
      .eq('id', serviceId)
    .single();

    if (serviceError || !service) {
      throw new Error('Invalid service selected');
    }
    
    serviceName = service.name;
    servicePrice = service.price;
    serviceDuration = service.duration;
  }

  // Log the service details for tracking
  console.log('Booking appointment with service:', { serviceName, servicePrice, serviceDuration });

  try {
    // Check for scheduling conflicts for the doctor
    const { data: conflicts, error: conflictError } = await supabase
    .from('appointments')
      .select('id, time')
      .eq('doctor_id', doctorId)
    .eq('date', date)
      .neq('status', 'cancelled');
    
    if (conflictError) {
      throw new Error('Failed to check doctor availability');
    }
    
    // Simple conflict check - ensure appointments don't overlap
    // This is a basic check, for a real system you'd want more sophisticated time slot validation
    if (conflicts && conflicts.length > 0) {
      // Check if the requested time overlaps with existing appointments
      const requestedHour = parseInt(time.split(':')[0]);
      const requestedMinute = parseInt(time.split(':')[1]);
      
      for (const conflict of conflicts) {
        const conflictHour = parseInt(conflict.time.split(':')[0]);
        const conflictMinute = parseInt(conflict.time.split(':')[1]);
        
        // Check if appointments are less than the service duration apart
        const requestedTimeInMinutes = requestedHour * 60 + requestedMinute;
        const conflictTimeInMinutes = conflictHour * 60 + conflictMinute;
        
        if (Math.abs(requestedTimeInMinutes - conflictTimeInMinutes) < serviceDuration) {
          throw new Error('The doctor already has an appointment at this time');
        }
      }
    }
    
    // Create the appointment
    const insertPayload: any = {
    patient_id: patientId,
    doctor_id: doctorId,
    date,
    time,
    status: 'pending',
      notes: notes || null,
      payment_status: 'unpaid',
    };
    
    // Add service_id only if it exists
    if (serviceId) {
      insertPayload.service_id = serviceId;
    }
    
    const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
      .insert(insertPayload)
    .select()
    .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      throw new Error('Failed to create appointment');
    }
    
    return { success: true, data: appointment };
  } catch (error) {
    console.error('Error in bookAppointment:', error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'An unexpected error occurred' };
  }
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
        message: result.message || "Failed to book appointment. Please try again."
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
  const supabase = await createClient();
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
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        notes,
        services:service_id (
          name,
          price,
          duration
        ),
        doctor_id,
        payment_status,
        payment_method,
        transaction_id,
        patient_id
      `);

    if (userRole === 'patient' && userId) {
      query = query.eq('patient_id', userId);
    }

    const { data: appointments, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      return [];
    }

    if (!appointments || appointments.length === 0) {
      return [];
    }

    // Get unique doctor IDs and filter out any null/undefined values
    const doctorIds = [...new Set(appointments
      .map(appt => appt.doctor_id)
      .filter((id): id is string => id !== null && id !== undefined)
    )];

    // Prepare arrays for patient processing
    const regularPatientIds: string[] = [];
    const guestPatientIds: string[] = [];
    
    // Categorize patient IDs
    appointments.forEach(appt => {
      if (appt.patient_id) {
        if (appt.patient_id.startsWith('guest_')) {
          // Extract UUID from guest_UUID format
          const guestId = appt.patient_id.substring(6);
          guestPatientIds.push(guestId);
        } else {
          regularPatientIds.push(appt.patient_id);
        }
      }
    });

    // Fetch regular patient data if any
    const regularPatientMap = new Map<string, string>();
    if (regularPatientIds.length > 0) {
      const { data: patients } = await supabase
        .from('patients')
        .select('id, full_name')
        .in('id', regularPatientIds);
      
      if (patients && patients.length > 0) {
        patients.forEach(patient => {
          regularPatientMap.set(patient.id, patient.full_name);
        });
      }
    }

    // Fetch guest patient data if any
    const guestPatientMap = new Map<string, string>();
    if (guestPatientIds.length > 0) {
      const { data: guestPatients } = await supabase
        .from('guest_patients')
        .select('id, full_name')
        .in('id', guestPatientIds);
      
      if (guestPatients && guestPatients.length > 0) {
        guestPatients.forEach(patient => {
          guestPatientMap.set(`guest_${patient.id}`, patient.full_name);
        });
      }
    }

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
        patient: { 
          full_name: getPatientName(appt.patient_id, regularPatientMap, guestPatientMap) 
        },
        doctor: null,
        payment_status: appt.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
        payment_method: appt.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
        transaction_id: appt.transaction_id || null,
        patient_id: appt.patient_id
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
        patient: { 
          full_name: getPatientName(appt.patient_id, regularPatientMap, guestPatientMap) 
        },
        doctor: null,
        payment_status: appt.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
        payment_method: appt.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
        transaction_id: appt.transaction_id || null,
        patient_id: appt.patient_id
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
        patient: { 
          full_name: getPatientName(appt.patient_id, regularPatientMap, guestPatientMap) 
        },
        doctor: null,
        payment_status: appt.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
        payment_method: appt.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
        transaction_id: appt.transaction_id || null,
        patient_id: appt.patient_id
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
      patient: { 
        full_name: getPatientName(appt.patient_id, regularPatientMap, guestPatientMap) 
      },
      doctor: appt.doctor_id ? {
        full_name: doctorProfileMap.get(appt.doctor_id) || 'Unknown Doctor'
      } : null,
      payment_status: appt.payment_status as 'unpaid' | 'paid' | 'refunded' | undefined,
      payment_method: appt.payment_method as 'mpesa' | 'cash' | 'bank' | undefined,
      transaction_id: appt.transaction_id || null,
      patient_id: appt.patient_id
    }));
  } catch (error) {
    console.error('Error in fetchAppointments:', error);
    return [];
  }
}

// Helper function to get patient name from either regular or guest patient maps
function getPatientName(
  patientId: string | null, 
  regularPatientMap: Map<string, string>, 
  guestPatientMap: Map<string, string>
): string {
  if (!patientId) return 'Unknown Patient';
  
  if (patientId.startsWith('guest_')) {
    return guestPatientMap.get(patientId) || 'Unknown Guest Patient';
  } else {
    return regularPatientMap.get(patientId) || 'Unknown Patient';
  }
}

export async function fetchDoctors() {
  const supabase = await createClient();
  
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

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchMedicationSalesMetrics(tenantId: string) {
  console.log('=== fetchMedicationSalesMetrics START ===');
  console.log('Fetching metrics for tenant:', tenantId);

  try {
    const supabase = await createClient();
    
    // Get medication sales with all necessary joins
    const { data: medicationSales, error: medicationError } = await supabase
      .from('sale_items')
      .select(`
        id,
        sale_id,
        medication_id,
        batch_id,
        quantity,
        unit_price,
        total_price,
        tenant_id,
        created_at,
        medications (
          id,
          name,
          dosage_form,
          strength
        ),
        medication_batches (
          id,
          batch_number,
          expiry_date
        ),
        sales (
          id,
          created_at
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (medicationError) {
      console.error('Error fetching medication sales:', medicationError);
      return null;
    }

    console.log('Medication sales query result:', {
      count: medicationSales?.length || 0,
      firstItemId: medicationSales?.[0]?.id,
      lastItemId: medicationSales?.[medicationSales.length - 1]?.id
    });

    // Calculate total quantity sold for each medication
    const medicationCounts = medicationSales?.reduce((acc, item) => {
      const key = item.medication_id;
      if (!acc[key]) {
        acc[key] = {
          name: item.medications?.name || 'Unknown',
          dosage_form: item.medications?.dosage_form,
          strength: item.medications?.strength,
          totalQuantity: 0,
          totalRevenue: 0
        };
      }
      acc[key].totalQuantity += item.quantity;
      acc[key].totalRevenue += parseFloat(item.total_price);
      return acc;
    }, {} as Record<string, { 
      name: string; 
      dosage_form?: string; 
      strength?: string; 
      totalQuantity: number;
      totalRevenue: number;
    }>) || {};

    // Find the medication with the highest total quantity
    const mostSoldMedication = Object.entries(medicationCounts)
      .sort(([, a], [, b]) => b.totalQuantity - a.totalQuantity)[0];

    const metrics = {
      mostSoldMedication: mostSoldMedication ? {
        name: mostSoldMedication[1].name,
        dosage_form: mostSoldMedication[1].dosage_form,
        strength: mostSoldMedication[1].strength,
        totalQuantity: mostSoldMedication[1].totalQuantity,
        totalRevenue: mostSoldMedication[1].totalRevenue
      } : null,
      medicationCounts
    };

    console.log('Calculated medication metrics:', {
      mostSoldMedication: metrics.mostSoldMedication,
      totalMedications: Object.keys(medicationCounts).length
    });

    console.log('=== fetchMedicationSalesMetrics SUCCESS ===');
    return metrics;
  } catch (error) {
    console.error('=== fetchMedicationSalesMetrics ERROR ===');
    console.error('Error in fetchMedicationSalesMetrics:', error);
    return null;
  }
}

export async function fetchMedicationSales(
  tenantId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: any[]; error: string | null }> {
  console.log('=== fetchMedicationSales START ===');
  console.log('Input parameters:', { tenantId, page, pageSize });

  try {
    const supabase = await createClient();
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Execute the query with the exact structure requested
    const { data: medicationSales, error: salesError } = await supabase
      .from('sale_items')
      .select(`
        id,
        sale_id,
        medication_id,
        batch_id,
        quantity,
        unit_price,
        total_price,
        tenant_id,
        created_at,
        medications (
          id,
          name,
          dosage_form,
          strength
        ),
        medication_batches (
          id,
          batch_number,
          expiry_date
        ),
        sales (
          id,
          created_at
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (salesError) {
      console.error('Error fetching medication sales:', salesError);
      return { data: [], error: salesError.message };
    }

    console.log('Medication sales query result:', {
      count: medicationSales?.length || 0,
      firstItemId: medicationSales?.[0]?.id,
      lastItemId: medicationSales?.[medicationSales.length - 1]?.id
    });

    // Transform the data to match the requested structure
    const transformedSales = medicationSales?.map(item => ({
      id: item.id,
      sale_id: item.sale_id,
      medication_id: item.medication_id,
      batch_id: item.batch_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      tenant_id: item.tenant_id,
      created_at: item.created_at,
      medication_name: item.medications?.name,
      batch_number: item.medication_batches?.batch_number,
      sale_date: item.sales?.created_at
    })) || [];

    console.log('=== fetchMedicationSales SUCCESS ===');
    return { data: transformedSales, error: null };
  } catch (error) {
    console.error('=== fetchMedicationSales ERROR ===');
    console.error('Error in fetchMedicationSales:', error);
    return { data: [], error: 'An unexpected error occurred' };
  }
}

export async function fetchSales(
  searchTerm: string = '',
  timeframe: string = 'all',
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: Sale[]; error: string | null }> {
  console.log('=== fetchSales START ===');
  console.log('Input parameters:', { searchTerm, timeframe, page, pageSize });
  
  try {
    const supabase = await createClient();
    console.log('Supabase client created');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Auth user:', { userId: user?.id, email: user?.email, error: userError });
    
    if (!user) {
      console.error('No authenticated user found');
      return { data: [], error: 'Not authenticated' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    console.log('User profile:', { 
      role: profile?.role, 
      tenantId: profile?.tenant_id,
      userId: user.id,
      error: profileError 
    });

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { data: [], error: 'Failed to fetch user profile' };
    }

    if (!profile || !['admin', 'pharmacist', 'cashier'].includes(profile.role)) {
      console.error('Unauthorized role:', profile?.role);
      return { data: [], error: 'Unauthorized: Only admins, pharmacists and cashiers can fetch sales' };
    }

    if (!profile.tenant_id) {
      console.error('No tenant ID found for user:', user.id);
      return { data: [], error: 'No tenant ID found for user' };
    }

    // Set tenant context
    console.log('Setting tenant context for:', profile.tenant_id);
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      console.error('Error setting tenant context:', setContextError);
      return { data: [], error: 'Failed to set tenant context' };
    }

    // Get tenant ID from context to verify it was set correctly
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id');

    if (getTenantError || !tenantId) {
      console.error('Error getting tenant ID from context:', getTenantError);
      return { data: [], error: 'Failed to get tenant ID from context' };
    }

    console.log('Tenant context set successfully:', { 
      expectedTenantId: profile.tenant_id,
      actualTenantId: tenantId 
    });

    // Calculate date range based on timeframe
    let startDate = null;
    let endDate = null;

    if (timeframe !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (timeframe) {
        case 'today':
          startDate = today.toISOString();
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'year':
          startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
      }
    }

    console.log('Date range:', { startDate, endDate, timeframe });

    // Build the query with left joins
    let query = supabase
      .from('sales')
      .select(`
        id,
        created_at,
        payment_method,
        payment_status,
        total_amount,
        transaction_id,
        created_by,
        tenant_id,
        patient_id,
        updated_at,
        patient:guest_patients (
          id,
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
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    // Apply date filtering if timeframe is not 'all'
    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lt('created_at', endDate);
    }

    // Apply search term if provided
    if (searchTerm) {
      query = query.or(`patient.full_name.ilike.%${searchTerm}%`);
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    console.log('Executing sales query with params:', {
      tenantId: profile.tenant_id,
      offset,
      pageSize,
      hasDateFilter: !!startDate,
      hasSearchTerm: !!searchTerm
    });

    const { data: sales, error: salesError } = await query;

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return { data: [], error: salesError.message };
    }

    console.log('Sales query result:', {
      count: sales?.length || 0,
      firstSaleId: sales?.[0]?.id,
      lastSaleId: sales?.[sales.length - 1]?.id
    });

    if (!sales || sales.length === 0) {
      console.log('No sales found for the given criteria');
      return { data: [], error: null };
    }

    console.log('=== fetchSales SUCCESS ===');
    return { data: sales, error: null };
  } catch (error) {
    console.error('=== fetchSales ERROR ===');
    console.error('Error in fetchSales:', error);
    return { data: [], error: 'An unexpected error occurred' };
  }
}

export async function fetchSupplier(id: string): Promise<Supplier> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSupplier(id: string, updateData: Partial<Supplier>): Promise<Supplier> {
  const supabase = await createClient();
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
  const supabase = await createClient();
  
  // Get the patient data using the get_patient_by_id function instead of querying patients table directly
  // This handles both regular patients and guest patients
  const { data: patientData, error: patientError } = await supabase
    .rpc('get_patient_by_id', { p_id: patientId });

  if (patientError || !patientData) {
    console.error('Error fetching patient:', patientError);
    throw new Error(patientError?.message || 'Failed to fetch patient data');
  }

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
  const supabase = await createClient();
  
  let query = supabase
    .from('appointments')
    .select(`
      id,
      date,
      time,
      services:service_id (name, price),
      payment_status,
      patient_id
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

  // If no appointments found or there was an error
  if (!appointments || appointments.length === 0) {
    return [];
  }

  // Process patient information for display
  const regularPatientIds: string[] = [];
  const guestPatientIds: string[] = [];
  
  // Categorize patient IDs
  appointments.forEach(appt => {
    if (appt.patient_id) {
      if (appt.patient_id.startsWith('guest_')) {
        // Extract UUID from guest_UUID format
        const guestId = appt.patient_id.substring(6);
        guestPatientIds.push(guestId);
      } else {
        regularPatientIds.push(appt.patient_id);
      }
    }
  });

  // Fetch regular patient data if any
  const regularPatientMap = new Map<string, string>();
  if (regularPatientIds.length > 0) {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, full_name')
      .in('id', regularPatientIds);
    
    if (patients && patients.length > 0) {
      patients.forEach(patient => {
        regularPatientMap.set(patient.id, patient.full_name);
      });
    }
  }

  // Fetch guest patient data if any
  const guestPatientMap = new Map<string, string>();
  if (guestPatientIds.length > 0) {
    const { data: guestPatients } = await supabase
      .from('guest_patients')
      .select('id, full_name')
      .in('id', guestPatientIds);
    
    if (guestPatients && guestPatients.length > 0) {
      guestPatients.forEach(patient => {
        guestPatientMap.set(`guest_${patient.id}`, patient.full_name);
      });
    }
  }

  return appointments.map(app => ({
    id: app.id,
    date: app.date,
    time: app.time,
    services: app.services,
    payment_status: app.payment_status as 'unpaid' | 'paid' | 'refunded' | null,
    patient_name: getPatientName(app.patient_id, regularPatientMap, guestPatientMap)
  }));
}


export async function fetchDoctorNames(doctorIds: string[]) {
  const supabase = await createClient();
  
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

export async function createSale(saleData: {
  patient_id?: string;
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
  console.log('=== createSale START ===');
  console.log('Received sale data:', {
    patientId: saleData.patient_id,
    itemsCount: saleData.items.length,
    paymentMethod: saleData.payment_method,
    totalAmount: saleData.total_amount
  });

  try {
    const supabase = await createClient();
    console.log('Supabase client created');

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
      throw new Error('Unauthorized: Only admins, pharmacists and cashiers can create sales');
    }

    if (!profile.tenant_id) {
      throw new Error('No tenant ID found for user');
    }

    // Set tenant context
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      throw new Error('Failed to set tenant context');
    }

    // Get tenant ID from context
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id');

    if (getTenantError || !tenantId) {
      throw new Error('Failed to get tenant ID');
    }

    // Check transaction limits
    console.log('Checking transaction limits...');
    const { allowed, current, limit } = await checkUsageLimit(tenantId, 'max_transactions_per_month');
    console.log('Transaction limit check result:', { allowed, current, limit });

    if (!allowed) {
      console.error('Transaction limit reached:', { current, limit });
      throw new Error(`Transaction limit reached (${current}/${limit}). Please upgrade your plan to continue making sales.`);
    }

    // Only validate patient if patient_id is provided
    if (saleData.patient_id) {
      console.log('Validating patient:', saleData.patient_id);
      // Check the guest_patients table directly
      const { data: patientData, error: patientError } = await supabase
        .from('guest_patients')
        .select('id, patient_type')
        .eq('id', saleData.patient_id)
        .eq('tenant_id', tenantId)
        .single();

      console.log('Patient validation result:', {
        hasData: !!patientData,
        error: patientError ? patientError.message : 'none'
      });

      if (patientError) {
        console.error('Error validating patient:', patientError);
        throw new Error('Invalid patient ID or patient not found');
      }

      if (!patientData) {
        console.error('Patient not found:', saleData.patient_id);
        throw new Error('Patient not found');
      }

      // Calculate totals
      const medicationTotal = saleData.items.reduce((sum, item) => sum + item.total_price, 0);
      const appointmentTotal = 0; // Quick sales don't include appointments
      const grandTotal = medicationTotal + appointmentTotal;

      console.log('Creating sale with totals:', {
        medicationTotal,
        appointmentTotal,
        grandTotal,
        patientId: saleData.patient_id
      });

      // Start a transaction
      console.log('Creating sale record...');
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          patient_id: saleData.patient_id,
          payment_method: saleData.payment_method,
          payment_status: saleData.payment_status,
          total_amount: grandTotal,
          created_by: user.id,
          tenant_id: tenantId
        })
        .select()
        .single();

      console.log('Sale creation result:', {
        hasData: !!sale,
        error: saleError ? saleError.message : 'none'
      });

      if (saleError) {
        console.error('Error creating sale:', saleError);
        throw saleError;
      }

      // Insert sale items and decrement batch quantities
      console.log('Processing sale items...');
      for (const item of saleData.items) {
        console.log('Processing item:', {
          medicationId: item.medication_id,
          batchId: item.batch_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          tenantId: tenantId
        });

        try {
          // Insert sale item with explicit tenant_id
          console.log('Attempting to insert sale item...');
          const { data: insertedItem, error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              medication_id: item.medication_id,
              batch_id: item.batch_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              tenant_id: tenantId
            })
            .select()
            .single();

          if (itemError) {
            console.error('Error inserting sale item:', {
              error: itemError,
              details: itemError.details,
              hint: itemError.hint,
              code: itemError.code,
              saleId: sale.id,
              tenantId: tenantId,
              item: {
                medicationId: item.medication_id,
                batchId: item.batch_id,
                quantity: item.quantity
              }
            });
            // Attempt to rollback the sale creation
            await supabase.from('sales').delete().eq('id', sale.id);
            throw itemError;
          }

          if (!insertedItem) {
            console.error('No data returned after sale item insertion');
            await supabase.from('sales').delete().eq('id', sale.id);
            throw new Error('Failed to insert sale item: No data returned');
          }

          console.log('Sale item created successfully:', {
            itemId: insertedItem.id,
            saleId: sale.id,
            tenantId: tenantId,
            medicationId: item.medication_id,
            batchId: item.batch_id,
            quantity: item.quantity
          });

          // Verify the sale item was created
          const { data: verifyItem, error: verifyError } = await supabase
            .from('sale_items')
            .select('*')
            .eq('id', insertedItem.id)
            .single();

          if (verifyError) {
            console.error('Error verifying sale item:', {
              error: verifyError,
              itemId: insertedItem.id
            });
            await supabase.from('sales').delete().eq('id', sale.id);
            throw verifyError;
          }

          if (!verifyItem) {
            console.error('Sale item not found after creation');
            await supabase.from('sales').delete().eq('id', sale.id);
            throw new Error('Sale item not found after creation');
          }

          console.log('Sale item verification successful:', {
            itemId: verifyItem.id,
            saleId: verifyItem.sale_id,
            tenantId: verifyItem.tenant_id
          });

          // Decrement batch quantity
          console.log('Decrementing batch quantity...');
          const { error: decrementError } = await supabase.rpc('decrement_batch_quantity', {
            p_batch_id: item.batch_id,
            p_quantity: item.quantity
          });

          if (decrementError) {
            console.error('Error decrementing batch quantity:', {
              error: decrementError,
              details: decrementError.details,
              hint: decrementError.hint,
              code: decrementError.code
            });
            // Attempt to rollback the sale creation and items
            await supabase.from('sale_items').delete().eq('sale_id', sale.id);
            await supabase.from('sales').delete().eq('id', sale.id);
            throw decrementError;
          }

          console.log('Batch quantity decremented successfully');
        } catch (error) {
          console.error('Error in sale item processing:', error);
          // Attempt to rollback the sale creation
          await supabase.from('sales').delete().eq('id', sale.id);
          throw error;
        }
      }

      console.log('=== createSale SUCCESS ===');
      return { success: true, data: sale };
    }

    // If no patient_id provided, this is a quick sale
    console.log('Processing quick sale...');
    const medicationTotal = saleData.items.reduce((sum, item) => sum + item.total_price, 0);
    const grandTotal = medicationTotal;

    // Create the sale
    console.log('Creating quick sale record...');
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        payment_method: saleData.payment_method,
        payment_status: saleData.payment_status,
        total_amount: grandTotal,
        created_by: user.id,
        tenant_id: tenantId
      })
      .select()
      .single();

    console.log('Quick sale creation result:', {
      hasData: !!sale,
      error: saleError ? saleError.message : 'none'
    });

    if (saleError) {
      console.error('Error creating quick sale:', saleError);
      throw saleError;
    }

    // Insert sale items and decrement batch quantities
    console.log('Processing quick sale items...');
    for (const item of saleData.items) {
      console.log('Processing quick sale item:', {
        medicationId: item.medication_id,
        batchId: item.batch_id,
        quantity: item.quantity
      });

      // Insert sale item with explicit tenant_id
      const { error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          medication_id: item.medication_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          tenant_id: tenantId
        });

      if (itemError) {
        console.error('Error inserting quick sale item:', itemError);
        // Attempt to rollback the sale creation
        await supabase.from('sales').delete().eq('id', sale.id);
        throw itemError;
      }

      // Decrement batch quantity
      console.log('Decrementing batch quantity for quick sale...');
      const { error: decrementError } = await supabase.rpc('decrement_batch_quantity', {
        p_batch_id: item.batch_id,
        p_quantity: item.quantity
      });

      if (decrementError) {
        console.error('Error decrementing batch quantity for quick sale:', decrementError);
        // Attempt to rollback the sale creation and items
        await supabase.from('sale_items').delete().eq('sale_id', sale.id);
        await supabase.from('sales').delete().eq('id', sale.id);
        throw decrementError;
      }
    }

    console.log('=== createSale SUCCESS (Quick Sale) ===');
    return { success: true, data: sale };
  } catch (error) {
    console.error('=== createSale ERROR ===');
    console.error('Error in createSale:', error);
    throw error;
  }
}
