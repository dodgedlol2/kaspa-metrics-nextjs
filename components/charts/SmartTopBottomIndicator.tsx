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

interface SmartTopBottomIndicatorProps {
  data3m: InactiveSupplyDataPoint[]
  data6m: InactiveSupplyDataPoint[]
  data1y: InactiveSupplyDataPoint[]
  data2y: InactiveSupplyDataPoint[]
  data3y: InactiveSupplyDataPoint[]
  priceData: KaspaMetric[]
  powerLawParams1y?: { intercept: number; slope: number; r2: number; constant: number }
  powerLawParams2y?: { intercept: number; slope: number; r2: number; constant: number }
  powerLawParams3y?: { intercept: number; slope: number; r2: number; constant: number }
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

export default function SmartTopBottomIndicator({ 
  data3m,
  data6m,
  data1y,
  data2y,
  data3y,
  priceData,
  powerLawParams1y,
  powerLawParams2y,
  powerLawParams3y,
  height = 800 
}: SmartTopBottomIndicatorProps) {
  const [timePeriod, setTimePeriod] = useState<'6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')

  // Filter data based on time period
  const { filteredPriceData, filteredData } = useMemo(() => {
    if (timePeriod === 'All') {
      return { 
        filteredPriceData: priceData,
        filteredData: {
          data3m, data6m, data1y, data2y, data3y
        }
      }
    }
    
    const now = Date.now()
    const days = { '6M': 180, '1Y': 365, '2Y': 730, '3Y': 1095 }
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000

    return {
      filteredPriceData: priceData.filter(point => point.timestamp >= cutoffTime),
      filteredData: {
        data3m: data3m.filter(point => point.timestamp >= cutoffTime),
        data6m: data6m.filter(point => point.timestamp >= cutoffTime),
        data1y: data1y.filter(point => point.timestamp >= cutoffTime),
        data2y: data2y.filter(point => point.timestamp >= cutoffTime),
        data3y: data3y.filter(point => point.timestamp >= cutoffTime)
      }
    }
  }, [data3m, data6m, data1y, data2y, data3y, priceData, timePeriod])

  // Calculate the smart top/bottom indicator
  const smartIndicator = useMemo(() => {
    if (!filteredData || filteredPriceData.length === 0) return null

    return filteredPriceData.map(pricePoint => {
      // Find corresponding inactive supply data for each timeframe
      const find3m = filteredData.data3m.find(d => Math.abs(d.timestamp - pricePoint.timestamp) < 24 * 60 * 60 * 1000)
      const find6m = filteredData.data6m.find(d => Math.abs(d.timestamp - pricePoint.timestamp) < 24 * 60 * 60 * 1000)
      const find1y = filteredData.data1y.find(d => Math.abs(d.timestamp - pricePoint.timestamp) < 24 * 60 * 60 * 1000)
      const find2y = filteredData.data2y.find(d => Math.abs(d.timestamp - pricePoint.timestamp) < 24 * 60 * 60 * 1000)
      const find3y = filteredData.data3y.find(d => Math.abs(d.timestamp - pricePoint.timestamp) < 24 * 60 * 60 * 1000)

      if (!find1y || !find2y || !find3y || !powerLawParams1y || !powerLawParams2y || !powerLawParams3y) return null

      // Calculate power law deviations for long-term holders (they have reliable power laws)
      const deviation1y = find1y ? ((find1y.percent - (powerLawParams1y.constant * Math.pow(find1y.daysFromGenesis, powerLawParams1y.slope))) / (powerLawParams1y.constant * Math.pow(find1y.daysFromGenesis, powerLawParams1y.slope))) * 100 : 0
      const deviation2y = find2y ? ((find2y.percent - (powerLawParams2y.constant * Math.pow(find2y.daysFromGenesis, powerLawParams2y.slope))) / (powerLawParams2y.constant * Math.pow(find2y.daysFromGenesis, powerLawParams2y.slope))) * 100 : 0
      const deviation3y = find3y ? ((find3y.percent - (powerLawParams3y.constant * Math.pow(find3y.daysFromGenesis, powerLawParams3y.slope))) / (powerLawParams3y.constant * Math.pow(find3y.daysFromGenesis, powerLawParams3y.slope))) * 100 : 0

      // Calculate short-term vs long-term ratios (momentum indicators)
      const shortTerm = ((find3m?.percent || 0) + (find6m?.percent || 0)) / 2
      const longTerm = ((find2y?.percent || 0) + (find3y?.percent || 0)) / 2
      const shortLongRatio = longTerm > 0 ? (shortTerm / longTerm) : 1

      // Create composite scores
      // Conviction Score: How much do long-term holders deviate from their power laws?
      const convictionScore = (deviation1y + deviation2y * 1.5 + deviation3y * 2) / 4.5 // Weight longer timeframes more

      // Momentum Score: Are short-term holders out of sync with long-term?
      const normalRatio = 3.5 // Normal ratio between short-term and long-term
      const momentumScore = ((shortLongRatio - normalRatio) / normalRatio) * 100

      // Combined Smart Score
      // Negative = Potential Bottom (accumulation)
      // Positive = Potential Top (distribution)
      const smartScore = (convictionScore * 0.6) + (momentumScore * 0.4)

      // Determine signal strength and type
      let signal: string
      let signalStrength: number
      let bubbleSize: number

      if (smartScore < -20) {
        signal = 'Strong Buy Zone'
        signalStrength = 3
        bubbleSize = 20
      } else if (smartScore < -10) {
        signal = 'Buy Zone'
        signalStrength = 2
        bubbleSize = 15
      } else if (smartScore < -5) {
        signal = 'Weak Buy'
        signalStrength = 1
        bubbleSize = 10
      } else if (smartScore > 20) {
        signal = 'Strong Sell Zone'
        signalStrength = -3
        bubbleSize = 20
      } else if (smartScore > 10) {
        signal = 'Sell Zone'
        signalStrength = -2
        bubbleSize = 15
      } else if (smartScore > 5) {
        signal = 'Weak Sell'
        signalStrength = -1
        bubbleSize = 10
      } else {
        signal = 'Neutral'
        signalStrength = 0
        bubbleSize = 6
      }

      return {
        date: new Date(pricePoint.timestamp),
        price: pricePoint.value,
        smartScore,
        convictionScore,
        momentumScore,
        shortLongRatio,
        signal,
        signalStrength,
        bubbleSize,
        deviations: { deviation1y, deviation2y, deviation3y },
        percentages: {
          p3m: find3m?.percent || 0,
          p6m: find6m?.percent || 0,
          p1y: find1y?.percent || 0,
          p2y: find2y?.percent || 0,
          p3y: find3y?.percent || 0
        }
      }
    }).filter(Boolean)
  }, [filteredData, filteredPriceData, powerLawParams1y, powerLawParams2y, powerLawParams3y])

