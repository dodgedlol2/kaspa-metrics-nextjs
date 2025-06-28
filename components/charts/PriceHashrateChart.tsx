'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface DataPoint {
  timestamp: number
  value: number
}

interface PriceHashrateChartProps {
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

export default function PriceHashrateChart({ priceData, hashrateData, className = '' }: PriceHashrateChartProps) {
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [hashrateScale, setHashrateScale] = useState<'Linear' | 'Log'>('Log')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [isHovering, setIsHovering] = useState(false)

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

  // Filter data based on time period for display only
  const filteredAnalysisData = useMemo(() => {
    if (timePeriod === 'All' || analysisData.length === 0) return analysisData
    
    const now = Date.now()
    const days = {
      '1M': 30, '3M': 90, '6M': 180, 
      '1Y': 365, '2Y': 730, '3Y': 1095
    }
    
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    return analysisData.filter(point => point.date.getTime() >= cutoffTime)
  }, [analysisData, timePeriod])

  const powerLawData = useMemo(() => {
    if (analysisData.length < 10) return null

    try {
      // Always use ALL data for power law calculation (not filtered data)
      const priceHashrateData = analysisData.map(d => ({ x: d.hashrate, y: d.price }))
      const priceHashrateFit = fitPowerLaw(priceHashrateData)
      return { priceHashrate: priceHashrateFit }
    } catch (error) {
      console.error('Power law calculation failed:', error)
      return null
    }
  }, [analysisData])

  const recentDataPoints = useMemo(() => {
    if (filteredAnalysisData.length < 10) return { recent: filteredAnalysisData.slice(-10), older: filteredAnalysisData.slice(0, -10) }
    
    const recent10Days = filteredAnalysisData.slice(-10)
    const older = filteredAnalysisData.slice(0, -10)
    
    return {
      recent: recent10Days,
      older: older
    }
  }, [filteredAnalysisData])

  const mainChartData = useMemo(() => {
    if (filteredAnalysisData.length === 0) return []

    const traces: any[] = []

    // Historical data (older than 10 days)
    if (recentDataPoints.older.length > 0) {
      traces.push({
        x: recentDataPoints.older.map(d => d.hashrate),
        y: recentDataPoints.older.map(d => d.price),
        mode: 'markers',
        type: 'scattergl',
        name: 'Historical Data',
        marker: {
          color: '#5B6CFF',
          size: 6,
          opacity: 1.0,
          line: { width: 0.5, color: 'rgba(150, 150, 150, 0.6)' }
        },
        hovertemplate: 'Hashrate: %{x:.1f} PH/s<br>Price: $%{y:.2f}<br>%{text}<extra></extra>',
        text: recentDataPoints.older.map(d => d.date.toISOString().split('T')[0]),
        hoverdistance: 5
      })
    }

    // Last 10 days - with increasing size and brightness
    if (recentDataPoints.recent.length > 0) {
      const recentSizes = recentDataPoints.recent.map((_, index) => 6 + index * 2) // Start at 6, increase by 2 each day
      const recentOpacities = recentDataPoints.recent.map((_, index) => {
        const intensity = (index + 1) / recentDataPoints.recent.length
        return 0.5 + intensity * 0.5 // From 0.5 to 1.0 opacity
      })

      traces.push({
        x: recentDataPoints.recent.map(d => d.hashrate),
        y: recentDataPoints.recent.map(d => d.price),
        mode: 'markers',
        type: 'scattergl',
        name: 'Last 10 Days',
        marker: {
          color: '#5B6CFF',
          size: recentSizes,
          opacity: recentOpacities,
          line: { width: 0 }, // Removed white lines
          symbol: 'circle' // Removed star symbol
        },
        hovertemplate: 'Hashrate: %{x:.1f} PH/s<br>Price: $%{y:.2f}<br>%{text}<extra></extra>',
        text: recentDataPoints.recent.map(d => d.date.toISOString().split('T')[0]),
        hoverdistance: 5
      })
    }

    // Power law trend line only
    if (showPowerLaw === 'Show' && powerLawData?.priceHashrate) {
      const { a, b, r2 } = powerLawData.priceHashrate
      
      // Use filtered data range for power law display
      const minHashrate = Math.min(...filteredAnalysisData.map(d => d.hashrate))
      const maxHashrate = Math.max(...filteredAnalysisData.map(d => d.hashrate))
      const xFit = []
      const yFit = []
      
      for (let i = 0; i <= 100; i++) {
        const x = minHashrate + (maxHashrate - minHashrate) * (i / 100)
        const y = a * Math.pow(x, b)
        xFit.push(x)
        yFit.push(y)
      }

      // Main power law trend only
      traces.push({
        x: xFit,
        y: yFit,
        mode: 'lines',
        type: 'scatter',
        name: `Power Law Trend (R²=${r2.toFixed(3)})`,
        line: { color: '#F59E0B', width: 3, dash: 'solid' },
        hoverinfo: 'skip'
      })
    }

    return traces
  }, [filteredAnalysisData, recentDataPoints, showPowerLaw, powerLawData])

  const mainLayout: any = {
    height: 500,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    hovermode: 'x unified',
    showlegend: true,
    margin: { l: 50, r: 20, t: 20, b: 50 },
    hoverlabel: {
      bgcolor: 'rgba(15, 20, 25, 0.95)',
      bordercolor: 'rgba(91, 108, 255, 0.5)',
      font: { color: '#e2e8f0', size: 10 },
      align: 'left',
      namelength: -1,
      xanchor: 'right',  // This anchors the tooltip to the right edge, making it appear to the left of cursor
      yanchor: 'middle', // Centers vertically relative to the cursor
      x: -10,            // Move 10 pixels to the left
      y: 0               // No vertical offset
    },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "left",
      x: 0,
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: 'rgba(0,0,0,0)',
      borderwidth: 0,
      font: { size: 10, color: '#9CA3AF' }
    },
    hoverdistance: 100,
    selectdirection: 'diagonal',
    yaxis: {
      title: { 
        text: 'Price (USD)', 
        font: { size: 12, color: '#9CA3AF' }
      },
      type: priceScale === 'Log' ? 'log' : 'linear',
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      showspikes: false,
      tickfont: { size: 10, color: '#9CA3AF' },
      autorange: false,
      range: priceScale === 'Log' ? 
        [Math.log10(Math.min(...filteredAnalysisData.map(d => d.price)) * 0.8), Math.log10(Math.max(...filteredAnalysisData.map(d => d.price)) * 1.2)] :
        [Math.min(...filteredAnalysisData.map(d => d.price)) * 0.9, Math.max(...filteredAnalysisData.map(d => d.price)) * 1.1],
      linecolor: '#363650',
      zerolinecolor: '#363650'
    },
    xaxis: {
      title: { 
        text: 'Network Hashrate (PH/s)', 
        font: { size: 12, color: '#9CA3AF' }
      },
      type: hashrateScale === 'Log' ? 'log' : 'linear',
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      showspikes: false,
      tickfont: { size: 10, color: '#9CA3AF' },
      autorange: false,
      range: hashrateScale === 'Log' ? 
        [Math.log10(Math.min(...filteredAnalysisData.map(d => d.hashrate)) * 0.9), Math.log10(Math.max(...filteredAnalysisData.map(d => d.hashrate)) * 1.1)] :
        [Math.min(...filteredAnalysisData.map(d => d.hashrate)) * 0.95, Math.max(...filteredAnalysisData.map(d => d.hashrate)) * 1.05],
      linecolor: '#363650',
      zerolinecolor: '#363650'
    }
  }

