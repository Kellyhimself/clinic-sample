// lib/authActions.ts
'use server';
import { getSupabaseClient } from './supabase';
import { Database } from '../types/supabase';

export type Appointment = {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  services: { name: string; price: number; duration: number };
  profiles: { full_name: string };
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
    options: {
      data: {
        full_name: fullName,
        phone_number: phoneNumber,
      },
    },
  });

  if (authError || !user) throw new Error(authError?.message || 'Signup failed');
}

export async function login(formData: FormData) {
  const supabase = await getSupabaseClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error; // Let LoginForm.tsx handle the error
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

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }
  console.log('Fetched profiles as per the function:', profiles); // Debug log
  return profiles || []; // Ensure array is returned even if no data
}





export async function fetchServices() {
  const supabase = await getSupabaseClient();
  const { data: services, error } = await supabase
    .from('services')
    .select('id, name, price, duration')
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch services: ${error.message}`);

  return services as {
    id: string;
    name: string;
    price: number;
    duration: number;
  }[];
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

  // Check for existing appointments at the same date/time if using a predefined service
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
      service_id: serviceId || null, // Null if custom service
      date,
      time,
      status: 'pending',
      notes: customService || formData.get('notes') as string || '',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchAppointments(userRole?: string) {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be logged in');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) throw new Error('Failed to fetch user role');

  const effectiveRole = userRole || profile.role;
  const isAdmin = effectiveRole === 'admin';
  const isStaff = effectiveRole === 'staff';
  const isPatient = effectiveRole === 'patient';

  let query = supabase
    .from('appointments')
    .select(`
      id,
      date,
      time,
      status,
      notes,
      services ( id, name, price, duration ),
      profiles ( id, full_name )
    `)
    .order('date', { ascending: false });

  if (isPatient) {
    query = query.eq('patient_id', user.id);
  } else if (!isAdmin && !isStaff) {
    throw new Error('You do not have permission to view appointments');
  }

  const { data: appointments, error } = await query;
  if (error) throw new Error(error.message);

  // Define the raw type using generated types
  type RawAppointment = Database['public']['Tables']['appointments']['Row'] & {
    services: Database['public']['Tables']['services']['Row'] | null;
    profiles: Database['public']['Tables']['profiles']['Row'] | null;
  };

  // Assert the type with double cast to match RawAppointment
  const transformedAppointments: Appointment[] = (appointments as unknown as RawAppointment[]).map((appt) => ({
    id: appt.id,
    date: appt.date,
    time: appt.time,
    status: appt.status as 'pending' | 'confirmed' | 'cancelled', // Narrow the type
    notes: appt.notes || '',
    services: appt.services
      ? {
          name: appt.services.name,
          price: appt.services.price,
          duration: appt.services.duration,
        }
      : { name: 'Custom', price: 0, duration: 0 },
    profiles: appt.profiles
      ? { full_name: appt.profiles.full_name || 'Unknown' }
      : { full_name: 'Unknown' },
  }));

  return transformedAppointments;
}