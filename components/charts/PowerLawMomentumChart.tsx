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
  data3m?: InactiveSupplyDataPoint[]  // Add short-term data
  data6m?: InactiveSupplyDataPoint[]  // Add short-term data
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
  data3m,
  data6m,
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

  // Calculate relative behavior analysis between short-term and long-term holders
  const relativeAnalysis = useMemo(() => {
    if (!analysisData || analysisData.length === 0 || !data3m || !data6m) return null

    return analysisData.map((point, index) => {
      // Find corresponding short-term data points
      const corresponding3m = data3m.find(d => 
        Math.abs(d.timestamp - point.timestamp) < 24 * 60 * 60 * 1000
      )
      const corresponding6m = data6m.find(d => 
        Math.abs(d.timestamp - point.timestamp) < 24 * 60 * 60 * 1000
      )

      if (!corresponding3m || !corresponding6m) return { ...point, relativeSignal: 'No Data' }

      // Calculate normalized positions (no power law needed for short-term)
      // Use simple percentage positions relative to recent range
      const longTermPosition = point.deviation // Already calculated from power law

      // For short-term, calculate position relative to their recent range
      const recent3mData = data3m.slice(Math.max(0, index - 30), index + 1) // Last 30 days
      const recent6mData = data6m.slice(Math.max(0, index - 30), index + 1)
      
      if (recent3mData.length === 0 || recent6mData.length === 0) {
        return { ...point, relativeSignal: 'Insufficient Data' }
      }

      const avg3m = recent3mData.reduce((sum, d) => sum + d.percent, 0) / recent3mData.length
      const avg6m = recent6mData.reduce((sum, d) => sum + d.percent, 0) / recent6mData.length
      
      const shortTerm3mPosition = ((corresponding3m.percent - avg3m) / avg3m) * 100
      const shortTerm6mPosition = ((corresponding6m.percent - avg6m) / avg6m) * 100
      const shortTermAvgPosition = (shortTerm3mPosition + shortTerm6mPosition) / 2

      // Calculate relative behavior signals
      const divergence = Math.abs(shortTermAvgPosition - longTermPosition)
      const direction = shortTermAvgPosition - longTermPosition

      // Determine relative behavior patterns
      let relativeSignal: string
      let signalStrength: number
      
      if (divergence > 15) {
        if (direction > 0) {
          // Short-term much more bullish than long-term
          relativeSignal = shortTermAvgPosition > 10 ? 'Short-term FOMO' : 'Short-term Leading'
          signalStrength = 3
        } else {
          // Short-term much more bearish than long-term  
          relativeSignal = longTermPosition > 5 ? 'Smart Money Accumulating' : 'Short-term Panic'
          signalStrength = 3
        }
      } else if (divergence > 8) {
        if (direction > 0) {
          relativeSignal = 'Short-term Optimistic'
          signalStrength = 2
        } else {
          relativeSignal = 'Long-term Confident'
          signalStrength = 2
        }
      } else if (divergence > 3) {
        relativeSignal = direction > 0 ? 'Mild Short-term Premium' : 'Mild Long-term Premium'
        signalStrength = 1
      } else {
        relativeSignal = 'Aligned Behavior'
        signalStrength = 0
      }

      return {
        ...point,
        shortTermPosition: shortTermAvgPosition,
        divergence,
        direction,
        relativeSignal,
        signalStrength
      }
    }).filter(item => item && item.relativeSignal !== 'No Data' && item.relativeSignal !== 'Insufficient Data')
  }, [analysisData, data3m, data6m])

  // Prepare Plotly data for relative behavior analysis
  const plotlyData = useMemo(() => {
    if (!relativeAnalysis || relativeAnalysis.length === 0) {
      // Fallback when no 3M/6M data available - show just the price chart
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

        // Add a message annotation
        traces.push({
          x: [priceXValues[Math.floor(priceXValues.length / 2)]],
          y: [priceYValues[Math.floor(priceYValues.length / 2)]],
          mode: 'text',
          type: 'scatter',
          text: ['Relative analysis requires 3M/6M data'],
          textposition: 'middle center',
          textfont: { color: '#9CA3AF', size: 14 },
          showlegend: false,
          hoverinfo: 'skip',
          yaxis: 'y',
        })
      }
      return traces
    }

    const traces: any[] = []
    const xValues = relativeAnalysis.map(d => d.date)

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

      // === COLORED BUBBLES FOR RELATIVE BEHAVIOR SIGNALS ===
      
      // Create bubble data based on relative behavior between timeframes
      const bubbleData = relativeAnalysis.map(point => {
        // Find corresponding price
        const pricePoint = filteredPriceData.find(p => 
          Math.abs(p.timestamp - point.timestamp) < 24 * 60 * 60 * 1000
        )
        
        if (!pricePoint || !point.relativeSignal || point.relativeSignal === 'No Data' || point.relativeSignal === 'Insufficient Data') return null

        // Color and size based on relative behavior patterns
        let color: string
        let size: number = 8
        const signal = point.relativeSignal

        switch (signal) {
          case 'Short-term FOMO':
            color = 'rgba(239, 68, 68, 0.9)' // Bright red
            size = 16
            break
          case 'Smart Money Accumulating':
            color = 'rgba(34, 197, 94, 0.9)' // Bright green  
            size = 16
            break
          case 'Short-term Leading':
            color = 'rgba(251, 146, 60, 0.8)' // Orange
            size = 13
            break
          case 'Short-term Panic':
            color = 'rgba(248, 113, 113, 0.8)' // Light red
            size = 13
            break
          case 'Short-term Optimistic':
            color = 'rgba(59, 130, 246, 0.7)' // Blue
            size = 10
            break
          case 'Long-term Confident':
            color = 'rgba(74, 222, 128, 0.7)' // Green
            size = 10
            break
          case 'Mild Short-term Premium':
            color = 'rgba(168, 85, 247, 0.6)' // Purple
            size = 8
            break
          case 'Mild Long-term Premium':
            color = 'rgba(139, 92, 246, 0.6)' // Light purple
            size = 8
            break
          default: // Aligned Behavior
            color = 'rgba(107, 114, 128, 0.4)' // Gray
            size = 6
        }

        return {
          date: point.date,
          price: pricePoint.value,
          signal,
          divergence: point.divergence,
          shortTermPosition: point.shortTermPosition,
          longTermPosition: point.deviation,
          color,
          size
        }
      }).filter(Boolean)

      // Group by signal type for legend
      const signalGroups = {
        'Smart Money Accumulating': bubbleData.filter(b => b?.signal === 'Smart Money Accumulating'),
        'Long-term Confident': bubbleData.filter(b => b?.signal === 'Long-term Confident'),
        'Aligned Behavior': bubbleData.filter(b => b?.signal === 'Aligned Behavior'),
        'Mild Long-term Premium': bubbleData.filter(b => b?.signal === 'Mild Long-term Premium'),
        'Mild Short-term Premium': bubbleData.filter(b => b?.signal === 'Mild Short-term Premium'),
        'Short-term Optimistic': bubbleData.filter(b => b?.signal === 'Short-term Optimistic'),
        'Short-term Leading': bubbleData.filter(b => b?.signal === 'Short-term Leading'),
        'Short-term Panic': bubbleData.filter(b => b?.signal === 'Short-term Panic'),
        'Short-term FOMO': bubbleData.filter(b => b?.signal === 'Short-term FOMO'),
      }

      // Add traces for each signal type
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
              `Divergence: ${p?.divergence.toFixed(1)}%<br>` +
              `Short-term: ${p?.shortTermPosition.toFixed(1)}%<br>` +
              `Long-term: ${p?.longTermPosition.toFixed(1)}%`
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
          y: relativeAnalysis.map(d => d.percent),
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
          y: relativeAnalysis.map(d => d.predicted),
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
  }, [relativeAnalysis, filteredPriceData, showPowerLaw, timeframeName])

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
          text: "🟢 Green = Smart Money/Long-term Confident<br>🔴 Red = Short-term FOMO/Panic<br>🔵 Blue/🟠 Orange = Leading Behavior<br>🟣 Purple = Aligned/Mild Divergence",
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

      {/* Relative Behavior Statistics */}
      {relativeAnalysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Power Law R²</div>
            <div className="text-xl font-bold text-white">{powerLawParams.r2.toFixed(3)}</div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Current Divergence</div>
            <div className={`text-xl font-bold ${relativeAnalysis[relativeAnalysis.length - 1]?.divergence > 10 ? 'text-[#EF4444]' : relativeAnalysis[relativeAnalysis.length - 1]?.divergence > 5 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
              {(relativeAnalysis[relativeAnalysis.length - 1]?.divergence || 0).toFixed(1)}%
            </div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Current Signal</div>
            <div className="text-xs font-bold text-white">
              {relativeAnalysis[relativeAnalysis.length - 1]?.relativeSignal || 'N/A'}
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
