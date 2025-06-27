import { getCurrentMetrics, getMarketCapData } from '@/lib/sheets'
import MarketCapChart from '@/components/charts/MarketCapChart'

export default async function MarketCapPage() {
  // Fetch real data from Google Sheets
  const [metrics, marketCapData] = await Promise.all([
    getCurrentMetrics(),
    getMarketCapData()
  ])
  
  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Market Capitalization
        </h1>
      </div>
      {/* Clean Market Cap Chart - No borders, no containers */}
      <div className="mb-8">
        <MarketCapChart data={marketCapData} height={650} />
      </div>
    </div>
  )
}
