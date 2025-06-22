export default function HashrateePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Mining Hashrate</h1>
        <p className="text-gray-400">Real-time network hashrate analysis and trends</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Current Hashrate</h3>
          <div className="text-3xl font-bold text-white">2.54 EH/s</div>
          <p className="text-green-400 text-sm mt-1">+1.8% from yesterday</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">7-Day Average</h3>
          <div className="text-3xl font-bold text-white">2.48 EH/s</div>
          <p className="text-blue-400 text-sm mt-1">Steady growth</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">All-Time High</h3>
          <div className="text-3xl font-bold text-white">2.89 EH/s</div>
          <p className="text-gray-400 text-sm mt-1">Reached 2 weeks ago</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Hashrate Chart</h3>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-kaspa-gradient text-white rounded text-sm">1D</button>
            <button className="px-3 py-1 bg-white/10 text-gray-300 rounded text-sm hover:bg-white/20">7D</button>
            <button className="px-3 py-1 bg-white/10 text-gray-300 rounded text-sm hover:bg-white/20">30D</button>
            <button className="px-3 py-1 bg-white/10 text-gray-300 rounded text-sm hover:bg-white/20">ALL</button>
          </div>
        </div>
        <div className="h-96 bg-white/5 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">🔄 Real-time hashrate chart</p>
            <p className="text-sm text-gray-500">Connected to Google Sheets data source</p>
          </div>
        </div>
      </div>
    </div>
  )
}
