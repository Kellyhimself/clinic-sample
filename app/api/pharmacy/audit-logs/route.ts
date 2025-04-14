// app/api/pharmacy/audit-logs/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

export async function GET(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const table_name = searchParams.get('table_name');

  let query = supabase
    .from('audit_logs')
    .select('*, user:profiles(full_name)')
    .order('created_at', { ascending: false });

  if (table_name) query = query.eq('table_name', table_name);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}