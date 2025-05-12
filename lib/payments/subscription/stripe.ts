import Stripe from 'stripe';

// Initialize the Stripe client with the secret key
// This should be used only on the server-side
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil', // Use the latest stable API version
});

// Helper function to format price for display
export function formatAmountForDisplay(amount: number, currency: string): string {
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
  });
  return numberFormat.format(amount / 100);
}

// Convert amount from dollars to cents for Stripe
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

// Create a new subscription checkout session
export async function createCheckoutSession({
  priceId,
  tenantId,
  customerId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  priceId: string;
  tenantId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  // Create a checkout session with the selected price
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    // If the tenant already has a Stripe customer, use that
    ...(customerId && { customer: customerId }),
    subscription_data: {
      metadata: {
        tenant_id: tenantId,
        ...(metadata || {})
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenant_id: tenantId,
      ...(metadata || {})
    },
  };

  console.log('Creating Stripe checkout session with params:', JSON.stringify(params, null, 2));
  
  try {
    const checkoutSession = await stripe.checkout.sessions.create(params);
    console.log('Checkout session created successfully:', checkoutSession.url);
    return checkoutSession;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Create a billing portal session for managing existing subscriptions
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string = `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
}

// Retrieve a subscription by ID
export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

// Cancel a subscription
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

// Update a subscription's price
export async function updateSubscription({
  subscriptionId,
  newPriceId,
}: {
  subscriptionId: string;
  newPriceId: string;
}) {
  // Get the subscription first to find the current item ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Get the subscription item ID
  const itemId = subscription.items.data[0].id;

  // Update the subscription
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: itemId,
        price: newPriceId,
      },
    ],
  });

  return updatedSubscription;
}

// Get all products and prices
export async function getProductsAndPrices() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  });

  // Get all prices to ensure we have the most up-to-date information
  const prices = await stripe.prices.list({
    active: true,
    expand: ['data.product'],
  });

  return {
    products: products.data,
    prices: prices.data,
  };
} 