import { Suspense } from 'react'
import { Metadata } from 'next'
import OpenInterestPriceChart from '@/components/charts/OpenInterestPriceChart'
import { getOpenInterestData, getPriceData } from '@/lib/sheets'

export const metadata: Metadata = {
  title: 'Open Interest Analysis | Kaspa Metrics',
  description: 'Track Kaspa futures open interest with advanced risk indicators and power law analysis',
}

// Format currency values
function formatCurrency(value: number): string {
  if (value >= 1000000000) return `$${(value/1000000000).toFixed(2)}B`
  if (value >= 1000000) return `$${(value/1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value/1000).toFixed(1)}K`
  if (value >= 1) return `$${value.toFixed(2)}`
  if (value >= 0.01) return `$${value.toFixed(3)}`
  if (value >= 0.001) return `$${value.toFixed(4)}`
  return `$${value.toExponential(2)}`
}

// Format percentage
function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

async function getInitialData() {
  try {
    const [openInterestData, priceData] = await Promise.all([
      getOpenInterestData(),
      getPriceData()
    ])
    return { openInterestData, priceData }
  } catch (error) {
    console.error('Error loading initial data:', error)
    return { openInterestData: [], priceData: [] }
  }
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F1A] via-[#1A1A2E] to-[#16213E] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#5B6CFF] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-white text-lg">Loading Open Interest Analysis...</div>
      </div>
    </div>
  )
}

export default async function OpenInterestPage() {
  const { openInterestData, priceData } = await getInitialData()

  // Calculate current metrics
  const currentOI = openInterestData[openInterestData.length - 1]
  const previousOI = openInterestData[openInterestData.length - 2]
  const oiChange = currentOI && previousOI ? 
    ((currentOI.value - previousOI.value) / previousOI.value) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F1A] via-[#1A1A2E] to-[#16213E] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#1A1A2E]/90 via-[#2A2A3E]/90 to-[#1A1A2E]/90 rounded-2xl p-6 border border-[#2D2D45]/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Open Interest Analysis
              </h1>
              <p className="text-[#A0A0B8] text-lg">
                Track Kaspa futures open interest with risk indicators
              </p>
            </div>
            
            {currentOI && (
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(currentOI.value)}
                </div>
                <div className={`text-sm ${
                  oiChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPercentage(oiChange)} (24h)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-gradient-to-r from-[#1A1A2E]/90 via-[#2A2A3E]/90 to-[#1A1A2E]/90 rounded-2xl p-6 border border-[#2D2D45]/50 backdrop-blur-sm">
          <Suspense fallback={<LoadingSpinner />}>
            <OpenInterestPriceChart 
              openInterestData={openInterestData}
              priceData={priceData}
              height={600}
            />
          </Suspense>
        </div>

      </div>
    </div>
  )
}
