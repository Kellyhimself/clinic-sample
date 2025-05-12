'use server';

import { createClient } from '@/app/lib/supabase/server';
import { createCheckoutSession, createBillingPortalSession, stripe } from '@/lib/payments/subscription/stripe';
import { processPesapalSubscription } from '@/lib/payments/subscription/pesapal';

export async function processPayment(method: 'card' | 'mpesa', phoneNumber?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    throw new Error('No tenant ID found for user');
  }

  // Set tenant context
  const { error: setContextError } = await supabase
    .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

  if (setContextError) {
    throw new Error('Failed to set tenant context');
  }

  // Get tenant ID from context
  const { data: tenantId, error: getTenantError } = await supabase
    .rpc('get_tenant_id');

  if (getTenantError || !tenantId) {
    throw new Error('Failed to get tenant ID');
  }

  // Get tenant's current plan and subscription details
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan_type, subscription_id, contact_phone')
    .eq('id', tenantId)
    .single();

  if (tenantError) {
    throw new Error('Failed to fetch tenant details');
  }

  // Define plan prices
  const plans = {
    pro: {
      price: 1999,
      stripe_price_id: process.env.STRIPE_PRO_PLAN_PRICE_ID,
      pesapal_price_id: process.env.PESAPAL_PRO_PLAN_PRICE_ID
    },
    enterprise: {
      price: 9999,
      stripe_price_id: process.env.STRIPE_ENTERPRISE_PLAN_PRICE_ID,
      pesapal_price_id: process.env.PESAPAL_ENTERPRISE_PRICE_ID
    }
  };

  try {
    if (method === 'card') {
      // Determine which plan to upgrade to
      const plan = tenant.plan_type === 'free' ? 'pro' : 'enterprise';
      const priceId = plans[plan].stripe_price_id;

      if (!priceId) {
        throw new Error(`Price ID not found for ${plan} plan`);
      }

      // Find or create a Stripe customer for this tenant
      let customerId: string | undefined;

      // Try to get existing Stripe customer ID from the tenant record
      const { data: tenantCustomer } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', tenantId)
        .single();

      if (tenantCustomer?.stripe_customer_id) {
        console.log('Using existing Stripe customer:', tenantCustomer.stripe_customer_id);
        customerId = tenantCustomer.stripe_customer_id;
      } else {
        // Create a new customer in Stripe
        try {
          // Get more user data for creating the customer
          const { data: userData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (userData) {
            const customer = await stripe.customers.create({
              email: userData.email,
              name: userData.full_name,
              metadata: {
                tenant_id: tenantId
              }
            });
            
            customerId = customer.id;
            
            // Save the customer ID back to the tenant record
            await supabase
              .from('tenants')
              .update({ stripe_customer_id: customerId })
              .eq('id', tenantId);
              
            console.log('Created new Stripe customer:', customerId);
          }
        } catch (customerError) {
          console.error('Error creating Stripe customer:', customerError);
          // Continue without a customer ID if creation fails
        }
      }

      // Create a new checkout session
      const { url } = await createCheckoutSession({
        priceId,
        tenantId,
        ...(customerId && { customerId }),
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing?success=true`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing?canceled=true`,
        metadata: {
          tenant_id: tenantId,
          price_id: priceId
        }
      });

      return { redirectUrl: url };
    } else {
      // M-Pesa payment
      if (!phoneNumber) {
        throw new Error('Phone number is required for M-Pesa payment');
      }

      const plan = tenant.plan_type === 'free' ? 'pro' : 'enterprise';
      const { orderTrackingId } = await processPesapalSubscription({
        phoneNumber,
        amount: plans[plan].price,
        tenantId,
        planId: plan,
        description: `Subscription upgrade to ${plan} plan`
      });

      // Save the phone number to the tenant's record
      await supabase
        .from('tenants')
        .update({ contact_phone: phoneNumber })
        .eq('id', tenantId);

      return { orderTrackingId };
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
} 