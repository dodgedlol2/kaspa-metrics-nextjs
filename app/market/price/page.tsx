export default function PricePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Price Analysis</h1>
        <p className="text-gray-400">Live Kaspa price data and market analysis</p>
      </div>

      {/* Price Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Current Price</h3>
          <div className="text-3xl font-bold text-white">$0.0452</div>
          <p className="text-green-400 text-sm mt-1">+5.24% (24h)</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">24h Volume</h3>
          <div className="text-3xl font-bold text-white">$12.4M</div>
          <p className="text-blue-400 text-sm mt-1">+8.1% increase</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">24h High</h3>
          <div className="text-3xl font-bold text-white">$0.0468</div>
          <p className="text-gray-400 text-sm mt-1">Peak today</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">24h Low</h3>
          <div className="text-3xl font-bold text-white">$0.0429</div>
          <p className="text-gray-400 text-sm mt-1">Low today</p>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Price Chart</h3>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-kaspa-gradient text-white rounded text-sm">24H</button>
            <button className="px-3 py-1 bg-white/10 text-gray-300 rounded text-sm hover:bg-white/20">7D</button>
            <button className="px-3 py-1 bg-white/10 text-gray-300 rounded text-sm hover:bg-white/20">30D</button>
            <button className="px-3 py-1 bg-white/10 text-gray-300 rounded text-sm hover:bg-white/20">1Y</button>
          </div>
        </div>
        <div className="h-96 bg-white/5 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">📈 Live price chart with candlesticks</p>
            <p className="text-sm text-gray-500">Real-time market data integration</p>
          </div>
        </div>
      </div>
    </div>
  )
}
