import { createAdminClient } from '@/app/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// Verify required environment variables
const requiredEnvVars = {
  PESAPAL_CONSUMER_KEY: process.env.PESAPAL_CONSUMER_KEY,
  PESAPAL_CONSUMER_SECRET: process.env.PESAPAL_CONSUMER_SECRET,
  PESAPAL_ENVIRONMENT: process.env.PESAPAL_ENVIRONMENT,
};

// Check if any required variables are missing
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(`Missing required PesaPal environment variables: ${missingVars.join(', ')}`);
}

// Initialize PesaPal client
const pesapal = {
  consumerKey: requiredEnvVars.PESAPAL_CONSUMER_KEY!,
  consumerSecret: requiredEnvVars.PESAPAL_CONSUMER_SECRET!,
  environment: requiredEnvVars.PESAPAL_ENVIRONMENT as 'sandbox' | 'production',
  baseUrl: requiredEnvVars.PESAPAL_ENVIRONMENT === 'production' 
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3',
};

/**
 * Get PesaPal access token
 */
async function getPesapalToken() {
  try {
    // Log the credentials being used (without the secret)
    console.log('Using PesaPal credentials:', {
      consumerKey: pesapal.consumerKey,
      environment: pesapal.environment,
      baseUrl: pesapal.baseUrl,
    });

    // Create the request body
    const requestBody = {
      consumer_key: pesapal.consumerKey,
      consumer_secret: pesapal.consumerSecret,
    };

    // Log the request details
    console.log('PesaPal Auth Request:', {
      url: `${pesapal.baseUrl}/api/Auth/RequestToken`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await fetch(`${pesapal.baseUrl}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Log the response for debugging
    console.log('PesaPal Auth Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Get the response text first
    const responseText = await response.text();
    console.log('PesaPal Auth Response Text:', responseText);

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse PesaPal response as JSON:', responseText);
      throw new Error(`Invalid JSON response from PesaPal: ${responseText}`);
    }
    
    // Log the parsed data for debugging
    console.log('PesaPal Auth Response Data:', data);

    if (!response.ok) {
      const errorMessage = data.error?.message || data.message || 'Failed to get PesaPal access token';
      console.error('PesaPal Auth Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error,
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    // Check for token in different possible response formats
    const token = data.token || data.access_token || data.accessToken || data.data?.token;
    if (!token) {
      console.error('PesaPal Auth Response Data:', data);
      throw new Error('No token received from PesaPal');
    }

    return token;
  } catch (error) {
    console.error('PesaPal Auth Error:', error);
    throw error;
  }
}

/**
 * Process subscription payment via PesaPal
 */
export async function processPesapalSubscription({
  phoneNumber,
  amount,
  tenantId,
  planId,
  description,
}: {
  phoneNumber: string;
  amount: number;
  tenantId: string;
  planId: string;
  description: string;
}) {
  try {
    // Get access token
    const token = await getPesapalToken();
    
    // Format phone number (remove + and country code if needed)
    const formattedPhone = phoneNumber.replace(/^\+?254/, '254');
    
    // Create order
    const response = await fetch(`${pesapal.baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: `SUB-${tenantId}-${Date.now()}`,
        currency: 'KES',
        amount: amount,
        description,
        callback_url: process.env.PESAPAL_CALLBACK_URL,
        notification_id: process.env.PESAPAL_IPN_URL,
        billing_address: {
          phone_number: formattedPhone,
          email_address: `${tenantId}@tenant.com`, // Required by PesaPal
          country_code: 'KE',
        },
        metadata: {
          tenant_id: tenantId,
          plan_id: planId,
          payment_type: 'subscription'
        }
      }),
    });

    // Log the response for debugging
    console.log('PesaPal Order Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Get the response text first
    const responseText = await response.text();
    console.log('PesaPal Order Response Text:', responseText);

    // Try to parse as JSON
    let order;
    try {
      order = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from PesaPal: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(order.message || 'Failed to create PesaPal order');
    }

    // Store the order tracking ID for reference
    if (order.tracking_id) {
      const supabase = createAdminClient();
      await supabase
        .from('pesapal_transactions')
        .insert({
          tracking_id: order.tracking_id,
          tenant_id: tenantId,
          plan_id: planId,
          amount,
          phone_number: formattedPhone,
          status: 'pending',
          description,
        } satisfies Database['public']['Tables']['pesapal_transactions']['Insert']);
    }

    return { orderTrackingId: order.tracking_id };
  } catch (error) {
    console.error('PesaPal Subscription Error:', error);
    throw error;
  }
}

/**
 * Query the status of a PesaPal transaction
 */
export async function queryPesapalStatus(trackingId: string) {
  try {
    // Get access token
    const token = await getPesapalToken();

    const response = await fetch(`${pesapal.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    // Get the response text first
    const responseText = await response.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from PesaPal: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(data.message || 'Failed to query PesaPal status');
    }

    return data;
  } catch (error) {
    console.error('PesaPal Query Error:', error);
    throw error;
  }
} 