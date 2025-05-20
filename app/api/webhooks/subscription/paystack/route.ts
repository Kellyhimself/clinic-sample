import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyPaystackWebhook } from '@/lib/paystack';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { SUBSCRIPTION_LIMITS, type PlanType } from '@/app/lib/config/features/subscriptionFeatures';

interface CustomField {
  display_name: string;
  variable_name: string;
  value: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const headersList = await headers();
    const paystackSignature = headersList.get('x-paystack-signature');

    if (!paystackSignature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 401 });
    }

    const isValid = verifyPaystackWebhook(body, paystackSignature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = body.event;

    if (event === 'charge.success') {
      const payment = body.data;

      // Extract plan from custom_fields in metadata
      const customFields = payment.metadata?.custom_fields || [];
      const planField = customFields.find((field: CustomField) => field.variable_name === 'plan_id');
      const plan = (planField?.value || 'pro') as PlanType; // Default to 'pro' if not found

      const tenant_id = payment.metadata?.tenant_id;
      if (!tenant_id) {
        return NextResponse.json({ error: 'No tenant_id in metadata' }, { status: 400 });
      }

      // Create admin client for database operations
      const supabase = createAdminClient();

      // Create subscription invoice
      const { error: invoiceError } = await supabase
        .from('subscription_invoices')
        .insert({
          tenant_id,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: 'paid',
          payment_method: payment.channel,
          payment_date: payment.paid_at,
          paystack_payment_id: payment.id.toString(),
          external_invoice_id: payment.reference,
          invoice_number: `INV-${payment.reference}`,
          invoice_date: payment.created_at,
          metadata: payment
        });

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
      }

      // Update tenant subscription
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          subscription_status: 'active',
          plan_type: plan,
          last_payment_date: payment.paid_at,
          payment_method: payment.channel,
          paystack_customer_id: payment.customer.customer_code,
          paystack_subscription_id: payment.reference,
          subscription_start_date: payment.created_at,
          subscription_end_date: new Date(new Date(payment.created_at).setFullYear(new Date(payment.created_at).getFullYear() + 1)).toISOString(),
          is_active: true,
          payment_failures: 0
        })
        .eq('id', tenant_id);

      if (tenantError) {
        console.error('Tenant update error:', tenantError);
        return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
      }

      // Get the plan limits from configuration
      const planLimits = SUBSCRIPTION_LIMITS[plan];

      // Convert features array to object
      const featuresObject = planLimits.features.reduce((acc, feature) => {
        acc[feature] = true;
        return acc;
      }, {} as Record<string, boolean>);

      // Update or create subscription limits using upsert
      const { error: limitError } = await supabase
        .from('subscription_limits')
        .upsert({
          tenant_id: tenant_id,
          plan_type: plan,
          max_patients: planLimits.max_patients,
          max_appointments_per_month: planLimits.max_appointments_per_month,
          max_inventory_items: planLimits.max_inventory_items,
          max_users: planLimits.max_users,
          max_transactions_per_month: planLimits.max_transactions_per_month,
          features: featuresObject,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id',
          ignoreDuplicates: false
        });

      if (limitError) {
        console.error('Subscription limits update error:', limitError);
        return NextResponse.json({ error: 'Failed to update subscription limits' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}