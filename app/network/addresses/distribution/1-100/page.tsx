'use client'

export default function KAS1to100Page() {
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-[#A0A0B8] bg-clip-text text-transparent">
                Address Distribution: 1-100 KAS
              </h1>
              <p className="text-[#6B7280] text-sm">
                Analysis of addresses holding between 1 and 100 KAS tokens
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

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Stats Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Addresses Card */}
              <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#6B7280] text-sm font-medium">Total Addresses</p>
                    <p className="text-2xl font-bold text-white mt-1">--</p>
                    <p className="text-[#10B981] text-xs mt-1">Coming Soon</p>
                  </div>
                  <div className="w-12 h-12 bg-[#5B6CFF]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#5B6CFF]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C18.67,14 24,15.33 24,18V20H8V18C8,15.33 13.33,14 16,14M8.5,6A2.5,2.5 0 0,1 11,8.5A2.5,2.5 0 0,1 8.5,11A2.5,2.5 0 0,1 6,8.5A2.5,2.5 0 0,1 8.5,6M8.5,13C10.83,13 15.5,14.17 15.5,16.5V18H1.5V16.5C1.5,14.17 6.17,13 8.5,13Z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total KAS Held Card */}
              <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#6B7280] text-sm font-medium">Total KAS Held</p>
                    <p className="text-2xl font-bold text-white mt-1">--</p>
                    <p className="text-[#10B981] text-xs mt-1">Coming Soon</p>
                  </div>
                  <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholder Chart Area */}
            <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Distribution Chart</h3>
              <div className="h-64 bg-[#0F0F1A]/30 rounded-lg border border-[#2D2D45]/20 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-[#6B7280] mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19M6.5,11.5H9.5V8.5H6.5V11.5M14.5,15.5H17.5V12.5H14.5V15.5M10.5,7.5H13.5V10.5H10.5V7.5Z"/>
                  </svg>
                  <p className="text-[#6B7280] text-sm">Chart visualization coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Tier Info */}
            <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tier Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#2D2D45]/20">
                  <span className="text-[#6B7280] text-sm">Range</span>
                  <span className="text-white text-sm font-medium">1 - 100 KAS</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2D2D45]/20">
                  <span className="text-[#6B7280] text-sm">Category</span>
                  <span className="text-white text-sm font-medium">Retail Holdings</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#6B7280] text-sm">Data Status</span>
                  <span className="text-[#F59E0B] text-sm font-medium">In Development</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-[#1A1A2E]/50 backdrop-blur-sm border border-[#2D2D45]/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] text-sm">% of Total Supply</span>
                  <span className="text-white text-sm">--</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] text-sm">% of All Addresses</span>
                  <span className="text-white text-sm">--</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] text-sm">Average Balance</span>
                  <span className="text-white text-sm">--</span>
                </div>
              </div>
            </div>

            {/* Coming Soon Notice */}
            <div className="bg-gradient-to-r from-[#5B6CFF]/10 to-[#6366F1]/10 border border-[#5B6CFF]/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
              <p className="text-[#A0A0B8] text-sm">
                Detailed analytics and real-time data for this distribution tier will be available soon. 
                We're working on integrating comprehensive address data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
