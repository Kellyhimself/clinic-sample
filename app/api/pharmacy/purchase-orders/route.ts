// app/api/pharmacy/purchase-orders/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';
export async function GET() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:supplier_id(name), medication:medication_id(name)')
    .order('order_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { supplier_id, medication_id, quantity, unit_price } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({ supplier_id, medication_id, quantity, unit_price, created_by: user?.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}