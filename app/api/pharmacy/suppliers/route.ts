// app/api/pharmacy/suppliers/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

export async function GET() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('suppliers').select('*').order('name');

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

  const { name, contact_person, email, phone_number, address } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name, contact_person, email, phone_number, address, created_by: user?.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}