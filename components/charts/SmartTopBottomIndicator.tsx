'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

// Dynamically import Plotly to avoid SSR issuesss
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

  // Calculate the smart top/bottom indicator based on observed behavioral patterns
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

      // === 1. MAIN SIGNAL: 1Y Power Law Deviation (Smart Money) ===
      // When above power law = accumulating during relative price weakness
      // When below power law = distributing during relative price strength
      const deviation1y = find1y ? ((find1y.percent - (powerLawParams1y.constant * Math.pow(find1y.daysFromGenesis, powerLawParams1y.slope))) / (powerLawParams1y.constant * Math.pow(find1y.daysFromGenesis, powerLawParams1y.slope))) * 100 : 0
      
      // Secondary confirmation from 2Y and 3Y (also reliable power laws)
      const deviation2y = find2y ? ((find2y.percent - (powerLawParams2y.constant * Math.pow(find2y.daysFromGenesis, powerLawParams2y.slope))) / (powerLawParams2y.constant * Math.pow(find2y.daysFromGenesis, powerLawParams2y.slope))) * 100 : 0
      const deviation3y = find3y ? ((find3y.percent - (powerLawParams3y.constant * Math.pow(find3y.daysFromGenesis, powerLawParams3y.slope))) / (powerLawParams3y.constant * Math.pow(find3y.daysFromGenesis, powerLawParams3y.slope))) * 100 : 0

      // === 2. SENTIMENT INDICATORS: 3M/6M Behavior (No power laws) ===
      // Calculate relative position for short-term holders vs their recent averages
      const priceIndex = filteredPriceData.findIndex(p => Math.abs(p.timestamp - pricePoint.timestamp) < 24 * 60 * 60 * 1000)
      if (priceIndex < 30) return null // Need enough history for moving averages

      // Calculate 30-day moving averages for short-term percentages
      const recent3mData = filteredData.data3m.slice(Math.max(0, priceIndex - 30), priceIndex + 1)
      const recent6mData = filteredData.data6m.slice(Math.max(0, priceIndex - 30), priceIndex + 1)
      const recentPriceData = filteredPriceData.slice(Math.max(0, priceIndex - 30), priceIndex + 1)

      if (recent3mData.length < 15 || recent6mData.length < 15 || recentPriceData.length < 15) return null

      const avg3m = recent3mData.reduce((sum, d) => sum + d.percent, 0) / recent3mData.length
      const avg6m = recent6mData.reduce((sum, d) => sum + d.percent, 0) / recent6mData.length
      const avgPrice = recentPriceData.reduce((sum, d) => sum + d.value, 0) / recentPriceData.length

      // Calculate sentiment positions
      const sentiment3m = find3m ? ((find3m.percent - avg3m) / avg3m) * 100 : 0  // Relative to their average
      const sentiment6m = find6m ? ((find6m.percent - avg6m) / avg6m) * 100 : 0
      const pricePosition = ((pricePoint.value - avgPrice) / avgPrice) * 100  // Price vs its average

      // === 3. SMART MONEY SCORE (Primary Signal) ===
      // Higher weight for longer timeframes, 1Y is the key indicator
      const smartMoneyScore = (deviation1y * 0.6) + (deviation2y * 0.3) + (deviation3y * 0.1)

      // === 4. SENTIMENT NOISE SCORE ===
      // Positive = buying into tops, Negative = selling into bottoms (contrarian indicators)
      // When price is high and short-term holders are accumulating = potential top
      // When price is low and short-term holders are selling = potential bottom
      const sentimentNoise = ((sentiment3m * 0.4) + (sentiment6m * 0.6)) - (pricePosition * 0.5)

      // === 5. COMBINED SIGNAL ===
      // Smart Money Score is primary, Sentiment Noise is contrarian confirmation
      // Positive smartMoneyScore = 1Y+ accumulating above trend = BUY (price relatively low)
      // Negative sentimentNoise = short-term selling when they should buy = BUY confirmation
      const combinedScore = smartMoneyScore - (sentimentNoise * 0.3) // Sentiment as contrarian indicator

      // === 6. SIGNAL CLASSIFICATION ===
      let signal: string
      let signalStrength: number
      let bubbleSize: number
      let confidence: number

      // Strong signals (high confidence)
      if (combinedScore > 8 && smartMoneyScore > 5) {
        signal = 'Strong Buy'
        signalStrength = 3
        bubbleSize = 18
        confidence = 0.9
      } else if (combinedScore > 4 && smartMoneyScore > 2) {
        signal = 'Buy'
        signalStrength = 2
        bubbleSize = 14
        confidence = 0.7
      } else if (combinedScore > 1) {
        signal = 'Weak Buy'
        signalStrength = 1
        bubbleSize = 10
        confidence = 0.5
      } else if (combinedScore < -8 && smartMoneyScore < -5) {
        signal = 'Strong Sell'
        signalStrength = -3
        bubbleSize = 18
        confidence = 0.9
      } else if (combinedScore < -4 && smartMoneyScore < -2) {
        signal = 'Sell'
        signalStrength = -2
        bubbleSize = 14
        confidence = 0.7
      } else if (combinedScore < -1) {
        signal = 'Weak Sell'
        signalStrength = -1
        bubbleSize = 10
        confidence = 0.5
      } else {
        signal = 'Neutral'
        signalStrength = 0
        bubbleSize = 6
        confidence = 0.3
      }

      return {
        date: new Date(pricePoint.timestamp),
        price: pricePoint.value,
        combinedScore,
        smartMoneyScore,
        sentimentNoise,
        signal,
        signalStrength,
        bubbleSize,
        confidence,
        // Detailed breakdown for tooltips
        breakdown: {
          deviation1y,
          deviation2y,  
          deviation3y,
          sentiment3m,
          sentiment6m,
          pricePosition
        },
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
      'Strong Buy': smartIndicator.filter(d => d?.signal === 'Strong Buy'),
      'Buy': smartIndicator.filter(d => d?.signal === 'Buy'),
      'Weak Buy': smartIndicator.filter(d => d?.signal === 'Weak Buy'),
      'Neutral': smartIndicator.filter(d => d?.signal === 'Neutral'),
      'Weak Sell': smartIndicator.filter(d => d?.signal === 'Weak Sell'),
      'Sell': smartIndicator.filter(d => d?.signal === 'Sell'),
      'Strong Sell': smartIndicator.filter(d => d?.signal === 'Strong Sell'),
    }

    const colors = {
      'Strong Buy': 'rgba(34, 197, 94, 0.9)', // Bright green
      'Buy': 'rgba(74, 222, 128, 0.8)', // Green
      'Weak Buy': 'rgba(134, 239, 172, 0.7)', // Light green
      'Neutral': 'rgba(107, 114, 128, 0.4)', // Gray
      'Weak Sell': 'rgba(252, 165, 165, 0.7)', // Light red
      'Sell': 'rgba(248, 113, 113, 0.8)', // Red
      'Strong Sell': 'rgba(239, 68, 68, 0.9)', // Bright red
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
          text: points.map(p => {
            const combinedScore = p?.combinedScore?.toFixed(1) || '0.0'
            const smartMoney = p?.smartMoneyScore?.toFixed(1) || '0.0'
            const deviation1y = p?.breakdown?.deviation1y?.toFixed(1) || '0.0'
            const sentimentNoise = p?.sentimentNoise?.toFixed(1) || '0.0'
            const confidence = ((p?.confidence || 0) * 100).toFixed(0)
            
            return `Combined Score: ${combinedScore}<br>` +
                   `Smart Money: ${smartMoney}<br>` +
                   `1Y Deviation: ${deviation1y}%<br>` +
                   `Sentiment Noise: ${sentimentNoise}<br>` +
                   `Confidence: ${confidence}%`
          }),
          showlegend: true,
          yaxis: 'y',
        })
      }
    })

    // === SMART SCORE OSCILLATOR (Secondary Y-axis) ===
    traces.push({
      x: smartIndicator.map(d => d?.date),
      y: smartIndicator.map(d => d?.combinedScore),
      mode: 'lines',
      type: 'scatter',
      name: 'Combined Score',
      line: { color: 'rgba(139, 92, 246, 0.8)', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(139, 92, 246, 0.1)',
      connectgaps: true,
      hovertemplate: '<b>Combined Score</b><br>%{y:.1f}<br>%{x}<extra></extra>',
      yaxis: 'y2',
    })

    // Zero line for combined score
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

    // Signal zone lines (adjusted for new scoring)
    traces.push({
      x: xRange,
      y: [-8, -8],
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
      y: [8, 8],
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
        title: { text: 'Combined Score' },
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
          text: "🟢 Green = 1Y+ holders accumulating above trend (Smart Money)<br>🔴 Red = 1Y+ holders distributing below trend<br>🟣 Purple = Combined score oscillator<br>Size = Signal confidence",
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
            <div className="text-sm text-[#A0A0B8] mb-1">Combined Score</div>
            <div className={`text-xl font-bold ${(smartIndicator[smartIndicator.length - 1]?.combinedScore || 0) > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
              {smartIndicator[smartIndicator.length - 1]?.combinedScore?.toFixed(1) || 'N/A'}
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
