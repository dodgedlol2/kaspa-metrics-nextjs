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

  // Prepare Plotly data for single chart with bubble overlays
  const plotlyData = useMemo(() => {
    if (!momentumData || momentumData.length === 0) return []

    const traces: any[] = []
    const xValues = momentumData.map(d => d.date)

    // === MAIN PRICE CHART ===
    if (filteredPriceData.length > 0) {
      const priceXValues = filteredPriceData.map(d => new Date(d.timestamp))
      const priceYValues = filteredPriceData.map(d => d.value)

      traces.push({
        x: priceXValues,
        y: priceYValues,
        mode: 'lines',
        type: 'scatter',
        name: 'Kaspa Price',
        line: { color: 'rgba(156, 163, 175, 0.8)', width: 2 },
        connectgaps: true,
        showlegend: true,
        hovertemplate: '<b>Price</b><br>$%{y:.4f}<br>%{x}<extra></extra>',
        yaxis: 'y',
      })

      // === COLORED BUBBLES FOR POWER LAW DEVIATION SIGNALS ===
      
      // Create bubble data based purely on deviation from power law
      const bubbleData = momentumData.map(point => {
        const deviation = point.deviation
        
        // Find corresponding price
        const pricePoint = filteredPriceData.find(p => 
          Math.abs(p.timestamp - point.timestamp) < 24 * 60 * 60 * 1000 // Within 1 day
        )
        
        if (!pricePoint) return null

        // Simple color logic based ONLY on deviation from power law
        let color: string
        let size: number = 8 // Base size
        let signalType: string

        if (deviation < -15) {
          // Strongly below power law trend
          color = 'rgba(34, 197, 94, 0.9)' // Bright green
          size = 14
          signalType = 'Strong Undervalued'
        } else if (deviation < -8) {
          // Moderately below power law trend
          color = 'rgba(74, 222, 128, 0.8)' // Green
          size = 11
          signalType = 'Undervalued'
        } else if (deviation < -3) {
          // Slightly below power law trend
          color = 'rgba(134, 239, 172, 0.7)' // Light green
          size = 9
          signalType = 'Slightly Undervalued'
        } else if (deviation > 15) {
          // Strongly above power law trend
          color = 'rgba(239, 68, 68, 0.9)' // Bright red
          size = 14
          signalType = 'Strong Overvalued'
        } else if (deviation > 8) {
          // Moderately above power law trend
          color = 'rgba(248, 113, 113, 0.8)' // Red
          size = 11
          signalType = 'Overvalued'
        } else if (deviation > 3) {
          // Slightly above power law trend
          color = 'rgba(252, 165, 165, 0.7)' // Light red
          size = 9
          signalType = 'Slightly Overvalued'
        } else {
          // Within normal range of power law
          color = 'rgba(139, 92, 246, 0.4)' // Purple
          size = 6
          signalType = 'Fair Value'
        }

        return {
          date: point.date,
          price: pricePoint.value,
          deviation,
          color,
          size,
          signalType
        }
      }).filter(Boolean)

      // Group bubbles by signal type for better legend
      const signalGroups = {
        'Strong Undervalued': bubbleData.filter(b => b?.signalType === 'Strong Undervalued'),
        'Undervalued': bubbleData.filter(b => b?.signalType === 'Undervalued'),
        'Slightly Undervalued': bubbleData.filter(b => b?.signalType === 'Slightly Undervalued'),
        'Fair Value': bubbleData.filter(b => b?.signalType === 'Fair Value'),
        'Slightly Overvalued': bubbleData.filter(b => b?.signalType === 'Slightly Overvalued'),
        'Overvalued': bubbleData.filter(b => b?.signalType === 'Overvalued'),
        'Strong Overvalued': bubbleData.filter(b => b?.signalType === 'Strong Overvalued'),
      }

      // Add bubble traces for each signal type
      Object.entries(signalGroups).forEach(([signalType, points]) => {
        if (points.length > 0) {
          traces.push({
            x: points.map(p => p?.date),
            y: points.map(p => p?.price),
            mode: 'markers',
            type: 'scatter',
            name: signalType,
            marker: {
              size: points.map(p => p?.size),
              color: points[0]?.color,
              line: { color: 'rgba(255, 255, 255, 0.2)', width: 1 }
            },
            hovertemplate: `<b>${signalType}</b><br>` +
                          'Price: $%{y:.4f}<br>' +
                          '%{text}<br>' +
                          '%{x}<extra></extra>',
            text: points.map(p => 
              `Deviation from Power Law: ${p?.deviation.toFixed(1)}%`
            ),
            showlegend: true,
            yaxis: 'y',
          })
        }
      })

      // === INACTIVE SUPPLY OVERLAY (Secondary Y-axis) ===
      if (showPowerLaw === 'Show') {
        // Actual inactive supply data
        traces.push({
          x: xValues,
          y: momentumData.map(d => d.percent),
          mode: 'lines',
          type: 'scatter',
          name: `${timeframeName} Inactive Supply`,
          line: { color: 'rgba(91, 108, 255, 0.6)', width: 1.5 },
          connectgaps: true,
          hovertemplate: '<b>Inactive Supply</b><br>%{y:.2f}%<br>%{x}<extra></extra>',
          yaxis: 'y2',
          opacity: 0.7,
        })

        // Power law prediction line
        traces.push({
          x: xValues,
          y: momentumData.map(d => d.predicted),
          mode: 'lines',
          type: 'scatter',
          name: `Power Law Trend`,
          line: { color: 'rgba(255, 140, 0, 0.6)', width: 1.5, dash: 'dot' },
          connectgaps: true,
          hovertemplate: '<b>Power Law</b><br>%{y:.2f}%<br>%{x}<extra></extra>',
          yaxis: 'y2',
          opacity: 0.7,
        })
      }
    }

    return traces
  }, [momentumData, filteredPriceData, showPowerLaw, timeframeName])

  // Plotly layout with single panel and dual Y-axes
  const plotlyLayout = useMemo(() => {
    if (!momentumData || momentumData.length === 0) return {}

    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 80, r: 80, t: 20, b: 50 },

      // Single X-axis
      xaxis: {
        type: 'date',
        showgrid: true,
        gridcolor: '#363650',
        gridwidth: 1,
        color: '#9CA3AF',
        tickformat: '%b %Y',
        title: { text: 'Date' },
      },

      // Primary Y-axis (Price in USD)
      yaxis: {
        title: { text: 'Price (USD)', standoff: 15 },
        type: priceScale === 'Log' ? 'log' : 'linear',
        side: 'left',
        gridcolor: '#363650',
        gridwidth: 1,
        color: '#9CA3AF',
        showgrid: true,
      },

      // Secondary Y-axis (Inactive Supply %) - only if power law is shown
      yaxis2: showPowerLaw === 'Show' ? {
        title: { text: `${timeframeName} Inactive Supply (%)`, standoff: 15 },
        type: yScale === 'Log' ? 'log' : 'linear',
        side: 'right',
        overlaying: 'y',
        showgrid: false,
        color: '#9CA3AF',
        tickfont: { size: 10 },
      } : undefined,

      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.02,
        xanchor: "left",
        x: 0,
        bgcolor: 'rgba(0,0,0,0)',
        font: { size: 10 },
        itemwidth: 30,
      },

      // Add signal zone annotations
      annotations: [
        {
          text: "🟢 Green = Below Power Law (Undervalued)<br>🔴 Red = Above Power Law (Overvalued)<br>🟣 Purple = Fair Value<br>Size = Deviation Magnitude",
          showarrow: false,
          xref: "paper",
          yref: "paper",
          x: 0.02,
          y: 0.98,
          xanchor: "left",
          yanchor: "top",
          bgcolor: "rgba(26, 26, 46, 0.8)",
          bordercolor: "#2D2D45",
          borderwidth: 1,
          font: { size: 9, color: "#9CA3AF" },
        }
      ],
    }

    return layout
  }, [momentumData, yScale, priceScale, height, showPowerLaw, timeframeName])

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
          {filteredPriceData.length > 0 && (
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

          {/* Power Law Overlay Toggle */}
          <button
            onClick={() => setShowPowerLaw(showPowerLaw === 'Show' ? 'Hide' : 'Show')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              showPowerLaw === 'Show'
                ? 'bg-[#5B6CFF] text-white'
                : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
            }`}
          >
            Inactive Supply Lines
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

      {/* Power Law Deviation Statistics */}
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
            <div className="text-sm text-[#A0A0B8] mb-1">Current Price</div>
            <div className="text-xl font-bold text-white">
              {filteredPriceData.length > 0 ? formatCurrency(filteredPriceData[filteredPriceData.length - 1]?.value || 0) : 'N/A'}
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
