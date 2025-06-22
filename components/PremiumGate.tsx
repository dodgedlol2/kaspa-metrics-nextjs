'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
  showPreview?: boolean;
  fallback?: React.ReactNode;
}

interface UserData {
  isPremium: boolean;
  subscriptionStatus: string;
}

export default function PremiumGate({ 
  children, 
  feature = 'this feature', 
  showPreview = false,
  fallback
}: PremiumGateProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [session, status]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/stripe/checkout');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  // User is premium - show the feature
  if (userData?.isPremium) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default premium upgrade prompt
  return (
    <div className="relative">
      {/* Blurred preview if enabled */}
      {showPreview && (
        <div className="filter blur-sm pointer-events-none opacity-50">
          {children}
        </div>
      )}

      {/* Upgrade overlay */}
      <div className={`${showPreview ? 'absolute inset-0' : ''} bg-gradient-to-br from-[#5B6CFF]/20 to-[#6366F1]/20 backdrop-blur-sm border-2 border-[#5B6CFF]/50 rounded-xl p-8 text-center`}>
        <div className="max-w-md mx-auto">
          {/* Premium Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] rounded-full text-white font-semibold mb-4">
            ⭐ Premium Feature
          </div>

          <h3 className="text-xl font-bold text-white mb-3">
            Unlock {feature}
          </h3>
          
          <p className="text-gray-300 mb-6">
            {session?.user 
              ? `Upgrade to Premium to access ${feature} and other advanced analytics tools.`
              : `Sign in and upgrade to Premium to access ${feature} and other advanced analytics tools.`
            }
          </p>

          {/* Feature highlights */}
          <div className="text-left bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-white font-semibold mb-2">Premium includes:</p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Real-time price alerts</li>
              <li>• Advanced technical indicators</li>
              <li>• API access & data export</li>
              <li>• Portfolio tracking</li>
              <li>• Priority support</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {session?.user ? (
              <>
                <button
                  onClick={() => router.push('/premium/pricing')}
                  className="flex-1 bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300"
                >
                  Upgrade to Premium
                </button>
                <button
                  onClick={() => router.push('/premium/pricing')}
                  className="flex-1 bg-white/10 border border-white/20 text-white py-3 px-6 rounded-lg hover:bg-white/20 transition-all duration-300"
                >
                  View Pricing
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login?callbackUrl=/premium/pricing')}
                  className="flex-1 bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300"
                >
                  Sign In & Upgrade
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="flex-1 bg-white/10 border border-white/20 text-white py-3 px-6 rounded-lg hover:bg-white/20 transition-all duration-300"
                >
                  Create Account
                </button>
              </>
            )}
          </div>

          {/* Pricing reminder */}
          <p className="text-sm text-gray-400 mt-4">
            Only $9.99/month • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for checking premium status
export function usePremiumStatus() {
  const { data: session } = useSession();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchPremiumStatus();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchPremiumStatus = async () => {
    try {
      const response = await fetch('/api/stripe/checkout');
      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.isPremium);
      }
    } catch (error) {
      console.error('Error fetching premium status:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isPremium, loading };
}
