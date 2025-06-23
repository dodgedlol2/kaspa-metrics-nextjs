'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const urlError = searchParams.get('error');

  useEffect(() => {
    // Handle URL-based errors (like from NextAuth)
    if (urlError) {
      let errorMessage = '';
      switch (urlError) {
        case 'CredentialsSignin':
          errorMessage = 'Invalid email or password. Please try again.';
          break;
        case 'EmailNotVerified':
          errorMessage = 'Please verify your email address before logging in.';
          break;
        case 'AccessDenied':
          errorMessage = 'Access denied. Please contact support.';
          break;
        default:
          errorMessage = 'An error occurred during sign in. Please try again.';
      }
      setError(errorMessage);
      setShowError(true);
    }
  }, [urlError]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowError(false);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        let errorMessage = '';
        switch (result.error) {
          case 'CredentialsSignin':
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'EmailNotVerified':
            errorMessage = 'Please verify your email address before logging in.';
            break;
          default:
            errorMessage = 'Login failed. Please try again.';
        }
        setError(errorMessage);
        setShowError(true);
      } else if (result?.ok) {
        // Successful login - redirect to callback URL
        // Middleware will handle email verification checks
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Something went wrong. Please try again.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setLoading(true);
    setError('');
    setShowError(false);

    try {
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setError(`Failed to sign in with ${provider}. Please try again.`);
      setShowError(true);
      setLoading(false);
    }
  };

  const dismissError = () => {
    setShowError(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-md mx-auto w-full">
        {/* Error Toast */}
        {showError && error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 relative animate-in slide-in-from-top duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
              <button
                onClick={dismissError}
                className="ml-3 flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to your Kaspa Metrics account</p>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleSocialLogin('discord')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.010c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Continue with Discord
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1a1a2e] text-gray-400">Or continue with email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#5B6CFF] focus:ring-1 focus:ring-[#5B6CFF] transition-all duration-300"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#5B6CFF] focus:ring-1 focus:ring-[#5B6CFF] transition-all duration-300"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a href="/forgot-password" className="text-[#5B6CFF] hover:text-[#6366F1] transition-colors">
                  Forgot your password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <div className="bg-gradient-to-r from-[#5B6CFF]/20 to-[#6366F1]/20 border border-[#5B6CFF]/30 rounded-xl p-4">
              <p className="text-gray-300 text-sm mb-3">
                Don't have an account?
              </p>
              <button
                onClick={() => router.push('/register')}
                className="w-full bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] text-white py-2.5 px-6 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5B6CFF]/25 transition-all duration-300"
              >
                Sign Up for Free
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Join thousands of Kaspa investors
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
