import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCustomerPortalSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's Stripe customer ID from database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('email', session.user.email)
      .single();

    if (error || !user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe first.' },
        { status: 404 }
      );
    }

    // Create customer portal session
    const portalSession = await createCustomerPortalSession(user.stripe_customer_id);

    return NextResponse.json({
      portalUrl: portalSession.url,
    });

  } catch (error) {
    console.error('Customer portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
