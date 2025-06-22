import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Webhook secret from Stripe dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Stripe webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    
    console.log('Processing subscription update for customer:', customerId);
    console.log('Subscription status:', subscription.status);
    console.log('Subscription ID:', subscription.id);
    console.log('Current period end:', subscription.current_period_end);
    
    // Find user by Stripe customer ID
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error) {
      console.error('Database error when looking up user:', error);
      console.log('Searching for customer ID:', customerId);
      
      // Try to find any users with this customer ID
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, stripe_customer_id')
        .not('stripe_customer_id', 'is', null);
      
      console.log('All users with stripe_customer_id:', allUsers);
      return;
    }

    if (!user) {
      console.error('User not found for customer:', customerId);
      
      // Try to find any users with this customer ID
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, stripe_customer_id')
        .not('stripe_customer_id', 'is', null);
      
      console.log('All users with stripe_customer_id:', allUsers);
      return;
    }

    console.log('Found user:', user.email);

    // Calculate subscription end date with proper error handling
    let subscriptionEndDate: Date;
    try {
      if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
        subscriptionEndDate = new Date(subscription.current_period_end * 1000);
      } else {
        // Fallback: set to 1 month from now
        subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      }
      
      // Validate the date
      if (isNaN(subscriptionEndDate.getTime())) {
        throw new Error('Invalid date created');
      }
    } catch (dateError) {
      console.error('Error creating subscription end date:', dateError);
      // Fallback: set to 1 month from now
      subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    }

    console.log('Subscription end date:', subscriptionEndDate.toISOString());
    console.log('Updating user subscription for user ID:', user.id);

    // Update user subscription status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_premium: subscription.status === 'active',
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_end_date: subscriptionEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user subscription:', updateError);
      return;
    }

    console.log(`Successfully updated subscription for user ${user.email}: ${subscription.status}`);

    // Send welcome email for new subscriptions
    if (subscription.status === 'active') {
      await sendPremiumWelcomeEmail(user.email, user.id);
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error || !user) {
      console.error('User not found for customer:', customerId);
      return;
    }

    // Update user to free tier
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_premium: false,
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user subscription:', updateError);
      return;
    }

    console.log(`Canceled subscription for user ${user.email}`);

    // Send cancellation email
    await sendSubscriptionCanceledEmail(user.email, user.id);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!user) return;

    console.log(`Payment succeeded for user ${user.email}: $${(invoice.amount_paid / 100).toFixed(2)}`);
    
    // Send payment receipt email
    await sendPaymentReceiptEmail(user.email, user.id, invoice);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!user) return;

    console.log(`Payment failed for user ${user.email}`);
    
    // Send payment failed email
    await sendPaymentFailedEmail(user.email, user.id, invoice);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

// Email functions (using your existing Mailjet setup)
async function sendPremiumWelcomeEmail(email: string, userId: string) {
  try {
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
      console.error('Mailjet credentials not configured');
      return;
    }

    const mailjet = (await import('node-mailjet')).default.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_API_SECRET
    );

    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@kaspametrics.com',
            Name: 'Kaspa Metrics'
          },
          To: [{ Email: email }],
          Subject: '🎉 Welcome to Kaspa Metrics Premium!',
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🎉 Welcome to Premium!</h1>
              </div>
              <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <p>Congratulations! You now have access to all premium features:</p>
                <ul style="text-align: left; margin: 20px 0;">
                  <li>🚨 <strong>Price Alerts</strong> - Custom threshold notifications</li>
                  <li>📊 <strong>Advanced Charts</strong> - Technical indicators & more timeframes</li>
                  <li>🔌 <strong>API Access</strong> - Developer endpoints for your projects</li>
                  <li>📈 <strong>Data Export</strong> - CSV/JSON downloads</li>
                  <li>📱 <strong>Mobile Alerts</strong> - Push notifications</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background: linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Explore Premium Features →
                  </a>
                </div>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Questions? Reply to this email or visit our <a href="${process.env.NEXTAUTH_URL}/support">support center</a>.
                </p>
              </div>
            </div>
          `
        }
      ]
    });
  } catch (error) {
    console.error('Error sending premium welcome email:', error);
  }
}

async function sendSubscriptionCanceledEmail(email: string, userId: string) {
  // Implementation for cancellation email
  console.log('TODO: Send cancellation email to', email);
}

async function sendPaymentReceiptEmail(email: string, userId: string, invoice: Stripe.Invoice) {
  // Implementation for payment receipt
  console.log('TODO: Send payment receipt to', email);
}

async function sendPaymentFailedEmail(email: string, userId: string, invoice: Stripe.Invoice) {
  // Implementation for payment failed email
  console.log('TODO: Send payment failed email to', email);
}
