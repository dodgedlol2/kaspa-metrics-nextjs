import React from 'react'
import PriceHashrateVolume3DChart from '@/components/charts/PriceHashrateVolume3DChart'
import PriceChart from '@/components/charts/PriceChart'
import ThreeDPowerLawOscillator from '@/components/charts/ThreeDPowerLawOscillator'
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

        {/* Price Chart Section */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Price History & Power Law
            </h2>
            <p className="text-[#A0A0B8]">
              Kaspa's price trajectory with power law model and key support/resistance levels
            </p>
          </div>
          
          <PriceChart 
            data={priceData} 
            height={600}
          />
        </div>

        {/* 3D Power Law Oscillator Section */}
        <div className="mb-8">
          <ThreeDPowerLawOscillator
            priceData={priceData}
            hashrateData={hashrateData}
            volumeData={volumeData}
            height={400}
          />
        </div>

        {/* Explanation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  )
}
