// app/(auth)/appointments/page.tsx
import { fetchAppointments } from "@/lib/authActions";
import { getSupabaseClient } from "@/lib/supabase";
import AppointmentsTable from "@/components/AppointmentsTable";
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export default async function AppointmentsPage() {
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

  if (profileError) {
    console.error('AppointmentsPage - Failed to fetch profile:', profileError.message);
    // Optionally redirect or throw an error
    // redirect('/error');
  }

  const userRole = profile?.role || 'patient';
  console.log('AppointmentsPage - Determined userRole:', userRole);

  const appointments = await fetchAppointments(userRole);

  async function confirmAppointment(formData: FormData) {
    'use server';
    const supabase = await import('@/lib/supabase').then((m) => m.getSupabaseClient());
    const id = formData.get('id') as string;
    await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id);
    revalidatePath('/appointments');
  }

  async function cancelAppointment(formData: FormData) {
    'use server';
    const supabase = await import('@/lib/supabase').then((m) => m.getSupabaseClient());
    const id = formData.get('id') as string;
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    revalidatePath('/appointments');
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Appointments</h1>
      <AppointmentsTable
        appointments={appointments}
        userRole={userRole}
        confirmAppointment={confirmAppointment}
        cancelAppointment={cancelAppointment}
      />
    </div>
  );
}