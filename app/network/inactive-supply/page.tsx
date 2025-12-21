import { getInactiveSupplyData, calculateInactiveSupplyPowerLaw, getPriceData } from '@/lib/sheets'

export const revalidate = 3600

export default async function InactiveSupplyOverviewPage() {
  // Fetch data for key timeframes to show insights
  const [
    data1y, 
    data2y,
    data4y
  ] = await Promise.all([
    getInactiveSupplyData('1year'),
    getInactiveSupplyData('2years'),
    getInactiveSupplyData('4years')
  ])

  // Calculate power law metrics for insights
  const powerLaw2y = calculateInactiveSupplyPowerLaw(data2y)
  const powerLaw1y = calculateInactiveSupplyPowerLaw(data1y)

  // Safely get latest data points - using the same pattern as your existing pages
  const latest1y = data1y?.[data1y.length - 1]?.inactiveSupplyPercentage ?? 0
  const latest2y = data2y?.[data2y.length - 1]?.inactiveSupplyPercentage ?? 0
  const latest4y = data4y?.[data4y.length - 1]?.inactiveSupplyPercentage ?? 0

  // Calculate holder strength ratio safely
  const holderStrengthRatio = latest1y > 0 ? (latest4y / latest1y * 100) : 0

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Holder Conviction Analysis
        </h1>
        <p className="text-[#9CA3AF] text-lg">
          Real-time insights into Kaspa's inactive supply patterns and holder behavior
        </p>
      </div>

      {/* Key Insights Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#5B6CFF] mb-2">Power Law Strength</h3>
          <div className="text-3xl font-bold text-white mb-2">
            R² {powerLaw2y?.r2?.toFixed(3) || '0.000'}
          </div>
          <p className="text-[#9CA3AF] text-sm">
            2-year accumulation follows {powerLaw2y?.r2 && powerLaw2y.r2 > 0.99 ? 'near-perfect' : powerLaw2y?.r2 && powerLaw2y.r2 > 0.95 ? 'excellent' : 'strong'} mathematical patterns
          </p>
        </div>

        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#FF8C00] mb-2">Diamond Hands Ratio</h3>
          <div className="text-3xl font-bold text-white mb-2">
            {holderStrengthRatio.toFixed(1)}%
          </div>
          <p className="text-[#9CA3AF] text-sm">
            4+ year holders vs 1+ year holders
          </p>
        </div>

        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#10B981] mb-2">Ultra Long-Term</h3>
          <div className="text-3xl font-bold text-white mb-2">
            {latest4y.toFixed(1)}%
          </div>
          <p className="text-[#9CA3AF] text-sm">
            Supply unmoved for 4+ years
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <a
          href="/network/inactive-supply/6-months"
          className="group bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4 hover:bg-[#252545] hover:border-[#5B6CFF]/30 transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-lg font-bold text-white group-hover:text-[#5B6CFF] transition-colors duration-200 mb-1">
              6+ Months
            </div>
            <div className="text-xs text-[#9CA3AF] font-medium">
              Active vs Inactive
            </div>
          </div>
        </a>

        <a
          href="/network/inactive-supply/1-year"
          className="group bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4 hover:bg-[#252545] hover:border-[#5B6CFF]/30 transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-lg font-bold text-white group-hover:text-[#5B6CFF] transition-colors duration-200 mb-1">
              1+ Year
            </div>
            <div className="text-xs text-[#9CA3AF] font-medium">
              {latest1y.toFixed(1)}% Supply
            </div>
          </div>
        </a>

        <a
          href="/network/inactive-supply/2-years"
          className="group bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4 hover:bg-[#252545] hover:border-[#5B6CFF]/30 transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-lg font-bold text-white group-hover:text-[#5B6CFF] transition-colors duration-200 mb-1">
              2+ Years
            </div>
            <div className="text-xs text-[#9CA3AF] font-medium">
              {latest2y.toFixed(1)}% Supply
            </div>
          </div>
        </a>

        <a
          href="/network/inactive-supply/3-years"
          className="group bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4 hover:bg-[#252545] hover:border-[#5B6CFF]/30 transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-lg font-bold text-white group-hover:text-[#5B6CFF] transition-colors duration-200 mb-1">
              3+ Years
            </div>
            <div className="text-xs text-[#9CA3AF] font-medium">
              Long-term HODLers
            </div>
          </div>
        </a>

        <a
          href="/network/inactive-supply/4-years"
          className="group bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4 hover:bg-[#252545] hover:border-[#5B6CFF]/30 transition-all duration-200"
        >
          <div className="text-center">
            <div className="text-lg font-bold text-white group-hover:text-[#5B6CFF] transition-colors duration-200 mb-1">
              4+ Years
            </div>
            <div className="text-xs text-[#9CA3AF] font-medium">
              {latest4y.toFixed(1)}% Supply
            </div>
          </div>
        </a>
      </div>

      {/* Key Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[#5B6CFF]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,10V12H7V10H9M13,10V12H11V10H13M17,10V12H15V10H17M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19M19,19V8H5V19H19M19,6V5H5V6H19Z"/>
            </svg>
            Mathematical Patterns
          </h3>
          <ul className="space-y-3 text-[#9CA3AF]">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#10B981] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">R² {powerLaw2y?.r2?.toFixed(3) || '0.000'}</strong> - Kaspa's 2-year holder accumulation shows {powerLaw2y?.r2 && powerLaw2y.r2 > 0.95 ? 'excellent' : 'good'} power law correlation
              </span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#F59E0B] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">{((latest2y - latest4y) / latest2y * 100).toFixed(1)}%</strong> of 2+ year holders moved funds in the last 2 years
              </span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#EF4444] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">Power law slope:</strong> {powerLaw2y?.slope?.toFixed(3) || 'N/A'} indicates accumulation trends
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[#FF8C00]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
            </svg>
            Holder Insights
          </h3>
          <ul className="space-y-3 text-[#9CA3AF]">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#8B5CF6] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">Ultra conviction:</strong> {latest4y.toFixed(1)}% haven't moved in 4+ years
              </span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#06B6D4] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">Holder evolution:</strong> Clear progression from 1yr to 4yr commitment levels
              </span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#84CC16] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">Network maturity:</strong> Strong power law correlations indicate organic growth
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
