import React from 'react'
import PriceHashrateVolume3DChart from '@/components/charts/PriceHashrateVolume3DChart'
import { getPriceData, getHashrateData, getVolumeData } from '@/lib/sheets'

export default async function ThreeDPowerLawPage() {
  // Fetch real data from Google Sheets server-side 1
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
                3D Power Law Analysis
              </h1>
              <p className="text-[#A0A0B8] text-lg">
                Explore the true 3-dimensional relationship between price, hashrate, and volume
              </p>
            </div>
          </div>
        </div>

        {/* 3D Chart Section */}
        <div className="mb-8">
          <PriceHashrateVolume3DChart 
            priceData={priceData} 
            hashrateData={hashrateData} 
            volumeData={volumeData}
            className="mb-6" 
          />
          
          {/* Chart Explanation */}
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
                  <span className="text-[#5B6CFF] font-semibold mr-2">📈</span>
                  <span><strong>Z-Axis (Volume):</strong> Trading activity in USD</span>
                </div>
                <div className="flex items-start">
                  <span className="text-[#5B6CFF] font-semibold mr-2">🧮</span>
                  <span><strong>Power Law Formula:</strong> Price = A × Hashrate^B × Volume^C</span>
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

          {/* Power Law Theory Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-[#1A1A2E] rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  True 3D Power Law Relationships
                </h2>
                <div className="space-y-4 text-[#A0A0B8]">
                  <p>
                    Unlike traditional 2D power law analysis that considers only price and one other metric, 
                    this 3D visualization captures the complete interplay between three fundamental variables: 
                    <span className="text-[#5B6CFF] font-mono"> Price = A × Hashrate^B × Volume^C</span>
                  </p>
                  <p>
                    This approach is similar to Dr. Giovanni Santostasi's Bitcoin power law research, 
                    which demonstrated that cryptocurrency valuations follow multi-dimensional power law distributions 
                    rather than simple linear relationships.
                  </p>
                  <p>
                    The 3D surface represents the optimal price given any combination of hashrate and volume, 
                    allowing you to identify periods when the market is trading above or below the mathematical trend.
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
                    Volume acts as a market confidence indicator
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    Higher volume + higher hashrate = stronger price support
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    3D trajectory reveals market evolution patterns
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    Points above surface indicate potential overvaluation
                  </li>
                </ul>
              </div>

              <div className="bg-[#1A1A2E] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">How to Use</h3>
                <ul className="space-y-2 text-sm text-[#A0A0B8]">
                  <li>• Rotate the chart to explore different angles</li>
                  <li>• Toggle trajectory to see market path</li>
                  <li>• Enable power law surface for fair value</li>
                  <li>• Color by price/volume for pattern discovery</li>
                  <li>• Switch axes to log scale for clarity</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
