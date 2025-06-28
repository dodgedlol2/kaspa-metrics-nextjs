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

  const powerLawData = useMemo(() => {
    if (analysisData.length < 10) return null

    try {
      const priceHashrateData = analysisData.map(d => ({ x: d.hashrate, y: d.price }))
      const priceHashrateFit = fitPowerLaw(priceHashrateData)
      return { priceHashrate: priceHashrateFit }
    } catch (error) {
      console.error('Power law calculation failed:', error)
      return null
    }
  }, [analysisData])

  const recentDataPoints = useMemo(() => {
    if (analysisData.length < 30) return { recent: analysisData.slice(-7), older: analysisData.slice(0, -7) }
    
    const recent30Days = analysisData.slice(-30)
    const recent7Days = analysisData.slice(-7)
    const older = analysisData.slice(0, -30)
    
    return {
      recent: recent7Days,
      recent30: recent30Days.slice(0, -7),
      older: older
    }
  }, [analysisData])

  const mainChartData = useMemo(() => {
    if (analysisData.length === 0) return []

    const traces: any[] = []

    // Historical data (older than 30 days)
    if (recentDataPoints.older.length > 0) {
      traces.push({
        x: recentDataPoints.older.map(d => d.hashrate),
        y: recentDataPoints.older.map(d => d.price),
        mode: 'markers',
        type: 'scattergl',
        name: 'Historical Data',
        marker: {
          color: '#6B7280',
          size: 4,
          opacity: 0.4,
          line: { width: 0 }
        },
        hovertemplate: '<b>Hashrate</b>: %{x:.2f} PH/s<br><b>Price</b>: $%{y:.4f}<br><b>Date</b>: %{text}<extra></extra>',
        text: recentDataPoints.older.map(d => d.date.toISOString().split('T')[0]),
        hoverdistance: 15
      })
    }

    // Last 30 days (excluding last 7)
    if (recentDataPoints.recent30 && recentDataPoints.recent30.length > 0) {
      traces.push({
        x: recentDataPoints.recent30.map(d => d.hashrate),
        y: recentDataPoints.recent30.map(d => d.price),
        mode: 'markers',
        type: 'scattergl',
        name: 'Last 30 Days',
        marker: {
          color: '#5B6CFF',
          size: 6,
          opacity: 0.7,
          line: { width: 1, color: '#4C5EE8' }
        },
        hovertemplate: '<b>Hashrate</b>: %{x:.2f} PH/s<br><b>Price</b>: $%{y:.4f}<br><b>Date</b>: %{text}<extra></extra>',
        text: recentDataPoints.recent30.map(d => d.date.toISOString().split('T')[0]),
        hoverdistance: 15
      })
    }

    // Last 7 days - Combined into single trace to prevent flickering
    if (recentDataPoints.recent.length > 0) {
      const recentSizes = recentDataPoints.recent.map((_, index) => 8 + index * 2)
      const recentColors = recentDataPoints.recent.map((_, index) => {
        const intensity = (index + 1) / recentDataPoints.recent.length
        return `rgba(91, 108, 255, ${0.6 + intensity * 0.4})`
      })
      
      // Use star symbol for the latest point only
      const symbols = recentDataPoints.recent.map((_, index) => 
        index === recentDataPoints.recent.length - 1 ? 'star' : 'circle'
      )

      traces.push({
        x: recentDataPoints.recent.map(d => d.hashrate),
        y: recentDataPoints.recent.map(d => d.price),
        mode: 'markers',
        type: 'scattergl',
        name: 'Last 7 Days',
        marker: {
          color: recentColors,
          size: recentSizes,
          opacity: 1,
          line: { width: 2, color: '#FFFFFF' },
          symbol: symbols
        },
        hovertemplate: '<b>Hashrate</b>: %{x:.2f} PH/s<br><b>Price</b>: $%{y:.4f}<br><b>Date</b>: %{text}<extra></extra>',
        text: recentDataPoints.recent.map(d => d.date.toISOString().split('T')[0]),
        hoverdistance: 15
      })
    }

    // Power law trend line and support/resistance levels
    if (showPowerLaw === 'Show' && powerLawData?.priceHashrate) {
      const { a, b, r2 } = powerLawData.priceHashrate
      const minHashrate = Math.min(...analysisData.map(d => d.hashrate))
      const maxHashrate = Math.max(...analysisData.map(d => d.hashrate))
      const xFit = []
      const yFit = []
      
      for (let i = 0; i <= 100; i++) {
        const x = minHashrate + (maxHashrate - minHashrate) * (i / 100)
        const y = a * Math.pow(x, b)
        xFit.push(x)
        yFit.push(y)
      }

      // Support level (bottom of channel)
      traces.push({
        x: xFit,
        y: yFit.map(y => y * 0.5),
        mode: 'lines',
        type: 'scatter',
        name: 'Support Level',
        line: { color: 'rgba(245, 158, 11, 0.4)', width: 1, dash: 'dot' },
        hoverinfo: 'skip',
        showlegend: false,
        hoverdistance: -1
      })

      // Main power law trend
      traces.push({
        x: xFit,
        y: yFit,
        mode: 'lines',
        type: 'scatter',
        name: `Power Law Trend (R²=${r2.toFixed(3)})`,
        line: { color: '#F59E0B', width: 3, dash: 'solid' },
        hoverdistance: 15
      })

      // Resistance level (top of channel)
      traces.push({
        x: xFit,
        y: yFit.map(y => y * 2.0),
        mode: 'lines',
        type: 'scatter',
        name: 'Resistance Level',
        line: { color: 'rgba(245, 158, 11, 0.4)', width: 1, dash: 'dot' },
        hoverinfo: 'skip',
        fill: 'tonexty',
        fillcolor: 'rgba(245, 158, 11, 0.08)',
        showlegend: false,
        hoverdistance: -1
      })
    }

    return traces
  }, [analysisData, recentDataPoints, showPowerLaw, powerLawData])

  const mainLayout: any = {
    height: 650,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    hovermode: 'closest',
    showlegend: true,
    margin: { l: 60, r: 30, t: 30, b: 60 },
    hoverlabel: {
      bgcolor: 'rgba(15, 15, 26, 0.95)',
      bordercolor: 'rgba(91, 108, 255, 0.3)',
      font: { color: '#e2e8f0', size: 12 },
      align: 'left',
      namelength: -1
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
      font: { size: 12 }
    },
    hoverdistance: 20,
    spikedistance: -1,
    yaxis: {
      title: { 
        text: 'Price (USD)', 
        font: { size: 14, color: '#E5E7EB' }
      },
      type: priceScale === 'Log' ? 'log' : 'linear',
      gridcolor: 'rgba(107, 114, 128, 0.15)',
      gridwidth: 1,
      color: '#9CA3AF',
      showspikes: false,
      zeroline: false,
      tickfont: { size: 11 }
    },
    xaxis: {
      title: { 
        text: 'Network Hashrate (PH/s)', 
        font: { size: 14, color: '#E5E7EB' }
      },
      type: hashrateScale === 'Log' ? 'log' : 'linear',
      gridcolor: 'rgba(107, 114, 128, 0.15)',
      gridwidth: 1,
      color: '#9CA3AF',
      showspikes: false,
      zeroline: false,
      tickfont: { size: 11 }
    }
  }

  if (analysisData.length === 0) {
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
      </div>

      <div style={{ height: '650px' }} className="w-full">
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
            toImageButtonOptions: {
              format: 'png',
              filename: 'price_hashrate_chart',
              height: 650,
              width: 1200,
              scale: 1
            }
          }}
          useResizeHandler={true}
          onHover={() => setIsHovering(true)}
          onUnhover={() => setIsHovering(false)}
        />
      </div>
    </div>
  )
}
