export default function AlertsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Price Alerts 👑</h1>
        <p className="text-gray-400">Set custom alerts for price movements and network events</p>
      </div>

      {/* Premium Notice */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">👑</span>
          <h3 className="text-xl font-semibold text-white">Premium Feature</h3>
        </div>
        <p className="text-gray-300 mb-4">
          Get instant notifications when Kaspa hits your target price or when significant network events occur.
        </p>
        <button className="bg-yellow-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors">
          Upgrade to Premium - $9.99/month
        </button>
      </div>

      {/* Alert Types Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Price Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">Price above $0.05</span>
              <span className="text-yellow-400">🔒 Premium</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">Price below $0.04</span>
              <span className="text-yellow-400">🔒 Premium</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">24h change &gt; 10%</span>
              <span className="text-yellow-400">🔒 Premium</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Network Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">Hashrate ATH</span>
              <span className="text-yellow-400">🔒 Premium</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">Difficulty change &gt; 5%</span>
              <span className="text-yellow-400">🔒 Premium</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">Large transactions</span>
              <span className="text-yellow-400">🔒 Premium</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
