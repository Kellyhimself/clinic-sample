// app/api/patients/[id]/summary/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';
import { fetchUserRole } from '@/lib/authActions';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'doctor', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('patient_summary')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select('id, medication_name, dosage, instructions, prescription_date, quantity')
    .eq('patient_id', params.id);

  const { data: medical_records } = await supabase
    .from('medical_records')
    .select('id, diagnosis, treatment, record_date, doctor:doctor_id(full_name)')
    .eq('patient_id', params.id);

  const { data: purchases } = await supabase
    .from('sales')
    .select('id, quantity, unit_price, sale_date, medication:medication_id(name)')
    .eq('patient_id', params.id);

  return NextResponse.json({
    ...data,
    prescriptions,
    medical_records,
    purchases,
  });
}