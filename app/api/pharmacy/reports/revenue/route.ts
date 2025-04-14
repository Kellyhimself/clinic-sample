// app/api/pharmacy/reports/revenue/route.ts
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
  const period = searchParams.get('period');

  let query = supabase.from('receipts').select('total_cost, created_at, sale:sale_id(medication:medication_id(name))');

  if (period) {
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'daily':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
    }
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalRevenue = data.reduce((sum, receipt) => sum + (receipt.total_cost || 0), 0);

  return NextResponse.json({ totalRevenue, receipts: data });
}