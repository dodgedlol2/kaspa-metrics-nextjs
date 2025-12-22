import { getInactiveSupplyData, calculateInactiveSupplyPowerLaw, getPriceData } from '@/lib/sheets'
import PowerLawMomentumChart from '@/components/charts/PowerLawMomentumChart'

export const revalidate = 3600

export default async function PowerLawMomentumPage() {
  const kaspaGenesis = new Date('2021-11-07T00:00:00.000Z')

  // Fetch data for 1Y, 2Y, and 3Y timeframes (most reliable power laws)
  const [
    data1y,
    data2y, 
    data3y,
    priceData
  ] = await Promise.all([
    getInactiveSupplyData('1year'),
    getInactiveSupplyData('2years'),
    getInactiveSupplyData('3years'),
    getPriceData()
  ])

  // Process data with same genesis adjustments as individual pages
  const adjustedGenesis1y = new Date(kaspaGenesis)
  adjustedGenesis1y.setFullYear(adjustedGenesis1y.getFullYear() + 1)
  
  const adjustedGenesis2y = new Date(kaspaGenesis)
  adjustedGenesis2y.setFullYear(adjustedGenesis2y.getFullYear() + 2)
  
  const adjustedGenesis3y = new Date(kaspaGenesis)
  adjustedGenesis3y.setFullYear(adjustedGenesis3y.getFullYear() + 3)

  const processed1y = data1y.map(point => ({
    ...point,
    daysFromGenesis: Math.max(1, Math.floor((point.timestamp - adjustedGenesis1y.getTime()) / (24 * 60 * 60 * 1000)))
  })).filter(point => point.daysFromGenesis > 0)

  const processed2y = data2y.map(point => ({
    ...point,
    daysFromGenesis: Math.max(1, Math.floor((point.timestamp - adjustedGenesis2y.getTime()) / (24 * 60 * 60 * 1000)))
  })).filter(point => point.daysFromGenesis > 0)

  const processed3y = data3y.map(point => ({
    ...point,
    daysFromGenesis: Math.max(1, Math.floor((point.timestamp - adjustedGenesis3y.getTime()) / (24 * 60 * 60 * 1000)))
  })).filter(point => point.daysFromGenesis > 0)

  // Calculate power law parameters
  const powerLaw1y = calculateInactiveSupplyPowerLaw(processed1y)
  const powerLaw2y = calculateInactiveSupplyPowerLaw(processed2y)
  const powerLaw3y = calculateInactiveSupplyPowerLaw(processed3y)

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
            Power Law Momentum Analysis
          </h1>
          <p className="text-lg text-[#A0A0B8] max-w-4xl">
            Detrended analysis of holder behavior relative to power law predictions. Track accumulation momentum and identify smart money patterns across conviction timeframes.
          </p>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#F59E0B] mb-2">1 Year Holders</h3>
            <div className="text-2xl font-bold text-white mb-1">
              R² {powerLaw1y?.r2.toFixed(3) || 'N/A'}
            </div>
            <div className="text-sm text-[#9CA3AF]">
              Medium-term conviction with strong power law correlation
            </div>
          </div>

          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#5B6CFF] mb-2">2 Year Holders</h3>
            <div className="text-2xl font-bold text-white mb-1">
              R² {powerLaw2y?.r2.toFixed(3) || 'N/A'}
            </div>
            <div className="text-sm text-[#9CA3AF]">
              Strong conviction with excellent mathematical predictability
            </div>
          </div>

          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#059669] mb-2">3 Year Holders</h3>
            <div className="text-2xl font-bold text-white mb-1">
              R² {powerLaw3y?.r2.toFixed(3) || 'N/A'}
            </div>
            <div className="text-sm text-[#9CA3AF]">
              Ultra conviction with near-perfect power law behavior
            </div>
          </div>
        </div>

        {/* 1 Year Analysis */}
        {powerLaw1y && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">1 Year Holder Momentum</h2>
              <p className="text-[#A0A0B8]">
                Medium-term holders showing conviction building patterns. Watch for inverse correlation with price movements.
              </p>
            </div>
            <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
              <PowerLawMomentumChart 
                data={processed1y}
                priceData={priceData}
                timeframeName="1 Year"
                powerLawParams={powerLaw1y}
                height={800}
              />
            </div>
          </div>
        )}

        {/* 2 Year Analysis */}
        {powerLaw2y && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">2 Year Holder Momentum</h2>
              <p className="text-[#A0A0B8]">
                Strong conviction holders with excellent power law correlation. Key timeframe for smart money analysis.
              </p>
            </div>
            <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
              <PowerLawMomentumChart 
                data={processed2y}
                priceData={priceData}
                timeframeName="2 Years"
                powerLawParams={powerLaw2y}
                height={800}
              />
            </div>
          </div>
        )}

        {/* 3 Year Analysis */}
        {powerLaw3y && (
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">3 Year Holder Momentum</h2>
              <p className="text-[#A0A0B8]">
                Ultra conviction diamond hands with near-perfect mathematical predictability. Ultimate smart money indicator.
              </p>
            </div>
            <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
              <PowerLawMomentumChart 
                data={processed3y}
                priceData={priceData}
                timeframeName="3 Years"
                powerLawParams={powerLaw3y}
                height={800}
              />
            </div>
          </div>
        )}

        {/* Educational Content */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* How to Read the Charts */}
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">How to Read the Charts</h3>
            <div className="space-y-4 text-[#9CA3AF] text-sm">
              <div>
                <h4 className="text-[#5B6CFF] font-semibold mb-2">Top Panel - Accumulation Trends:</h4>
                <ul className="space-y-1 pl-4">
                  <li>• <span className="text-[#5B6CFF]">Blue line:</span> Actual inactive supply percentage</li>
                  <li>• <span className="text-[#FF8C00]">Orange dotted:</span> Power law prediction</li>
                  <li>• <span className="text-[#9CA3AF]">Gray background:</span> Price overlay for correlation</li>
                </ul>
              </div>
              <div>
                <h4 className="text-[#8B5CF6] font-semibold mb-2">Bottom Panel - Momentum Oscillators:</h4>
                <ul className="space-y-1 pl-4">
                  <li>• <span className="text-[#8B5CF6]">Purple area:</span> Deviation from power law (%)</li>
                  <li>• <span className="text-[#10B981]">Green line:</span> 7-day momentum (%/day)</li>
                  <li>• <span className="text-white">Dashed lines:</span> Zero reference levels</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Trading Signals */}
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Smart Money Signals</h3>
            <div className="space-y-4 text-[#9CA3AF] text-sm">
              <div>
                <h4 className="text-[#10B981] font-semibold mb-2">Accumulation Signals (Buy Zone):</h4>
                <ul className="space-y-1 pl-4">
                  <li>• Negative deviation: Below power law trend</li>
                  <li>• Positive momentum: Accelerating accumulation</li>
                  <li>• Price inverse correlation: Buying the dip</li>
                </ul>
              </div>
              <div>
                <h4 className="text-[#EF4444] font-semibold mb-2">Distribution Signals (Sell Zone):</h4>
                <ul className="space-y-1 pl-4">
                  <li>• Positive deviation: Above power law trend</li>
                  <li>• Negative momentum: Decelerating accumulation</li>
                  <li>• Price correlation: Taking profits on pumps</li>
                </ul>
              </div>
              <div>
                <h4 className="text-[#F59E0B] font-semibold mb-2">Key Insight:</h4>
                <p className="pl-4">Longer timeframes (2Y-3Y) show smarter, less reactive behavior. Use them to confirm trends from shorter timeframes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Insights */}
        <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Power Law Momentum Theory</h3>
          <div className="grid md:grid-cols-3 gap-6 text-[#9CA3AF] text-sm">
            <div>
              <h4 className="text-[#F59E0B] font-semibold mb-2">The Detrending Concept</h4>
              <p>
                By removing the power law trend, we isolate the <strong>momentum component</strong> of holder behavior. 
                This reveals when accumulation accelerates or decelerates relative to the mathematical baseline.
              </p>
            </div>
            <div>
              <h4 className="text-[#5B6CFF] font-semibold mb-2">Smart Money Patterns</h4>
              <p>
                Long-term holders often display <strong>contrarian behavior</strong> - accumulating when price falls 
                and distributing when price rises. This creates predictable momentum patterns.
              </p>
            </div>
            <div>
              <h4 className="text-[#059669] font-semibold mb-2">Conviction Hierarchy</h4>
              <p>
                3Y holders show the most predictable patterns (highest R²), while 1Y holders are more reactive. 
                Use longer timeframes to filter noise from shorter ones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
