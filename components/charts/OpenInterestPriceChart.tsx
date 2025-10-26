'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface OpenInterestPriceChartProps {
  openInterestData: KaspaMetric[]
  priceData: KaspaMetric[]
  height?: number
}

// Calculate days from genesis for a timestamp (Kaspa genesis: November 7, 2021)
const GENESIS_DATE = new Date('2021-11-07T00:00:00.000Z').getTime()
const OI_START_DATE = new Date('2023-08-04T00:00:00.000Z').getTime() // First OI data point

function getDaysFromGenesis(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - GENESIS_DATE) / (24 * 60 * 60 * 1000)) + 1)
}

function getDaysFromOIStart(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - OI_START_DATE) / (24 * 60 * 60 * 1000)) + 1)
}

// Enhanced power law regression function
function fitPowerLaw(xData: number[], yData: number[]) {
  const validIndices = xData
    .map((x, i) => ({ x, y: yData[i], index: i }))
    .filter(point => point.x > 0 && point.y > 0)
  
  if (validIndices.length < 2) {
    return { a: 1, b: 1, r2: 0 }
  }
  
  const logX = validIndices.map(point => Math.log(Math.max(1, point.x)))
  const logY = validIndices.map(point => Math.log(point.y))
  
  const n = logX.length
  const sumX = logX.reduce((a, b) => a + b, 0)
  const sumY = logY.reduce((a, b) => a + b, 0)
  const sumXY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)
  const sumX2 = logX.reduce((sum, x) => sum + x * x, 0)
  const sumY2 = logY.reduce((sum, y) => sum + y * y, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Calculate R²
  const meanX = sumX / n
  const meanY = sumY / n
  const ssXY = sumXY - n * meanX * meanY
  const ssXX = sumX2 - n * meanX * meanX
  const ssYY = sumY2 - n * meanY * meanY
  const rValue = ssXY / Math.sqrt(ssXX * ssYY)
  const r2 = rValue * rValue
  
  const a = Math.exp(intercept)
  const b = slope
  
  return { a, b, r2 }
}

// Format currency values
function formatCurrency(value: number): string {
  if (value >= 1000000000) return `$${(value/1000000000).toFixed(2)}B`
  if (value >= 1000000) return `$${(value/1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value/1000).toFixed(1)}K`
  if (value >= 1) return `$${value.toFixed(2)}`
  if (value >= 0.01) return `$${value.toFixed(3)}`
  if (value >= 0.001) return `$${value.toFixed(4)}`
  return `$${value.toExponential(2)}`
}

