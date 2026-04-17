import { getPriceData, getAddressDistribution1to100Data } from '@/lib/sheets'
import AddressDistributionChart from '@/components/charts/AddressDistributionChart'

export default async function KAS1to100DistributionPage() {
  // Fetch real data from Google Sheetsz
  const [addressData, priceData] = await Promise.all([
    getAddressDistribution1to100Data(),
    getPriceData()
  ])
  
  return (
    <div className="min-h-screen bg-[#0A0A12] text-white">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#6366F1] to-[#5B6CFF] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
                Address Distribution: 1-100 KAS
              </h1>
              <p className="text-[#6B7280] text-lg">
                Analysis of addresses holding between 1 and 100 KAS tokens over time
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
          <span>Distribution Tiers</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
          </svg>
          <span className="text-[#5B6CFF]">1-100 KAS</span>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Current Addresses */}
          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm font-medium">Current Addresses</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {addressData.length > 0 
                    ? (addressData[addressData.length - 1].value / 1000).toFixed(1) + 'K'
                    : '--'
                  }
                </p>
                <p className="text-[#10B981] text-xs mt-1">
                  {addressData.length > 1 
                    ? ((addressData[addressData.length - 1].value - addressData[addressData.length - 2].value) >= 0 ? '+' : '') 
                      + ((addressData[addressData.length - 1].value - addressData[addressData.length - 2].value) / 1000).toFixed(1) + 'K'
                    : 'Live Data'
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-[#5B6CFF]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#5B6CFF]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C18.67,14 24,15.33 24,18V20H8V18C8,15.33 13.33,14 16,14M8.5,6A2.5,2.5 0 0,1 11,8.5A2.5,2.5 0 0,1 8.5,11A2.5,2.5 0 0,1 6,8.5A2.5,2.5 0 0,1 8.5,6M8.5,13C10.83,13 15.5,14.17 15.5,16.5V18H1.5V16.5C1.5,14.17 6.17,13 8.5,13Z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Peak Addresses */}
          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm font-medium">Peak Addresses</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {addressData.length > 0 
                    ? (Math.max(...addressData.map(d => d.value)) / 1000).toFixed(1) + 'K'
                    : '--'
                  }
                </p>
                <p className="text-[#F59E0B] text-xs mt-1">All-Time High</p>
              </div>
              <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Growth Rate */}
          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm font-medium">30-Day Growth</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {addressData.length >= 30 
                    ? (((addressData[addressData.length - 1].value - addressData[addressData.length - 30].value) 
                       / addressData[addressData.length - 30].value * 100).toFixed(1) + '%')
                    : '--'
                  }
                </p>
                <p className="text-[#10B981] text-xs mt-1">Monthly Change</p>
              </div>
              <div className="w-12 h-12 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.5,5A6.5,6.5 0 0,1 22,11.5A6.5,6.5 0 0,1 15.5,18A6.5,6.5 0 0,1 9,11.5A6.5,6.5 0 0,1 15.5,5M15.5,7A4.5,4.5 0 0,0 11,11.5A4.5,4.5 0 0,0 15.5,16A4.5,4.5 0 0,0 20,11.5A4.5,4.5 0 0,0 15.5,7M14,9H17V12H14V9M2,10.5C2,10.5 6.14,15.37 6.81,16.04C7.35,16.58 8.17,16.58 8.71,16.04C9.38,15.37 13.5,10.5 13.5,10.5V12.5C13.5,12.5 9.38,17.37 8.71,18.04C8.17,18.58 7.35,18.58 6.81,18.04C6.14,17.37 2,12.5 2,12.5V10.5Z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Data Points */}
          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm font-medium">Data Points</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {addressData.length}
                </p>
                <p className="text-[#A0A0B8] text-xs mt-1">
                  {addressData.length > 0 
                    ? `Since ${new Date(addressData[0].timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                    : 'Loading...'
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-[#A0A0B8]/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#A0A0B8]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V7H5V5H19M5,19V9H19V19H5Z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Address Distribution Chart with Price Background */}
        <div className="mb-8">
          <AddressDistributionChart 
            data={addressData} 
            priceData={priceData}
            height={650}
            tierName="1-100 KAS"
            tierRange="1 to 100 KAS"
          />
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tier Analysis */}
          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 text-[#5B6CFF] mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19M6.5,11.5H9.5V8.5H6.5V11.5M14.5,15.5H17.5V12.5H14.5V15.5M10.5,7.5H13.5V10.5H10.5V7.5Z"/>
              </svg>
              Tier Analysis
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#2D2D45]/20">
                <span className="text-[#6B7280] text-sm">Holdings Range</span>
                <span className="text-white text-sm font-medium">1 - 100 KAS</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#2D2D45]/20">
                <span className="text-[#6B7280] text-sm">Category</span>
                <span className="text-white text-sm font-medium">Retail Investors</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#2D2D45]/20">
                <span className="text-[#6B7280] text-sm">Typical Profile</span>
                <span className="text-white text-sm font-medium">Small Holdings</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#6B7280] text-sm">Market Segment</span>
                <span className="text-white text-sm font-medium">Entry Level</span>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 text-[#10B981] mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7H13V9H11V7M11,11H13V17H11V11Z"/>
              </svg>
              Key Insights
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-[#0F0F1A]/40 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#A0A0B8] text-sm">
                    This tier represents the largest group of Kaspa holders by count, indicating strong retail adoption and network participation.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-[#0F0F1A]/40 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#A0A0B8] text-sm">
                    Growth trends in this segment often correlate with increased network awareness and accessibility.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-[#0F0F1A]/40 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-[#F59E0B] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#A0A0B8] text-sm">
                    Power law analysis can reveal long-term adoption patterns and network maturity indicators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Notes */}
        <div className="mt-8 bg-gradient-to-r from-[#5B6CFF]/10 to-[#6366F1]/10 border border-[#5B6CFF]/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <svg className="w-5 h-5 text-[#5B6CFF] mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7H13V9H11V7M11,11H13V17H11V11Z"/>
            </svg>
            Technical Notes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#A0A0B8]">
            <div>
              <p className="mb-2">
                <strong className="text-white">Data Source:</strong> Daily snapshots from Kaspa network analysis, tracking addresses with holdings between 1-100 KAS.
              </p>
              <p>
                <strong className="text-white">Update Frequency:</strong> Data is updated daily to reflect the most current distribution patterns.
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong className="text-white">Power Law Analysis:</strong> Regression analysis helps identify long-term growth trends and network adoption patterns.
              </p>
              <p>
                <strong className="text-white">Price Correlation:</strong> Background price data helps contextualize address growth during different market conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
