'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface DataPoint {
  timestamp: number
  value: number
}

interface PowerLawResidualChartProps {
  priceData: DataPoint[]
  hashrateData: DataPoint[]
  className?: string
}

function fitPowerLaw(data: Array<{x: number, y: number}>) {
  if (data.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  const logData = data.map(point => ({
    x: Math.log(Math.max(0.0001, point.x)),
    y: Math.log(Math.max(0.0001, point.y))
  }))
  
  const n = logData.length
  const sumX = logData.reduce((sum, point) => sum + point.x, 0)
  const sumY = logData.reduce((sum, point) => sum + point.y, 0)
  const sumXY = logData.reduce((sum, point) => sum + point.x * point.y, 0)
  const sumX2 = logData.reduce((sum, point) => sum + point.x * point.x, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  const meanY = sumY / n
  const ssRes = logData.reduce((sum, point) => {
    const predicted = intercept + slope * point.x
    return sum + Math.pow(point.y - predicted, 2)
  }, 0)
  const ssTot = logData.reduce((sum, point) => {
    return sum + Math.pow(point.y - meanY, 2)
  }, 0)
  const r2 = 1 - (ssRes / ssTot)
  
  const a = Math.exp(intercept)
  const b = slope
  
  return { a, b, r2 }
}

function calculateMovingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1)
    const window = data.slice(start, end)
    const average = window.reduce((sum, val) => sum + val, 0) / window.length
    result.push(average)
  }
  return result
}

