import Link from 'next/link'

export default function HomePage() {
return (
    <div className="min-h-screen bg-gradient-to-br from-kaspa-dark via-kaspa-darker to-kaspa-dark">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-kaspa-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Kaspa Metrics</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/mining" className="text-gray-300 hover:text-white transition-colors">
                Mining
              </Link>
              <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">
                Price Data
              </Link>
              <Link href="/login" className="bg-kaspa-gradient text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

    <div className="p-6">
{/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Kaspa Metrics
            <span className="block text-transparent bg-clip-text bg-kaspa-gradient">
              Made Simple
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Professional cryptocurrency metrics with real-time charts, mining insights, 
            and market data. Everything you need to track Kaspa's performance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard"
              className="bg-kaspa-gradient text-white px-8 py-3 rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity"
            >
              View Metrics
            </Link>
            <Link 
              href="/premium"
              className="border border-white/20 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Go Premium
            </Link>
          </div>
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Kaspa Metrics
          <span className="block text-transparent bg-clip-text bg-kaspa-gradient">
            Made Simple
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Professional cryptocurrency metrics with real-time charts, mining insights, 
          and market data. Everything you need to track Kaspa's performance.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="/dashboard"
            className="bg-kaspa-gradient text-white px-8 py-3 rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity"
          >
            View Metrics
          </a>
          <a 
            href="/premium/alerts"
            className="border border-white/20 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors"
          >
            Go Premium
          </a>
</div>
      </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-kaspa-gradient rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-xl">⛏️</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Mining Metrics</h3>
            <p className="text-gray-400">Real-time hashrate, difficulty, and mining performance metrics.</p>
      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="w-12 h-12 bg-kaspa-gradient rounded-lg flex items-center justify-center mb-4">
            <span className="text-white text-xl">⛏️</span>
</div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-kaspa-gradient rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Price Tracking</h3>
            <p className="text-gray-400">Live price data, volume analysis, and market cap insights.</p>
          <h3 className="text-xl font-semibold text-white mb-2">Mining Metrics</h3>
          <p className="text-gray-400">Real-time hashrate, difficulty, and mining performance metrics.</p>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="w-12 h-12 bg-kaspa-gradient rounded-lg flex items-center justify-center mb-4">
            <span className="text-white text-xl">💰</span>
</div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-kaspa-gradient rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Advanced Charts</h3>
            <p className="text-gray-400">Interactive charts with power law analysis and trend indicators.</p>
          <h3 className="text-xl font-semibold text-white mb-2">Price Tracking</h3>
          <p className="text-gray-400">Live price data, volume analysis, and market cap insights.</p>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="w-12 h-12 bg-kaspa-gradient rounded-lg flex items-center justify-center mb-4">
            <span className="text-white text-xl">📊</span>
</div>
          <h3 className="text-xl font-semibold text-white mb-2">Advanced Charts</h3>
          <p className="text-gray-400">Interactive charts with power law analysis and trend indicators.</p>
</div>
</div>
</div>
