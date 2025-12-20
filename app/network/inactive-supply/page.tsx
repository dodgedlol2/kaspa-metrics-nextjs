import { getInactiveSupplyData, calculateInactiveSupplyPowerLaw } from '@/lib/sheets'
import InactiveSupplyChart from '@/components/charts/InactiveSupplyChart'

export default async function InactiveSupply2YearsPage() {
  // Fetch inactive supply data for 2+ years
  const data = await getInactiveSupplyData('2years')
  
  // Calculate power law parameters
  const powerLawParams = calculateInactiveSupplyPowerLaw(data)
  
  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Supply Not Moved in 2+ Years
        </h1>
        <p className="text-[#9CA3AF] text-lg">
          Tracking the percentage of KAS supply that hasn't moved in over 2 years, with power law analysis
        </p>
      </div>

      {/* Power Law Stats */}
      {powerLawParams && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">Intercept</div>
            <div className="text-2xl font-bold text-[#FF8C00]">
              {powerLawParams.intercept.toFixed(3)}
            </div>
          </div>
          
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">Slope</div>
            <div className="text-2xl font-bold text-[#FF8C00]">
              {powerLawParams.slope.toFixed(3)}
            </div>
          </div>
          
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">R² (Fit Quality)</div>
            <div className="text-2xl font-bold text-[#FF8C00]">
              {powerLawParams.r2.toFixed(3)}
            </div>
          </div>
          
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">Current Inactive %</div>
            <div className="text-2xl font-bold text-[#00FFCC]">
              {data.length > 0 ? data[data.length - 1].percent.toFixed(2) : '0.00'}%
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="mb-8">
        <InactiveSupplyChart 
          data={data}
          timeframeName="2 Years"
          powerLawParams={powerLawParams || undefined}
          height={650}
        />
      </div>

      {/* Explanation Section */}
      <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">What Does This Mean?</h2>
        
        <div className="space-y-4 text-[#9CA3AF]">
          <p>
            This chart shows the percentage of Kaspa's total supply that hasn't been moved in over 2 years. 
            A higher percentage indicates strong holder conviction and long-term accumulation.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold text-[#00FFCC] mb-2">Power Law Trend</h3>
              <p className="text-sm">
                The orange dotted line shows the mathematical power law relationship: 
                <code className="bg-[#0F0F1A] px-2 py-1 rounded text-[#FF8C00] mx-1">
                  y = {powerLawParams?.constant.toFixed(6)} × x^{powerLawParams?.slope.toFixed(3)}
                </code>
              </p>
              <p className="text-sm mt-2">
                R² of {powerLawParams?.r2.toFixed(3)} indicates {
                  powerLawParams && powerLawParams.r2 > 0.9 ? 'excellent' : 
                  powerLawParams && powerLawParams.r2 > 0.8 ? 'good' : 'moderate'
                } fit quality.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#9CA3AF] mb-2">Bounds Interpretation</h3>
              <p className="text-sm">
                <span className="text-[#9CA3AF]">Lower Bound (-60%):</span> Historically low inactive supply levels
              </p>
              <p className="text-sm mt-1">
                <span className="text-[#9CA3AF]">Upper Bound (+120%):</span> Historically high inactive supply levels
              </p>
              <p className="text-sm mt-2">
                These bounds help identify unusual market conditions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Insights */}
      <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Trading Insights</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="font-semibold text-white">Increasing Inactive Supply</h3>
            </div>
            <p className="text-sm text-[#9CA3AF]">
              Suggests strong holder conviction. More supply being locked up long-term typically 
              indicates bullish sentiment and reduced selling pressure.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <h3 className="font-semibold text-white">Decreasing Inactive Supply</h3>
            </div>
            <p className="text-sm text-[#9CA3AF]">
              Indicates coins are moving after being dormant. Could signal distribution by long-term 
              holders, or preparation for market activity.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#FF8C00] rounded-full"></div>
              <h3 className="font-semibold text-white">Power Law Deviation</h3>
            </div>
            <p className="text-sm text-[#9CA3AF]">
              When actual supply moves significantly away from the power law trend, it may indicate 
              unusual market conditions or regime changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
