import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get('appointmentId');

  if (!appointmentId) {
    return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
  }

  try {
    const { generateReceipt } = await import('@/lib/authActions');
    const receipt = await generateReceipt(appointmentId);
    return new NextResponse(receipt, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: `Failed to generate receipt: ${errorMessage}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('M-Pesa Callback Response:', body);

  const { ResultCode, CheckoutRequestID, CallbackMetadata } = body.Body.stkCallback;

  if (!CheckoutRequestID) {
    return NextResponse.json({ error: 'Missing CheckoutRequestID' }, { status: 400 });
  }

  const supabase: SupabaseClient<Database> = await getSupabaseClient();

  if (ResultCode === 0) {
    const metadata = CallbackMetadata.Item.reduce(
      (acc: Record<string, string | number>, item: { Name: string; Value: string | number }) => {
        acc[item.Name] = item.Value;
        return acc;
      },
      {}
    );

    const { MpesaReceiptNumber } = metadata;

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        payment_method: 'mpesa',
        transaction_id: MpesaReceiptNumber,
      })
      .eq('transaction_id', CheckoutRequestID);

    if (updateError) {
      console.error('Failed to update appointment:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } else {
    console.error('M-Pesa payment failed:', body.Body.stkCallback.ResultDesc);
    await supabase
      .from('appointments')
      .update({ payment_status: 'unpaid' })
      .eq('transaction_id', CheckoutRequestID);
    return NextResponse.json({ success: false, message: body.Body.stkCallback.ResultDesc });
  }
}