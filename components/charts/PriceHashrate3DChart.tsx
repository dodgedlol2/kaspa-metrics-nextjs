'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface DataPoint {
  timestamp: number
  value: number
}

interface PriceHashrate3DChartProps {
  priceData: DataPoint[]
  hashrateData: DataPoint[]
  className?: string
}

export default function PriceHashrate3DChart({ priceData, hashrateData, className = '' }: PriceHashrate3DChartProps) {
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [showTrajectory, setShowTrajectory] = useState<'Hide' | 'Show'>('Show')
  const [colorBy, setColorBy] = useState<'Time' | 'Price' | 'Hashrate'>('Time')
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [hashrateScale, setHashrateScale] = useState<'Linear' | 'Log'>('Log')

  const analysisData = useMemo(() => {
    if (!priceData || !hashrateData || priceData.length === 0 || hashrateData.length === 0) {
      return []
    }

    const merged: Array<{
      date: Date,
      timestamp: number,
      hashrate: number,
      price: number,
      timeIndex: number
    }> = []

    priceData.forEach(pricePoint => {
      const priceDate = new Date(pricePoint.timestamp).toDateString()
      const correspondingHashrate = hashrateData.find(hashratePoint => {
        const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
        return priceDate === hashrateDate
      })

      if (correspondingHashrate && pricePoint.value > 0 && correspondingHashrate.value > 0) {
        const date = new Date(pricePoint.timestamp)
        const hashrate = correspondingHashrate.value / 1e15 // Convert to PH/s
        const price = pricePoint.value

        merged.push({
          date,
          timestamp: pricePoint.timestamp,
          hashrate,
          price,
          timeIndex: 0 // Will be set below
        })
      }
    })

    // Sort by date and assign time indices
    const sorted = merged.sort((a, b) => a.date.getTime() - b.date.getTime())
    sorted.forEach((point, index) => {
      point.timeIndex = index
    })

    return sorted
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
    return analysisData.filter(point => point.date.getTime() >= cutoffTime)
  }, [analysisData, timePeriod])

  const chartData = useMemo(() => {
    if (filteredAnalysisData.length === 0) return []

    const traces: any[] = []

    // Prepare color and size arrays
    let colors: number[] = []
    let colorscale: string = 'Viridis'
    let colorbarTitle: string = ''

    switch (colorBy) {
      case 'Time':
        colors = filteredAnalysisData.map((_, index) => index)
        colorscale = 'Viridis'
        colorbarTitle = 'Time Progression'
        break
      case 'Price':
        colors = filteredAnalysisData.map(d => d.price)
        colorscale = 'Plasma'
        colorbarTitle = 'Price (USD)'
        break
      case 'Hashrate':
        colors = filteredAnalysisData.map(d => d.hashrate)
        colorscale = 'Turbo'
        colorbarTitle = 'Hashrate (PH/s)'
        break
    }

    // 3D Scatter plot with time as Z-axis
    traces.push({
      x: filteredAnalysisData.map(d => d.hashrate),
      y: filteredAnalysisData.map(d => d.price),
      z: filteredAnalysisData.map(d => d.timeIndex),
      mode: 'markers',
      type: 'scatter3d',
      name: 'Price vs Hashrate Evolution',
      marker: {
        size: 4,
        color: colors,
        colorscale: colorscale,
        opacity: 0.8,
        colorbar: {
          title: {
            text: colorbarTitle,
            font: { color: '#9CA3AF', size: 12 }
          },
          tickfont: { color: '#9CA3AF', size: 10 },
          thickness: 15,
          len: 0.7,
          x: 1.02
        },
        line: {
          width: 0.5,
          color: 'rgba(60, 60, 60, 0.8)'
        }
      },
      hovertemplate: 
        'Hashrate: %{x:.1f} PH/s<br>' +
        'Price: $%{y:.2f}<br>' +
        'Date: %{text}<br>' +
        '<extra></extra>',
      text: filteredAnalysisData.map(d => d.date.toISOString().split('T')[0])
    })

    // Add trajectory line if enabled
    if (showTrajectory === 'Show') {
      traces.push({
        x: filteredAnalysisData.map(d => d.hashrate),
        y: filteredAnalysisData.map(d => d.price),
        z: filteredAnalysisData.map(d => d.timeIndex),
        mode: 'lines',
        type: 'scatter3d',
        name: 'Evolution Trajectory',
        line: {
          color: '#F59E0B',
          width: 3
        },
        hoverinfo: 'skip',
        showlegend: true
      })
    }

    return traces
  }, [filteredAnalysisData, showTrajectory, colorBy])

  const layout: any = {
    height: 600,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    showlegend: true,
    margin: { l: 0, r: 0, t: 40, b: 0 },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "left",
      x: 0,
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: 'rgba(0,0,0,0)',
      font: { size: 11, color: '#9CA3AF' }
    },
    scene: {
      xaxis: {
        title: {
          text: 'Network Hashrate (PH/s)',
          font: { color: '#9CA3AF', size: 12 }
        },
        type: hashrateScale === 'Log' ? 'log' : 'linear',
        color: '#9CA3AF',
        gridcolor: '#363650',
        backgroundcolor: 'rgba(0,0,0,0)',
        showbackground: true
      },
      yaxis: {
        title: {
          text: 'Price (USD)',
          font: { color: '#9CA3AF', size: 12 }
        },
        type: priceScale === 'Log' ? 'log' : 'linear',
        color: '#9CA3AF',
        gridcolor: '#363650',
        backgroundcolor: 'rgba(0,0,0,0)',
        showbackground: true
      },
      zaxis: {
        title: {
          text: 'Time Progression',
          font: { color: '#9CA3AF', size: 12 }
        },
        color: '#9CA3AF',
        gridcolor: '#363650',
        backgroundcolor: 'rgba(0,0,0,0)',
        showbackground: true,
        ticktext: filteredAnalysisData.length > 0 ? [
          filteredAnalysisData[0]?.date.toISOString().split('T')[0] || '',
          filteredAnalysisData[Math.floor(filteredAnalysisData.length * 0.25)]?.date.toISOString().split('T')[0] || '',
          filteredAnalysisData[Math.floor(filteredAnalysisData.length * 0.5)]?.date.toISOString().split('T')[0] || '',
          filteredAnalysisData[Math.floor(filteredAnalysisData.length * 0.75)]?.date.toISOString().split('T')[0] || '',
          filteredAnalysisData[filteredAnalysisData.length - 1]?.date.toISOString().split('T')[0] || ''
        ] : [],
        tickvals: filteredAnalysisData.length > 0 ? [
          0,
          Math.floor(filteredAnalysisData.length * 0.25),
          Math.floor(filteredAnalysisData.length * 0.5),
          Math.floor(filteredAnalysisData.length * 0.75),
          filteredAnalysisData.length - 1
        ] : []
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.2 }
      },
      bgcolor: 'rgba(15, 15, 26, 0.9)'
    }
  }

  if (filteredAnalysisData.length === 0) {
    return (
      <div className={`bg-[#1A1A2E] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-400 text-lg font-medium mb-2">No Data Available</div>
            <div className="text-[#6B7280] text-sm">Unable to correlate price and hashrate data for 3D visualization</div>
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

          {/* Hashrate Scale Control */}
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

          {/* Color By Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,19H5V3H13V9H19V19Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Color By:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{colorBy}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-56 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                {(['Time', 'Price', 'Hashrate'] as const).map((option) => (
                  <div 
                    key={option}
                    onClick={() => setColorBy(option)}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      colorBy === option 
                        ? 'bg-[#5B6CFF]/20' 
                        : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,19H5V3H13V9H19V19Z"/>
                    </svg>
                    <div className="flex-1">
                      <div className={`font-medium text-xs ${colorBy === option ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                        Color by {option}
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                        {option === 'Time' && 'Color progression shows chronological evolution'}
                        {option === 'Price' && 'Color intensity reflects price levels'}
                        {option === 'Hashrate' && 'Color intensity reflects network security'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trajectory Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Trajectory:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{showTrajectory}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setShowTrajectory('Hide')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showTrajectory === 'Hide' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showTrajectory === 'Hide' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Hide Trajectory
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Show only data points without connecting line
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setShowTrajectory('Show')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showTrajectory === 'Show' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showTrajectory === 'Show' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Show Trajectory
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Connect points to show evolution path
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
                {(['2Y', '3Y', 'All'] as const).map((period) => (
                  <div 
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      timePeriod === period
                        ? 'bg-[#5B6CFF]/20' 
                        : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                    </svg>
                    <span className={`text-xs font-medium ${
                      timePeriod === period ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {period === 'All' ? 'All Time' : period}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: '600px' }} className="w-full">
        <Plot
          data={chartData}
          layout={layout}
          style={{ width: '100%', height: '100%' }}
          config={{
            displayModeBar: true,
            responsive: true,
            doubleClick: 'autosize',
            scrollZoom: true,
            editable: false,
            staticPlot: false,
            showTips: false,
            autosizable: true,
            frameMargins: 0,
            modeBarButtonsToAdd: ['pan3d', 'orbitRotation', 'tableRotation', 'resetCameraDefault3d'],
            toImageButtonOptions: {
              format: 'png',
              filename: 'price_hashrate_3d_chart',
              height: 800,
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
