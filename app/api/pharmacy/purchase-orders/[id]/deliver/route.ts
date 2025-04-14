// app/api/pharmacy/purchase-orders/[id]/deliver/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { delivery_date } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .update({ status: 'delivered', delivery_date })
    .eq('id', params.id)
    .select()
    .single();

  if (poError) {
    return NextResponse.json({ error: poError.message }, { status: 500 });
  }

  const { error: stockError } = await supabase.rpc('restock_medication', {
    p_medication_id: po.medication_id,
    p_quantity: po.quantity,
    p_reason: `Purchase Order #${po.id}`,
    p_user_id: user?.id,
  });

  if (stockError) {
    return NextResponse.json({ error: stockError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Delivery recorded and stock updated' });
}