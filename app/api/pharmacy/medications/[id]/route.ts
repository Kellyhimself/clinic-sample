// app/api/pharmacy/medications/[id]/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
    .update({
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
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('medications').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Medication deleted' });
}