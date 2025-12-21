import { getInactiveSupplyData, calculateInactiveSupplyPowerLaw, getPriceData } from '@/lib/sheets'
import InactiveSupplyChart from '@/components/charts/InactiveSupplyChart'

export const revalidate = 3600

export default async function InactiveSupply3YearsPage() {
  const kaspaGenesis = new Date('2021-11-07T00:00:00.000Z')
  const adjustedGenesis = new Date(kaspaGenesis)
  adjustedGenesis.setFullYear(adjustedGenesis.getFullYear() + 3)

  const [rawData, priceData] = await Promise.all([
    getInactiveSupplyData('3years'),
    getPriceData()
  ])

  const data = rawData.map(point => ({
    ...point,
    daysFromGenesis: Math.max(1, Math.floor((point.timestamp - adjustedGenesis.getTime()) / (24 * 60 * 60 * 1000)))
  })).filter(point => point.daysFromGenesis > 0)

  const powerLawParams = calculateInactiveSupplyPowerLaw(data)

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Supply Not Moved in 3+ Years
        </h1>
      </div>

      <div className="mb-8">
        <InactiveSupplyChart 
          data={data}
          priceData={priceData}
          timeframeName="3 Years"
          genesisDate={adjustedGenesis}
          powerLawParams={powerLawParams || undefined}
          height={650}
        />
      </div>

      <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">What Does This Mean?</h2>
        
        <div className="space-y-4 text-[#9CA3AF]">
          <p>
            This chart shows the percentage of Kaspa's total supply that hasn't been moved in over 3 years. 
            A higher percentage indicates extremely strong holder conviction and diamond hands behavior.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold text-[#5B6CFF] mb-2">Power Law Trend</h3>
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
              <h3 className="text-lg font-semibold text-[#9CA3AF] mb-2">Price Context</h3>
              <p className="text-sm">
                The gray line in the background shows Kaspa's price movement over the same period. 
                This helps identify correlations between price action and changes in ultra-long-term holder behavior.
              </p>
              <p className="text-sm mt-2">
                Compare price peaks and dips with changes in inactive supply to understand market psychology.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
