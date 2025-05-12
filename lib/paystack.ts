import axios from 'axios';

// Initialize Paystack API
const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

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
  metadata?: Record<string, any>;
}) {
  try {
    const response = await paystack.post('/transaction/initialize', {
      amount: amount * 100, // Convert to kobo
      email,
      callback_url,
      metadata,
      channels: ['card', 'bank', 'ussd', 'qr', 'mpesa', 'mobile_money'],
    });

    return response.data;
  } catch (error) {
    console.error('Paystack transaction initialization error:', error);
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