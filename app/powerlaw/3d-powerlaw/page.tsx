import React from 'react'
import PriceHashrateVolume3DChart from '@/components/charts/PriceHashrateVolume3DChart'
import PriceChartWith3DResiduals from '@/components/charts/PriceChartWith3DResiduals'
import { getPriceData, getHashrateData, getVolumeData } from '@/lib/sheets'

export default async function ThreeDPowerLawPage() {
  // Fetch real data from Google Sheets server-side 11123124
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
          
          {/* Power Law Theory Section */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
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
        </div>

        {/* Price Chart with 3D Power Law Signals */}
        <div className="mb-8">
          <PriceChartWith3DResiduals 
            priceData={priceData}
            hashrateData={hashrateData}
            volumeData={volumeData}
            height={1000}
          />
        </div>

        {/* Explanation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1A1A2E] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">How to Use the Oscillator</h3>
            <div className="space-y-3 text-sm text-[#A0A0B8]">
              <div className="flex items-start">
                <span className="text-[#5B6CFF] font-semibold mr-2">📊</span>
                <span><strong>Residual Calculation:</strong> Shows how much actual price deviates from the 3D power law prediction</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-400 font-semibold mr-2">🟢</span>
                <span><strong>Negative Values:</strong> Price is undervalued relative to hashrate & volume - potential buy zones</span>
              </div>
              <div className="flex items-start">
                <span className="text-red-400 font-semibold mr-2">🔴</span>
                <span><strong>Positive Values:</strong> Price is overvalued relative to fundamentals - consider taking profits</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-400 font-semibold mr-2">⚖️</span>
                <span><strong>Zero Line:</strong> Price perfectly matches the 3D power law model prediction</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A2E] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Trading Strategy Insights</h3>
            <div className="space-y-3 text-sm text-[#A0A0B8]">
              <div className="flex items-start">
                <span className="text-green-400 font-semibold mr-2">💎</span>
                <span><strong>Strong Buy (&lt;-50%):</strong> Historically rare opportunities when all three metrics suggest deep undervaluation</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-400 font-semibold mr-2">📈</span>
                <span><strong>Accumulation Zone (-50% to -25%):</strong> Good entry points for long-term positions</span>
              </div>
              <div className="flex items-start">
                <span className="text-orange-400 font-semibold mr-2">⚠️</span>
                <span><strong>Profit Taking (+25% to +50%):</strong> Consider scaling out of positions</span>
              </div>
              <div className="flex items-start">
                <span className="text-red-400 font-semibold mr-2">🚨</span>
                <span><strong>Strong Sell (&gt;+50%):</strong> Extreme overvaluation - historically precedes corrections</span>
              </div>
            </div>
          </div>
        </div>

        {/* Understanding the Model Section */}
        <div className="bg-[#1A1A2E] rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Understanding the 3D Power Law Model</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-semibold text-[#5B6CFF] mb-2">What Makes This Different?</h4>
                <p className="text-sm text-[#A0A0B8] mb-3">
                  Traditional power law models use <strong>time</strong> (days since genesis) to predict price. 
                  Our 3D model uses <strong>network fundamentals</strong> instead:
                </p>
                <div className="bg-[#0F0F1A] rounded-lg p-3 mb-3">
                  <p className="text-xs text-[#6B7280] mb-1">Traditional Model:</p>
                  <p className="text-sm text-white font-mono">Price = A × (Days)^B</p>
                </div>
                <div className="bg-[#0F0F1A] rounded-lg p-3">
                  <p className="text-xs text-[#6B7280] mb-1">Our 3D Model:</p>
                  <p className="text-sm text-[#5B6CFF] font-mono">Price = A × Hashrate^B × Volume^C</p>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-[#5B6CFF] mb-2">Why No Time Variable?</h4>
                <p className="text-sm text-[#A0A0B8]">
                  Instead of saying "price should be X because the network is Y days old," we say 
                  "price should be X because the network has THIS much security (hashrate) and THIS much activity (volume)." 
                  This is fundamentally based, not time-based!
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-semibold text-[#5B6CFF] mb-2">How the Oscillator Works</h4>
                <div className="space-y-2 text-sm text-[#A0A0B8]">
                  <div className="flex items-start">
                    <span className="text-[#5B6CFF] mr-2">1.</span>
                    <span>Calculate what price <strong>should be</strong> based on hashrate + volume</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#5B6CFF] mr-2">2.</span>
                    <span>Compare to what price <strong>actually is</strong></span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#5B6CFF] mr-2">3.</span>
                    <span>Calculate the % difference (residual)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#5B6CFF] mr-2">4.</span>
                    <span>Plot over time to see when price disconnects from fundamentals</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-[#5B6CFF] mb-2">Why Residuals Fluctuate</h4>
                <p className="text-sm text-[#A0A0B8] mb-2">
                  The oscillator shows how <strong>market psychology</strong> differs from fundamentals:
                </p>
                <ul className="space-y-1 text-sm text-[#A0A0B8]">
                  <li>• Fear & greed cycles create extremes</li>
                  <li>• News events cause temporary deviations</li>
                  <li>• Speculation pushes price above/below model</li>
                  <li>• Mean reversion brings it back over time</li>
                </ul>
              </div>

              <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-[#5B6CFF]">
                <p className="text-xs text-[#A0A0B8]">
                  <strong className="text-white">Current Reading (-48%):</strong> Price is undervalued relative to 
                  network security and trading activity, suggesting a potential accumulation opportunity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
