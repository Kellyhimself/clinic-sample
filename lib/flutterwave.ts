import Flutterwave from 'flutterwave-node-v3';

// Initialize Flutterwave
const flw = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY!,
  process.env.FLUTTERWAVE_SECRET_KEY!
);

// Types
export interface FlutterwaveSubscription {
  id: string;
  status: string;
  amount: number;
  currency: string;
  plan: string;
  customer: {
    email: string;
    phone_number: string;
    name: string;
  };
  created_at: string;
  next_payment_date: string;
}

export interface FlutterwavePayment {
  id: string;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  created_at: string;
}

// Create a subscription
export async function createSubscription({
  amount,
  currency = 'KES',
  plan,
  customer,
}: {
  amount: number;
  currency?: string;
  plan: string;
  customer: {
    email: string;
    phone_number: string;
    name: string;
  };
}) {
  try {
    const response = await flw.Subscription.create({
      amount,
      currency,
      plan,
      customer,
      start_date: new Date().toISOString(),
    });

    return response;
  } catch (error) {
    console.error('Flutterwave subscription creation error:', error);
    throw error;
  }
}

// Initialize payment
export async function initializePayment({
  amount,
  currency = 'KES',
  email,
  phone_number,
  name,
  tx_ref,
}: {
  amount: number;
  currency?: string;
  email: string;
  phone_number: string;
  name: string;
  tx_ref: string;
}) {
  try {
    const response = await flw.Charge.initiate({
      tx_ref,
      amount,
      currency,
      payment_options: 'card,mpesa',
      customer: {
        email,
        phone_number,
        name,
      },
      customizations: {
        title: 'Clinic Subscription',
        description: 'Subscription payment',
        logo: process.env.NEXT_PUBLIC_APP_URL + '/logo.png',
      },
    });

    return response;
  } catch (error) {
    console.error('Flutterwave payment initialization error:', error);
    throw error;
  }
}

// Verify payment
export async function verifyPayment(transactionId: string) {
  try {
    const response = await flw.Transaction.verify({ id: transactionId });
    return response;
  } catch (error) {
    console.error('Flutterwave payment verification error:', error);
    throw error;
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    const response = await flw.Subscription.fetch({ id: subscriptionId });
    return response;
  } catch (error) {
    console.error('Flutterwave subscription fetch error:', error);
    throw error;
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  try {
    const response = await flw.Subscription.cancel({ id: subscriptionId });
    return response;
  } catch (error) {
    console.error('Flutterwave subscription cancellation error:', error);
    throw error;
  }
} 