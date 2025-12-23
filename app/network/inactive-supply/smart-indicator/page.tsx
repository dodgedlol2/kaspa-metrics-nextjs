import { getInactiveSupplyData, calculateInactiveSupplyPowerLaw, getPriceData } from '@/lib/sheets'
import SmartTopBottomIndicator from '@/components/charts/SmartTopBottomIndicator'

export const revalidate = 3600

export default async function SmartIndicatorPage() {
  const kaspaGenesis = new Date('2021-11-07T00:00:00.000Z')

  // Fetch ALL timeframe data for comprehensive analysis
  const [
    data3m,
    data6m,
    data1y,
    data2y, 
    data3y,
    priceData
  ] = await Promise.all([
    getInactiveSupplyData('3months'),
    getInactiveSupplyData('6months'),
    getInactiveSupplyData('1year'),
    getInactiveSupplyData('2years'),
    getInactiveSupplyData('3years'),
    getPriceData()
  ])

  // Process data with genesis adjustments for power law calculations
  const adjustedGenesis3m = new Date(kaspaGenesis)
  adjustedGenesis3m.setMonth(adjustedGenesis3m.getMonth() + 3)
  
  const adjustedGenesis6m = new Date(kaspaGenesis)
  adjustedGenesis6m.setMonth(adjustedGenesis6m.getMonth() + 6)
  
  const adjustedGenesis1y = new Date(kaspaGenesis)
  adjustedGenesis1y.setFullYear(adjustedGenesis1y.getFullYear() + 1)
  
  const adjustedGenesis2y = new Date(kaspaGenesis)
  adjustedGenesis2y.setFullYear(adjustedGenesis2y.getFullYear() + 2)
  
  const adjustedGenesis3y = new Date(kaspaGenesis)
  adjustedGenesis3y.setFullYear(adjustedGenesis3y.getFullYear() + 3)

  // Process all datasets
  const processed3m = data3m.map(point => ({
    ...point,
    daysFromGenesis: Math.max(1, Math.floor((point.timestamp - adjustedGenesis3m.getTime()) / (24 * 60 * 60 * 1000)))
  })).filter(point => point.daysFromGenesis > 0)

  const processed6m = data6m.map(point => ({
    ...point,
    daysFromGenesis: Math.max(1, Math.floor((point.timestamp - adjustedGenesis6m.getTime()) / (24 * 60 * 60 * 1000)))
  })).filter(point => point.daysFromGenesis > 0)

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

  // Calculate power law parameters (only for reliable timeframes) with null checks
  const powerLawParams1y = calculateInactiveSupplyPowerLaw(processed1y) || {
    intercept: 0, slope: 1, r2: 0, constant: 1
  }
  const powerLawParams2y = calculateInactiveSupplyPowerLaw(processed2y) || {
    intercept: 0, slope: 1, r2: 0, constant: 1
  }
  const powerLawParams3y = calculateInactiveSupplyPowerLaw(processed3y) || {
    intercept: 0, slope: 1, r2: 0, constant: 1
  }

  // Get current values
  const latest = {
    price: priceData[priceData.length - 1]?.value || 0,
    p3m: processed3m[processed3m.length - 1]?.percent || 0,
    p6m: processed6m[processed6m.length - 1]?.percent || 0,
    p1y: processed1y[processed1y.length - 1]?.percent || 0,
    p2y: processed2y[processed2y.length - 1]?.percent || 0,
    p3y: processed3y[processed3y.length - 1]?.percent || 0
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
            Smart Top/Bottom Indicator
          </h1>
          <p className="text-lg text-[#A0A0B8] max-w-4xl">
            Multi-timeframe analysis combining all holder groups (3M-3Y) to predict market tops and bottoms. Uses conviction scores and momentum ratios to generate unified buy/sell signals.
          </p>
        </div>

        {/* Current Market Overview */}
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#DC2626] mb-1">3M Holders</h3>
            <div className="text-lg font-bold text-white">{latest.p3m.toFixed(1)}%</div>
            <div className="text-xs text-[#9CA3AF]">Short-term sentiment</div>
          </div>

          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#EA580C] mb-1">6M Holders</h3>
            <div className="text-lg font-bold text-white">{latest.p6m.toFixed(1)}%</div>
            <div className="text-xs text-[#9CA3AF]">Medium-short term</div>
          </div>

          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#F59E0B] mb-1">1Y Holders</h3>
            <div className="text-lg font-bold text-white">{latest.p1y.toFixed(1)}%</div>
            <div className="text-xs text-[#9CA3AF]">R² {powerLawParams1y?.r2.toFixed(3) || 'N/A'}</div>
          </div>

          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#5B6CFF] mb-1">2Y Holders</h3>
            <div className="text-lg font-bold text-white">{latest.p2y.toFixed(1)}%</div>
            <div className="text-xs text-[#9CA3AF]">R² {powerLawParams2y?.r2.toFixed(3) || 'N/A'}</div>
          </div>

          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#059669] mb-1">3Y Holders</h3>
            <div className="text-lg font-bold text-white">{latest.p3y.toFixed(1)}%</div>
            <div className="text-xs text-[#9CA3AF]">R² {powerLawParams3y?.r2.toFixed(3) || 'N/A'}</div>
          </div>

          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#9CA3AF] mb-1">Current Price</h3>
            <div className="text-lg font-bold text-white">${latest.price.toFixed(4)}</div>
            <div className="text-xs text-[#9CA3AF]">Live market data</div>
          </div>
        </div>

        {/* Smart Indicator Chart */}
        <div className="mb-8">
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
            <SmartTopBottomIndicator 
              data3m={processed3m}
              data6m={processed6m}
              data1y={processed1y}
              data2y={processed2y}
              data3y={processed3y}
              priceData={priceData}
              powerLawParams1y={powerLawParams1y}
              powerLawParams2y={powerLawParams2y}
              powerLawParams3y={powerLawParams3y}
              height={900}
            />
          </div>
        </div>

        {/* How It Works */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Smart Score Methodology */}
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Smart Score Calculation</h3>
            <div className="space-y-4 text-[#9CA3AF] text-sm">
              <div>
                <h4 className="text-[#5B6CFF] font-semibold mb-2">Conviction Score (60% weight):</h4>
                <p>Measures how much long-term holders (1Y-3Y) deviate from their power law trends. Negative = accumulation below trend.</p>
                <div className="mt-2 p-2 bg-[#0F0F1A] rounded text-xs">
                  Formula: (Dev1Y + Dev2Y×1.5 + Dev3Y×2) ÷ 4.5
                </div>
              </div>
              <div>
                <h4 className="text-[#10B981] font-semibold mb-2">Momentum Score (40% weight):</h4>
                <p>Compares short-term (3M+6M) vs long-term (2Y+3Y) holder ratios. Deviation from normal ratio indicates market extremes.</p>
                <div className="mt-2 p-2 bg-[#0F0F1A] rounded text-xs">
                  Formula: ((ShortLongRatio - 3.5) ÷ 3.5) × 100
                </div>
              </div>
            </div>
          </div>

          {/* Signal Interpretation */}
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Signal Zones</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-[#22C55E] rounded-full opacity-90"></div>
                <div>
                  <span className="text-[#22C55E] font-semibold">Strong Buy Zone:</span>
                  <span className="text-[#9CA3AF]"> Score &lt; -20</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#4ADE80] rounded-full opacity-80"></div>
                <div>
                  <span className="text-[#4ADE80] font-semibold">Buy Zone:</span>
                  <span className="text-[#9CA3AF]"> Score -20 to -10</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#86EFAC] rounded-full opacity-70"></div>
                <div>
                  <span className="text-[#86EFAC] font-semibold">Weak Buy:</span>
                  <span className="text-[#9CA3AF]"> Score -10 to -5</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#6B7280] rounded-full opacity-40"></div>
                <div>
                  <span className="text-[#9CA3AF] font-semibold">Neutral:</span>
                  <span className="text-[#9CA3AF]"> Score -5 to +5</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#FCA5A5] rounded-full opacity-70"></div>
                <div>
                  <span className="text-[#FCA5A5] font-semibold">Weak Sell:</span>
                  <span className="text-[#9CA3AF]"> Score +5 to +10</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#F87171] rounded-full opacity-80"></div>
                <div>
                  <span className="text-[#F87171] font-semibold">Sell Zone:</span>
                  <span className="text-[#9CA3AF]"> Score +10 to +20</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-[#EF4444] rounded-full opacity-90"></div>
                <div>
                  <span className="text-[#EF4444] font-semibold">Strong Sell Zone:</span>
                  <span className="text-[#9CA3AF]"> Score &gt; +20</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
