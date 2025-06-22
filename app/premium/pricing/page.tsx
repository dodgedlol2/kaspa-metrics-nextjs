'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface SubscriptionStatus {
  isPremium: boolean;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  hasStripeCustomer: boolean;
}

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchSubscriptionStatus();
    }
  }, [session]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/stripe/checkout');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const handleUpgrade = async () => {
    if (!session?.user) {
      router.push('/login?callbackUrl=/premium/pricing');
      return;
    }

    if (subscriptionStatus?.isPremium) {
      router.push('/premium/billing');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || 'price_1RcvleFa5YIiSYw6MAWIAQAo',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;

    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = {
    free: [
      'Basic price charts',
      'Hashrate monitoring',
      'Market cap tracking',
      'Volume analysis',
      'Mobile responsive',
    ],
    premium: [
      'Advanced technical indicators',
      'Real-time price alerts',
      'Historical data export',
      'API access',
      'Custom dashboard layouts',
      'Portfolio tracking',
      'Priority support',
      'Mobile push notifications',
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Unlock advanced Kaspa analytics and take your crypto insights to the next level
          </p>
        </div>

        {/* Current Status Banner */}
        {subscriptionStatus?.isPremium && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-8 text-center">
            <p className="text-green-400 font-semibold">
              🎉 You're currently on the Premium plan! 
              {subscriptionStatus.subscriptionEndDate && (
                <span className="ml-2 text-green-300">
                  (Renews {new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 relative">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
              <div className="text-4xl font-bold text-white mb-2">
                $0<span className="text-lg text-gray-400">/month</span>
              </div>
              <p className="text-gray-400">Perfect for getting started</p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-300">
                  <span className="text-green-400 mr-3">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 px-6 bg-gray-600 text-gray-400 rounded-lg font-semibold cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-[#5B6CFF]/20 to-[#6366F1]/20 backdrop-blur-sm border-2 border-[#5B6CFF]/50 rounded-2xl p-8 relative">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white px-6 py-2 rounded-full text-sm font-bold">
                MOST POPULAR
              </span>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
              <div className="text-4xl font-bold text-white mb-2">
                $9.99<span className="text-lg text-gray-400">/month</span>
              </div>
              <p className="text-gray-400">For serious Kaspa investors</p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.premium.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-300">
                  <span className="text-[#5B6CFF] mr-3">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </span>
              ) : subscriptionStatus?.isPremium ? (
                'Manage Billing'
              ) : session?.user ? (
                'Upgrade to Premium'
              ) : (
                'Sign In to Upgrade'
              )}
            </button>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Feature Comparison
          </h2>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-white/10">
              {/* Header */}
              <div className="bg-[#1a1a2e] p-4">
                <h3 className="font-semibold text-white">Features</h3>
              </div>
              <div className="bg-[#1a1a2e] p-4 text-center">
                <h3 className="font-semibold text-white">Free</h3>
              </div>
              <div className="bg-gradient-to-r from-[#5B6CFF]/20 to-[#6366F1]/20 p-4 text-center">
                <h3 className="font-semibold text-white">Premium</h3>
              </div>

              {/* Feature Rows */}
              {[
                ['Price Charts', '✓', '✓'],
                ['Basic Analytics', '✓', '✓'],
                ['Mobile Access', '✓', '✓'],
                ['Price Alerts', '✗', '✓'],
                ['API Access', '✗', '✓'],
                ['Data Export', '✗', '✓'],
                ['Technical Indicators', '✗', '✓'],
                ['Portfolio Tracking', '✗', '✓'],
                ['Priority Support', '✗', '✓'],
              ].map(([feature, free, premium], index) => (
                <>
                  <div className="bg-[#1a1a2e] p-4 text-gray-300">{feature}</div>
                  <div className="bg-[#1a1a2e] p-4 text-center">
                    <span className={free === '✓' ? 'text-green-400' : 'text-red-400'}>
                      {free}
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-[#5B6CFF]/10 to-[#6366F1]/10 p-4 text-center">
                    <span className={premium === '✓' ? 'text-green-400' : 'text-red-400'}>
                      {premium}
                    </span>
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! You can cancel your subscription at any time. Your premium features will remain active until the end of your billing period."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards (Visa, MasterCard, American Express) processed securely through Stripe."
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 7-day money-back guarantee. If you're not satisfied, contact us for a full refund."
              },
              {
                q: "How do price alerts work?",
                a: "Set custom price thresholds and get instant notifications via email and push notifications when Kaspa hits your target prices."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-left">
                <h4 className="font-semibold text-white mb-2">{faq.q}</h4>
                <p className="text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-[#5B6CFF]/20 to-[#6366F1]/20 backdrop-blur-sm border border-[#5B6CFF]/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to unlock premium Kaspa analytics?
            </h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join hundreds of Kaspa investors who rely on our advanced tools for better trading decisions.
            </p>
            {!subscriptionStatus?.isPremium && (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {session?.user ? 'Start Premium Trial' : 'Sign In to Get Started'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
