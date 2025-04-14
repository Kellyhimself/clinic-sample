// app/api/pharmacy/reports/stock-movement/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

export async function GET(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const medication_id = searchParams.get('medication_id');
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  let query = supabase
    .from('stock_transactions')
    .select('*, medication:medication_id(name), user:created_by(full_name)')
    .order('created_at', { ascending: false });

  if (medication_id) query = query.eq('medication_id', medication_id);
  if (start_date) query = query.gte('created_at', start_date);
  if (end_date) query = query.lte('created_at', end_date);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}