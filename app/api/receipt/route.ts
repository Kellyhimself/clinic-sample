// app/api/receipts/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

// Define raw data shape from Supabase
interface RawAppointment {
  date: string;
  time: string;
  services: { name: string; price: number }[] | null; // Array due to Supabase behavior
  profiles: { full_name: string }[] | null; // Array due to Supabase behavior
}

// Define raw sale data
interface RawSale {
  quantity: number;
  unit_price: number;
  medication: { name: string }[] | null;
}

export async function POST(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { appointment_id, appointment_cost, sale_id } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  let medication_cost = 0;
  let medication_name = 'N/A';
  if (sale_id) {
    const { data: sale } = await supabase
      .from('sales')
      .select('quantity, unit_price, medication:medication_id(name)')
      .eq('id', sale_id)
      .single() as { data: RawSale | null };
    if (sale) {
      medication_cost = sale.quantity * sale.unit_price;
      medication_name = sale.medication && sale.medication.length > 0 ? sale.medication[0].name : 'N/A';
    }
  }

  const { data: appointment } = await supabase
    .from('appointments')
    .select('date, time, services(name, price), profiles(full_name)')
    .eq('id', appointment_id)
    .single() as { data: RawAppointment | null };

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }

  const service = appointment.services && appointment.services.length > 0
    ? appointment.services[0]
    : { name: 'N/A', price: 0 };
  const profile = appointment.profiles && appointment.profiles.length > 0
    ? appointment.profiles[0]
    : { full_name: 'Unknown' };

  const receipt_text = `
    --- Payment Receipt ---
    Appointment ID: ${appointment_id}
    Patient: ${profile.full_name}
    Service: ${service.name}
    Date: ${appointment.date} at ${appointment.time}
    Appointment Cost: KSh ${appointment_cost || service.price || 0}
    Medication: ${medication_name}
    Medication Cost: KSh ${medication_cost}
    Total: KSh ${(appointment_cost || service.price || 0) + medication_cost}
    Issued on: ${new Date().toLocaleString()}
    ----------------------
  `;

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      appointment_id,
      sale_id,
      appointment_cost: appointment_cost || service.price,
      medication_cost,
      receipt_text,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}