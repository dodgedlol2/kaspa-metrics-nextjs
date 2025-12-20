'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface InactiveSupplyDataPoint {
  date: Date
  timestamp: number
  percent: number
  daysFromGenesis: number
}

interface InactiveSupplyChartProps {
  data: InactiveSupplyDataPoint[]
  timeframeName: string // e.g., "2 Years"
  genesisDate: Date // The adjusted genesis date for this timeframe
  powerLawParams?: {
    intercept: number
    slope: number
    r2: number
    constant: number
  }
  height?: number
}

// Format percentage with proper decimals
function formatPercent(value: number): string {
  if (value >= 10) return `${value.toFixed(1)}%`
  else if (value >= 1) return `${value.toFixed(2)}%`
  else return `${value.toFixed(3)}%`
}

// Generate log ticks for Y-axis
function generateLogTicks(dataMin: number, dataMax: number) {
  const logMin = Math.floor(Math.log10(dataMin))
  const logMax = Math.ceil(Math.log10(dataMax))
  
  const majorTicks: number[] = []
  const intermediateTicks: number[] = []
  const minorTicks: number[] = []
  
  for (let i = logMin; i <= logMax + 1; i++) {
    const base = Math.pow(10, i)
    
    if (dataMin <= base && base <= dataMax) {
      majorTicks.push(base)
    }
    
    for (const factor of [2, 5]) {
      const intermediateVal = factor * base
      if (dataMin <= intermediateVal && intermediateVal <= dataMax) {
        intermediateTicks.push(intermediateVal)
      }
    }
    
    for (const j of [3, 4, 6, 7, 8, 9]) {
      const minorVal = j * base
      if (dataMin <= minorVal && minorVal <= dataMax) {
        minorTicks.push(minorVal)
      }
    }
  }
  
  return { majorTicks, intermediateTicks, minorTicks }
}

// Generate linear ticks with appropriate spacing
function generateLinearTicks(dataMin: number, dataMax: number, numTicks: number = 8) {
  const range = dataMax - dataMin
  const rawStep = range / (numTicks - 1)
  
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalizedStep = rawStep / magnitude
  
  let niceStep: number
  if (normalizedStep <= 1) {
    niceStep = 1
  } else if (normalizedStep <= 2) {
    niceStep = 2
  } else if (normalizedStep <= 5) {
    niceStep = 5
  } else {
    niceStep = 10
  }
  
  const step = niceStep * magnitude
  const niceMin = Math.floor(dataMin / step) * step
  const niceMax = Math.ceil(dataMax / step) * step
  
  const ticks: number[] = []
  for (let i = niceMin; i <= niceMax + step/2; i += step) {
    if (i >= 0) {
      ticks.push(i)
    }
  }
  
  return ticks
}

