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

interface CombinedInactiveSupplyChartProps {
  data3m: InactiveSupplyDataPoint[]
  data6m: InactiveSupplyDataPoint[]
  data1y: InactiveSupplyDataPoint[]
  data2y: InactiveSupplyDataPoint[]
  data3y: InactiveSupplyDataPoint[]
  data4y: InactiveSupplyDataPoint[]
  priceData: KaspaMetric[]
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
  if (value >= 10) return `${value.toFixed(1)}%`
  else if (value >= 1) return `${value.toFixed(2)}%`
  else return `${value.toFixed(3)}%`
}

export default function CombinedInactiveSupplyChart({ 
  data3m,
  data6m,
  data1y, 
  data2y,
  data3y,
  data4y,
  priceData,
  height = 600 
}: CombinedInactiveSupplyChartProps) {
  const [yScale, setYScale] = useState<'Linear' | 'Log'>('Log')
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [timePeriod, setTimePeriod] = useState<'6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [showPriceBackground, setShowPriceBackground] = useState(true)

  // Filter all data based on time period
  const { filteredData3m, filteredData6m, filteredData1y, filteredData2y, filteredData3y, filteredData4y, filteredPriceData } = useMemo(() => {
    if (timePeriod === 'All') {
      return {
        filteredData3m: data3m,
        filteredData6m: data6m,
        filteredData1y: data1y,
        filteredData2y: data2y,
        filteredData3y: data3y,
        filteredData4y: data4y,
        filteredPriceData: priceData
      }
    }
    
    const now = Date.now()
    const days = {
      '6M': 180, 
      '1Y': 365, 
      '2Y': 730, 
      '3Y': 1095
    }
    
    const cutoffTime = now - days[timePeriod as keyof typeof days] * 24 * 60 * 60 * 1000

    return {
      filteredData3m: data3m.filter(point => point.timestamp >= cutoffTime),
      filteredData6m: data6m.filter(point => point.timestamp >= cutoffTime),
      filteredData1y: data1y.filter(point => point.timestamp >= cutoffTime),
      filteredData2y: data2y.filter(point => point.timestamp >= cutoffTime),
      filteredData3y: data3y.filter(point => point.timestamp >= cutoffTime),
      filteredData4y: data4y.filter(point => point.timestamp >= cutoffTime),
      filteredPriceData: priceData.filter(point => point.timestamp >= cutoffTime)
    }
  }, [data3m, data6m, data1y, data2y, data3y, data4y, priceData, timePeriod])

  // Prepare Plotly data
  const plotlyData = useMemo(() => {
    const traces: any[] = []

    // Add price background trace if enabled
    if (showPriceBackground && filteredPriceData.length > 0) {
      const priceXValues = filteredPriceData.map(d => new Date(d.timestamp))
      const priceYValues = filteredPriceData.map(d => d.value)

      traces.push({
        x: priceXValues,
        y: priceYValues,
        mode: 'lines',
        type: 'scatter',
        name: 'Kaspa Price',
        line: { 
          color: 'rgba(156, 163, 175, 0.3)', 
          width: 1 
        },
        yaxis: 'y2',
        connectgaps: true,
        showlegend: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Price: $%{y:.4f}<br>%{x}<extra></extra>',
      })
    }

    // Color scheme for different timeframes
    const timeframeColors = {
      '3m': '#DC2626',  // Red-600
      '6m': '#EA580C',  // Orange-600  
      '1y': '#F59E0B',  // Amber-500
      '2y': '#5B6CFF',  // Primary blue
      '3y': '#059669',  // Emerald-600
      '4y': '#10B981'   // Emerald-500
    }

    // Add 3-month data
    if (filteredData3m.length > 0) {
      traces.push({
        x: filteredData3m.map(d => d.date),
        y: filteredData3m.map(d => d.percent),
        mode: 'lines',
        type: 'scatter',
        name: '3+ Months',
        line: { 
          color: timeframeColors['3m'],
          width: 2 
        },
        connectgaps: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Inactive: %{y:.2f}%<br>%{x}<extra></extra>',
      })
    }

    // Add 6-month data
    if (filteredData6m.length > 0) {
      traces.push({
        x: filteredData6m.map(d => d.date),
        y: filteredData6m.map(d => d.percent),
        mode: 'lines',
        type: 'scatter',
        name: '6+ Months',
        line: { 
          color: timeframeColors['6m'],
          width: 2 
        },
        connectgaps: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Inactive: %{y:.2f}%<br>%{x}<extra></extra>',
      })
    }

    // Add 1-year data
    if (filteredData1y.length > 0) {
      traces.push({
        x: filteredData1y.map(d => d.date),
        y: filteredData1y.map(d => d.percent),
        mode: 'lines',
        type: 'scatter',
        name: '1+ Year',
        line: { 
          color: timeframeColors['1y'],
          width: 2 
        },
        connectgaps: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Inactive: %{y:.2f}%<br>%{x}<extra></extra>',
      })
    }

    // Add 2-year data
    if (filteredData2y.length > 0) {
      traces.push({
        x: filteredData2y.map(d => d.date),
        y: filteredData2y.map(d => d.percent),
        mode: 'lines',
        type: 'scatter',
        name: '2+ Years',
        line: { 
          color: timeframeColors['2y'],
          width: 2 
        },
        connectgaps: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Inactive: %{y:.2f}%<br>%{x}<extra></extra>',
      })
    }

    // Add 3-year data
    if (filteredData3y.length > 0) {
      traces.push({
        x: filteredData3y.map(d => d.date),
        y: filteredData3y.map(d => d.percent),
        mode: 'lines',
        type: 'scatter',
        name: '3+ Years',
        line: { 
          color: timeframeColors['3y'],
          width: 2 
        },
        connectgaps: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Inactive: %{y:.2f}%<br>%{x}<extra></extra>',
      })
    }

    // Add 4-year data
    if (filteredData4y.length > 0) {
      traces.push({
        x: filteredData4y.map(d => d.date),
        y: filteredData4y.map(d => d.percent),
        mode: 'lines',
        type: 'scatter',
        name: '4+ Years',
        line: { 
          color: timeframeColors['4y'],
          width: 2 
        },
        connectgaps: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Inactive: %{y:.2f}%<br>%{x}<extra></extra>',
      })
    }

    return traces
  }, [filteredData3m, filteredData6m, filteredData1y, filteredData2y, filteredData3y, filteredData4y, filteredPriceData, showPriceBackground])

  // Plotly layout
  const plotlyLayout = useMemo(() => {
    // Calculate Y-axis range from all timeframe data
    const allPercentValues = [
      ...filteredData3m.map(d => d.percent),
      ...filteredData6m.map(d => d.percent),
      ...filteredData1y.map(d => d.percent),
      ...filteredData2y.map(d => d.percent),
      ...filteredData3y.map(d => d.percent),
      ...filteredData4y.map(d => d.percent)
    ]
    
    if (allPercentValues.length === 0) return {}

    const yMinData = Math.min(...allPercentValues)
    const yMaxData = Math.max(...allPercentValues)
    
    let yMinChart: number, yMaxChart: number
    
    if (yScale === 'Log') {
      yMinChart = Math.max(0.1, yMinData * 0.8)
      yMaxChart = yMaxData * 1.2
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * 1.1
    }

    // Calculate price Y-axis range if price data exists
    let priceYRange: [number, number] | undefined

    if (showPriceBackground && filteredPriceData.length > 0) {
      const priceValues = filteredPriceData.map(d => d.value)
      const priceMin = Math.min(...priceValues)
      const priceMax = Math.max(...priceValues)
      
      if (priceScale === 'Log') {
        priceYRange = [Math.log10(priceMin * 0.8), Math.log10(priceMax * 1.2)]
      } else {
        priceYRange = [priceMin * 0.95, priceMax * 1.05]
      }
    }

    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 80, r: showPriceBackground && filteredPriceData.length > 0 ? 80 : 20, t: 20, b: 50 },
      hoverlabel: {
        bgcolor: 'rgba(15, 20, 25, 0.95)',
        bordercolor: 'rgba(91, 108, 255, 0.5)',
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
      showspikes: false,
    }

    // Configure primary Y-axis (inactive supply %)
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
    }

    // Configure secondary Y-axis (price) if price data exists
    if (showPriceBackground && filteredPriceData.length > 0 && priceYRange) {
      layout.yaxis2 = {
        title: { text: 'Price (USD)', standoff: 20 },
        type: priceScale === 'Log' ? 'log' : 'linear',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        color: '#9CA3AF',
        range: priceYRange,
        showspikes: false,
      }
    }

    return layout
  }, [filteredData3m, filteredData1y, filteredData2y, filteredData4y, filteredPriceData, yScale, priceScale, height, showPriceBackground])

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
                <div 
                  onClick={() => setYScale('Linear')}
                  className={`p-2 rounded cursor-pointer transition-all text-xs ${yScale === 'Linear' ? 'bg-[#5B6CFF]/20 text-[#5B6CFF]' : 'hover:bg-[#1A1A2E] text-white'}`}
                >
                  Linear Scale
                </div>
                <div 
                  onClick={() => setYScale('Log')}
                  className={`p-2 rounded cursor-pointer transition-all text-xs ${yScale === 'Log' ? 'bg-[#5B6CFF]/20 text-[#5B6CFF]' : 'hover:bg-[#1A1A2E] text-white'}`}
                >
                  Log Scale
                </div>
              </div>
            </div>
          </div>

          {/* Price Scale Control */}
          {showPriceBackground && filteredPriceData.length > 0 && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <span className="text-[#A0A0B8] text-xs">Price:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{priceScale}</span>
              </button>
              <div className="absolute top-full mt-1 left-0 w-32 bg-[#0F0F1A]/90 border border-[#2D2D45]/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <div className="p-1">
                  <div 
                    onClick={() => setPriceScale('Linear')}
                    className={`p-2 rounded cursor-pointer transition-all text-xs ${priceScale === 'Linear' ? 'bg-[#5B6CFF]/20 text-[#5B6CFF]' : 'hover:bg-[#1A1A2E] text-white'}`}
                  >
                    Linear
                  </div>
                  <div 
                    onClick={() => setPriceScale('Log')}
                    className={`p-2 rounded cursor-pointer transition-all text-xs ${priceScale === 'Log' ? 'bg-[#5B6CFF]/20 text-[#5B6CFF]' : 'hover:bg-[#1A1A2E] text-white'}`}
                  >
                    Log
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Price Background Toggle */}
          <button
            onClick={() => setShowPriceBackground(!showPriceBackground)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              showPriceBackground
                ? 'bg-[#5B6CFF] text-white'
                : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
            }`}
          >
            Price Background
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
