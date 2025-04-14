// app/api/pharmacy/medications/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';
import { Medication } from '@/types/supabase';

export async function GET(request: Request) {
  const supabase = await getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const showLowStock = searchParams.get('lowStock') === 'true';
  const showExpiring = searchParams.get('expiring') === 'true';

  let query = supabase.from('medications').select('*').eq('is_active', true);

  if (showLowStock) {
    query = query.lte('quantity_in_stock', 'reorder_level');
  }
  if (showExpiring) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    query = query.lte('expiry_date', thirtyDaysFromNow.toISOString());
  }

  const { data, error } = await query.order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Medication[]);
}

export async function POST(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const {
    name,
    batch_no,
    category,
    supplier_id,
    description,
    unit_price,
    quantity_in_stock,
    reorder_level,
    expiry_date,
    is_active,
  } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('medications')
    .insert({
      name,
      batch_no,
      category,
      supplier_id,
      description,
      unit_price,
      quantity_in_stock,
      reorder_level,
      expiry_date,
      is_active,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Medication, { status: 201 });
}