import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { getPaystackClient } from '@/lib/paystack';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', session.user.app_metadata.tenant_id)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const body = await req.json();
    const { plan, email } = body;

    if (!plan || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const paystack = getPaystackClient();

    // Create or get customer
    let customer;
    if (tenant.paystack_customer_id) {
      customer = await paystack.customer.fetch(tenant.paystack_customer_id);
    } else {
      customer = await paystack.customer.create({
        email,
        first_name: tenant.name,
        metadata: {
          tenant_id: tenant.id
        }
      });
    }

    // Create transaction
    const transaction = await paystack.transaction.initialize({
      email,
      amount: plan === 'pro' ? 5000000 : 500000, // 50,000 or 5,000 NGN in kobo
      currency: 'NGN',
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      metadata: {
        tenant_id: tenant.id,
        plan,
        custom_fields: [
          {
            display_name: 'Plan',
            variable_name: 'plan_id',
            value: plan
          }
        ]
      }
    });

    if (!transaction.status) {
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
    }

    // Update tenant with customer ID if not already set
    if (!tenant.paystack_customer_id) {
      const adminClient = createAdminClient();
      await adminClient
        .from('tenants')
        .update({ paystack_customer_id: customer.data.customer_code })
        .eq('id', tenant.id);
    }

    return NextResponse.json({
      authorization_url: transaction.data.authorization_url
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 