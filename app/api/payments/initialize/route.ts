import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { Paystack } from '@paystack/paystack-sdk';

// Initialize Paystack with the appropriate key based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const paystackSecretKey = isDevelopment 
  ? process.env.PAYSTACK_TEST_SECRET_KEY 
  : process.env.PAYSTACK_SECRET_KEY;

const paystack = new Paystack(paystackSecretKey!, {
  hostname: isDevelopment ? 'api.paystack.co' : 'api.paystack.co'
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, email, callback_url, method, metadata } = body;

    // Validate required fields
    if (!amount || !email || !callback_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize transaction
    const transaction = await paystack.transaction.initialize({
      amount: amount * 100, // Convert to kobo/cents
      email,
      callback_url,
      currency: 'KES',
      metadata,
      channels: method === 'mpesa' ? ['mpesa'] : ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
    });

    if (!transaction.status) {
      return NextResponse.json(
        { error: 'Failed to initialize transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
} 