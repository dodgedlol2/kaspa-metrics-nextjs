import { getCurrentMetrics, getPriceData, getHashrateData } from '@/lib/sheets'
import MetricCard from '@/components/MetricCard'
import PriceChart from '@/components/charts/PriceChart'
import HashrateChart from '@/components/charts/HashrateChart'

// Format numbers nicely
function formatPrice(price: number): string {
  return `$${price.toFixed(4)}`
}

function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`
  return `$${marketCap.toLocaleString()}`
}

function formatHashrate(hashrate: number): string {
  if (hashrate >= 1e18) return `${(hashrate / 1e18).toFixed(2)} EH/s`
  if (hashrate >= 1e15) return `${(hashrate / 1e15).toFixed(1)} PH/s`
  return `${hashrate.toLocaleString()} H/s`
}

function formatVolume(volume: number): string {
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(0)}K`
  return `$${volume.toLocaleString()}`
}

export default async function DashboardPage() {
  // Fetch real data from Google Sheets
  const [metrics, priceData, hashrateData] = await Promise.all([
    getCurrentMetrics(),
    getPriceData(),
    getHashrateData()
  ])
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-400">Real-time Kaspa network metrics and insights</p>
        <p className="text-xs text-gray-500 mt-1">
          Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </p>
      </div>

      {/* Real Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Current Price"
          value={formatPrice(metrics.price)}
          change={metrics.priceChange24h}
          subtitle="Last 24h"
          icon="💰"
        />
        
        <MetricCard
          title="Market Cap"
          value={formatMarketCap(metrics.marketCap)}
          change={metrics.marketCapChange24h}
          subtitle="Total value"
          icon="💎"
        />
        
        <MetricCard
          title="Hashrate"
          value={formatHashrate(metrics.hashrate)}
          change={metrics.hashrateChange24h}
          subtitle="Network power"
          icon="⛏️"
        />
        
        <MetricCard
          title="24h Volume"
          value={formatVolume(metrics.volume24h)}
          change={metrics.volumeChange24h}
          subtitle="Trading activity"
          icon="📊"
        />
      </div>

      {/* Real Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Price Chart</h3>
          <PriceChart data={priceData.slice(-30)} height={250} />
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Hashrate Trend</h3>
          <HashrateChart data={hashrateData.slice(-30)} height={250} />
        </div>
      </div>
    </div>
  )
}
