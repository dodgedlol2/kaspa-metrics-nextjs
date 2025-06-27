'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface VolumeChartProps {
  data: KaspaMetric[]
  height?: number
}

// Enhanced currency formatting for volume
function formatVolume(value: number): string {
  if (value >= 1000000000) {
    return `$${(value/1000000000).toFixed(2)}B`
  } else if (value >= 1000000) {
    return `$${(value/1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `$${(value/1000).toFixed(0)}K`
  } else {
    return `$${value.toFixed(0)}`
  }
}

// Generate log ticks
function generateLogTicks(dataMin: number, dataMax: number) {
  const logMin = Math.floor(Math.log10(dataMin))
  const logMax = Math.ceil(Math.log10(dataMax))
  
  const majorTicks: number[] = []
  const intermediateTicks: number[] = []
  const minorTicks: number[] = []
  
  for (let i = logMin; i <= logMax + 1; i++) {
    const base = Math.pow(10, i)
    
    // Major tick at 1 * 10^i
    if (dataMin <= base && base <= dataMax) {
      majorTicks.push(base)
    }
    
    // Intermediate ticks at 2 and 5 * 10^i
    for (const factor of [2, 5]) {
      const intermediateVal = factor * base
      if (dataMin <= intermediateVal && intermediateVal <= dataMax) {
        intermediateTicks.push(intermediateVal)
      }
    }
    
    // Minor ticks at 3, 4, 6, 7, 8, 9 * 10^i
    for (const j of [3, 4, 6, 7, 8, 9]) {
      const minorVal = j * base
      if (dataMin <= minorVal && minorVal <= dataMax) {
        minorTicks.push(minorVal)
      }
    }
  }
  
  return { majorTicks, intermediateTicks, minorTicks }
}

export default function VolumeChart({ data, height = 600 }: VolumeChartProps) {
  const [volumeScale, setVolumeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timePeriod, setTimePeriod] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | 'All' | 'Full'>('All')

  // Function to handle double-click reset to full view
  const handleDoubleClickReset = () => {
    console.log('Double click detected, current period:', timePeriod)
    
    if (timePeriod === 'All') {
      setTimePeriod('Full')
    } else if (timePeriod === 'Full') {
      setTimePeriod('All')
    } else {
      setTimePeriod('All')
    }
  }

  // Filter data based on time period
  const filteredData = useMemo(() => {
    if (timePeriod === 'All' || timePeriod === 'Full' || data.length === 0) return data
    
    const now = Date.now()
    const days = {
      '1W': 7, '1M': 30, '3M': 90, 
      '6M': 180, '1Y': 365, '2Y': 730,
      '3Y': 1095, '5Y': 1825
    }
    
    const cutoffTime = now - days[timePeriod as keyof typeof days] * 24 * 60 * 60 * 1000
    return data.filter(point => point.timestamp >= cutoffTime)
  }, [data, timePeriod])

  // Calculate volume statistics
  const volumeStats = useMemo(() => {
    if (filteredData.length === 0) return null
    
    const volumes = filteredData.map(d => d.value)
    const maxVolume = Math.max(...volumes)
    const minVolume = Math.min(...volumes)
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
    
    const maxPoint = filteredData.find(d => d.value === maxVolume)
    const minPoint = filteredData.find(d => d.value === minVolume)
    
    return {
      max: { value: maxVolume, date: maxPoint ? new Date(maxPoint.timestamp) : new Date() },
      min: { value: minVolume, date: minPoint ? new Date(minPoint.timestamp) : new Date() },
      avg: avgVolume
    }
  }, [filteredData])

  // Prepare Plotly data
  const plotlyData = useMemo(() => {
    if (filteredData.length === 0) return []

    const traces: any[] = []

    // Determine X values based on time scale
    let xValues: (number | Date)[]
    if (timeScale === 'Log') {
      // For log time scale, use days from a reference date
      const referenceDate = new Date('2021-11-07').getTime() // Kaspa genesis
      xValues = filteredData.map(d => Math.max(1, Math.floor((d.timestamp - referenceDate) / (24 * 60 * 60 * 1000)) + 1))
    } else {
      xValues = filteredData.map(d => {
        const date = new Date(d.timestamp)
        if (isNaN(date.getTime())) {
          console.warn('Invalid timestamp:', d.timestamp)
          return new Date()
        }
        return date
      })
    }

    const yValues = filteredData.map(d => d.value)

    // Calculate Y-axis range
    const yMinData = Math.min(...yValues)
    const yMaxData = Math.max(...yValues)
    
    let yMinChart: number, yMaxChart: number
    
    if (volumeScale === 'Log') {
      yMinChart = yMinData * 0.5
      yMaxChart = yMaxData * 2
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * 1.1
    }

    // Main volume trace - using bar chart for volume visualization
    traces.push({
      x: xValues,
      y: yValues,
      type: 'bar',
      name: 'Kaspa Volume',
      marker: {
        color: '#5B6CFF',
        opacity: 0.8,
        line: {
          color: '#4338CA',
          width: 0.5
        }
      },
      hovertemplate: timeScale === 'Linear' 
        ? '<b>%{fullData.name}</b><br>Volume: %{y}<extra></extra>'
        : '%{text}<br><b>%{fullData.name}</b><br>Volume: %{y}<extra></extra>',
      hoverinfo: 'none',
      text: filteredData.map(d => new Date(d.timestamp).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })),
    })

    // Add volume statistics markers
    if (volumeStats) {
      // Max volume marker
      const maxX = timeScale === 'Log' 
        ? Math.max(1, Math.floor((volumeStats.max.date.getTime() - new Date('2021-11-07').getTime()) / (24 * 60 * 60 * 1000)) + 1)
        : volumeStats.max.date
      
      traces.push({
        x: [maxX],
        y: [volumeStats.max.value],
        mode: 'markers+text',
        type: 'scatter',
        name: 'Volume Stats',
        marker: {
          color: '#10B981',
          size: 8,
          line: { color: '#059669', width: 2 }
        },
        text: [`High ${formatVolume(volumeStats.max.value)}`],
        textposition: 'top center',
        textfont: { color: '#ffffff', size: 11 },
        showlegend: true,
        hovertemplate: `<b>Highest Volume</b><br>Volume: ${formatVolume(volumeStats.max.value)}<br>Date: ${volumeStats.max.date.toLocaleDateString()}<extra></extra>`,
      })

      // Min volume marker
      const minX = timeScale === 'Log' 
        ? Math.max(1, Math.floor((volumeStats.min.date.getTime() - new Date('2021-11-07').getTime()) / (24 * 60 * 60 * 1000)) + 1)
        : volumeStats.min.date
      
      traces.push({
        x: [minX],
        y: [volumeStats.min.value],
        mode: 'markers+text',
        type: 'scatter',
        name: 'Low',
        legendgroup: 'stats',
        marker: {
          color: '#EF4444',
          size: 8,
          line: { color: '#DC2626', width: 2 }
        },
        text: [`Low ${formatVolume(volumeStats.min.value)}`],
        textposition: 'bottom center',
        textfont: { color: '#ffffff', size: 11 },
        showlegend: false,
        hovertemplate: `<b>Lowest Volume</b><br>Volume: ${formatVolume(volumeStats.min.value)}<br>Date: ${volumeStats.min.date.toLocaleDateString()}<extra></extra>`,
      })
    }

    return traces
  }, [filteredData, timeScale, volumeScale, volumeStats])

  // Plotly layout
  const plotlyLayout = useMemo(() => {
    if (filteredData.length === 0) return {}

    const yValues = filteredData.map(d => d.value)
    const yMinData = Math.min(...yValues)
    const yMaxData = Math.max(...yValues)
    
    let yMinChart: number, yMaxChart: number
    
    if (volumeScale === 'Log') {
      yMinChart = yMinData * 0.5
      yMaxChart = yMaxData * 2
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * 1.1
    }

    // Generate custom ticks for Y-axis if log scale
    let yTickVals: number[] | undefined
    let yTickText: string[] | undefined
    let yMinorTicks: number[] = []

    if (volumeScale === 'Log') {
      const { majorTicks, intermediateTicks, minorTicks } = generateLogTicks(yMinChart, yMaxChart)
      yTickVals = [...majorTicks, ...intermediateTicks].sort((a, b) => a - b)
      yTickText = yTickVals.map(val => formatVolume(val))
      yMinorTicks = minorTicks
    }

    // Create base layout
    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 50, r: 20, t: 20, b: 50 },
      hoverlabel: {
        bgcolor: 'rgba(15, 20, 25, 0.95)',
        bordercolor: 'rgba(91, 108, 255, 0.5)',
        font: { color: '#e2e8f0', size: 11 },
        align: 'left',
        namelength: -1,
        xanchor: 'right',
        yanchor: 'middle',
        x: -10,
        y: 0
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
      hoverdistance: 100,
      selectdirection: 'diagonal'
    }

    // Configure X-axis based on time scale
    if (timeScale === 'Log') {
      // For log time scale, calculate the actual data range
      const referenceDate = new Date('2021-11-07').getTime()
      const daysValues = filteredData.map(d => Math.max(1, Math.floor((d.timestamp - referenceDate) / (24 * 60 * 60 * 1000)) + 1))
      const minDays = Math.min(...daysValues)
      const maxDays = Math.max(...daysValues)
      
      const logMin = Math.log10(Math.max(1, minDays))
      const logMax = Math.log10(maxDays)
      
      layout.xaxis = {
        title: { text: 'Days Since Genesis (Log Scale)' },
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
      // Linear time scale
      const dates = filteredData.map(d => new Date(d.timestamp))
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
      title: { text: 'Volume (USD)' },
      type: volumeScale === 'Log' ? 'log' : 'linear',
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      range: volumeScale === 'Log' 
        ? [Math.log10(yMinChart), Math.log10(yMaxChart)]
        : [yMinChart, yMaxChart],
      showspikes: false
    }

    // Add log-specific Y-axis configuration
    if (volumeScale === 'Log' && yTickVals && yTickText) {
      layout.yaxis.tickmode = 'array'
      layout.yaxis.tickvals = yTickVals
      layout.yaxis.ticktext = yTickText
      layout.yaxis.minor = {
        showgrid: true,
        gridwidth: 0.5,
        gridcolor: 'rgba(54, 54, 80, 0.3)',
        tickmode: 'array',
        tickvals: yMinorTicks
      }
    }

    return layout
  }, [filteredData, timeScale, volumeScale, height])

  return (
    <div className="space-y-6">
      {/* Interactive Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Volume Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Volume Scale:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{volumeScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setVolumeScale('Linear')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    volumeScale === 'Linear' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${volumeScale === 'Linear' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Linear Scale
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Equal spacing between volume intervals
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setVolumeScale('Log')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    volumeScale === 'Log' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${volumeScale === 'Log' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
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
        </div>

        {/* Time Period Buttons */}
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
                timePeriod === 'All' || timePeriod === 'Full' || timePeriod === '1W' || timePeriod === '2Y' || timePeriod === '3Y' || timePeriod === '5Y'
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              <svg className={`w-3 h-3 ${
                timePeriod === 'All' || timePeriod === 'Full' || timePeriod === '1W' || timePeriod === '2Y' || timePeriod === '3Y' || timePeriod === '5Y'
                  ? 'text-white' 
                  : 'text-[#6366F1]'
              }`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
              </svg>
              <span>Max</span>
              <svg className={`w-3 h-3 transition-colors ${
                timePeriod === 'All' || timePeriod === 'Full' || timePeriod === '1W' || timePeriod === '2Y' || timePeriod === '3Y' || timePeriod === '5Y'
                  ? 'text-white group-hover:text-gray-200' 
                  : 'text-current group-hover:text-[#5B6CFF]'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 right-0 w-32 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setTimePeriod('1W')}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === '1W'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === '1W' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    1 Week
                  </span>
                </div>
                <div 
                  onClick={() => setTimePeriod('2Y' as any)}
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
                  onClick={() => setTimePeriod('3Y' as any)}
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
                  onClick={() => setTimePeriod('5Y' as any)}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === '5Y'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === '5Y' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    5 Years
                  </span>
                </div>
                <div 
                  onClick={() => setTimePeriod('All')}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === 'All' || timePeriod === 'Full'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === 'All' || timePeriod === 'Full' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    All Time
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plotly Chart */}
      <div style={{ height: `${height}px` }} className="w-full">
        <Plot
          data={plotlyData}
          layout={plotlyLayout}
          style={{ width: '100%', height: '100%' }}
          onDoubleClick={handleDoubleClickReset}
          onRelayout={(eventData) => {
            console.log('Plotly relayout event:', eventData)
          }}
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
