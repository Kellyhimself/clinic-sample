import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV === 'development';

// Get the appropriate secret key
const getSecretKey = () => {
  if (isDevelopment) {
    return process.env.PAYSTACK_TEST_SECRET_KEY;
  }
  return process.env.PAYSTACK_SECRET_KEY;
};

const secretKey = getSecretKey();

// Initialize Paystack API
const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  },
});

// Export the configured Paystack client
export const getPaystackClient = () => paystack;

// Types
export interface PaystackSubscription {
  id: string;
  status: string;
  amount: number;
  currency: string;
  plan: {
    id: string;
    name: string;
  };
  customer: {
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  next_payment_date: string;
}

export interface PaystackPayment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  channel: string;
  created_at: string;
}

interface TransactionMetadata {
  plan?: string;
  plan_id?: string;
  payment_method?: string;
  phone_number?: string | null;
  tenant_id?: string;
  environment?: string;
}

// Create a subscription
export async function createSubscription({
  customer,
  plan,
  authorization,
}: {
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
  plan: string;
  authorization: string;
}) {
  try {
    const response = await paystack.post('/subscription', {
      customer: customer.email,
      plan,
      authorization,
    });

    return response.data;
  } catch (error) {
    console.error('Paystack subscription creation error:', error);
    throw error;
  }
}

// Initialize transaction
export async function initializeTransaction({
  amount,
  email,
  callback_url,
  metadata,
}: {
  amount: number;
  email: string;
  callback_url: string;
  metadata?: TransactionMetadata;
}) {
  try {
    console.log('Initializing Paystack transaction with:', {
      amount,
      email,
      callback_url,
      metadata,
      isTestMode: isDevelopment,
      environment: isDevelopment ? 'test' : 'production'
    });

    // Determine channels based on payment method
    const channels = metadata?.payment_method === 'mpesa' 
      ? ['mpesa', 'mobile_money']
      : ['card', 'bank', 'ussd', 'qr'];

    const response = await paystack.post('/transaction/initialize', {
      amount: amount * 100, // Convert to kobo
      email,
      callback_url,
      currency: 'KES',
      channels,
      metadata: {
        custom_fields: [
          {
            display_name: 'Plan',
            variable_name: 'plan',
            value: metadata?.plan
          },
          {
            display_name: 'Plan ID',
            variable_name: 'plan_id',
            value: metadata?.plan_id
          },
          {
            display_name: 'Payment Method',
            variable_name: 'payment_method',
            value: metadata?.payment_method
          },
          {
            display_name: 'Phone Number',
            variable_name: 'phone_number',
            value: metadata?.phone_number
          }
        ],
        tenant_id: metadata?.tenant_id,
        environment: metadata?.environment
      }
    });

    console.log('Paystack transaction initialization response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Paystack transaction initialization error:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
    } else {
      console.error('Paystack transaction initialization error:', error);
    }
    throw error;
  }
}

// Verify transaction
export async function verifyTransaction(reference: string) {
  try {
    const response = await paystack.get(`/transaction/verify/${reference}`);
    return response.data;
  } catch (error) {
    console.error('Paystack transaction verification error:', error);
    throw error;
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    const response = await paystack.get(`/subscription/${subscriptionId}`);
    return response.data;
  } catch (error) {
    console.error('Paystack subscription fetch error:', error);
    throw error;
  }
}

// Disable subscription
export async function disableSubscription(subscriptionId: string) {
  try {
    const response = await paystack.post(`/subscription/disable`, {
      code: subscriptionId,
    });
    return response.data;
  } catch (error) {
    console.error('Paystack subscription disable error:', error);
    throw error;
  }
}

// Enable subscription
export async function enableSubscription(subscriptionId: string) {
  try {
    const response = await paystack.post(`/subscription/enable`, {
      code: subscriptionId,
    });
    return response.data;
  } catch (error) {
    console.error('Paystack subscription enable error:', error);
    throw error;
  }
}

export function verifyPaystackWebhook(payload: Record<string, unknown>, signature: string): boolean {
  const secret = getSecretKey();
  if (!secret) {
    console.error('Paystack secret key not found');
    return false;
  }
  
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
} 