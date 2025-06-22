'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      // Here you could add payment verification logic
      // For now, we'll just simulate a successful verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVerified(true);
    } catch (error) {
      console.error('Payment verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#5B6CFF] mx-auto mb-4"></div>
          <p className="text-white text-lg">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Animation */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="w-24 h-24 bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] rounded-full flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            {/* Celebration rings */}
            <div className="absolute inset-0 rounded-full border-4 border-[#5B6CFF]/30 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[#6366F1]/30 animate-ping" style={{animationDelay: '0.5s'}}></div>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
          🎉 Welcome to Premium!
        </h1>
        
        <p className="text-xl text-gray-300 mb-8 max-w-lg mx-auto">
          Your subscription is now active! You have full access to all premium features.
        </p>

        {/* Premium Features Unlocked */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">✨ Features Unlocked</h2>
          
          <div className="grid md:grid-cols-2 gap-4 text-left">
            {[
              '🚨 Real-time price alerts',
              '📊 Advanced technical indicators', 
              '🔌 API access for developers',
              '📈 Historical data export',
              '💼 Portfolio tracking',
              '📱 Mobile push notifications',
              '⚡ Priority customer support',
              '🎯 Custom dashboard layouts'
            ].map((feature, index) => (
              <div key={index} className="flex items-center text-gray-300">
                <span className="text-green-400 mr-3">✓</span>
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300"
          >
            Explore Premium Dashboard →
          </button>
          
          <button
            onClick={() => router.push('/premium/alerts')}
            className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all duration-300"
          >
            Set Up Price Alerts
          </button>
        </div>

        {/* Quick Tips */}
        <div className="mt-12 bg-gradient-to-r from-[#5B6CFF]/10 to-[#6366F1]/10 border border-[#5B6CFF]/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">💡 Quick Tips to Get Started</h3>
          <div className="text-left space-y-2 text-gray-300">
            <p>• Visit your <strong>Dashboard</strong> to see new premium charts and indicators</p>
            <p>• Set up <strong>Price Alerts</strong> to get notified of important price movements</p>
            <p>• Check your <strong>Billing</strong> page to manage your subscription</p>
            <p>• Explore the <strong>API</strong> section if you're a developer</p>
          </div>
        </div>

        {/* Receipt Info */}
        {sessionId && (
          <div className="mt-8 text-sm text-gray-400">
            <p>A receipt has been sent to {session?.user?.email}</p>
            <p className="mt-1">Session ID: {sessionId}</p>
          </div>
        )}

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 mb-2">Need help getting started?</p>
          <button 
            onClick={() => router.push('/support')}
            className="text-[#5B6CFF] hover:text-[#6366F1] transition-colors duration-300"
          >
            Contact Premium Support →
          </button>
        </div>
      </div>
    </div>
  );
}
