import { getCurrentMetrics, getPriceData } from '@/lib/sheets'
import PriceChart from '@/components/charts/PriceChart'

export default async function PricePage() {
  // Fetch real data from Google Sheets
  const [metrics, priceData] = await Promise.all([
    getCurrentMetrics(),
    getPriceData()
  ])
  
  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Spot Price
        </h1>
      </div>
      {/* Clean Price Chart - No borders, no containers */}
      <div className="mb-8">
        <PriceChart data={priceData} height={750} />
      </div>
    </div>
  )
}
