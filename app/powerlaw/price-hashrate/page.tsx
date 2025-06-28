'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import PriceHashrateChart from '@/components/charts/PriceHashrateChart'
import { getPriceData, getHashrateData } from '@/lib/sheets'

interface KaspaMetric {
  timestamp: number
  value: number
}

export default function PriceHashratePage(): JSX.Element {
  const { data: session } = useSession()
  const isLoggedIn = !!session
  
  const [priceData, setPriceData] = useState<KaspaMetric[]>([])
  const [hashrateData, setHashrateData] = useState<KaspaMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [priceResult, hashrateResult] = await Promise.all([
        getPriceData(),
        getHashrateData()
      ])
      
      setPriceData(priceResult)
      setHashrateData(hashrateResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

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
        {loading ? (
          <div className="bg-[#1A1A2E] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center h-80">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#5B6CFF] rounded-full animate-bounce"></div>
                <div className="w-4 h-4 bg-[#5B6CFF] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-4 h-4 bg-[#5B6CFF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-[#1A1A2E] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center h-80">
              <div className="text-center">
                <div className="text-red-400 text-lg font-medium mb-2">Failed to load data</div>
                <div className="text-[#6B7280] text-sm">{error}</div>
                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-2 bg-[#5B6CFF] text-white rounded-lg hover:bg-[#4C5EE8] transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <PriceHashrateChart 
            priceData={priceData} 
            hashrateData={hashrateData} 
            className="mb-8" 
          />
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
