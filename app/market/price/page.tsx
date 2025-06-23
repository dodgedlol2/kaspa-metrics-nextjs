import { getCurrentMetrics, getPriceData } from '@/lib/sheets'
import MetricCard from '@/components/MetricCard'
import AdvancedPriceChart from '@/components/charts/AdvancedPriceChart'

// Format numbers nicely
function formatPrice(price: number): string {
  if (price >= 1) {
    if (price >= 1000) return `$${(price/1000).toFixed(1)}k`
    else if (price >= 100) return `$${price.toFixed(0)}`
    else if (price >= 10) return `$${price.toFixed(1)}`
    else return `$${price.toFixed(2)}`
  } else if (price >= 0.01) {
    return `$${price.toFixed(3)}`
  } else if (price >= 0.001) {
    return `$${price.toFixed(4)}`
  } else if (price >= 0.0001) {
    return `$${price.toFixed(5)}`
  } else {
    return `$${price.toExponential(2)}`
  }
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(0)}K`
  return `$${volume.toLocaleString()}`
}

// Calculate 24h high/low from price data
function calculate24hHighLow(priceData: any[]) {
  if (priceData.length < 2) return { high: 0, low: 0 }
  
  const last24h = priceData.slice(-24) // Assuming daily data, take last 24 points as approximation
  const prices = last24h.map(d => d.value)
  
  return {
    high: Math.max(...prices),
    low: Math.min(...prices)
  }
}

export default async function PricePage() {
  // Fetch real data from Google Sheets
  const [metrics, priceData] = await Promise.all([
    getCurrentMetrics(),
    getPriceData()
  ])

  // Calculate 24h high/low
  const { high: high24h, low: low24h } = calculate24hHighLow(priceData)
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Price Analysis</h1>
        <p className="text-gray-400">Advanced Kaspa price charts with power law analysis</p>
        <p className="text-xs text-gray-500 mt-1">
          Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </p>
      </div>

      {/* Real Price Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Current Price"
          value={formatPrice(metrics.price)}
          change={metrics.priceChange24h}
          subtitle="Last 24h"
          icon="💰"
        />
        
        <MetricCard
          title="24h Volume"
          value={formatVolume(metrics.volume24h)}
          change={metrics.volumeChange24h}
          subtitle="Trading activity"
          icon="📊"
        />
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">24h High</h3>
          </div>
          <div className="flex items-center">
            <span className="text-2xl mr-3">📈</span>
            <div>
              <div className="text-2xl font-bold text-white">{formatPrice(high24h)}</div>
              <p className="text-xs text-gray-500 mt-1">Peak today</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">24h Low</h3>
          </div>
          <div className="flex items-center">
            <span className="text-2xl mr-3">📉</span>
            <div>
              <div className="text-2xl font-bold text-white">{formatPrice(low24h)}</div>
              <p className="text-xs text-gray-500 mt-1">Low today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Price Chart */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">Advanced Price Chart</h3>
          <p className="text-sm text-gray-400">
            Interactive chart with logarithmic scaling, power law regression, and support/resistance analysis
          </p>
        </div>
        
        <AdvancedPriceChart data={priceData} />
      </div>

      {/* Price Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Price Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">24h Change</span>
              <span className={`font-semibold ${
                metrics.priceChange24h > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {metrics.priceChange24h > 0 ? '+' : ''}{metrics.priceChange24h.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Price</span>
              <span className="text-white font-semibold">{formatPrice(metrics.price)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">24h High</span>
              <span className="text-white font-semibold">{formatPrice(high24h)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">24h Low</span>
              <span className="text-white font-semibold">{formatPrice(low24h)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Market Data</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Market Cap</span>
              <span className="text-white font-semibold">
                {formatVolume(metrics.marketCap)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">24h Volume</span>
              <span className="text-white font-semibold">
                {formatVolume(metrics.volume24h)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Volume Change</span>
              <span className={`font-semibold ${
                metrics.volumeChange24h > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {metrics.volumeChange24h > 0 ? '+' : ''}{metrics.volumeChange24h.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Data Points</span>
              <span className="text-white font-semibold">{priceData.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
