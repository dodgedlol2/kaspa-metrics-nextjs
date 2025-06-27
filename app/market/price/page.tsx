import { getCurrentMetrics, getPriceData } from '@/lib/sheets'
import PriceChart from '@/components/charts/PriceChart'

export default async function PricePage() {
  // Fetch real data from Google Sheets
  const [metrics, priceData] = await Promise.all([
    getCurrentMetrics(),
    getPriceData()
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-kaspa-dark via-kaspa-darker to-kaspa-dark">
      {/* Header Section */}
      <div className="px-8 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Price Analysis
            </h1>
            <p className="text-gray-400 text-lg">
              Advanced charting with power law regression and multi-scale analysis
            </p>
          </div>
          
          {/* Current Price Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 min-w-[200px]">
            <div className="text-gray-400 text-sm font-medium mb-1">Current Price</div>
            <div className="text-2xl font-bold text-white mb-1">
              ${metrics?.price ? Number(metrics.price).toFixed(4) : '0.0000'}
            </div>
            <div className="text-green-400 text-sm font-medium">
              {metrics?.price_change_24h ? `${metrics.price_change_24h > 0 ? '+' : ''}${metrics.price_change_24h.toFixed(2)}%` : '+0.00%'} 24h
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="px-8 py-8">
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          {/* Chart Container */}
          <div className="relative">
            <PriceChart data={priceData} height={650} />
          </div>
        </div>
      </div>

      {/* Analysis Cards */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Technical Analysis Card */}
          <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-kaspa-blue/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-kaspa-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Technical Analysis</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Support Level</span>
                <span className="text-white font-medium">$0.0892</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Resistance Level</span>
                <span className="text-white font-medium">$0.2150</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Trend</span>
                <span className="text-green-400 font-medium">Bullish</span>
              </div>
            </div>
          </div>

          {/* Volume Analysis Card */}
          <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Volume Analysis</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">24h Volume</span>
                <span className="text-white font-medium">$12.4M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Volume (7d)</span>
                <span className="text-white font-medium">$8.9M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Volume Trend</span>
                <span className="text-green-400 font-medium">+39.3%</span>
              </div>
            </div>
          </div>

          {/* Power Law Card */}
          <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Power Law Model</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">R² Correlation</span>
                <span className="text-white font-medium">0.8696</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Model Slope</span>
                <span className="text-white font-medium">3.3439</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Prediction</span>
                <span className="text-orange-400 font-medium">Above Trend</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
