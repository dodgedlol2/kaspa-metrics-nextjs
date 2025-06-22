import Link from 'next/link'

export default function Header() {
  return (
    <header className="h-16 bg-black/20 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-6 w-full">
      {/* Logo */}
      <Link href="/" className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-kaspa-gradient rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <h1 className="text-xl font-bold text-white">Kaspa Metrics</h1>
      </Link>

      {/* Right side - Login/User */}
      <div className="flex items-center space-x-4">
        <Link 
          href="/login"
          className="bg-kaspa-gradient text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Login
        </Link>
      </div>
    </header>
  )
}
