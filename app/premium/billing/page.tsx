'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface SubscriptionData {
  isPremium: boolean;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  hasStripeCustomer: boolean;
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user) {
      fetchSubscriptionData();
    }
  }, [session, status]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/stripe/checkout');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { portalUrl } = await response.json();
      window.location.href = portalUrl;

    } catch (error) {
      console.error('Portal error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || !subscriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B6CFF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Billing & Subscription
          </h1>
          <p className="text-gray-300">
            Manage your Kaspa Metrics subscription and billing information
          </p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Current Plan</h2>
            {subscriptionData.isPremium && (
              <span className="bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white px-4 py-2 rounded-full text-sm font-semibold">
                PREMIUM
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Plan Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan:</span>
                  <span className="text-white font-semibold">
                    {subscriptionData.isPremium ? 'Premium' : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`font-semibold ${
                    subscriptionData.subscriptionStatus === 'active' 
                      ? 'text-green-400' 
                      : subscriptionData.subscriptionStatus === 'canceled'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}>
                    {subscriptionData.subscriptionStatus === 'active' ? 'Active' :
                     subscriptionData.subscriptionStatus === 'canceled' ? 'Canceled' :
                     subscriptionData.subscriptionStatus === 'past_due' ? 'Past Due' :
                     'Free'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    {subscriptionData.subscriptionStatus === 'canceled' ? 'Premium expires:' :
                     subscriptionData.subscriptionStatus === 'active' ? 'Next billing:' :
                     'Renews:'}
                  </span>
                  <span className="text-white">
                    {subscriptionData.subscriptionEndDate ? new Date(subscriptionData.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                
                {subscriptionData.subscriptionStatus === 'canceled' && (
                  <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-yellow-300 font-medium">Subscription Canceled</p>
                        <p className="text-yellow-300 text-sm mt-1">
                          You'll keep premium access until {subscriptionData.subscriptionEndDate ? new Date(subscriptionData.subscriptionEndDate).toLocaleDateString() : 'your billing period ends'}. 
                          You can reactivate anytime before then.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly Cost:</span>
                  <span className="text-white font-semibold">
                    {subscriptionData.isPremium ? '$9.99' : '$0.00'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Features Included</h3>
              <div className="space-y-2">
                {subscriptionData.isPremium ? (
                  <>
                    <div className="flex items-center text-green-400">
                      <span className="mr-2">✓</span>
                      Real-time price alerts
                    </div>
                    <div className="flex items-center text-green-400">
                      <span className="mr-2">✓</span>
                      Advanced technical indicators
                    </div>
                    <div className="flex items-center text-green-400">
                      <span className="mr-2">✓</span>
                      API access
                    </div>
                    <div className="flex items-center text-green-400">
                      <span className="mr-2">✓</span>
                      Data export (CSV/JSON)
                    </div>
                    <div className="flex items-center text-green-400">
                      <span className="mr-2">✓</span>
                      Portfolio tracking
                    </div>
                    <div className="flex items-center text-green-400">
                      <span className="mr-2">✓</span>
                      Priority support
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center text-gray-400">
                      <span className="mr-2">✓</span>
                      Basic charts and analytics
                    </div>
                    <div className="flex items-center text-gray-400">
                      <span className="mr-2">✓</span>
                      Price and hashrate tracking
                    </div>
                    <div className="flex items-center text-gray-400">
                      <span className="mr-2">✓</span>
                      Mobile responsive design
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {subscriptionData.isPremium ? (
            <>
              {subscriptionData.subscriptionStatus === 'canceled' ? (
                // Canceled subscription - show reactivation
                <button
                  onClick={() => router.push('/premium/pricing')}
                  className="bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white p-6 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300"
                >
                  <div className="text-2xl mb-2">🔄</div>
                  <div>Reactivate Premium</div>
                  <div className="text-sm opacity-80 mt-1">
                    Continue your subscription
                  </div>
                </button>
              ) : (
                // Active subscription - show manage billing
                <button
                  onClick={handleManageBilling}
                  disabled={loading}
                  className="bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white p-6 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Loading...
                    </span>
                  ) : (
                    <>
                      <div className="text-2xl mb-2">💳</div>
                      <div>Manage Billing</div>
                      <div className="text-sm opacity-80 mt-1">
                        Update payment, cancel, download invoices
                      </div>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => router.push('/premium/alerts')}
                className="bg-white/5 border border-white/10 text-white p-6 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
              >
                <div className="text-2xl mb-2">🚨</div>
                <div>Price Alerts</div>
                <div className="text-sm opacity-80 mt-1">
                  Manage your alert settings
                </div>
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="bg-white/5 border border-white/10 text-white p-6 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
              >
                <div className="text-2xl mb-2">📊</div>
                <div>Dashboard</div>
                <div className="text-sm opacity-80 mt-1">
                  View premium analytics
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push('/premium/pricing')}
                className="bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white p-6 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300"
              >
                <div className="text-2xl mb-2">⭐</div>
                <div>Upgrade to Premium</div>
                <div className="text-sm opacity-80 mt-1">
                  Unlock all features for $9.99/month
                </div>
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="bg-white/5 border border-white/10 text-white p-6 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
              >
                <div className="text-2xl mb-2">📊</div>
                <div>Free Dashboard</div>
                <div className="text-sm opacity-80 mt-1">
                  Basic analytics and charts
                </div>
              </button>

              <button
                onClick={() => router.push('/premium/pricing')}
                className="bg-white/5 border border-white/10 text-white p-6 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
              >
                <div className="text-2xl mb-2">🔍</div>
                <div>View Features</div>
                <div className="text-sm opacity-80 mt-1">
                  See what Premium includes
                </div>
              </button>
            </>
          )}
        </div>

        {/* Support Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Support</h3>
              <p className="text-gray-400 mb-4">
                Have questions about your subscription or need technical support?
              </p>
              <button className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all duration-300">
                Contact Support
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Feedback</h3>
              <p className="text-gray-400 mb-4">
                Help us improve Kaspa Metrics by sharing your feedback and feature requests.
              </p>
              <button className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all duration-300">
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
