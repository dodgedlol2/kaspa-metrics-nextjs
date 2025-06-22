export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-400">Real-time Kaspa network metrics and insights</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Current Price</h3>
            <span className="text-green-400 text-sm">+5.2%</span>
          </div>
          <div className="text-2xl font-bold text-white">$0.045</div>
          <p className="text-xs text-gray-500 mt-1">Last 24h</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Market Cap</h3>
            <span className="text-green-400 text-sm">+2.1%</span>
          </div>
          <div className="text-2xl font-bold text-white">$1.2B</div>
          <p className="text-xs text-gray-500 mt-1">Total value</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Hashrate</h3>
            <span className="text-blue-400 text-sm">+1.8%</span>
          </div>
          <div className="text-2xl font-bold text-white">2.5 EH/s</div>
          <p className="text-xs text-gray-500 mt-1">Network power</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Difficulty</h3>
            <span className="text-yellow-400 text-sm">+0.9%</span>
          </div>
          <div className="text-2xl font-bold text-white">45.2T</div>
          <p className="text-xs text-gray-500 mt-1">Mining difficulty</p>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Price Chart</h3>
          <div className="h-64 bg-white/5 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Interactive chart coming soon...</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Hashrate Trend</h3>
          <div className="h-64 bg-white/5 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Interactive chart coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
