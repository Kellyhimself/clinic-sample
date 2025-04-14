// app/api/prescriptions/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';
export async function POST(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['doctor', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { doctor_id, patient_id, medication_name, dosage, instructions, quantity } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: medication, error: medError } = await supabase
    .from('medications')
    .select('id, quantity_in_stock, unit_price')
    .eq('name', medication_name)
    .single();

  if (medError || !medication) {
    return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
  }

  if (quantity && medication.quantity_in_stock < quantity) {
    return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
  }

  const { data: prescription, error } = await supabase
    .from('prescriptions')
    .insert({
      doctor_id,
      patient_id,
      medication_name,
      dosage,
      instructions,
      quantity,
      prescription_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (quantity) {
    const { error: stockError } = await supabase
      .from('medications')
      .update({ quantity_in_stock: medication.quantity_in_stock - quantity })
      .eq('id', medication.id);

    if (stockError) {
      return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    await supabase.from('stock_transactions').insert({
      medication_id: medication.id,
      transaction_type: 'deduction',
      quantity: -quantity,
      reason: `Prescription #${prescription.id}`,
      prescription_id: prescription.id,
      created_by: user?.id,
    });

    await supabase.from('sales').insert({
      medication_id: medication.id,
      patient_id,
      prescription_id: prescription.id,
      quantity,
      unit_price: medication.unit_price,
      created_by: user?.id,
    });
  }

  return NextResponse.json(prescription, { status: 201 });
}