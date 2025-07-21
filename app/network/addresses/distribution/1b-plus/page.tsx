import { getPriceData, getAddressDistribution1bPlusData } from '@/lib/sheets'
import AddressDistributionChart from '@/components/charts/AddressDistributionChart'

export default async function KAS1bPlusDistributionPage() {
  // Fetch real data from Google Sheets
  const [addressData, priceData] = await Promise.all([
    getAddressDistribution1bPlusData(),
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
                Address Distribution: 1B+ KAS
              </h1>
              <p className="text-[#6B7280] text-lg">
                Analysis of addresses holding 1,000,000,000+ KAS tokens over time
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
          <span className="text-[#5B6CFF]">1B+ KAS</span>
        </div>

        {/* Address Distribution Chart with Price Background */}
        <div className="mb-8">
          <AddressDistributionChart 
            data={addressData} 
            priceData={priceData}
            height={650}
            tierName="1B+ KAS"
            tierRange="1,000,000,000+ KAS"
          />
        </div>
      </div>
    </div>
  )
}