export default function InactiveSupplyChart({ 
  data, 
  timeframeName,
  genesisDate,
  powerLawParams,
  height = 600 
}: InactiveSupplyChartProps) {
  const [yScale, setYScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | 'All' | 'Full'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  const [showBounds, setShowBounds] = useState<'Hide' | 'Show'>('Show')

  // Filter data based on time period
  const filteredData = useMemo(() => {
    if (timePeriod === 'All' || timePeriod === 'Full' || data.length === 0) return data
    
    const now = Date.now()
    const days = {
      '1M': 30, '3M': 90, '6M': 180, 
      '1Y': 365, '2Y': 730, '3Y': 1095
    }
    
    const cutoffTime = now - days[timePeriod as keyof typeof days] * 24 * 60 * 60 * 1000
    return data.filter(point => point.timestamp >= cutoffTime)
  }, [data, timePeriod])

  // Calculate power law fit line
  const powerLawFitData = useMemo(() => {
    if (showPowerLaw === 'Hide' || !powerLawParams || filteredData.length === 0) return null
    
    const { constant, slope } = powerLawParams
    
    const daysRange = filteredData.map(d => d.daysFromGenesis)
    const minDays = Math.min(...daysRange)
    const maxDays = Math.max(...daysRange)
    
    const numPoints = 100
    const xFit: number[] = []
    const yFit: number[] = []
    const yLower: number[] = []
    const yUpper: number[] = []
    
    for (let i = 0; i < numPoints; i++) {
      const x = minDays + (maxDays - minDays) * (i / (numPoints - 1))
      const y = constant * Math.pow(x, slope)
      xFit.push(x)
      yFit.push(y)
      yLower.push(y * 0.4) // -60% bound
      yUpper.push(y * 2.2) // +120% bound
    }
    
    return { xFit, yFit, yLower, yUpper }
  }, [filteredData, powerLawParams, showPowerLaw])

  // Prepare Plotly data
  const plotlyData = useMemo(() => {
    if (filteredData.length === 0) return []

    const traces: any[] = []

    // Determine X values based on time scale
    let xValues: (number | Date)[]
    if (timeScale === 'Log') {
      xValues = filteredData.map(d => d.daysFromGenesis)
    } else {
      xValues = filteredData.map(d => d.date)
    }

    const yValues = filteredData.map(d => d.percent)

    // Calculate Y-axis range
    const yMinData = Math.min(...yValues)
    const yMaxData = Math.max(...yValues)
    
    let yMinChart: number, yMaxChart: number
    
    if (yScale === 'Log') {
      yMinChart = yMinData * 0.8
      yMaxChart = yMaxData * 1.2
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * 1.1
    }

    // For log scale: add invisible baseline
    if (yScale === 'Log') {
      traces.push({
        x: xValues,
        y: Array(xValues.length).fill(yMinChart),
        mode: 'lines',
        type: 'scatter',
        name: 'baseline',
        line: { color: 'rgba(0,0,0,0)', width: 0 },
        showlegend: false,
        hoverinfo: 'skip',
      })
    }

    // Main inactive supply trace - CHANGED COLOR TO MATCH WEBSITE
    traces.push({
      x: xValues,
      y: yValues,
      mode: 'lines',
      type: 'scatter',
      name: `Inactive Supply (${timeframeName})`,
      line: { 
        color: '#5B6CFF',  // Changed from #00FFCC to match website purple
        width: 2 
      },
      fill: yScale === 'Log' ? 'tonexty' : 'tozeroy',
      fillgradient: {
        type: "vertical",
        colorscale: [
          [0, "rgba(13, 13, 26, 0.01)"],
          [1, "rgba(91, 108, 255, 0.6)"]  // Changed to match purple theme
        ]
      },
      connectgaps: true,
      hovertemplate: timeScale === 'Linear' 
        ? '<b>%{fullData.name}</b><br>Inactive: %{y:.2f}%<extra></extra>'
        : '%{text}<br><b>%{fullData.name}</b><br>Inactive: %{y:.2f}%<extra></extra>',
      hoverinfo: 'none',
      text: filteredData.map(d => d.date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })),
    })

    // Add power law fit line
    if (powerLawFitData && showPowerLaw === 'Show') {
      let fitX: (number | Date)[]
      if (timeScale === 'Log') {
        fitX = powerLawFitData.xFit
      } else {
        fitX = powerLawFitData.xFit.map(days => 
          new Date(genesisDate.getTime() + days * 24 * 60 * 60 * 1000)
        )
      }

      traces.push({
        x: fitX,
        y: powerLawFitData.yFit,
        mode: 'lines',
        type: 'scatter',
        name: `Power Law (R² ${powerLawParams?.r2.toFixed(3)})`,
        line: { 
          color: '#FF8C00',  // Keep orange for power law
          width: 2,
          dash: 'dot'
        },
        connectgaps: true,
        showlegend: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Fit: %{y:.2f}%<extra></extra>',
      })

      // Add bounds if enabled
      if (showBounds === 'Show') {
        traces.push({
          x: fitX,
          y: powerLawFitData.yLower,
          mode: 'lines',
          type: 'scatter',
          name: 'Lower Bound (-60%)',
          line: { 
            color: '#9CA3AF', 
            width: 1,
            dash: 'dot'
          },
          showlegend: true,
          hovertemplate: '<b>%{fullData.name}</b><br>%{y:.2f}%<extra></extra>',
        })

        traces.push({
          x: fitX,
          y: powerLawFitData.yUpper,
          mode: 'lines',
          type: 'scatter',
          name: 'Upper Bound (+120%)',
          line: { 
            color: '#9CA3AF', 
            width: 1,
            dash: 'dot'
          },
          showlegend: true,
          hovertemplate: '<b>%{fullData.name}</b><br>%{y:.2f}%<extra></extra>',
        })
      }
    }

    return traces
  }, [filteredData, timeScale, yScale, powerLawFitData, showPowerLaw, showBounds, timeframeName, powerLawParams, genesisDate])

  // Plotly layout
  const plotlyLayout = useMemo(() => {
    if (filteredData.length === 0) return {}

    const yValues = filteredData.map(d => d.percent)
    const yMinData = Math.min(...yValues)
    const yMaxData = Math.max(...yValues)
    
    let yMinChart: number, yMaxChart: number
    
    if (yScale === 'Log') {
      yMinChart = yMinData * 0.8
      yMaxChart = yMaxData * 1.2
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * 1.1
    }

    // Generate custom ticks for Y-axis
    let yTickVals: number[] | undefined
    let yTickText: string[] | undefined
    let yMinorTicks: number[] = []

    if (yScale === 'Log') {
      const { majorTicks, intermediateTicks, minorTicks } = generateLogTicks(yMinChart, yMaxChart)
      yTickVals = [...majorTicks, ...intermediateTicks].sort((a, b) => a - b)
      yTickText = yTickVals.map(val => formatPercent(val))
      yMinorTicks = minorTicks
    }

    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 80, r: 20, t: 20, b: 50 },
      hoverlabel: {
        bgcolor: 'rgba(15, 20, 25, 0.95)',
        bordercolor: 'rgba(91, 108, 255, 0.5)',  // Changed to match purple theme
        font: { color: '#e2e8f0', size: 11 },
        align: 'left',
        namelength: -1,
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
        font: { size: 11 }
      },
    }

    // Configure X-axis
    if (timeScale === 'Log') {
      const daysFromGenesisValues = filteredData.map(d => d.daysFromGenesis)
      const minDays = Math.min(...daysFromGenesisValues)
      const maxDays = Math.max(...daysFromGenesisValues)
      
      const logMin = Math.log10(Math.max(1, minDays))
      const logMax = Math.log10(maxDays)
      
      layout.xaxis = {
        title: { text: `Days Since Genesis + ${timeframeName} (Log Scale)` },
        type: 'log',
        showgrid: true,
        gridwidth: 1,
        gridcolor: 'rgba(255, 255, 255, 0.1)',
        linecolor: '#3A3C4A',
        zerolinecolor: '#3A3C4A',
        color: '#9CA3AF',
        range: [logMin, logMax],
        autorange: false,
        minor: {
          ticklen: 6,
          gridcolor: 'rgba(255, 255, 255, 0.05)',
          gridwidth: 0.5
        },
        showspikes: false,
      }
    } else {
      const dates = filteredData.map(d => d.date)
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
      
      layout.xaxis = {
        title: { text: 'Date' },
        type: 'date',
        showgrid: true,
        gridwidth: 1,
        gridcolor: '#363650',
        linecolor: '#3A3C4A',
        zerolinecolor: '#3A3C4A',
        color: '#9CA3AF',
        tickformat: '%b %Y',
        hoverformat: '%B %d, %Y',
        range: [minDate.toISOString(), maxDate.toISOString()],
        autorange: false,
        showspikes: false,
      }
    }

    // Configure Y-axis
    layout.yaxis = {
      title: { text: 'Inactive Supply (%)' },
      type: yScale === 'Log' ? 'log' : 'linear',
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      range: yScale === 'Log' 
        ? [Math.log10(yMinChart), Math.log10(yMaxChart)]
        : [yMinChart, yMaxChart],
      showspikes: false,
      tickmode: yTickVals ? 'array' : undefined,
      tickvals: yTickVals,
      ticktext: yTickText,
    }

    if (yScale === 'Log' && yMinorTicks.length > 0) {
      layout.yaxis.minor = {
        showgrid: true,
        gridwidth: 0.5,
        gridcolor: 'rgba(54, 54, 80, 0.3)',
        tickmode: 'array',
        tickvals: yMinorTicks
      }
    }

    return layout
  }, [filteredData, timeScale, yScale, height, timeframeName])

  return (
    <div className="space-y-6">
      {/* Interactive Controls - MATCHING HASHRATE CHART STYLE */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Y Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.27,4.73L19.27,9.73C19.65,10.11 19.65,10.74 19.27,11.12L14.27,16.12C13.89,16.5 13.26,16.5 12.88,16.12C12.5,15.74 12.5,15.11 12.88,14.73L16.16,11.45H8.91L12.19,14.73C12.57,15.11 12.57,15.74 12.19,16.12C11.81,16.5 11.18,16.5 10.8,16.12L5.8,11.12C5.42,10.74 5.42,10.11 5.8,9.73L10.8,4.73C11.18,4.35 11.81,4.35 12.19,4.73C12.57,5.11 12.57,5.74 12.19,6.12L8.91,9.4H16.16L12.88,6.12C12.5,5.74 12.5,5.11 12.88,4.73C13.26,4.35 13.89,4.35 14.27,4.73Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Y Scale:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{yScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setYScale('Linear')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    yScale === 'Linear' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${yScale === 'Linear' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Linear Scale
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Equal spacing between percentage intervals
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setYScale('Log')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    yScale === 'Log' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${yScale === 'Log' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
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

          {/* Time Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Time Scale:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{timeScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setTimeScale('Linear')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    timeScale === 'Linear' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${timeScale === 'Linear' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Linear Time
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Standard calendar-based time axis
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setTimeScale('Log')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    timeScale === 'Log' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${timeScale === 'Log' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Logarithmic Time
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Days from genesis, log-scaled
                    </div>
                  </div>
                </div>
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
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bounds Control */}
          {showPowerLaw === 'Show' && powerLawParams && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                </svg>
                <span className="text-[#A0A0B8] text-xs">Bounds:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{showBounds}</span>
                <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
                <div className="p-1.5">
                  <div 
                    onClick={() => setShowBounds('Hide')}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      showBounds === 'Hide' 
                        ? 'bg-[#5B6CFF]/20' 
                        : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <div className="flex-1">
                      <div className={`font-medium text-xs ${showBounds === 'Hide' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                        Hide Bounds
                      </div>
                    </div>
                  </div>
                  <div 
                    onClick={() => setShowBounds('Show')}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      showBounds === 'Show' 
                        ? 'bg-[#5B6CFF]/20' 
                        : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <div className="flex-1">
                      <div className={`font-medium text-xs ${showBounds === 'Show' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                        Show Bounds
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Period Buttons */}
        <div className="flex items-center gap-2">
          {(['1M', '3M', '6M', '1Y', '2Y', '3Y'] as const).map((period) => (
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
          <button
            onClick={() => setTimePeriod('All')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              timePeriod === 'All' || timePeriod === 'Full'
                ? 'bg-[#5B6CFF] text-white'
                : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Plotly Chart */}
      <div style={{ height: `${height}px` }} className="w-full">
        <Plot
          data={plotlyData}
          layout={plotlyLayout}
          style={{ width: '100%', height: '100%' }}
          config={{
            displayModeBar: false,
            responsive: true,
            doubleClick: 'autosize',
            scrollZoom: true,
            editable: false
          }}
          useResizeHandler={true}
        />
      </div>
    </div>
  )
}
