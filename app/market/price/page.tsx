import { getCurrentMetrics, getPriceData } from '@/lib/sheets'
import PriceChart from '@/components/charts/PriceChart'

export default async function PricePage() {
  // Fetch real data from Google Sheets
  const [metrics, priceData] = await Promise.all([
    getCurrentMetrics(),
    getPriceData()
  ])
  
  return (
    <div 
      className="min-h-screen bg-[#0F0F1A] p-6 relative"
      style={{
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.015) 0.5px, transparent 0.5px),
          radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.012) 0.5px, transparent 0.5px),
          radial-gradient(circle at 25% 75%, rgba(255, 255, 255, 0.008) 0.5px, transparent 0.5px),
          radial-gradient(circle at 75% 25%, rgba(255, 255, 255, 0.010) 0.5px, transparent 0.5px),
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.006) 0.5px, transparent 0.5px)
        `,
        backgroundSize: '16px 16px, 24px 24px, 20px 20px, 28px 28px, 32px 32px',
        backgroundPosition: '0 0, 8px 8px, 4px 4px, 12px 12px, 16px 16px'
      }}
    >
      <div className="mb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Spot Price
        </h1>
      </div>
      {/* Clean Price Chart - No borders, no containers */}
      <div className="mb-8">
        <PriceChart data={priceData} height={650} />
      </div>
    </div>
  )
}
