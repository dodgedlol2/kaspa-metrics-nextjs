import { getPriceData } from '@/lib/sheets'

// TypeScript interfaces for API response
interface ApiTier {
  tier: number
  count: number
  amount: number
}

interface DistributionResponse {
  timestamp: number
  tiers: ApiTier[]
}

// Function to fetch distribution data from Kaspa API
async function getDistributionData(): Promise<DistributionResponse | null> {
  try {
    const response = await fetch('https://api.kaspa.org/addresses/distribution?limit=1', {
      headers: {
        'accept': 'application/json'
      },
      next: { revalidate: 180 } // Cache for 3 minutes (API cache time)
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch distribution data')
    }
    
    const data: DistributionResponse[] = await response.json()
    return data[0] // Get the latest entry
  } catch (error) {
    console.error('Error fetching distribution data:', error)
    return null
  }
}

export default async function AddressDistributionOverviewPage() {
  // Fetch distribution data from API and price data
  const [distributionData, priceData] = await Promise.all([
    getDistributionData(),
    getPriceData()
  ])

  // Get current KAS price for USD calculations
  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].value : 0.115

  // Map API tiers to our tier structure
  const tierMapping = [
    { tier: 0, name: '0.0001 - 1', range: '[0.0001 - 1]', icon: '🦐', category: 'Shrimp', color: 'from-gray-400 to-gray-500' },
    { tier: 1, name: '1 - 10', range: '[1 - 10]', icon: '🦀', category: 'Crab', color: 'from-orange-500 to-red-500' },
    { tier: 2, name: '10 - 100', range: '[10 - 100]', icon: '🐙', category: 'Octopus', color: 'from-purple-500 to-pink-500' },
    { tier: 3, name: '100 - 1K', range: '[100 - 1K]', icon: '🐟', category: 'Fish', color: 'from-blue-500 to-cyan-500' },
    { tier: 4, name: '1K - 10K', range: '[1K - 10K]', icon: '🐬', category: 'Dolphin', color: 'from-cyan-500 to-teal-500' },
    { tier: 5, name: '10K - 100K', range: '[10K - 100K]', icon: '🦈', category: 'Shark', color: 'from-teal-500 to-green-500' },
    { tier: 6, name: '100K - 1M', range: '[100K - 1M]', icon: '🐋', category: 'Whale', color: 'from-green-500 to-emerald-500' },
    { tier: 7, name: '1M - 10M', range: '[1M - 10M]', icon: '🐳', category: 'Humpback', color: 'from-emerald-500 to-blue-600' },
    { tier: 8, name: '10M - 100M', range: '[10M - 100M]', icon: '🦕', category: 'Megalodon', color: 'from-blue-600 to-indigo-500' },
    { tier: 9, name: '100M - 1B', range: '[100M - 1B]', icon: '🏛️', category: 'Institution', color: 'from-indigo-500 to-purple-600' },
    { tier: 10, name: '1B+', range: '[1B+]', icon: '👑', category: 'Leviathan', color: 'from-purple-600 to-pink-600' }
  ]

  // Combine API data with tier mapping
  const tierStats = tierMapping.map(tierInfo => {
    const apiTier = distributionData?.tiers?.find((t: ApiTier) => t.tier === tierInfo.tier)
    
    return {
      ...tierInfo,
      currentCount: apiTier?.count || 0,
      totalKAS: (apiTier?.amount || 0) / 100000000, // Convert from sompi to KAS
      totalUSD: ((apiTier?.amount || 0) / 100000000) * currentPrice
    }
  }).filter(tier => tier.totalKAS > 0 || tier.currentCount > 0) // Only show tiers with data

  // Calculate totals
  const totalAddresses = tierStats.reduce((sum, tier) => sum + tier.currentCount, 0)
  const totalKAS = tierStats.reduce((sum, tier) => sum + tier.totalKAS, 0)
  const totalUSD = tierStats.reduce((sum, tier) => sum + tier.totalUSD, 0)

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000000) return `${(num/1000000000).toFixed(1)}B`
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num/1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatCurrency = (num: number): string => {
    if (num >= 1000000000) return `${(num/1000000000).toFixed(2)}B`
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num/1000).toFixed(1)}K`
    return `${num.toFixed(0)}`
  }

  const formatKAS = (num: number): string => {
    if (num >= 1000000000) return `${(num/1000000000).toFixed(2)}B KAS`
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M KAS`
    if (num >= 1000) return `${(num/1000).toFixed(0)}K KAS`
    return `${num.toFixed(0)} KAS`
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="min-h-screen bg-[#0A0A12] text-white">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-[#6366F1] to-[#5B6CFF] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19M6.5,11.5H9.5V8.5H6.5V11.5M14.5,15.5H17.5V12.5H14.5V15.5M10.5,7.5H13.5V10.5H10.5V7.5Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
                  Address Distribution Overview
                </h1>
                <p className="text-[#6B7280] text-lg">
                  Complete analysis of Kaspa address distribution across all holding tiers
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-[#6B7280]">Last updated</p>
              <p className="text-sm text-white">
                {distributionData?.timestamp ? formatTimestamp(distributionData.timestamp) : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-[#6B7280] mb-6">
          <span>Network</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
          </svg>
          <span>Addresses</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
          </svg>
          <span className="text-[#5B6CFF]">Distribution Overview</span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm font-medium">Total Addresses</p>
                <p className="text-2xl font-bold text-white mt-1">{formatNumber(totalAddresses)}</p>
                <p className="text-[#10B981] text-xs mt-1">All Holdings</p>
              </div>
              <div className="w-12 h-12 bg-[#5B6CFF]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#5B6CFF]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C18.67,14 24,15.33 24,18V20H8V18C8,15.33 13.33,14 16,14M8.5,6A2.5,2.5 0 0,1 11,8.5A2.5,2.5 0 0,1 8.5,11A2.5,2.5 0 0,1 6,8.5A2.5,2.5 0 0,1 8.5,6M8.5,13C10.83,13 15.5,14.17 15.5,16.5V18H1.5V16.5C1.5,14.17 6.17,13 8.5,13Z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm font-medium">Total KAS Held</p>
                <p className="text-2xl font-bold text-white mt-1">{formatKAS(totalKAS)}</p>
                <p className="text-[#F59E0B] text-xs mt-1">Estimated</p>
              </div>
              <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm font-medium">USD Value</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalUSD)}</p>
                <p className="text-[#10B981] text-xs mt-1">@ ${currentPrice.toFixed(3)}</p>
              </div>
              <div className="w-12 h-12 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm font-medium">Distribution Tiers</p>
                <p className="text-2xl font-bold text-white mt-1">{tierStats.length}</p>
                <p className="text-[#A0A0B8] text-xs mt-1">Active Tiers</p>
              </div>
              <div className="w-12 h-12 bg-[#A0A0B8]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#A0A0B8]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3,11H5V13H3V11M11,5H13V19H11V5M7,9H9V15H7V9M15,3H17V17H15V3M19,7H21V13H19V7"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Table */}
        <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#2D2D45]/30">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <svg className="w-5 h-5 text-[#5B6CFF] mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3,3H21C21.53,3 22,3.47 22,4V20C22,20.53 21.53,21 21,21H3C2.47,21 2,20.53 2,20V4C2,3.47 2.47,3 3,3M20,8H4V6H20V8M20,18H4V10H20V18M6,12V16H10V12H6M18,14H12V12H18V14M18,16H12V15H18V16Z"/>
              </svg>
              Address Distribution by KAS Bucket
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2D2D45]/30">
                  <th className="text-left p-4 text-[#6B7280] text-sm font-medium">Category</th>
                  <th className="text-left p-4 text-[#6B7280] text-sm font-medium">Balance Range</th>
                  <th className="text-right p-4 text-[#6B7280] text-sm font-medium">Addresses</th>
                  <th className="text-right p-4 text-[#6B7280] text-sm font-medium">Total KAS</th>
                  <th className="text-right p-4 text-[#6B7280] text-sm font-medium">% of Supply</th>
                  <th className="text-right p-4 text-[#6B7280] text-sm font-medium">USD Value</th>
                </tr>
              </thead>
              <tbody>
                {tierStats.map((tier, index) => {
                  const percentOfSupply = totalKAS > 0 ? (tier.totalKAS / (24000000000)) * 100 : 0 // 24B total supply
                  const percentOfAddresses = totalAddresses > 0 ? (tier.currentCount / totalAddresses) * 100 : 0
                  
                  return (
                    <tr key={tier.name} className="border-b border-[#2D2D45]/10 hover:bg-[#1A1A2E]/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{tier.icon}</span>
                          <span className="text-white font-medium">{tier.category}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[#A0A0B8] text-sm">{tier.range}</span>
                      </td>
                      <td className="text-right p-4">
                        <div>
                          <span className="text-white font-medium">{formatNumber(tier.currentCount)}</span>
                          <div className="text-xs text-[#6B7280]">{percentOfAddresses.toFixed(1)}%</div>
                        </div>
                      </td>
                      <td className="text-right p-4">
                        <span className="text-white font-medium">{formatKAS(tier.totalKAS)}</span>
                      </td>
                      <td className="text-right p-4">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 h-2 bg-[#0F0F1A] rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${tier.color} rounded-full transition-all duration-300`}
                              style={{ width: `${Math.min(percentOfSupply * 4, 100)}%` }}
                            />
                          </div>
                          <span className="text-[#A0A0B8] text-sm w-12 text-right">
                            {percentOfSupply.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right p-4">
                        <span className="text-white font-medium">{formatCurrency(tier.totalUSD)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
