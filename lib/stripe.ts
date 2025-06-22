import Stripe from 'stripe';

// Initialize Stripe with your secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Stripe configuration constants
export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  
  // Premium subscription price (create this in Stripe dashboard)
  premiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1RcvleFa5YIiSYw6MAWIAQAo',
  
  // Subscription metadata
  premiumProductName: 'Kaspa Metrics Premium',
  premiumProductDescription: 'Advanced analytics, price alerts, API access, and data export',
  premiumPrice: 9.99,
  
  // Success/Cancel URLs
  successUrl: process.env.NEXTAUTH_URL + '/premium/success',
  cancelUrl: process.env.NEXTAUTH_URL + '/premium/pricing',
  
  // Customer portal URL
  customerPortalUrl: process.env.NEXTAUTH_URL + '/premium/billing',
};

// Helper function to format price for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

// Helper function to create or retrieve Stripe customer
export async function getOrCreateStripeCustomer(userId: string, email: string, name?: string) {
  try {
    // First check if customer already exists in our database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (user?.stripe_customer_id) {
      return user.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        userId,
      },
    });

    // Update user record with Stripe customer ID
    await supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

// Helper function to create checkout session
export async function createCheckoutSession(customerId: string, priceId: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: STRIPE_CONFIG.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: STRIPE_CONFIG.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Helper function to create customer portal session
export async function createCustomerPortalSession(customerId: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: STRIPE_CONFIG.customerPortalUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}
