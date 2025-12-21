import { getInactiveSupplyData, calculateInactiveSupplyPowerLaw, getPriceData } from '@/lib/sheets'

export const revalidate = 3600

export default async function InactiveSupplyOverviewPage() {
  // Fetch data for all timeframes to show comparative insights
  const [
    data6m,
    data1y, 
    data2y,
    data3y,
    data4y
  ] = await Promise.all([
    getInactiveSupplyData('6months'),
    getInactiveSupplyData('1year'),
    getInactiveSupplyData('2years'),
    getInactiveSupplyData('3years'),
    getInactiveSupplyData('4years')
  ])

  // Calculate power law metrics for insights
  const powerLaw2y = calculateInactiveSupplyPowerLaw(data2y)
  const powerLaw1y = calculateInactiveSupplyPowerLaw(data1y)

  // Get latest data points for current metrics
  const latest6m = data6m[data6m.length - 1]?.value || 0
  const latest1y = data1y[data1y.length - 1]?.value || 0
  const latest2y = data2y[data2y.length - 1]?.value || 0
  const latest3y = data3y[data3y.length - 1]?.value || 0
  const latest4y = data4y[data4y.length - 1]?.value || 0

  // Calculate holder strength ratio (4y/6m ratio)
  const holderStrengthRatio = latest6m > 0 ? (latest4y / latest6m * 100) : 0

  const timeframeData = [
    { name: '6+ Months', value: latest6m, href: '/network/inactive-supply/6-months' },
    { name: '1+ Year', value: latest1y, href: '/network/inactive-supply/1-year' },
    { name: '2+ Years', value: latest2y, href: '/network/inactive-supply/2-years' },
    { name: '3+ Years', value: latest3y, href: '/network/inactive-supply/3-years' },
    { name: '4+ Years', value: latest4y, href: '/network/inactive-supply/4-years' }
  ]

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Holder Conviction Analysis
        </h1>
        <p className="text-[#9CA3AF] text-lg">
          Real-time insights into Kaspa's inactive supply patterns and holder behavior across all timeframes
        </p>
      </div>

      {/* Key Insights Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#5B6CFF] mb-2">Power Law Strength</h3>
          <div className="text-3xl font-bold text-white mb-2">
            R² {powerLaw2y?.r2.toFixed(3) || '0.000'}
          </div>
          <p className="text-[#9CA3AF] text-sm">
            2-year accumulation follows {powerLaw2y && powerLaw2y.r2 > 0.99 ? 'near-perfect' : powerLaw2y && powerLaw2y.r2 > 0.95 ? 'excellent' : 'strong'} mathematical patterns
          </p>
        </div>

        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#FF8C00] mb-2">Holder Strength Ratio</h3>
          <div className="text-3xl font-bold text-white mb-2">
            {holderStrengthRatio.toFixed(1)}%
          </div>
          <p className="text-[#9CA3AF] text-sm">
            4+ year holders represent {holderStrengthRatio.toFixed(1)}% of 6+ month holders
          </p>
        </div>

        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#10B981] mb-2">Diamond Hands</h3>
          <div className="text-3xl font-bold text-white mb-2">
            {latest4y.toFixed(1)}%
          </div>
          <p className="text-[#9CA3AF] text-sm">
            Of total supply unmoved for 4+ years
          </p>
        </div>
      </div>

      {/* Current Supply Distribution */}
      <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Current Inactive Supply Distribution</h2>
        
        <div className="grid grid-cols-5 gap-4">
          {timeframeData.map((timeframe, index) => (
            <a
              key={timeframe.name}
              href={timeframe.href}
              className="group bg-[#0F0F1A] border border-[#2D2D45] rounded-lg p-4 hover:bg-[#252545] hover:border-[#5B6CFF]/30 transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-white group-hover:text-[#5B6CFF] transition-colors duration-200 mb-2">
                  {timeframe.value.toFixed(1)}%
                </div>
                <div className="text-xs text-[#9CA3AF] font-medium">
                  {timeframe.name}
                </div>
                
                {/* Visual bar representation */}
                <div className="mt-3 h-2 bg-[#2D2D45] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#5B6CFF] to-[#6366F1] transition-all duration-500"
                    style={{ width: `${Math.min(timeframe.value * 2, 100)}%` }}
                  />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[#5B6CFF]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,10V12H7V10H9M13,10V12H11V10H13M17,10V12H15V10H17M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19M19,19V8H5V19H19M19,6V5H5V6H19Z"/>
            </svg>
            Remarkable Patterns
          </h3>
          <ul className="space-y-3 text-[#9CA3AF]">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#10B981] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">R² {powerLaw2y?.r2.toFixed(3)}</strong> - Kaspa's 2-year holder accumulation follows near-perfect power laws, indicating organic network adoption
              </span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#F59E0B] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">{((latest2y - latest4y) / latest2y * 100).toFixed(1)}%</strong> of 2+ year holders moved their funds in the last 2 years
              </span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#EF4444] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">Power law slope:</strong> {powerLaw2y?.slope.toFixed(3)} indicates {powerLaw2y && powerLaw2y.slope > 0.5 ? 'accelerating' : 'decelerating'} accumulation
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[#FF8C00]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
            </svg>
            Market Insights
          </h3>
          <ul className="space-y-3 text-[#9CA3AF]">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#8B5CF6] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">Diamond hands:</strong> {latest4y.toFixed(1)}% of supply hasn't moved in 4+ years
              </span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#06B6D4] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">Active traders:</strong> {(100 - latest6m).toFixed(1)}% of supply moved in last 6 months
              </span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-[#84CC16] rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span className="text-sm">
                <strong className="text-white">Conviction gradient:</strong> Clean distribution from short to long-term holders
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
