'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      verifyEmail(token)
    } else {
      setError('Invalid verification link')
      setIsLoading(false)
    }
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=Email verified successfully! You can now sign in.')
        }, 3000)
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kaspa-dark via-kaspa-darker to-kaspa-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-kaspa-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Verifying your email...</p>
          <p className="text-gray-400 text-sm mt-2">This should only take a moment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-kaspa-dark via-kaspa-darker to-kaspa-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          {isSuccess ? (
            <>
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Email Verified! 🎉</h2>
              <p className="text-gray-400 mb-6">
                Your account is now fully verified. You can now access all premium features and billing options.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Redirecting to login in a few seconds...
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Verification Failed</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <p className="text-gray-500 text-sm mb-6">
                The verification link may have expired or been used already.
              </p>
            </>
          )}
          
          <div className="space-y-3">
            <Link 
              href="/login"
              className="block w-full bg-kaspa-gradient text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              {isSuccess ? 'Continue to Login' : 'Go to Login'}
            </Link>
            
            {!isSuccess && (
              <Link 
                href="/register"
                className="block w-full border border-white/20 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Create New Account
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
