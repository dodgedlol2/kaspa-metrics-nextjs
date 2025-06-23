'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);

  const token = searchParams.get('token');
  const messageParam = searchParams.get('message');

  useEffect(() => {
    if (token) {
      // Only verify if there's actually a token in the URL from email click
      console.log('Token found, starting verification:', token);
      verifyEmail(token);
    } else if (messageParam) {
      // Show the message without trying to verify anything
      console.log('Message param found, showing pending state:', messageParam);
      setStatus('pending');
      setMessage(messageParam);
    } else {
      // Default state - just waiting for user to check email
      console.log('No token or message, showing default pending state');
      setStatus('pending');
      setMessage('Please check your email and click the verification link.');
    }
  }, [token, messageParam]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Email verified successfully! You can now access all features.');
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to verify email. The link may be expired or invalid.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const resendVerification = async () => {
    if (!session?.user?.email) return;

    setResending(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.user.email }),
      });

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setMessage('Failed to send verification email. Please try again.');
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const getIcon = () => {
    switch (status) {
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'pending':
        return (
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return '✅ Email Verified!';
      case 'error':
        return '❌ Verification Failed';
      case 'pending':
        return token ? 'Verifying Email...' : '📧 Check Your Email';
      default:
        return 'Verifying Email...';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <div className="flex justify-center">
            {getIcon()}
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            {getTitle()}
          </h1>

          <p className="text-gray-300 mb-6">
            {message}
          </p>

          {status === 'success' && (
            <div className="text-green-400 text-sm mb-6">
              Redirecting to dashboard in 3 seconds...
            </div>
          )}

          {status === 'pending' && session?.user && (
            <div className="space-y-4">
              <button
                onClick={resendVerification}
                disabled={resending}
                className="w-full bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </span>
                ) : (
                  'Resend Verification Email'
                )}
              </button>

              <button
                onClick={handleSignOut}
                className="w-full bg-white/10 border border-white/20 text-white py-3 px-6 rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                Sign Out & Try Different Account
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <button
                onClick={() => router.push('/register')}
                className="w-full bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300"
              >
                Create New Account
              </button>

              <button
                onClick={() => router.push('/login')}
                className="w-full bg-white/10 border border-white/20 text-white py-3 px-6 rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                Back to Login
              </button>
            </div>
          )}

          {(status === 'loading' || status === 'success') && (
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-white/10 border border-white/20 text-white py-3 px-6 rounded-lg hover:bg-white/20 transition-all duration-300"
            >
              Continue to Dashboard
            </button>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Need help? <a href="mailto:support@kaspametrics.com" className="text-[#5B6CFF] hover:text-[#6366F1]">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
