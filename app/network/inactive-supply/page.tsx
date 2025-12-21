import Link from 'next/link'

export default function InactiveSupplyOverviewPage() {
  const timeframes = [
    {
      name: '6+ Months',
      href: '/network/inactive-supply/6-months',
      description: 'Short to medium-term holder behavior',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
        </svg>
      )
    },
    {
      name: '1+ Year',
      href: '/network/inactive-supply/1-year',
      description: 'Medium to long-term accumulation patterns',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
        </svg>
      )
    },
    {
      name: '2+ Years',
      href: '/network/inactive-supply/2-years',
      description: 'Strong long-term holder conviction',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
        </svg>
      )
    },
    {
      name: '3+ Years',
      href: '/network/inactive-supply/3-years',
      description: 'Ultra long-term diamond hands behavior',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
        </svg>
      )
    },
    {
      name: '4+ Years',
      href: '/network/inactive-supply/4-years',
      description: 'Maximum holder commitment and conviction',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Inactive Supply Analysis
        </h1>
        <p className="text-[#9CA3AF] text-lg max-w-3xl">
          Analyze Kaspa supply that hasn't moved across different timeframes. Each metric reveals different aspects of holder behavior and market psychology.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {timeframes.map((timeframe) => (
          <Link
            key={timeframe.name}
            href={timeframe.href}
            className="group bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6 hover:bg-[#252545] hover:border-[#5B6CFF]/30 transition-all duration-200"
          >
            <div className="flex items-center mb-4">
              <span className="text-[#5B6CFF] mr-3 group-hover:text-[#6366F1] transition-colors duration-200">
                {timeframe.icon}
              </span>
              <h3 className="text-xl font-bold text-white group-hover:text-[#5B6CFF] transition-colors duration-200">
                {timeframe.name}
              </h3>
            </div>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">
              {timeframe.description}
            </p>
            <div className="mt-4 flex items-center text-[#5B6CFF] text-sm font-medium group-hover:text-[#6366F1] transition-colors duration-200">
              View Analysis
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Understanding Inactive Supply Metrics</h2>
        
        <div className="space-y-4 text-[#9CA3AF]">
          <p>
            Inactive supply analysis tracks the percentage of Kaspa's total supply that hasn't been moved for specific time periods. 
            This provides insights into holder behavior, market psychology, and long-term accumulation trends.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold text-[#5B6CFF] mb-2">What It Reveals</h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Holder conviction and commitment levels</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Long-term accumulation vs short-term trading</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Market cycle psychology and sentiment</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-[#5B6CFF] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Supply scarcity and hodling behavior</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#FF8C00] mb-2">Power Law Analysis</h3>
              <p className="text-sm mb-2">
                Each timeframe includes power law trend analysis to identify mathematical patterns in holder accumulation.
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-[#FF8C00] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>R² values indicate trend strength and predictability</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-[#FF8C00] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Slopes reveal accumulation velocity changes</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-[#FF8C00] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Deviations signal potential market shifts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
