import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify Paystack webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

export async function POST(request: Request) {
  try {
    const headersList = headers();
    const signature = headersList.get('x-paystack-signature');

    if (!signature) {
      return new NextResponse('No signature', { status: 401 });
    }

    const payload = await request.text();
    const isValid = verifyWebhookSignature(payload, signature);

    if (!isValid) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(payload);

    // Handle different event types
    switch (event.event) {
      case 'subscription.create':
        await handleSubscriptionCreated(event.data);
        break;
      case 'subscription.enable':
        await handleSubscriptionEnabled(event.data);
        break;
      case 'subscription.disable':
        await handleSubscriptionDisabled(event.data);
        break;
      case 'charge.success':
        await handlePaymentSuccess(event.data);
        break;
      case 'charge.failed':
        await handlePaymentFailed(event.data);
        break;
      default:
        console.log('Unhandled event:', event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Webhook error', { status: 500 });
  }
}

// Handle subscription created event
async function handleSubscriptionCreated(data: any) {
  const { subscription, customer } = data;
  const tenantId = data.metadata?.tenant_id;

  if (!tenantId) {
    console.error('No tenant_id in metadata');
    return;
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      paystack_customer_id: customer.customer_code,
      paystack_subscription_id: subscription.subscription_code,
      subscription_status: subscription.status,
      subscription_start_date: new Date(subscription.created_at).toISOString(),
      subscription_end_date: new Date(subscription.next_payment_date).toISOString(),
      plan_type: data.metadata?.plan || 'free',
      payment_method: 'paystack',
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId);

  if (error) {
    console.error('Error updating tenant subscription:', error);
  }
}

// Handle subscription enabled event
async function handleSubscriptionEnabled(data: any) {
  const { subscription } = data;
  const tenantId = data.metadata?.tenant_id;

  if (!tenantId) {
    console.error('No tenant_id in metadata');
    return;
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId);

  if (error) {
    console.error('Error enabling subscription:', error);
  }
}

// Handle subscription disabled event
async function handleSubscriptionDisabled(data: any) {
  const { subscription } = data;
  const tenantId = data.metadata?.tenant_id;

  if (!tenantId) {
    console.error('No tenant_id in metadata');
    return;
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId);

  if (error) {
    console.error('Error disabling subscription:', error);
  }
}

// Handle payment success event
async function handlePaymentSuccess(data: any) {
  const { payment, subscription } = data;
  const tenantId = data.metadata?.tenant_id;

  if (!tenantId) {
    console.error('No tenant_id in metadata');
    return;
  }

  // Insert into subscription_invoices
  const { error: invoiceError } = await supabase
    .from('subscription_invoices')
    .insert({
      tenant_id: tenantId,
      amount: payment.amount / 100, // Convert from kobo to naira
      currency: payment.currency,
      status: 'paid',
      invoice_number: payment.reference,
      invoice_date: new Date(payment.paid_at).toISOString(),
      payment_date: new Date(payment.paid_at).toISOString(),
      payment_method: payment.channel,
      paystack_payment_id: payment.id.toString(),
      paystack_subscription_id: subscription?.subscription_code,
      period_start: new Date(payment.created_at).toISOString(),
      period_end: new Date(payment.paid_at).toISOString(),
      metadata: {
        payment_id: payment.id,
        payment_reference: payment.reference,
        payment_channel: payment.channel,
        payment_gateway: 'paystack'
      }
    });

  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError);
    return;
  }

  // Update tenant's last payment date
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({
      last_payment_date: new Date(payment.paid_at).toISOString(),
      payment_failures: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId);

  if (tenantError) {
    console.error('Error updating tenant payment info:', tenantError);
  }
}

// Handle payment failed event
async function handlePaymentFailed(data: any) {
  const { payment, subscription } = data;
  const tenantId = data.metadata?.tenant_id;

  if (!tenantId) {
    console.error('No tenant_id in metadata');
    return;
  }

  // Insert failed payment into subscription_invoices
  const { error: invoiceError } = await supabase
    .from('subscription_invoices')
    .insert({
      tenant_id: tenantId,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: 'failed',
      invoice_number: payment.reference,
      invoice_date: new Date(payment.created_at).toISOString(),
      payment_method: payment.channel,
      paystack_payment_id: payment.id.toString(),
      paystack_subscription_id: subscription?.subscription_code,
      period_start: new Date(payment.created_at).toISOString(),
      period_end: new Date(payment.created_at).toISOString(),
      metadata: {
        payment_id: payment.id,
        payment_reference: payment.reference,
        payment_channel: payment.channel,
        payment_gateway: 'paystack',
        failure_reason: payment.gateway_response
      }
    });

  if (invoiceError) {
    console.error('Error creating failed invoice:', invoiceError);
    return;
  }

  // Increment payment failures count
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({
      payment_failures: supabase.raw('payment_failures + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId);

  if (tenantError) {
    console.error('Error updating tenant payment failures:', tenantError);
  }
} 