// app/api/pharmacy/restock/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

export async function POST(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { medication_id, quantity, reason } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.rpc('restock_medication', {
    p_medication_id: medication_id,
    p_quantity: quantity,
    p_reason: reason,
    p_user_id: user?.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Stock updated' });
}