// Format percentage
function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export default function OpenInterestPriceChart({ 
  openInterestData, 
  priceData, 
  height = 600 
}: OpenInterestPriceChartProps) {
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | 'All'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  const [chartView, setChartView] = useState<'combined' | 'oi-only' | 'residuals-only'>('combined')

  // Filter data based on time period
  const filteredData = useMemo(() => {
    if (timePeriod === 'All') return { openInterestData, priceData }
    
    const now = Date.now()
    const periods = {
      '1M': 30 * 24 * 60 * 60 * 1000,
      '3M': 90 * 24 * 60 * 60 * 1000,
      '6M': 180 * 24 * 60 * 60 * 1000,
      '1Y': 365 * 24 * 60 * 60 * 1000,
      '2Y': 730 * 24 * 60 * 60 * 1000,
    }
    
    const cutoff = now - periods[timePeriod]
    
    return {
      openInterestData: openInterestData.filter(d => d.timestamp >= cutoff),
      priceData: priceData.filter(d => d.timestamp >= cutoff)
    }
  }, [openInterestData, priceData, timePeriod])

  // Calculate plotly data
  const plotlyData = useMemo(() => {
    const { openInterestData: filteredOI, priceData: filteredPrice } = filteredData

    if (filteredOI.length === 0 || filteredPrice.length === 0) return []

    // Calculate OI power law
    const oiDaysFromStart = filteredOI.map(d => getDaysFromOIStart(d.timestamp))
    const oiValues = filteredOI.map(d => d.value)
    const { a: aOI, b: bOI, r2: r2OI } = fitPowerLaw(oiDaysFromStart, oiValues)

    // Calculate OI residuals
    const oiWithResiduals = filteredOI.map((d, i) => {
      const daysFromStart = getDaysFromOIStart(d.timestamp)
      const predictedOI = aOI * Math.pow(daysFromStart, bOI)
      const residualPct = ((d.value - predictedOI) / predictedOI) * 100
      return {
        ...d,
        residualPct,
        predictedOI
      }
    })

    // Merge price and OI data for combined chart
    const mergedData = filteredPrice.map(pricePoint => {
      // Find closest OI data point (forward fill)
      let closestOI = oiWithResiduals[0]
      let minDiff = Math.abs(pricePoint.timestamp - oiWithResiduals[0].timestamp)
      
      for (const oiPoint of oiWithResiduals) {
        const diff = Math.abs(pricePoint.timestamp - oiPoint.timestamp)
        if (diff < minDiff) {
          minDiff = diff
          closestOI = oiPoint
        }
      }
      
      return {
        date: new Date(pricePoint.timestamp),
        price: pricePoint.value,
        residualPct: closestOI.residualPct || 0
      }
    })

    const traces = []

    if (chartView === 'combined' || chartView === 'oi-only') {
      // Open Interest line
      traces.push({
        x: filteredOI.map(d => new Date(d.timestamp)),
        y: filteredOI.map(d => d.value),
        type: 'scatter',
        mode: 'lines',
        name: 'Open Interest',
        line: { color: '#00FFCC', width: 2 },
        yaxis: chartView === 'combined' ? 'y2' : 'y',
        hovertemplate: '<b>%{fullData.name}</b><br>' +
          'Date: %{x}<br>' +
          'Value: %{customdata}<br>' +
          '<extra></extra>',
        customdata: filteredOI.map(d => formatCurrency(d.value))
      })

      // OI Power Law (if enabled)
      if (showPowerLaw === 'Show') {
        const oiDaysRange = filteredOI.map(d => getDaysFromOIStart(d.timestamp))
        const minDays = Math.min(...oiDaysRange)
        const maxDays = Math.max(...oiDaysRange)
        const fitDays = Array.from({ length: 100 }, (_, i) => 
          minDays + (maxDays - minDays) * i / 99
        )
        const fitValues = fitDays.map(days => aOI * Math.pow(days, bOI))
        const fitDates = fitDays.map(days => 
          new Date(OI_START_DATE + (days - 1) * 24 * 60 * 60 * 1000)
        )

        traces.push({
          x: fitDates,
          y: fitValues,
          type: 'scatter',
          mode: 'lines',
          name: `OI Power Law (R²: ${r2OI.toFixed(3)})`,
          line: { color: 'orange', dash: 'dot', width: 2 },
          yaxis: chartView === 'combined' ? 'y2' : 'y',
          hovertemplate: '<b>%{fullData.name}</b><br>' +
            'Date: %{x}<br>' +
            'Predicted: %{customdata}<br>' +
            '<extra></extra>',
          customdata: fitValues.map(v => formatCurrency(v))
        })
      }
    }

    if (chartView === 'combined') {
      // Price with color-coded OI risk
      traces.push({
        x: mergedData.map(d => d.date),
        y: mergedData.map(d => d.price),
        type: 'scatter',
        mode: 'markers+lines',
        name: 'Price (OI Risk Color)',
        marker: {
          color: mergedData.map(d => d.residualPct),
          colorscale: [
            [0.0, '#0A1E3D'],      // -60% Very Dark Blue (EXTREME COLD)
            [0.094, '#0F2D5C'],    // -55% Deep Dark Blue (VERY COLD)
            [0.125, '#1E3A8A'],    // -50% Dark Navy Blue (VERY COLD)
            [0.156, '#1D4ED8'],    // -45% Medium Dark Blue (COLD)
            [0.25, '#3B82F6'],     // -40% Bright Blue (COLD)
            [0.375, '#60A5FA'],    // -20% Sky Blue (transitioning to neutral)
            [0.5, '#9CA3AF'],      // 0% Gray (NEUTRAL)
            [0.625, '#9CA3AF'],    // +20% Gray (neutral zone end)
            [0.688, '#FFD700'],    // +30% Gold (CAUTION)
            [0.75, '#FF8C00'],     // +40% Dark Orange (WARNING)
            [0.813, '#FF4500'],    // +50% Orange Red (ELEVATED)
            [0.875, '#FF0000'],    // +60% Pure Red (HIGH RISK)
            [0.938, '#DC143C'],    // +80% Crimson (EXTREME DANGER)
            [1.0, '#8B0000']       // +100% Dark Red (MAXIMUM DANGER)
          ],
          cmin: -60,
          cmax: 100,
          size: 6,
          line: { width: 0.5, color: 'rgba(255, 255, 255, 0.4)' },
          colorbar: {
            title: '<b>OI Risk</b>',
            titleside: 'right',
            tickmode: 'array',
            tickvals: [-60, -40, -20, 0, 20, 40, 60, 80, 100],
            ticktext: [
              '-60%<br><b>🔵COLD</b>',
              '-40%<br><b>🌊LOW</b>',
              '-20%',
              '0%<br><b>✅SAFE</b>',
              '+20%',
              '+40%<br>⚠️Warn',
              '+60%<br><b>🔴RISK</b>',
              '+80%<br><b>⛔DANGER</b>',
              '+100%<br><b>🚨MAX</b>'
            ],
            len: 0.6,
            y: 0.75,
            thickness: 15
          }
        },
        line: { color: 'rgba(150, 150, 150, 0.3)', width: 1 },
        yaxis: 'y',
        hovertemplate: '<b>%{fullData.name}</b><br>' +
          'Date: %{x}<br>' +
          'Price: %{customdata.price}<br>' +
          'OI Risk: %{customdata.risk}<br>' +
          '<extra></extra>',
        customdata: mergedData.map(d => ({
          price: formatCurrency(d.price),
          risk: formatPercentage(d.residualPct)
        }))
      })
    }

    if (chartView === 'residuals-only') {
      // OI Residuals bars
      traces.push({
        x: oiWithResiduals.map(d => new Date(d.timestamp)),
        y: oiWithResiduals.map(d => d.residualPct),
        type: 'bar',
        name: 'OI Residuals',
        marker: {
          color: oiWithResiduals.map(d => d.residualPct >= 0 ? '#10B981' : '#EF4444'),
          line: { width: 0 }
        },
        hovertemplate: '<b>%{fullData.name}</b><br>' +
          'Date: %{x}<br>' +
          'Residual: %{customdata}<br>' +
          '<extra></extra>',
        customdata: oiWithResiduals.map(d => formatPercentage(d.residualPct))
      })
    }

    return traces
  }, [filteredData, showPowerLaw, chartView])

  // Layout configuration
  const plotlyLayout = useMemo(() => {
    const baseLayout = {
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#FFFFFF', family: 'Inter, sans-serif' },
      margin: { l: 60, r: 60, t: 60, b: 60 },
      showlegend: true,
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: 'rgba(26, 26, 46, 0.8)',
        bordercolor: 'rgba(75, 85, 99, 0.3)',
        borderwidth: 1
      },
      xaxis: {
        showgrid: true,
        gridcolor: 'rgba(75, 85, 99, 0.2)',
        zeroline: false,
        color: '#9CA3AF',
        title: 'Date'
      },
      hovermode: 'x unified'
    }

    if (chartView === 'combined') {
      return {
        ...baseLayout,
        title: {
          text: 'Kaspa Price & Open Interest Risk Analysis<br><sub>Color gradient shows OI deviation: Blue = Underheated, Red = Overheated</sub>',
          font: { size: 16, color: '#FFFFFF' },
          x: 0.5
        },
        yaxis: {
          title: 'Price (USD)',
          type: 'log',
          showgrid: true,
          gridcolor: 'rgba(75, 85, 99, 0.2)',
          color: '#9CA3AF',
          side: 'left'
        },
        yaxis2: {
          title: 'Open Interest (USD)',
          type: 'log',
          showgrid: false,
          color: '#00FFCC',
          side: 'right',
          overlaying: 'y'
        }
      }
    } else if (chartView === 'oi-only') {
      return {
        ...baseLayout,
        title: {
          text: 'Kaspa Open Interest Analysis',
          font: { size: 16, color: '#FFFFFF' },
          x: 0.5
        },
        yaxis: {
          title: 'Open Interest (USD)',
          type: 'log',
          showgrid: true,
          gridcolor: 'rgba(75, 85, 99, 0.2)',
          color: '#9CA3AF'
        }
      }
    } else {
      return {
        ...baseLayout,
        title: {
          text: 'Open Interest Residuals (% Deviation from Power Law)',
          font: { size: 16, color: '#FFFFFF' },
          x: 0.5
        },
        yaxis: {
          title: 'Residual (%)',
          showgrid: true,
          gridcolor: 'rgba(75, 85, 99, 0.2)',
          color: '#9CA3AF',
          zeroline: true,
          zerolinecolor: 'rgba(156, 163, 175, 0.5)'
        }
      }
    }
  }, [chartView])

  // Handle double-click reset to full view
  const handleDoubleClickReset = () => {
    setTimePeriod('All')
  }

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Chart View Selection */}
        <div className="flex items-center gap-2">
          <span className="text-[#A0A0B8] text-sm font-medium">View:</span>
          {(['combined', 'oi-only', 'residuals-only'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setChartView(view)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                chartView === view
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              {view === 'combined' ? 'Combined' : 
               view === 'oi-only' ? 'OI Only' : 'Residuals'}
            </button>
          ))}
        </div>

        {/* Power Law Toggle */}
        {(chartView === 'combined' || chartView === 'oi-only') && (
          <div className="relative group">
            <button 
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                showPowerLaw === 'Show'
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
              </svg>
              <span>Power Law</span>
            </button>
            <div className="absolute top-full mt-1 right-0 w-40 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setShowPowerLaw('Hide')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showPowerLaw === 'Hide' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
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
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showPowerLaw === 'Show' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Show Power Law
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time Period Buttons */}
        <div className="flex items-center gap-2">
          {(['1M', '3M', '6M', '1Y', '2Y', 'All'] as const).map((period) => (
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
        </div>
      </div>

      {/* Plotly Chart */}
      <div style={{ height: `${height}px` }} className="w-full">
        <Plot
          data={plotlyData}
          layout={plotlyLayout}
          style={{ width: '100%', height: '100%' }}
          onDoubleClick={handleDoubleClickReset}
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

      {/* Risk Explanation */}
      {chartView === 'combined' && (
        <div className="bg-gradient-to-r from-[#1A1A2E]/90 via-[#2A2A3E]/90 to-[#1A1A2E]/90 rounded-xl p-4 border border-[#2D2D45]/50 backdrop-blur-sm">
          <h4 className="text-sm font-bold text-white mb-3">Risk Color Scale Explanation</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="text-center">
              <div className="h-3 bg-gradient-to-r from-[#0A1E3D] to-[#3B82F6] rounded mb-2"></div>
              <div className="text-blue-400 font-semibold">🔵 COLD (-60% to -20%)</div>
              <div className="text-[#A0A0B8]">OI below trend - potential buying opportunity</div>
            </div>
            <div className="text-center">
              <div className="h-3 bg-[#9CA3AF] rounded mb-2"></div>
              <div className="text-gray-400 font-semibold">✅ NEUTRAL (-20% to +20%)</div>
              <div className="text-[#A0A0B8]">OI near trend - balanced market</div>
            </div>
            <div className="text-center">
              <div className="h-3 bg-gradient-to-r from-[#FFD700] to-[#8B0000] rounded mb-2"></div>
              <div className="text-red-400 font-semibold">🔴 HOT (+20% to +100%)</div>
              <div className="text-[#A0A0B8]">OI above trend - potential top signal</div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
