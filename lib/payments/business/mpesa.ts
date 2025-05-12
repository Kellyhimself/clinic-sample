import Mpesa from 'mpesa-api';
import { createAdminClient } from './supabase-server';

// Initialize the M-Pesa client
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  shortCode: process.env.MPESA_SHORT_CODE!,
  lipaNaMpesaShortCode: process.env.MPESA_LIPA_NA_MPESA_SHORTCODE!,
  lipaNaMpesaShortPass: process.env.MPESA_LIPA_NA_MPESA_PASSKEY!,
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  certificatePath: process.env.NODE_ENV === 'production' ? process.env.MPESA_CERT_PATH : null,
});

/**
 * Formats amount to 2 decimal places for M-Pesa
 */
export function formatAmountForMpesa(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Initiates an STK push to the user's phone for payment
 */
export async function initiateSTKPush({
  phoneNumber,
  amount,
  accountReference,
  callbackUrl,
  description,
  tenantId,
  planId,
}: {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  callbackUrl: string;
  description: string;
  tenantId: string;
  planId: string;
}) {
  try {
    // Format phone number (remove + and country code if needed)
    const formattedPhone = phoneNumber.replace(/^\+?254/, '254');
    
    const response = await mpesa.lipaNaMpesaOnline({
      amount,
      phoneNumber: formattedPhone,
      callbackUrl,
      accountReference,
      transactionDesc: description,
      transactionType: 'CustomerPayBillOnline',
    });

    // Store the checkout request ID for callback reference
    if (response.CheckoutRequestID) {
      const supabase = createAdminClient();
      await supabase.from('mpesa_transactions').insert({
        checkout_request_id: response.CheckoutRequestID,
        tenant_id: tenantId,
        plan_id: planId,
        amount,
        phone_number: formattedPhone,
        status: 'pending',
        description,
      });
    }

    return response;
  } catch (error) {
    console.error('M-Pesa STK Push Error:', error);
    throw error;
  }
}

/**
 * Query the status of an STK push transaction
 */
export async function querySTKStatus(checkoutRequestId: string) {
  try {
    const response = await mpesa.lipaNaMpesaQuery({
      checkoutRequestId,
    });
    return response;
  } catch (error) {
    console.error('M-Pesa Query Error:', error);
    throw error;
  }
}

/**
 * Process subscription payment via M-Pesa
 */
export async function processSubscriptionPayment({
  phoneNumber,
  amount,
  tenantId,
  planId,
}: {
  phoneNumber: string;
  amount: number;
  tenantId: string;
  planId: string;
}) {
  try {
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mpesa/callback`;
    const accountReference = `Clinic-${tenantId}`;
    const description = `Subscription payment for plan ${planId}`;

    return await initiateSTKPush({
      phoneNumber,
      amount,
      accountReference,
      callbackUrl,
      description,
      tenantId,
      planId,
    });
  } catch (error) {
    console.error('Subscription Payment Error:', error);
    throw error;
  }
}

/**
 * Set up recurring billing for a tenant via M-Pesa
 */
export async function setupRecurringBilling({
  tenantId,
  phoneNumber,
  planId,
  billingCycleInDays = 30,
}: {
  tenantId: string;
  phoneNumber: string;
  planId: string;
  billingCycleInDays?: number;
}) {
  try {
    const supabase = createAdminClient();
    
    // Format phone number (remove + and country code if needed)
    const formattedPhone = phoneNumber.replace(/^\+?254/, '254');
    
    // Get plan details to determine amount
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (planError || !planData) {
      throw new Error(`Plan not found: ${planError?.message}`);
    }
    
    // Calculate next billing date
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + billingCycleInDays);
    
    // Update tenant with recurring billing info
    const { error } = await supabase
      .from('tenants')
      .update({
        mpesa_phone_number: formattedPhone,
        subscription_plan: planId,
        subscription_status: 'active',
        next_billing_date: nextBillingDate.toISOString(),
        payment_method: 'mpesa',
      })
      .eq('id', tenantId);
      
    if (error) {
      throw new Error(`Failed to update tenant: ${error.message}`);
    }
    
    return {
      success: true,
      nextBillingDate,
      phoneNumber: formattedPhone,
      planId,
    };
  } catch (error) {
    console.error('Setup Recurring Billing Error:', error);
    throw error;
  }
} 