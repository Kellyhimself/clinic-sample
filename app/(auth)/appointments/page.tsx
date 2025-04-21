// app/(auth)/appointments/page.tsx
import {
  fetchAppointments,
} from "@/lib/authActions";
import { getSupabaseClient } from '@/lib/supabase-server';
import AppointmentsTable from "@/components/AppointmentsTable";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from "@/types/supabase";
import { Appointment } from "@/types/supabase";

export default async function AppointmentsPage() {
  const supabase: SupabaseClient<Database> = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("AppointmentsPage - Failed to fetch profile:", profileError.message);
  }

  const userRole = profile?.role || "patient";
  console.log("AppointmentsPage - User role:", userRole);
  
  try {
    // Pass user ID for patient-specific appointments
    const rawAppointments = await fetchAppointments(userRole, user.id);
    console.log("AppointmentsPage - Fetched appointments:", rawAppointments.length);
    
    // Transform the appointments to match the expected type
    const appointments: Appointment[] = rawAppointments.map(appt => ({
      id: appt.id,
      date: appt.date,
      time: appt.time,
      status: appt.status,
      notes: appt.notes || '',
      services: appt.services,
      profiles: appt.patient ? { full_name: appt.patient.full_name } : null,
      payment_status: appt.payment_status,
      payment_method: appt.payment_method,
      transaction_id: appt.transaction_id,
      doctor: appt.doctor
    }));

    async function confirmAppointment(formData: FormData) {
      "use server";
      try {
        const supabase = await getSupabaseClient();
        const id = formData.get("id") as string;
        
        if (!id) {
          throw new Error("Appointment ID is required");
        }

        const { error } = await supabase
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", id);

        if (error) {
          throw error;
        }

        revalidatePath("/appointments");
      } catch (error) {
        console.error("Error confirming appointment:", error);
        throw error;
      }
    }

    async function cancelAppointment(formData: FormData) {
      "use server";
      try {
        const supabase = await getSupabaseClient();
        const id = formData.get("id") as string;
        
        if (!id) {
          throw new Error("Appointment ID is required");
        }

        const { error } = await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", id);

        if (error) {
          throw error;
        }

        revalidatePath("/appointments");
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        throw error;
      }
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
  } catch (error) {
    console.error("AppointmentsPage - Error rendering appointments:", error);
    return (
      <div className="container mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Appointments</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Error loading appointments. Please try again later.
        </div>
      </div>
    );
  }
}