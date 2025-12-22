'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface InactiveSupplyDataPoint {
  date: Date
  timestamp: number
  percent: number
  daysFromGenesis: number
}

interface PowerLawMomentumChartProps {
  data: InactiveSupplyDataPoint[]
  priceData?: KaspaMetric[]
  timeframeName: string // e.g., "1 Year", "2 Years"
  powerLawParams: {
    intercept: number
    slope: number
    r2: number
    constant: number
  }
  height?: number
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

// Format percentage with proper decimals
function formatPercent(value: number): string {
  if (Math.abs(value) >= 10) return `${value.toFixed(1)}%`
  else if (Math.abs(value) >= 1) return `${value.toFixed(2)}%`
  else return `${value.toFixed(3)}%`
}

export default function PowerLawMomentumChart({ 
  data, 
  priceData,
  timeframeName,
  powerLawParams,
  height = 800 
}: PowerLawMomentumChartProps) {
  const [yScale, setYScale] = useState<'Linear' | 'Log'>('Linear')
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [timePeriod, setTimePeriod] = useState<'6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  const [showPriceOverlay, setShowPriceOverlay] = useState(true)

  // Filter data based on time period
  const { filteredData, filteredPriceData } = useMemo(() => {
    if (timePeriod === 'All' || data.length === 0) {
      return { filteredData: data, filteredPriceData: priceData || [] }
    }
    
    const now = Date.now()
    const days = { '6M': 180, '1Y': 365, '2Y': 730, '3Y': 1095 }
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000

    return {
      filteredData: data.filter(point => point.timestamp >= cutoffTime),
      filteredPriceData: (priceData || []).filter(point => point.timestamp >= cutoffTime)
    }
  }, [data, priceData, timePeriod])

  // Calculate power law predictions and detrended values
  const analysisData = useMemo(() => {
    if (filteredData.length === 0 || !powerLawParams) return null

    const { constant, slope } = powerLawParams

    return filteredData.map(point => {
      // Calculate power law prediction
      const predicted = constant * Math.pow(point.daysFromGenesis, slope)
      
      // Calculate detrended value (actual - predicted)
      const detrended = point.percent - predicted
      
      // Calculate percentage deviation from power law
      const deviation = ((point.percent - predicted) / predicted) * 100
      
      return {
        ...point,
        predicted,
        detrended,
        deviation
      }
    })
  }, [filteredData, powerLawParams])

  // Calculate momentum (rate of change in detrended values)
  const momentumData = useMemo(() => {
    if (!analysisData || analysisData.length < 14) return null

    return analysisData.map((point, index) => {
      if (index < 7) return { ...point, momentum7d: 0, momentum30d: 0 }
      
      // 7-day momentum
      const momentum7d = index >= 7 ? 
        (point.detrended - analysisData[index - 7].detrended) / 7 : 0
      
      // 30-day momentum (if enough data)
      const momentum30d = index >= 30 ? 
        (point.detrended - analysisData[index - 30].detrended) / 30 : 0

      return {
        ...point,
        momentum7d,
        momentum30d
      }
    })
  }, [analysisData])

  // Prepare Plotly data for dual subplot layout
  const plotlyData = useMemo(() => {
    if (!momentumData || momentumData.length === 0) return []

    const traces: any[] = []
    const xValues = momentumData.map(d => d.date)

    // === MAIN CHART (Top Subplot) ===
    
    // Price background (if enabled)
    if (showPriceOverlay && filteredPriceData.length > 0) {
      const priceXValues = filteredPriceData.map(d => new Date(d.timestamp))
      const priceYValues = filteredPriceData.map(d => d.value)

      traces.push({
        x: priceXValues,
        y: priceYValues,
        mode: 'lines',
        type: 'scatter',
        name: 'Kaspa Price',
        line: { color: 'rgba(156, 163, 175, 0.3)', width: 1 },
        yaxis: 'y3', // Tertiary y-axis for price
        connectgaps: true,
        showlegend: true,
        hovertemplate: '<b>Price</b><br>$%{y:.4f}<br>%{x}<extra></extra>',
        xaxis: 'x',
      })
    }

    // Actual inactive supply data
    traces.push({
      x: xValues,
      y: momentumData.map(d => d.percent),
      mode: 'lines',
      type: 'scatter',
      name: `Actual ${timeframeName}`,
      line: { color: '#5B6CFF', width: 2 },
      connectgaps: true,
      hovertemplate: '<b>Actual</b><br>%{y:.2f}%<br>%{x}<extra></extra>',
      xaxis: 'x',
      yaxis: 'y',
    })

    // Power law prediction line
    if (showPowerLaw === 'Show') {
      traces.push({
        x: xValues,
        y: momentumData.map(d => d.predicted),
        mode: 'lines',
        type: 'scatter',
        name: `Power Law Trend`,
        line: { color: '#FF8C00', width: 2, dash: 'dot' },
        connectgaps: true,
        hovertemplate: '<b>Power Law</b><br>%{y:.2f}%<br>%{x}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    // === MOMENTUM OSCILLATOR (Bottom Subplot) ===

    // Detrended values (deviation from power law)
    traces.push({
      x: xValues,
      y: momentumData.map(d => d.deviation),
      mode: 'lines',
      type: 'scatter',
      name: 'Deviation from Power Law',
      line: { color: '#8B5CF6', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(139, 92, 246, 0.1)',
      connectgaps: true,
      hovertemplate: '<b>Deviation</b><br>%{y:.1f}%<br>%{x}<extra></extra>',
      xaxis: 'x2',
      yaxis: 'y2',
    })

    // 7-day momentum line
    traces.push({
      x: xValues,
      y: momentumData.map(d => d.momentum7d),
      mode: 'lines',
      type: 'scatter',
      name: '7D Momentum',
      line: { color: '#10B981', width: 1.5 },
      connectgaps: true,
      hovertemplate: '<b>7D Momentum</b><br>%{y:.3f}%/day<br>%{x}<extra></extra>',
      xaxis: 'x2',
      yaxis: 'y4',
    })

    // Zero lines for reference
    traces.push({
      x: [xValues[0], xValues[xValues.length - 1]],
      y: [0, 0],
      mode: 'lines',
      type: 'scatter',
      name: 'Zero Line',
      line: { color: 'rgba(255, 255, 255, 0.3)', width: 1, dash: 'dash' },
      showlegend: false,
      hoverinfo: 'skip',
      xaxis: 'x2',
      yaxis: 'y2',
    })

    traces.push({
      x: [xValues[0], xValues[xValues.length - 1]],
      y: [0, 0],
      mode: 'lines',
      type: 'scatter',
      name: 'Zero Line',
      line: { color: 'rgba(255, 255, 255, 0.3)', width: 1, dash: 'dash' },
      showlegend: false,
      hoverinfo: 'skip',
      xaxis: 'x2',
      yaxis: 'y4',
    })

    return traces
  }, [momentumData, filteredPriceData, showPowerLaw, showPriceOverlay, timeframeName])

  // Plotly layout with subplots
  const plotlyLayout = useMemo(() => {
    if (!momentumData || momentumData.length === 0) return {}

    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 80, r: showPriceOverlay && filteredPriceData.length > 0 ? 80 : 20, t: 20, b: 50 },
      
      // Subplot configuration
      grid: {
        rows: 2,
        columns: 1,
        pattern: 'independent',
        roworder: 'top to bottom',
        ygap: 0.15
      },

      // Main chart X-axis
      xaxis: {
        domain: [0, 1],
        anchor: 'y',
        type: 'date',
        showgrid: true,
        gridcolor: '#363650',
        showticklabels: false, // Hide labels on top chart
        color: '#9CA3AF',
      },

      // Oscillator X-axis  
      xaxis2: {
        domain: [0, 1],
        anchor: 'y2',
        type: 'date',
        showgrid: true,
        gridcolor: '#363650',
        color: '#9CA3AF',
        tickformat: '%b %Y',
      },

      // Main chart Y-axis (Inactive Supply %)
      yaxis: {
        domain: [0.4, 1],
        anchor: 'x',
        title: { text: `${timeframeName} Inactive Supply (%)` },
        type: yScale === 'Log' ? 'log' : 'linear',
        gridcolor: '#363650',
        color: '#9CA3AF',
      },

      // Oscillator Y-axis (Deviation %)
      yaxis2: {
        domain: [0, 0.35],
        anchor: 'x2',
        title: { text: 'Deviation from Power Law (%)' },
        gridcolor: '#363650',
        color: '#9CA3AF',
        zeroline: true,
        zerolinecolor: '#666',
      },

      // Price Y-axis (right side of main chart)
      yaxis3: showPriceOverlay && filteredPriceData.length > 0 ? {
        domain: [0.4, 1],
        anchor: 'x',
        overlaying: 'y',
        side: 'right',
        title: { text: 'Price (USD)', standoff: 20 },
        type: priceScale === 'Log' ? 'log' : 'linear',
        showgrid: false,
        color: '#9CA3AF',
      } : undefined,

      // Momentum Y-axis (right side of oscillator)
      yaxis4: {
        domain: [0, 0.35],
        anchor: 'x2',
        overlaying: 'y2',
        side: 'right',
        title: { text: 'Momentum (%/day)', standoff: 20 },
        showgrid: false,
        color: '#9CA3AF',
        zeroline: true,
        zerolinecolor: '#666',
      },

      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.02,
        xanchor: "left",
        x: 0,
        bgcolor: 'rgba(0,0,0,0)',
        font: { size: 11 }
      },
    }

    return layout
  }, [momentumData, yScale, priceScale, height, showPriceOverlay, filteredPriceData, timeframeName])

  return (
    <div className="space-y-6">
      {/* Interactive Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Y Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <span className="text-[#A0A0B8] text-xs">Y Scale:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{yScale}</span>
            </button>
            <div className="absolute top-full mt-1 left-0 w-32 bg-[#0F0F1A]/90 border border-[#2D2D45]/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
              <div className="p-1">
                <div onClick={() => setYScale('Linear')} className={`p-2 rounded cursor-pointer transition-all text-xs ${yScale === 'Linear' ? 'bg-[#5B6CFF]/20 text-[#5B6CFF]' : 'hover:bg-[#1A1A2E] text-white'}`}>
                  Linear Scale
                </div>
                <div onClick={() => setYScale('Log')} className={`p-2 rounded cursor-pointer transition-all text-xs ${yScale === 'Log' ? 'bg-[#5B6CFF]/20 text-[#5B6CFF]' : 'hover:bg-[#1A1A2E] text-white'}`}>
                  Log Scale
                </div>
              </div>
            </div>
          </div>

          {/* Price Scale Control */}
          {showPriceOverlay && filteredPriceData.length > 0 && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <span className="text-[#A0A0B8] text-xs">Price:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{priceScale}</span>
              </button>
              <div className="absolute top-full mt-1 left-0 w-32 bg-[#0F0F1A]/90 border border-[#2D2D45]/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <div className="p-1">
                  <div onClick={() => setPriceScale('Linear')} className={`p-2 rounded cursor-pointer transition-all text-xs ${priceScale === 'Linear' ? 'bg-[#5B6CFF]/20 text-[#5B6CFF]' : 'hover:bg-[#1A1A2E] text-white'}`}>
                    Linear
                  </div>
                  <div onClick={() => setPriceScale('Log')} className={`p-2 rounded cursor-pointer transition-all text-xs ${priceScale === 'Log' ? 'bg-[#5B6CFF]/20 text-[#5B6CFF]' : 'hover:bg-[#1A1A2E] text-white'}`}>
                    Log
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Power Law Toggle */}
          <button
            onClick={() => setShowPowerLaw(showPowerLaw === 'Show' ? 'Hide' : 'Show')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              showPowerLaw === 'Show'
                ? 'bg-[#5B6CFF] text-white'
                : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
            }`}
          >
            Power Law Trend
          </button>

          {/* Price Overlay Toggle */}
          <button
            onClick={() => setShowPriceOverlay(!showPriceOverlay)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              showPriceOverlay
                ? 'bg-[#5B6CFF] text-white'
                : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
            }`}
          >
            Price Overlay
          </button>
        </div>

        {/* Time Period Buttons */}
        <div className="flex items-center gap-2">
          {(['6M', '1Y', '2Y', '3Y'] as const).map((period) => (
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
              timePeriod === 'All'
                ? 'bg-[#5B6CFF] text-white'
                : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Power Law Statistics */}
      {momentumData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Power Law R²</div>
            <div className="text-xl font-bold text-white">{powerLawParams.r2.toFixed(3)}</div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Current Deviation</div>
            <div className={`text-xl font-bold ${momentumData[momentumData.length - 1]?.deviation > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
              {formatPercent(momentumData[momentumData.length - 1]?.deviation || 0)}
            </div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">7D Momentum</div>
            <div className={`text-xl font-bold ${(momentumData[momentumData.length - 1]?.momentum7d || 0) > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {((momentumData[momentumData.length - 1]?.momentum7d || 0) * 100).toFixed(3)}%
            </div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Data Points</div>
            <div className="text-xl font-bold text-white">{filteredData.length}</div>
          </div>
        </div>
      )}

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