export default function PowerLawResidualChart({ priceData, hashrateData, className = '' }: PowerLawResidualChartProps) {
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [showMovingAverage, setShowMovingAverage] = useState<'Hide' | 'Show'>('Show')
  const [movingAverageWindow, setMovingAverageWindow] = useState<7 | 14 | 30 | 90>(30)
  const [showZones, setShowZones] = useState<'Hide' | 'Show'>('Show')

  const analysisData = useMemo(() => {
    if (!priceData || !hashrateData || priceData.length === 0 || hashrateData.length === 0) {
      return []
    }

    const merged: Array<{
      date: Date,
      hashrate: number,
      price: number
    }> = []

    priceData.forEach(pricePoint => {
      const priceDate = new Date(pricePoint.timestamp).toDateString()
      const correspondingHashrate = hashrateData.find(hashratePoint => {
        const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
        return priceDate === hashrateDate
      })

      if (correspondingHashrate && pricePoint.value > 0 && correspondingHashrate.value > 0) {
        const date = new Date(pricePoint.timestamp)
        const hashrate = correspondingHashrate.value / 1e15
        const price = pricePoint.value

        merged.push({
          date,
          hashrate,
          price
        })
      }
    })

    return merged.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [priceData, hashrateData])

  // Calculate power law and residuals
  const residualData = useMemo(() => {
    if (analysisData.length < 10) return []

    try {
      // Calculate power law using all available data
      const priceHashrateData = analysisData.map(d => ({ x: d.hashrate, y: d.price }))
      const { a, b } = fitPowerLaw(priceHashrateData)

      // Calculate residuals as percentage deviation
      const residuals = analysisData.map(d => {
        const expectedPrice = a * Math.pow(d.hashrate, b)
        const actualPrice = d.price
        const residualPercent = ((actualPrice - expectedPrice) / expectedPrice) * 100
        
        return {
          date: d.date,
          residual: residualPercent,
          actualPrice,
          expectedPrice,
          hashrate: d.hashrate
        }
      })

      return residuals
    } catch (error) {
      console.error('Power law residual calculation failed:', error)
      return []
    }
  }, [analysisData])

  // Filter data based on time period
  const filteredResidualData = useMemo(() => {
    if (timePeriod === 'All' || residualData.length === 0) return residualData
    
    const now = Date.now()
    const days = {
      '1M': 30, '3M': 90, '6M': 180, 
      '1Y': 365, '2Y': 730, '3Y': 1095
    }
    
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    return residualData.filter(point => point.date.getTime() >= cutoffTime)
  }, [residualData, timePeriod])

  const chartData = useMemo(() => {
    if (filteredResidualData.length === 0) return []

    const traces: any[] = []

    // Main residual line
    const dates = filteredResidualData.map(d => d.date.toISOString())
    const residuals = filteredResidualData.map(d => d.residual)

    // Color coding for the line based on residual values
    const colors = residuals.map(residual => {
      if (residual >= 100) return '#10B981' // Green for high overvaluation
      if (residual >= 50) return '#059669' // Dark green for moderate overvaluation
      if (residual >= 25) return '#0891B2' // Cyan for mild overvaluation
      if (residual >= -25) return '#6366F1' // Blue for fair value range
      if (residual >= -50) return '#8B5CF6' // Purple for mild undervaluation
      if (residual >= -75) return '#A855F7' // Light purple for moderate undervaluation
      return '#C084FC' // Lightest purple for high undervaluation
    })

    traces.push({
      x: dates,
      y: residuals,
      mode: 'markers+lines',
      type: 'scatter',
      name: 'Power Law Residual (%)',
      line: { 
        color: '#5B6CFF', 
        width: 2,
        shape: 'linear'
      },
      marker: {
        color: colors,
        size: 4,
        opacity: 0.8,
        line: { width: 0.5, color: 'rgba(255, 255, 255, 0.3)' }
      },
      hovertemplate: 'Date: %{x}<br>Residual: %{y:.1f}%<br>%{text}<extra></extra>',
      text: filteredResidualData.map(d => {
        const status = d.residual > 0 ? 'Overvalued' : 'Undervalued'
        return `${status} by ${Math.abs(d.residual).toFixed(1)}%<br>Price: $${d.actualPrice.toFixed(4)}<br>Expected: $${d.expectedPrice.toFixed(4)}`
      })
    })

    // Moving average
    if (showMovingAverage === 'Show' && residuals.length > movingAverageWindow) {
      const movingAvg = calculateMovingAverage(residuals, movingAverageWindow)
      
      traces.push({
        x: dates,
        y: movingAvg,
        mode: 'lines',
        type: 'scatter',
        name: `${movingAverageWindow}-Day Moving Average`,
        line: { 
          color: '#F59E0B', 
          width: 3,
          dash: 'solid'
        },
        hovertemplate: `${movingAverageWindow}-Day MA: %{y:.1f}%<extra></extra>`
      })
    }

    // Overbought/Oversold zones
    if (showZones === 'Show') {
      // Extreme overvaluation zone (>100%)
      traces.push({
        x: dates,
        y: Array(dates.length).fill(100),
        mode: 'lines',
        type: 'scatter',
        name: 'Extreme Overvaluation (+100%)',
        line: { color: 'rgba(239, 68, 68, 0.6)', width: 1, dash: 'dash' },
        hoverinfo: 'skip',
        showlegend: true
      })

      // Moderate overvaluation zone (>50%)
      traces.push({
        x: dates,
        y: Array(dates.length).fill(50),
        mode: 'lines',
        type: 'scatter',
        name: 'Moderate Overvaluation (+50%)',
        line: { color: 'rgba(245, 158, 11, 0.6)', width: 1, dash: 'dot' },
        hoverinfo: 'skip',
        showlegend: true
      })

      // Fair value zone (0%)
      traces.push({
        x: dates,
        y: Array(dates.length).fill(0),
        mode: 'lines',
        type: 'scatter',
        name: 'Fair Value (0%)',
        line: { color: 'rgba(156, 163, 175, 0.8)', width: 2, dash: 'solid' },
        hoverinfo: 'skip',
        showlegend: true
      })

      // Moderate undervaluation zone (-50%)
      traces.push({
        x: dates,
        y: Array(dates.length).fill(-50),
        mode: 'lines',
        type: 'scatter',
        name: 'Moderate Undervaluation (-50%)',
        line: { color: 'rgba(139, 92, 246, 0.6)', width: 1, dash: 'dot' },
        hoverinfo: 'skip',
        showlegend: true
      })

      // Extreme undervaluation zone (-75%)
      traces.push({
        x: dates,
        y: Array(dates.length).fill(-75),
        mode: 'lines',
        type: 'scatter',
        name: 'Extreme Undervaluation (-75%)',
        line: { color: 'rgba(168, 85, 247, 0.6)', width: 1, dash: 'dash' },
        hoverinfo: 'skip',
        showlegend: true
      })
    }

    return traces
  }, [filteredResidualData, showMovingAverage, movingAverageWindow, showZones])

  const layout: any = {
    height: 500,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    hovermode: 'x unified',
    showlegend: true,
    margin: { l: 60, r: 20, t: 40, b: 60 },
    title: {
      text: 'Power Law Residual: Price Deviation from Hashrate Trend',
      font: { size: 16, color: '#FFFFFF' },
      x: 0.5,
      xanchor: 'center'
    },
    hoverlabel: {
      bgcolor: 'rgba(15, 20, 25, 0.95)',
      bordercolor: 'rgba(91, 108, 255, 0.5)',
      font: { color: '#e2e8f0', size: 11 }
    },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: -0.3,
      xanchor: "center",
      x: 0.5,
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: 'rgba(0,0,0,0)',
      font: { size: 10, color: '#9CA3AF' }
    },
    yaxis: {
      title: { 
        text: 'Power Law Residual (%)', 
        font: { size: 14, color: '#FFFFFF' }
      },
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      tickfont: { size: 11, color: '#9CA3AF' },
      linecolor: '#363650',
      zerolinecolor: '#6B7280',
      zerolinewidth: 2,
      tickformat: '.0f',
      ticksuffix: '%'
    },
    xaxis: {
      title: { 
        text: 'Date', 
        font: { size: 14, color: '#FFFFFF' }
      },
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      tickfont: { size: 11, color: '#9CA3AF' },
      linecolor: '#363650',
      type: 'date',
      tickformat: '%b %Y'
    },
    annotations: [
      {
        text: `Positive values indicate overvaluation relative to network security<br>Negative values indicate undervaluation relative to network security`,
        showarrow: false,
        x: 0.5,
        y: -0.15,
        xref: 'paper',
        yref: 'paper',
        xanchor: 'center',
        yanchor: 'top',
        font: { size: 10, color: '#6B7280' }
      }
    ]
  }

  if (filteredResidualData.length === 0) {
    return (
      <div className={`bg-[#1A1A2E] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="text-red-400 text-lg font-medium mb-2">No Data Available</div>
            <div className="text-[#6B7280] text-sm">Unable to calculate power law residuals</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Moving Average Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Moving Avg:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{showMovingAverage}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setShowMovingAverage('Hide')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showMovingAverage === 'Hide' ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showMovingAverage === 'Hide' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Hide Moving Average
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setShowMovingAverage('Show')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showMovingAverage === 'Show' ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showMovingAverage === 'Show' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Show Moving Average
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Moving Average Window Control */}
          {showMovingAverage === 'Show' && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                </svg>
                <span className="text-[#A0A0B8] text-xs">Window:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{movingAverageWindow}D</span>
                <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full mt-1 left-0 w-48 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
                <div className="p-1.5">
                  {[7, 14, 30, 90].map((window) => (
                    <div 
                      key={window}
                      onClick={() => setMovingAverageWindow(window as 7 | 14 | 30 | 90)}
                      className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                        movingAverageWindow === window ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                      }`}
                    >
                      <span className={`text-xs font-medium ${
                        movingAverageWindow === window ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                      }`}>
                        {window} Days
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Zones Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,18.5A6.5,6.5 0 0,1 5.5,12A6.5,6.5 0 0,1 12,5.5A6.5,6.5 0 0,1 18.5,12A6.5,6.5 0 0,1 12,18.5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Zones:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{showZones}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setShowZones('Hide')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showZones === 'Hide' ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showZones === 'Hide' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Hide Reference Zones
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setShowZones('Show')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showZones === 'Show' ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showZones === 'Show' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Show Reference Zones
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Time Period Controls */}
        <div className="flex items-center gap-2">
          {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                timePeriod === period
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
          
          {/* Max Time Dropdown */}
          <div className="relative group">
            <button 
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                timePeriod === 'All' || timePeriod === '2Y' || timePeriod === '3Y'
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              <span>Max</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 right-0 w-32 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                {(['2Y', '3Y', 'All'] as const).map((period) => (
                  <div 
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      timePeriod === period ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      timePeriod === period ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {period === 'All' ? 'All Time' : period === '2Y' ? '2 Years' : '3 Years'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '500px' }} className="w-full">
        <Plot
          data={chartData}
          layout={layout}
          style={{ width: '100%', height: '100%' }}
          config={{
            displayModeBar: false,
            responsive: true,
            doubleClick: 'autosize',
            scrollZoom: true,
            editable: false,
            staticPlot: false,
            showTips: false,
            autosizable: true,
            frameMargins: 0,
            toImageButtonOptions: {
              format: 'png',
              filename: 'power_law_residual_chart',
              height: 650,
              width: 1200,
              scale: 1
            }
          }}
          useResizeHandler={true}
          revision={filteredResidualData.length}
        />
      </div>
    </div>
  )
}
