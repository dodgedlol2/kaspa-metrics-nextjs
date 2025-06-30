'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface DataPoint {
  timestamp: number
  value: number
}

interface PowerLawResidualHashratePriceChartProps {
  priceData: DataPoint[]
  hashrateData: DataPoint[]
  className?: string
}

// Kaspa genesis date - November 7, 2021
const GENESIS_DATE = new Date('2021-11-07T00:00:00.000Z').getTime()

// Calculate days from genesis for a timestamp
function getDaysFromGenesis(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - GENESIS_DATE) / (24 * 60 * 60 * 1000)) + 1)
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

// Enhanced currency formatting
function formatCurrency(value: number): string {
  if (value >= 1) {
    if (value >= 1000) return `$${(value/1000).toFixed(1)}k`
    else if (value >= 100) return `$${value.toFixed(0)}`
    else if (value >= 10) return `$${value.toFixed(1)}`
    else return `$${value.toFixed(2)}`
  } else if (value >= 0.01) {
    return `$${value.toFixed(3)}`
  } else if (value >= 0.001) {
    return `$${value.toFixed(4)}`
  } else if (value >= 0.0001) {
    return `$${value.toFixed(5)}`
  } else {
    return `$${value.toExponential(1)}`
  }
}

// Enhanced hashrate formatting
function formatHashrate(value: number): string {
  if (value >= 1e18) {
    return `${(value/1e18).toFixed(2)} EH/s`
  } else if (value >= 1e15) {
    return `${(value/1e15).toFixed(2)} PH/s`
  } else if (value >= 1e12) {
    return `${(value/1e12).toFixed(2)} TH/s`
  } else if (value >= 1e9) {
    return `${(value/1e9).toFixed(2)} GH/s`
  } else if (value >= 1e6) {
    return `${(value/1e6).toFixed(2)} MH/s`
  } else if (value >= 1e3) {
    return `${(value/1e3).toFixed(2)} KH/s`
  } else {
    return `${value.toFixed(2)} H/s`
  }
}

