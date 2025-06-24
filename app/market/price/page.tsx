import { getCurrentMetrics, getPriceData } from '@/lib/sheets'
import PriceChart from '@/components/charts/PriceChart'

export default async function PricePage() {
  // Fetch real data from Google Sheets
  const [metrics, priceData] = await Promise.all([
    getCurrentMetrics(),
    getPriceData()
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Price Analysis</h1>
      </div>

      {/* Clean Price Chart - No borders, no containers */}
      <div className="mb-8">
        <PriceChart data={priceData} height={600} />
      </div>
    </div>
  )
}
