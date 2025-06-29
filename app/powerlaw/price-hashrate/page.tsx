import React from 'react'
import PriceHashrateChart from '@/components/charts/PriceHashrateChart'
import PriceHashrate3DChart from '@/components/charts/PriceHashrate3DChart'
import PriceHashrateVolume3DChart from '@/components/charts/PriceHashrateVolume3DChart'
import { getPriceData, getHashrateData, getVolumeData } from '@/lib/sheets'

export default async function PriceHashratePage() {
  // Fetch real data from Google Sheets server-side
  const [priceData, hashrateData, volumeData] = await Promise.all([
    getPriceData(),
    getHashrateData(),
    getVolumeData()
  ])

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

        {/* Chart Section - moved up under title */}
        <PriceHashrateChart 
          priceData={priceData} 
          hashrateData={hashrateData} 
          className="mb-8" 
        />

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

        {/* Educational Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

        {/* 3D Chart Section - Days Since Genesis */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              3D Evolution Analysis
            </h2>
            <p className="text-[#A0A0B8]">
              Explore how the price-hashrate relationship has evolved over time in three-dimensional space
            </p>
          </div>
          
          <PriceHashrate3DChart 
            priceData={priceData} 
            hashrateData={hashrateData} 
            className="mb-6" 
          />
          
          {/* 3D Chart Explanation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-[#1A1A2E] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Understanding the 3D Visualization</h3>
              <div className="space-y-3 text-sm text-[#A0A0B8]">
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">📊</span>
                  <span><strong>X-Axis (Hashrate):</strong> Network security measured in petahashes per second</span>
                </div>
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">💰</span>
                  <span><strong>Y-Axis (Price):</strong> Market valuation in USD</span>
                </div>
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">⏰</span>
                  <span><strong>Z-Axis (Time):</strong> Days since Kaspa genesis (Nov 7, 2021)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">🎨</span>
                  <span><strong>Color Coding:</strong> Switch between time progression, price levels, or hashrate intensity</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A2E] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">3D Analysis Insights</h3>
              <div className="space-y-3 text-sm text-[#A0A0B8]">
                <div className="flex items-start">
                  <span className="text-green-400 font-semibold mr-2">🌀</span>
                  <span><strong>Trajectory Path:</strong> Shows market evolution as network matured</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-400 font-semibold mr-2">🔄</span>
                  <span><strong>Market Cycles:</strong> Curved path reveals natural mathematical relationship</span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 font-semibold mr-2">📐</span>
                  <span><strong>Power Law Surface:</strong> Red line shows 3D mathematical prediction</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-400 font-semibold mr-2">🎯</span>
                  <span><strong>Network Maturity:</strong> Time axis shows how age affects valuation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New 3D Chart Section - Hashrate vs Price vs Volume */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              True 3D Power Law Analysis
            </h2>
            <p className="text-[#A0A0B8]">
              Discover the relationship between network security, price, and trading activity - a true 3-variable power law similar to Dr. Giovanni's Bitcoin analysis
            </p>
          </div>
          
          <PriceHashrateVolume3DChart 
            priceData={priceData} 
            hashrateData={hashrateData} 
            volumeData={volumeData}
            className="mb-6" 
          />
          
          {/* 3D Volume Chart Explanation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1A1A2E] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">True 3D Power Law Relationship</h3>
              <div className="space-y-3 text-sm text-[#A0A0B8]">
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">📊</span>
                  <span><strong>X-Axis (Hashrate):</strong> Network security in petahashes per second</span>
                </div>
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">💰</span>
                  <span><strong>Y-Axis (Price):</strong> Market valuation in USD</span>
                </div>
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">📈</span>
                  <span><strong>Z-Axis (Volume):</strong> Trading activity in USD</span>
                </div>
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">🧮</span>
                  <span><strong>Power Law:</strong> Price = A × Hashrate^B × Volume^C</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A2E] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Advanced Market Insights</h3>
              <div className="space-y-3 text-sm text-[#A0A0B8]">
                <div className="flex items-start">
                  <span className="text-green-400 font-semibold mr-2">🎯</span>
                  <span><strong>No Time Constraint:</strong> Unlike time-based analysis, volume can increase or decrease</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-400 font-semibold mr-2">🔍</span>
                  <span><strong>Market Activity:</strong> Shows how trading volume affects price formation</span>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 font-semibold mr-2">⚡</span>
                  <span><strong>True 3D Analysis:</strong> Similar to Dr. Giovanni's Bitcoin research methodology</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-400 font-semibold mr-2">🎨</span>
                  <span><strong>Interactive Exploration:</strong> Rotate to see how all three variables interact</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
