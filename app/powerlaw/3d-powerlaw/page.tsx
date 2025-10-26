import React from 'react'
import PriceHashrateVolume3DChart from '@/components/charts/PriceHashrateVolume3DChart'
import PriceChart from '@/components/charts/PriceChart'
import { getPriceData, getHashrateData, getVolumeData } from '@/lib/sheets'

export default async function ThreeDPowerLawPage() {
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
      </div>
    </div>
  )
}
