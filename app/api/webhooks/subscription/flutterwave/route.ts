import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify Flutterwave webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

export async function POST(req: Request) {
  try {
    const headersList = headers();
    const signature = headersList.get('verif-hash');
    const payload = await req.text();

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(payload, signature, process.env.FLUTTERWAVE_WEBHOOK_SECRET!)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(payload);

    // Handle different event types
    switch (event.event) {
      case 'subscription.created':
        await handleSubscriptionCreated(event);
        break;
      case 'subscription.activated':
        await handleSubscriptionActivated(event);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event);
        break;
      case 'charge.completed':
        await handlePaymentCompleted(event);
        break;
      case 'charge.failed':
        await handlePaymentFailed(event);
        break;
      default:
        console.log('Unhandled event type:', event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handle subscription created event
async function handleSubscriptionCreated(event: any) {
  const { data } = event;
  
  await supabase
    .from('subscriptions')
    .upsert({
      flutterwave_subscription_id: data.id,
      status: 'pending',
      plan_id: data.plan,
      customer_id: data.customer.id,
      amount: data.amount,
      currency: data.currency,
      created_at: new Date().toISOString(),
      next_payment_date: data.next_payment_date,
    });
}

// Handle subscription activated event
async function handleSubscriptionActivated(event: any) {
  const { data } = event;
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    .eq('flutterwave_subscription_id', data.id);
}

// Handle subscription cancelled event
async function handleSubscriptionCancelled(event: any) {
  const { data } = event;
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('flutterwave_subscription_id', data.id);
}

// Handle payment completed event
async function handlePaymentCompleted(event: any) {
  const { data } = event;
  
  await supabase
    .from('payments')
    .insert({
      flutterwave_payment_id: data.id,
      flutterwave_subscription_id: data.subscription_id,
      amount: data.amount,
      currency: data.currency,
      status: 'completed',
      payment_method: data.payment_type,
      created_at: new Date().toISOString(),
    });
}

// Handle payment failed event
async function handlePaymentFailed(event: any) {
  const { data } = event;
  
  await supabase
    .from('payments')
    .insert({
      flutterwave_payment_id: data.id,
      flutterwave_subscription_id: data.subscription_id,
      amount: data.amount,
      currency: data.currency,
      status: 'failed',
      payment_method: data.payment_type,
      created_at: new Date().toISOString(),
    });
} 