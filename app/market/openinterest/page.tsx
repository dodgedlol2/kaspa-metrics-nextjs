import { Suspense } from 'react'
import { Metadata } from 'next'
import OpenInterestPage from './OpenInterestPage'
import { getOpenInterestData, getPriceData } from '@/lib/sheets'

export const metadata: Metadata = {
  title: 'Open Interest Analysis | Kaspa Metrics',
  description: 'Track Kaspa futures open interest with advanced risk indicators and power law analysis',
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

export default async function OpenInterestPageRoute() {
  const initialData = await getInitialData()

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OpenInterestPage initialData={initialData} />
    </Suspense>
  )
}
