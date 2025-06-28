'use client'
import { useSession } from 'next-auth/react'
import PriceHashrateChart from '@/components/charts/PriceHashrateChart'
import PremiumGate from '@/components/PremiumGate'

export default function PriceHashratePage() {
  const { data: session } = useSession()
  const isLoggedIn = !!session
  const isPremium = session?.user?.is_premium || false

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Price vs Hashrate Analysis
              </h1>
              <p className="text-[#A0A0B8] text-lg">
                Discover the mathematical relationship between Kaspa's network security and market valuation
              </p>
            </div>
            
            {!isPremium && (
              <div className="bg-gradient-to-r from-[#F59E0B] to-[#EAB308] text-black px-4 py-2 rounded-lg font-medium text-sm">
                Premium Feature
              </div>
            )}
          </div>
        </div>

        {/* Power Law Theory Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-[#1A1A2E] rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Understanding Power Law Relationships
              </h2>
              <div className="space-y-4 text-[#A0A0B8]">
                <p>
                  The relationship between Kaspa's price and network hashrate follows a power law distribution, 
                  mathematically expressed as: <span className="text-[#5B6CFF] font-mono">Price = A × Hashrate^B</span>
                </p>
                <p>
                  This relationship suggests that as the network becomes more secure (higher hashrate), 
                  the market recognizes this increased security with higher valuations, but not in a linear fashion.
                </p>
                <p>
                  Power laws are found throughout nature and markets, from earthquake magnitudes to 
                  city populations, making this analysis particularly valuable for understanding 
                  long-term price dynamics.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#1A1A2E] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Key Insights</h3>
              <ul className="space-y-3 text-sm text-[#A0A0B8]">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Network security directly correlates with market confidence
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Logarithmic scaling reveals underlying mathematical patterns
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Power law exponent indicates market maturity
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Deviations from trend line signal market opportunities
                </li>
              </ul>
            </div>

            <div className="bg-[#1A1A2E] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Analysis Benefits</h3>
              <ul className="space-y-2 text-sm text-[#A0A0B8]">
                <li>• Identify fair value estimates</li>
                <li>• Spot market over/undervaluation</li>
                <li>• Predict long-term price trends</li>
                <li>• Understand network fundamentals</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        {isLoggedIn ? (
          isPremium ? (
            <PriceHashrateChart className="mb-8" />
          ) : (
            <PremiumGate
              title="Unlock Power Law Analysis"
              description="Get access to advanced mathematical models and correlation analysis to better understand Kaspa's long-term value proposition."
              features={[
                'Interactive Price vs Hashrate charts',
                'Power law regression analysis',
                'Historical correlation data',
                'Market deviation indicators',
                'Export analysis data'
              ]}
              className="mb-8"
            />
          )
        ) : (
          <div className="bg-[#1A1A2E] rounded-xl p-8 text-center mb-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-[#5B6CFF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#5B6CFF]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Login Required</h3>
              <p className="text-[#A0A0B8] mb-6">
                Sign in to access our power law analysis tools and start discovering mathematical patterns in Kaspa's market behavior.
              </p>
              <a
                href="/login"
                className="inline-flex items-center px-6 py-3 bg-[#5B6CFF] text-white font-medium rounded-lg hover:bg-[#4C5EE8] transition-colors"
              >
                Sign In to Continue
              </a>
            </div>
          </div>
        )}

        {/* Educational Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1A1A2E] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">How to Interpret the Chart</h3>
            <div className="space-y-3 text-sm text-[#A0A0B8]">
              <div className="flex items-start">
                <span className="text-[#5B6CFF] font-semibold mr-2">1.</span>
                <span>Each point represents a specific date with corresponding price and hashrate values</span>
              </div>
              <div className="flex items-start">
                <span className="text-[#5B6CFF] font-semibold mr-2">2.</span>
                <span>The trend line shows the mathematical relationship between the two variables</span>
              </div>
              <div className="flex items-start">
                <span className="text-[#5B6CFF] font-semibold mr-2">3.</span>
                <span>Points above the line suggest overvaluation, below suggest undervaluation</span>
              </div>
              <div className="flex items-start">
                <span className="text-[#5B6CFF] font-semibold mr-2">4.</span>
                <span>The R² value indicates how well the model fits the historical data</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A2E] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Market Applications</h3>
            <div className="space-y-3 text-sm text-[#A0A0B8]">
              <div className="flex items-start">
                <span className="text-green-400 font-semibold mr-2">📈</span>
                <span>Use trend deviations to identify potential buying opportunities</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-400 font-semibold mr-2">⚖️</span>
                <span>Compare current price position relative to network fundamentals</span>
              </div>
              <div className="flex items-start">
                <span className="text-blue-400 font-semibold mr-2">🔮</span>
                <span>Project future price ranges based on hashrate growth</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-400 font-semibold mr-2">📊</span>
                <span>Validate investment thesis with mathematical evidence</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
