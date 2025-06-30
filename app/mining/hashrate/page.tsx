import { getCurrentMetrics, getHashrateData, getPriceData } from '@/lib/sheets'
import HashrateChart from '@/components/charts/HashrateChart'

export default async function HashratePage() {
  // Fetch real data from Google Sheets - now including price data
  const [metrics, hashrateData, priceData] = await Promise.all([
    getCurrentMetrics(),
    getHashrateData(),
    getPriceData() // Add price data fetch
  ])
  
  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Network Hashrate
        </h1>
      </div>
      {/* Clean Hashrate Chart with Price Background - No borders, no containers */}
      <div className="mb-8">
        <HashrateChart 
          data={hashrateData} 
          priceData={priceData} 
          height={650} 
        />
      </div>
    </div>
  )
}
