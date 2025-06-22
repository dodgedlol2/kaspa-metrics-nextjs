export default function HomePage() {
  return (
    <div className="p-6">
      {/* Hero Section */}
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
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="w-12 h-12 bg-kaspa-gradient rounded-lg flex items-center justify-center mb-4">
            <span className="text-white text-xl">⛏️</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Mining Metrics</h3>
          <p className="text-gray-400">Real-time hashrate, difficulty, and mining performance metrics.</p>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="w-12 h-12 bg-kaspa-gradient rounded-lg flex items-center justify-center mb-4">
            <span className="text-white text-xl">💰</span>
          </div>
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
  )
}
