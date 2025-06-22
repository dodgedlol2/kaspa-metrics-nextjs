'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function Header() {
  const { data: session, status } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <header className="h-16 bg-black/20 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-6 w-full">
      {/* Logo */}
      <Link href="/" className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-kaspa-gradient rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <h1 className="text-xl font-bold text-white">Kaspa Metrics</h1>
      </Link>

      {/* Right side - User Info or Login */}
      <div className="flex items-center space-x-4">
        {status === 'loading' ? (
          <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse"></div>
        ) : session ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors"
            >
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-kaspa-gradient rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <span className="text-white text-sm font-medium hidden md:block">
                {session.user?.name || session.user?.email}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg z-50">
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-sm font-medium text-white">{session.user?.name}</p>
                    <p className="text-xs text-gray-400">{session.user?.email}</p>
                  </div>
                  <Link
                    href="/account"
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Account Settings
                  </Link>
                  <Link
                    href="/premium/alerts"
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Premium Features
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="bg-kaspa-gradient text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