  if (filteredAnalysisData.length === 0) {
    return (
      <div className={`bg-[#1A1A2E] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="text-red-400 text-lg font-medium mb-2">No Data Available</div>
            <div className="text-[#6B7280] text-sm">Unable to correlate price and hashrate data</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Price Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Price Scale:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{priceScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setPriceScale('Linear')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    priceScale === 'Linear' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${priceScale === 'Linear' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Linear Scale
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Equal spacing between price intervals
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setPriceScale('Log')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    priceScale === 'Log' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${priceScale === 'Log' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Logarithmic Scale
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Better for analyzing percentage changes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.27,4.73L19.27,9.73C19.65,10.11 19.65,10.74 19.27,11.12L14.27,16.12C13.89,16.5 13.26,16.5 12.88,16.12C12.5,15.74 12.5,15.11 12.88,14.73L16.16,11.45H8.91L12.19,14.73C12.57,15.11 12.57,15.74 12.19,16.12C11.81,16.5 11.18,16.5 10.8,16.12L5.8,11.12C5.42,10.74 5.42,10.11 5.8,9.73L10.8,4.73C11.18,4.35 11.81,4.35 12.19,4.73C12.57,5.11 12.57,5.74 12.19,6.12L8.91,9.4H16.16L12.88,6.12C12.5,5.74 12.5,5.11 12.88,4.73C13.26,4.35 13.89,4.35 14.27,4.73Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Hashrate Scale:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{hashrateScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setHashrateScale('Linear')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    hashrateScale === 'Linear' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${hashrateScale === 'Linear' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Linear Scale
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Equal spacing between hashrate intervals
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setHashrateScale('Log')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    hashrateScale === 'Log' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${hashrateScale === 'Log' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Logarithmic Scale
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Better for analyzing percentage changes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Power Law:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{showPowerLaw}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setShowPowerLaw('Hide')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showPowerLaw === 'Hide' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9H21M19,19H5V3H13V9H19V19Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showPowerLaw === 'Hide' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Hide Power Law
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Display only the correlation data
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setShowPowerLaw('Show')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showPowerLaw === 'Show' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showPowerLaw === 'Show' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Show Power Law
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Display regression trend line
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Time Period Buttons - Moved to the right side */}
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
              <svg className={`w-3 h-3 ${
                timePeriod === 'All' || timePeriod === '2Y' || timePeriod === '3Y'
                  ? 'text-white' 
                  : 'text-[#6366F1]'
              }`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
              </svg>
              <span>Max</span>
              <svg className={`w-3 h-3 transition-colors ${
                timePeriod === 'All' || timePeriod === '2Y' || timePeriod === '3Y'
                  ? 'text-white group-hover:text-gray-200' 
                  : 'text-current group-hover:text-[#5B6CFF]'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 right-0 w-32 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setTimePeriod('2Y')}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === '2Y'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === '2Y' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    2 Years
                  </span>
                </div>
                <div 
                  onClick={() => setTimePeriod('3Y')}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === '3Y'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === '3Y' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    3 Years
                  </span>
                </div>
                <div 
                  onClick={() => setTimePeriod('All')}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === 'All'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === 'All' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    All Time
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: '500px' }} className="w-full">
        <Plot
          data={mainChartData}
          layout={mainLayout}
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
            modeBarButtonsToRemove: ['hoverClosestCartesian', 'hoverCompareCartesian'],
            toImageButtonOptions: {
              format: 'png',
              filename: 'price_hashrate_chart',
              height: 650,
              width: 1200,
              scale: 1
            }
          }}
          useResizeHandler={true}
          revision={filteredAnalysisData.length}
        />
      </div>
    </div>
  )
}
