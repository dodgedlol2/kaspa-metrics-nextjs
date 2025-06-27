import { getCurrentMetrics, getPriceData } from '@/lib/sheets'
import PriceChart from '@/components/charts/PriceChart'

export default async function PricePage() {
  // Fetch real data from Google Sheets
  const [metrics, priceData] = await Promise.all([
    getCurrentMetrics(),
    getPriceData()
  ])
  
  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#5B6CFF]/20 to-[#8B5CF6]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#3B82F6]/15 to-[#6366F1]/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-bl from-[#8B5CF6]/10 to-[#5B6CFF]/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '5s' }} />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Floating dots */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-[#5B6CFF]/30 rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '3s' }} />
        <div className="absolute top-40 right-32 w-1 h-1 bg-[#8B5CF6]/40 rounded-full animate-ping" style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
        <div className="absolute bottom-32 left-32 w-1.5 h-1.5 bg-[#3B82F6]/35 rounded-full animate-ping" style={{ animationDelay: '3s', animationDuration: '3.5s' }} />
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-[#6366F1]/40 rounded-full animate-ping" style={{ animationDelay: '2s', animationDuration: '4.5s' }} />
        
        {/* Geometric shapes */}
        <div className="absolute top-1/4 right-1/4 w-12 h-12 border border-[#5B6CFF]/10 rotate-45 animate-spin" style={{ animationDuration: '20s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-8 h-8 border border-[#8B5CF6]/8 rotate-12 animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }} />
        
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
      
      {/* Content with proper z-index */}
      <div className="relative z-10">
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
    </div>
  )
}