export default function PowerLawResidualHashratePriceChart({ 
  priceData, 
  hashrateData, 
  className = '' 
}: CombinedPriceHashrateResidualChartProps) {
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [hashrateScale, setHashrateScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  const [showMovingAverage, setShowMovingAverage] = useState<'Hide' | 'Show'>('Show')
  const [movingAverageWindow, setMovingAverageWindow] = useState<7 | 14 | 30 | 90>(30)

  const analysisData = useMemo(() => {
    if (!priceData || !hashrateData || priceData.length === 0 || hashrateData.length === 0) {
      return []
    }

    const merged: Array<{
      date: Date,
      timestamp: number,
      hashrate: number,
      price: number,
      daysFromGenesis: number
    }> = []

    priceData.forEach(pricePoint => {
      const priceDate = new Date(pricePoint.timestamp).toDateString()
      const correspondingHashrate = hashrateData.find(hashratePoint => {
        const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
        return priceDate === hashrateDate
      })

      if (correspondingHashrate && pricePoint.value > 0 && correspondingHashrate.value > 0) {
        const date = new Date(pricePoint.timestamp)
        const hashrate = correspondingHashrate.value
        const price = pricePoint.value
        const daysFromGenesis = getDaysFromGenesis(pricePoint.timestamp)

        merged.push({
          date,
          timestamp: pricePoint.timestamp,
          hashrate,
          price,
          daysFromGenesis
        })
      }
    })

    return merged.sort((a, b) => a.timestamp - b.timestamp)
  }, [priceData, hashrateData])

  // Filter data based on time period
  const filteredAnalysisData = useMemo(() => {
    if (timePeriod === 'All' || analysisData.length === 0) return analysisData
    
    const now = Date.now()
    const days = {
      '1M': 30, '3M': 90, '6M': 180, 
      '1Y': 365, '2Y': 730, '3Y': 1095
    }
    
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    return analysisData.filter(point => point.timestamp >= cutoffTime)
  }, [analysisData, timePeriod])

  // Calculate power law and residuals
  const powerLawAndResiduals = useMemo(() => {
    if (analysisData.length < 10) return null

    try {
      // Calculate power law using hashrate vs price
      const priceHashrateData = analysisData.map(d => ({ x: d.hashrate / 1e15, y: d.price }))
      const { a, b, r2 } = fitPowerLaw(priceHashrateData)

      // Calculate residuals as percentage deviation
      const residuals = analysisData.map(d => {
        const hashrateInPH = d.hashrate / 1e15
        const expectedPrice = a * Math.pow(hashrateInPH, b)
        const actualPrice = d.price
        const residualPercent = ((actualPrice - expectedPrice) / expectedPrice) * 100
        
        return {
          ...d,
          residual: residualPercent,
          expectedPrice
        }
      })

      return { 
        powerLaw: { a, b, r2 }, 
        residuals: residuals.filter(r => filteredAnalysisData.some(f => f.timestamp === r.timestamp))
      }
    } catch (error) {
      console.error('Power law residual calculation failed:', error)
      return null
    }
  }, [analysisData, filteredAnalysisData])

  const chartData = useMemo(() => {
    if (filteredAnalysisData.length === 0) return []

    const traces: any[] = []

    // Determine X values based on time scale
    let xValues: (number | Date)[]
    if (timeScale === 'Log') {
      xValues = filteredAnalysisData.map(d => d.daysFromGenesis)
    } else {
      xValues = filteredAnalysisData.map(d => d.date)
    }

    // Price trace on primary y-axis
    traces.push({
      x: xValues,
      y: filteredAnalysisData.map(d => d.price),
      mode: 'lines',
      type: 'scatter',
      name: 'Kaspa Price',
      yaxis: 'y',
      line: { 
        color: '#5B6CFF', 
        width: 2 
      },
      fill: priceScale === 'Log' ? undefined : 'tozeroy',
      fillcolor: 'rgba(91, 108, 255, 0.1)',
      hovertemplate: timeScale === 'Linear' 
        ? '<b>Price</b><br>Price: %{y}<br><extra></extra>'
        : '%{text}<br><b>Price</b><br>Price: %{y}<extra></extra>',
      text: filteredAnalysisData.map(d => d.date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })),
    })

    // Hashrate trace on secondary y-axis
    traces.push({
      x: xValues,
      y: filteredAnalysisData.map(d => d.hashrate),
      mode: 'lines',
      type: 'scatter',
      name: 'Network Hashrate',
      yaxis: 'y2',
      line: { 
        color: '#F59E0B', 
        width: 2,
        dash: 'dot'
      },
      hovertemplate: timeScale === 'Linear' 
        ? '<b>Hashrate</b><br>Hashrate: %{y}<br><extra></extra>'
        : '%{text}<br><b>Hashrate</b><br>Hashrate: %{y}<extra></extra>',
      text: filteredAnalysisData.map(d => d.date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })),
    })

    // Power law trend line for price if enabled
    if (showPowerLaw === 'Show' && powerLawAndResiduals?.powerLaw) {
      const { a, b } = powerLawAndResiduals.powerLaw
      const powerLawPrices = filteredAnalysisData.map(d => {
        const hashrateInPH = d.hashrate / 1e15
        return a * Math.pow(hashrateInPH, b)
      })

      traces.push({
        x: xValues,
        y: powerLawPrices,
        mode: 'lines',
        type: 'scatter',
        name: `Power Law Trend (R²=${powerLawAndResiduals.powerLaw.r2.toFixed(3)})`,
        yaxis: 'y',
        line: { 
          color: '#EF4444', 
          width: 2,
          dash: 'dash'
        },
        hovertemplate: '<b>Power Law</b><br>Expected: %{y}<extra></extra>',
      })
    }

    // Residual oscillator on bottom subplot
    if (powerLawAndResiduals?.residuals) {
      const residuals = powerLawAndResiduals.residuals.map(r => r.residual)
      
      // Main residual line
      traces.push({
        x: xValues,
        y: residuals,
        mode: 'lines',
        type: 'scatter',
        name: 'Power Law Residual (%)',
        yaxis: 'y3',
        xaxis: 'x',
        line: { 
          color: '#8B5CF6', 
          width: 2
        },
        fill: 'tozeroy',
        fillcolor: residuals.map(r => r > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
        hovertemplate: '<b>Residual</b><br>Deviation: %{y:.1f}%<extra></extra>',
      })

      // Zero line for residuals
      traces.push({
        x: xValues,
        y: Array(xValues.length).fill(0),
        mode: 'lines',
        type: 'scatter',
        name: 'Fair Value Line',
        yaxis: 'y3',
        xaxis: 'x',
        line: { 
          color: '#6B7280', 
          width: 1,
          dash: 'solid'
        },
        hoverinfo: 'skip',
        showlegend: false
      })

      // Overbought/Oversold zones
      traces.push({
        x: xValues,
        y: Array(xValues.length).fill(50),
        mode: 'lines',
        type: 'scatter',
        name: 'Overvalued (+50%)',
        yaxis: 'y3',
        xaxis: 'x',
        line: { 
          color: 'rgba(34, 197, 94, 0.6)', 
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip',
        showlegend: false
      })

      traces.push({
        x: xValues,
        y: Array(xValues.length).fill(-50),
        mode: 'lines',
        type: 'scatter',
        name: 'Undervalued (-50%)',
        yaxis: 'y3',
        xaxis: 'x',
        line: { 
          color: 'rgba(239, 68, 68, 0.6)', 
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip',
        showlegend: false
      })

      // Moving average for residuals
      if (showMovingAverage === 'Show' && residuals.length > movingAverageWindow) {
        const movingAvg = calculateMovingAverage(residuals, movingAverageWindow)
        
        traces.push({
          x: xValues,
          y: movingAvg,
          mode: 'lines',
          type: 'scatter',
          name: `${movingAverageWindow}D MA Residual`,
          yaxis: 'y3',
          xaxis: 'x',
          line: { 
            color: '#EC4899', 
            width: 3
          },
          hovertemplate: `<b>${movingAverageWindow}D MA</b><br>Average: %{y:.1f}%<extra></extra>`
        })
      }
    }

    return traces
  }, [filteredAnalysisData, timeScale, priceScale, hashrateScale, showPowerLaw, powerLawAndResiduals, showMovingAverage, movingAverageWindow])

  const layout: any = {
    height: 800,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    hovermode: 'x unified',
    showlegend: true,
    margin: { l: 60, r: 80, t: 40, b: 80 },
    title: {
      text: 'Kaspa Price & Hashrate with Power Law Residual Oscillator',
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
      y: -0.15,
      xanchor: "center",
      x: 0.5,
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: 'rgba(0,0,0,0)',
      font: { size: 10, color: '#9CA3AF' }
    },
    // Price Y-axis (left)
    yaxis: {
      title: { 
        text: 'Price (USD)', 
        font: { size: 14, color: '#5B6CFF' }
      },
      type: priceScale === 'Log' ? 'log' : 'linear',
      side: 'left',
      position: 0,
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#5B6CFF',
      tickfont: { size: 11, color: '#5B6CFF' },
      linecolor: '#5B6CFF',
      zerolinecolor: '#363650',
      domain: [0.35, 1], // Top 65% of the chart
      tickformat: priceScale === 'Log' ? '' : '.4f'
    },
    // Hashrate Y-axis (right)
    yaxis2: {
      title: { 
        text: 'Network Hashrate (H/s)', 
        font: { size: 14, color: '#F59E0B' }
      },
      type: hashrateScale === 'Log' ? 'log' : 'linear',
      side: 'right',
      overlaying: 'y',
      gridcolor: 'rgba(0,0,0,0)', // Hide grid for secondary axis
      color: '#F59E0B',
      tickfont: { size: 11, color: '#F59E0B' },
      linecolor: '#F59E0B',
      domain: [0.35, 1] // Top 65% of the chart
    },
    // Residual Y-axis (bottom)
    yaxis3: {
      title: { 
        text: 'Power Law Residual (%)', 
        font: { size: 14, color: '#8B5CF6' }
      },
      type: 'linear',
      side: 'left',
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#8B5CF6',
      tickfont: { size: 11, color: '#8B5CF6' },
      linecolor: '#8B5CF6',
      zerolinecolor: '#6B7280',
      zerolinewidth: 2,
      domain: [0, 0.25], // Bottom 25% of the chart
      tickformat: '.0f',
      ticksuffix: '%'
    },
    // X-axis configuration
    xaxis: {
      title: { 
        text: timeScale === 'Log' ? 'Days Since Genesis (Log Scale)' : 'Date', 
        font: { size: 14, color: '#FFFFFF' }
      },
      type: timeScale === 'Log' ? 'log' : 'date',
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      tickfont: { size: 11, color: '#9CA3AF' },
      linecolor: '#363650',
      tickformat: timeScale === 'Log' ? '' : '%b %Y',
      domain: [0, 1] // Full width
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
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Price Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#5B6CFF]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Price:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{priceScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-48 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                {['Linear', 'Log'].map((scale) => (
                  <div 
                    key={scale}
                    onClick={() => setTimeScale(scale as 'Linear' | 'Log')}
                    className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      timeScale === scale ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      timeScale === scale ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {scale} Time
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Power Law Control */}
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
            <div className="absolute top-full mt-1 left-0 w-48 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                {['Hide', 'Show'].map((option) => (
                  <div 
                    key={option}
                    onClick={() => setShowPowerLaw(option as 'Hide' | 'Show')}
                    className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      showPowerLaw === option ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      showPowerLaw === option ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {option} Power Law
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Moving Average Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#EC4899]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">MA:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{showMovingAverage}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-48 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                {['Hide', 'Show'].map((option) => (
                  <div 
                    key={option}
                    onClick={() => setShowMovingAverage(option as 'Hide' | 'Show')}
                    className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      showMovingAverage === option ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      showMovingAverage === option ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {option} Moving Average
                    </span>
                  </div>
                ))}
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
              <div className="absolute top-full mt-1 left-0 w-32 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
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
      <div style={{ height: '800px' }} className="w-full">
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
              filename: 'combined_price_hashrate_residual_chart',
              height: 800,
              width: 1200,
              scale: 1
            }
          }}
          useResizeHandler={true}
          revision={filteredAnalysisData.length}
        />
      </div>

      {/* Chart Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1A1A2E] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Main Chart (Top)</h3>
          <div className="space-y-3 text-sm text-[#A0A0B8]">
            <div className="flex items-start">
              <span className="text-[#5B6CFF] font-semibold mr-2">📈</span>
              <span><strong className="text-[#5B6CFF]">Blue Line:</strong> Kaspa price (left axis)</span>
            </div>
            <div className="flex items-start">
              <span className="text-[#F59E0B] font-semibold mr-2">⚡</span>
              <span><strong className="text-[#F59E0B]">Orange Dotted:</strong> Network hashrate (right axis)</span>
            </div>
            <div className="flex items-start">
              <span className="text-[#EF4444] font-semibold mr-2">📐</span>
              <span><strong className="text-[#EF4444]">Red Dashed:</strong> Power law expected price</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A2E] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Residual Oscillator (Bottom)</h3>
          <div className="space-y-3 text-sm text-[#A0A0B8]">
            <div className="flex items-start">
              <span className="text-[#8B5CF6] font-semibold mr-2">📊</span>
              <span><strong className="text-[#8B5CF6]">Purple Area:</strong> % deviation from power law</span>
            </div>
            <div className="flex items-start">
              <span className="text-[#EC4899] font-semibold mr-2">📈</span>
              <span><strong className="text-[#EC4899]">Pink Line:</strong> Moving average trend</span>
            </div>
            <div className="flex items-start">
              <span className="text-[#6B7280] font-semibold mr-2">⚖️</span>
              <span><strong>Gray Line:</strong> Fair value (0% deviation)</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A2E] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Trading Signals</h3>
          <div className="space-y-3 text-sm text-[#A0A0B8]">
            <div className="flex items-start">
              <span className="text-green-400 font-semibold mr-2">🟢</span>
              <span><strong>Above +50%:</strong> Potential overvaluation</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-400 font-semibold mr-2">🔵</span>
              <span><strong>±25% Range:</strong> Fair value zone</span>
            </div>
            <div className="flex items-start">
              <span className="text-red-400 font-semibold mr-2">🔴</span>
              <span><strong>Below -50%:</strong> Potential undervaluation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
                    onClick={() => setPriceScale(scale as 'Linear' | 'Log')}
                    className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      priceScale === scale ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      priceScale === scale ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {scale} Price
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hashrate Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.27,4.73L19.27,9.73C19.65,10.11 19.65,10.74 19.27,11.12L14.27,16.12C13.89,16.5 13.26,16.5 12.88,16.12C12.5,15.74 12.5,15.11 12.88,14.73L16.16,11.45H8.91L12.19,14.73C12.57,15.11 12.57,15.74 12.19,16.12C11.81,16.5 11.18,16.5 10.8,16.12L5.8,11.12C5.42,10.74 5.42,10.11 5.8,9.73L10.8,4.73C11.18,4.35 11.81,4.35 12.19,4.73C12.57,5.11 12.57,5.74 12.19,6.12L8.91,9.4H16.16L12.88,6.12C12.5,5.74 12.5,5.11 12.88,4.73C13.26,4.35 13.89,4.35 14.27,4.73Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Hashrate:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{hashrateScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-48 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                {['Linear', 'Log'].map((scale) => (
                  <div 
                    key={scale}
                    onClick={() => setHashrateScale(scale as 'Linear' | 'Log')}
                    className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      hashrateScale === scale ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      hashrateScale === scale ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {scale} Hashrate
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Time Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Time:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{timeScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-48 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                {['Linear', 'Log'].map((scale) => (
                  <div 
                    key={scale}
