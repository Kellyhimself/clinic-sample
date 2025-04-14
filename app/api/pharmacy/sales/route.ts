// app/api/pharmacy/sales/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

export async function POST(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { medication_id, patient_id, prescription_id, quantity, unit_price } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: medication, error: medError } = await supabase
    .from('medications')
    .select('quantity_in_stock')
    .eq('id', medication_id)
    .single();

  if (medError || !medication) {
    return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
  }

  if (medication.quantity_in_stock < quantity) {
    return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
  }

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      medication_id,
      patient_id,
      prescription_id,
      quantity,
      unit_price,
      created_by: user?.id,
    })
    .select()
    .single();

  if (saleError) {
    return NextResponse.json({ error: saleError.message }, { status: 500 });
  }

  const { error: stockError } = await supabase
    .from('medications')
    .update({ quantity_in_stock: medication.quantity_in_stock - quantity })
    .eq('id', medication_id);

  if (stockError) {
    return NextResponse.json({ error: stockError.message }, { status: 500 });
  }

  await supabase.from('stock_transactions').insert({
    medication_id,
    transaction_type: 'deduction',
    quantity: -quantity,
    reason: prescription_id ? `Sale via Prescription #${prescription_id}` : `Direct sale #${sale.id}`,
    prescription_id,
    created_by: user?.id,
  });

  return NextResponse.json(sale, { status: 201 });
}