  // Prepare Plotly data
  const plotlyData = useMemo(() => {
    if (!smartIndicator || smartIndicator.length === 0) return []

    const traces: any[] = []

    // === MAIN PRICE CHART ===
    const priceXValues = smartIndicator.map(d => d?.date)
    const priceYValues = smartIndicator.map(d => d?.price)

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

    // === SMART INDICATOR BUBBLES ===
    const signalGroups = {
      'Strong Buy Zone': smartIndicator.filter(d => d?.signal === 'Strong Buy Zone'),
      'Buy Zone': smartIndicator.filter(d => d?.signal === 'Buy Zone'),
      'Weak Buy': smartIndicator.filter(d => d?.signal === 'Weak Buy'),
      'Neutral': smartIndicator.filter(d => d?.signal === 'Neutral'),
      'Weak Sell': smartIndicator.filter(d => d?.signal === 'Weak Sell'),
      'Sell Zone': smartIndicator.filter(d => d?.signal === 'Sell Zone'),
      'Strong Sell Zone': smartIndicator.filter(d => d?.signal === 'Strong Sell Zone'),
    }

    const colors = {
      'Strong Buy Zone': 'rgba(34, 197, 94, 0.9)', // Bright green
      'Buy Zone': 'rgba(74, 222, 128, 0.8)', // Green
      'Weak Buy': 'rgba(134, 239, 172, 0.7)', // Light green
      'Neutral': 'rgba(107, 114, 128, 0.4)', // Gray
      'Weak Sell': 'rgba(252, 165, 165, 0.7)', // Light red
      'Sell Zone': 'rgba(248, 113, 113, 0.8)', // Red
      'Strong Sell Zone': 'rgba(239, 68, 68, 0.9)', // Bright red
    }

    Object.entries(signalGroups).forEach(([signalType, points]) => {
      if (points.length > 0) {
        traces.push({
          x: points.map(p => p?.date),
          y: points.map(p => p?.price),
          mode: 'markers',
          type: 'scatter',
          name: signalType,
          marker: {
            size: points.map(p => p?.bubbleSize),
            color: colors[signalType as keyof typeof colors],
            line: { color: 'rgba(255, 255, 255, 0.3)', width: 1 }
          },
          hovertemplate: `<b>${signalType}</b><br>` +
                        'Price: $%{y:.4f}<br>' +
                        '%{text}<br>' +
                        '%{x}<extra></extra>',
          text: points.map(p => 
            `Smart Score: ${p?.smartScore.toFixed(1)}<br>` +
            `Conviction: ${p?.convictionScore.toFixed(1)}<br>` +
            `Momentum: ${p?.momentumScore.toFixed(1)}<br>` +
            `Short/Long Ratio: ${p?.shortLongRatio.toFixed(2)}`
          ),
          showlegend: true,
          yaxis: 'y',
        })
      }
    })

    // === SMART SCORE OSCILLATOR (Secondary Y-axis) ===
    traces.push({
      x: smartIndicator.map(d => d?.date),
      y: smartIndicator.map(d => d?.smartScore),
      mode: 'lines',
      type: 'scatter',
      name: 'Smart Score',
      line: { color: 'rgba(139, 92, 246, 0.8)', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(139, 92, 246, 0.1)',
      connectgaps: true,
      hovertemplate: '<b>Smart Score</b><br>%{y:.1f}<br>%{x}<extra></extra>',
      yaxis: 'y2',
    })

    // Zero line for smart score
    const xRange = [smartIndicator[0]?.date, smartIndicator[smartIndicator.length - 1]?.date]
    traces.push({
      x: xRange,
      y: [0, 0],
      mode: 'lines',
      type: 'scatter',
      name: 'Zero Line',
      line: { color: 'rgba(255, 255, 255, 0.3)', width: 1, dash: 'dash' },
      showlegend: false,
      hoverinfo: 'skip',
      yaxis: 'y2',
    })

    // Signal zone lines
    traces.push({
      x: xRange,
      y: [-20, -20],
      mode: 'lines',
      type: 'scatter',
      name: 'Strong Buy Threshold',
      line: { color: 'rgba(34, 197, 94, 0.5)', width: 1, dash: 'dot' },
      showlegend: false,
      hoverinfo: 'skip',
      yaxis: 'y2',
    })

    traces.push({
      x: xRange,
      y: [20, 20],
      mode: 'lines',
      type: 'scatter',
      name: 'Strong Sell Threshold',
      line: { color: 'rgba(239, 68, 68, 0.5)', width: 1, dash: 'dot' },
      showlegend: false,
      hoverinfo: 'skip',
      yaxis: 'y2',
    })

    return traces
  }, [smartIndicator])

  // Plotly layout
  const plotlyLayout = useMemo(() => {
    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 80, r: 80, t: 20, b: 50 },

      // Subplot configuration
      grid: {
        rows: 2,
        columns: 1,
        pattern: 'independent',
        roworder: 'top to bottom',
        ygap: 0.12
      },

      // Price chart X-axis
      xaxis: {
        domain: [0, 1],
        anchor: 'y',
        type: 'date',
        showgrid: true,
        gridcolor: '#363650',
        showticklabels: false,
        color: '#9CA3AF',
      },

      // Smart Score X-axis
      xaxis2: {
        domain: [0, 1],
        anchor: 'y2',
        type: 'date',
        showgrid: true,
        gridcolor: '#363650',
        color: '#9CA3AF',
        tickformat: '%b %Y',
      },

      // Price Y-axis
      yaxis: {
        domain: [0.4, 1],
        anchor: 'x',
        title: { text: 'Price (USD)' },
        type: priceScale === 'Log' ? 'log' : 'linear',
        gridcolor: '#363650',
        color: '#9CA3AF',
      },

      // Smart Score Y-axis
      yaxis2: {
        domain: [0, 0.35],
        anchor: 'x2',
        title: { text: 'Smart Score' },
        gridcolor: '#363650',
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
        font: { size: 10 }
      },

      annotations: [
        {
          text: "🟢 Green = Buy Zones (Multi-timeframe accumulation)<br>🔴 Red = Sell Zones (Multi-timeframe distribution)<br>🟣 Purple = Smart Score oscillator<br>Size = Signal strength",
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
  }, [height, priceScale])

  return (
    <div className="space-y-6">
      {/* Interactive Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Price Scale Control */}
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

      {/* Smart Indicator Statistics */}
      {smartIndicator && smartIndicator.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Current Signal</div>
            <div className={`text-lg font-bold ${(smartIndicator[smartIndicator.length - 1]?.signalStrength || 0) > 0 ? 'text-[#10B981]' : (smartIndicator[smartIndicator.length - 1]?.signalStrength || 0) < 0 ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>
              {smartIndicator[smartIndicator.length - 1]?.signal || 'N/A'}
            </div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Smart Score</div>
            <div className={`text-xl font-bold ${(smartIndicator[smartIndicator.length - 1]?.smartScore || 0) > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
              {smartIndicator[smartIndicator.length - 1]?.smartScore?.toFixed(1) || 'N/A'}
            </div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Current Price</div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(smartIndicator[smartIndicator.length - 1]?.price || 0)}
            </div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#2D2D45] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Data Points</div>
            <div className="text-xl font-bold text-white">{smartIndicator.length}</div>
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
