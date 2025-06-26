'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface PriceChartProps {
  data: KaspaMetric[]
  height?: number
}

// Kaspa genesis date - November 7, 2021
const GENESIS_DATE = new Date('2021-11-07T00:00:00.000Z').getTime()

// Calculate days from genesis for a timestamp
function getDaysFromGenesis(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - GENESIS_DATE) / (24 * 60 * 60 * 1000)) + 1)
}

// Enhanced power law regression function
function fitPowerLaw(data: KaspaMetric[]) {
  const validData = data.filter(point => point.value > 0)
  
  if (validData.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  // Always use days from genesis for power law calculation
  const logX = validData.map(point => {
    const daysFromGenesis = getDaysFromGenesis(point.timestamp)
    return Math.log(Math.max(1, daysFromGenesis))
  })
  const logY = validData.map(point => Math.log(point.value))
  
  // Linear regression on log-transformed data
  const n = logX.length
  const sumX = logX.reduce((a, b) => a + b, 0)
  const sumY = logY.reduce((a, b) => a + b, 0)
  const sumXY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)
  const sumX2 = logX.reduce((sum, x) => sum + x * x, 0)
  const sumY2 = logY.reduce((sum, y) => sum + y * y, 0)
  
  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Calculate correlation coefficient and R²
  const meanX = sumX / n
  const meanY = sumY / n
  const ssXY = sumXY - n * meanX * meanY
  const ssXX = sumX2 - n * meanX * meanX
  const ssYY = sumY2 - n * meanY * meanY
  const rValue = ssXY / Math.sqrt(ssXX * ssYY)
  const r2 = rValue * rValue
  
  // Convert back to power law coefficients: y = a * x^b
  const a = Math.exp(intercept)
  const b = slope
  
  return { a, b, r2 }
}

// Calculate ATH (All-Time High) data
function calculateATH(data: KaspaMetric[]) {
  if (data.length === 0) return null
  
  const athPoint = data.reduce((max, point) => 
    point.value > max.value ? point : max
  )
  
  return {
    price: athPoint.value,
    date: new Date(athPoint.timestamp),
    timestamp: athPoint.timestamp,
    daysFromGenesis: getDaysFromGenesis(athPoint.timestamp)
  }
}

// Calculate 1YL (One Year Low) data
function calculate1YL(data: KaspaMetric[]) {
  if (data.length === 0) return null
  
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000)
  const recentData = data.filter(point => point.timestamp >= oneYearAgo)
  
  if (recentData.length === 0) {
    const minPoint = data.reduce((min, point) => 
      point.value < min.value ? point : min
    )
    return {
      price: minPoint.value,
      date: new Date(minPoint.timestamp),
      timestamp: minPoint.timestamp,
      daysFromGenesis: getDaysFromGenesis(minPoint.timestamp)
    }
  }
  
  const oylPoint = recentData.reduce((min, point) => 
    point.value < min.value ? point : min
  )
  
  return {
    price: oylPoint.value,
    date: new Date(oylPoint.timestamp),
    timestamp: oylPoint.timestamp,
    daysFromGenesis: getDaysFromGenesis(oylPoint.timestamp)
  }
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

export default function PriceChart({ data, height = 600 }: PriceChartProps) {
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timePeriod, setTimePeriod] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'All' | 'Full'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')

  // Function to handle double-click reset to full view
  const handleDoubleClickReset = () => {
    console.log('Double click detected, current period:', timePeriod) // Debug log
    
    // Always force a refresh by toggling between All and Full states
    if (timePeriod === 'All') {
      console.log('Switching to Full') // Debug log
      setTimePeriod('Full')
    } else if (timePeriod === 'Full') {
      console.log('Switching to All') // Debug log  
      setTimePeriod('All')
    } else {
      console.log('Switching to All from', timePeriod) // Debug log
      setTimePeriod('All')
    }
  }

  // Filter data based on time period
  const filteredData = useMemo(() => {
    if (timePeriod === 'All' || timePeriod === 'Full' || data.length === 0) return data
    
    const now = Date.now()
    const days = {
      '1W': 7, '1M': 30, '3M': 90, 
      '6M': 180, '1Y': 365
    }
    
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    return data.filter(point => point.timestamp >= cutoffTime)
  }, [data, timePeriod])

  // Calculate power law regression - always from complete dataset when both scales are log
  const powerLawData = useMemo(() => {
    if (showPowerLaw === 'Hide' || data.length < 10) return null
    
    try {
      // Always use ALL data for power law calculation, only when both scales are log
      const { a, b, r2 } = fitPowerLaw(data)
      return { a, b, r2 }
    } catch (error) {
      console.error('Power law calculation failed:', error)
      return null
    }
  }, [data, showPowerLaw])

  // Calculate ATH and 1YL points
  const athData = useMemo(() => calculateATH(filteredData), [filteredData])
  const oylData = useMemo(() => calculate1YL(filteredData), [filteredData])

  // Prepare Plotly data
  const plotlyData = useMemo(() => {
    if (filteredData.length === 0) return []

    const traces: any[] = []

    // Determine X values based on time scale
    let xValues: (number | Date)[]
    if (timeScale === 'Log') {
      xValues = filteredData.map(d => getDaysFromGenesis(d.timestamp))
    } else {
      // For linear time scale, ensure we have proper Date objects
      xValues = filteredData.map(d => {
        const date = new Date(d.timestamp)
        // Validate the date
        if (isNaN(date.getTime())) {
          console.warn('Invalid timestamp:', d.timestamp)
          return new Date()
        }
        return date
      })
    }

    const yValues = filteredData.map(d => d.value)

    // Debug logging for linear time scale
    if (timeScale === 'Linear' && filteredData.length > 0) {
      console.log('Linear time scale data:', {
        dataLength: filteredData.length,
        firstTimestamp: filteredData[0].timestamp,
        firstDate: new Date(filteredData[0].timestamp),
        lastTimestamp: filteredData[filteredData.length - 1].timestamp,
        lastDate: new Date(filteredData[filteredData.length - 1].timestamp),
        sampleXValues: xValues.slice(0, 3),
        sampleYValues: yValues.slice(0, 3)
      })
    }

    // Calculate Y-axis range
    const yMinData = Math.min(...yValues)
    const yMaxData = Math.max(...yValues)
    
    const athInView = athData !== null
    
    let yMinChart: number, yMaxChart: number
    
    if (priceScale === 'Log') {
      yMinChart = yMinData * 0.8
      yMaxChart = yMaxData * (athInView ? 1.50 : 1.05)
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * (athInView ? 1.15 : 1.05)
    }

    // For log scale: add invisible baseline using regular scatter
    if (priceScale === 'Log') {
      traces.push({
        x: xValues,
        y: Array(xValues.length).fill(yMinChart),
        mode: 'lines',
        type: 'scatter',
        name: 'baseline',
        line: { color: 'rgba(0,0,0,0)', width: 0 },
        showlegend: false, // Hide from legend
        hoverinfo: 'skip',
      })
    }

    // Main price trace using regular scatter for gradient support
    traces.push({
      x: xValues,
      y: yValues,
      mode: 'lines',
      type: 'scatter', // Changed from scattergl to scatter for gradient support
      name: 'Kaspa Price',
      line: { 
        color: '#5B6CFF', 
        width: 2 
      },
      fill: priceScale === 'Log' ? 'tonexty' : 'tozeroy',
      fillgradient: {
        type: "vertical",
        colorscale: [
          [0, "rgba(13, 13, 26, 0.01)"],  // Top: transparent
          [1, "rgba(91, 108, 255, 0.6)"]   // Bottom: full opacity
        ]
      },
      connectgaps: true,
      hovertemplate: timeScale === 'Linear' 
        ? '<b>%{fullData.name}</b><br>Price: $%{y:.4f}<extra></extra>'
        : '<b>Days since genesis:</b> %{x}<br>%{text}<br><b>%{fullData.name}</b><br>Price: $%{y:.4f}<extra></extra>',
      hoverinfo: 'none',
      text: filteredData.map(d => new Date(d.timestamp).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })),
    })

    // Add power law if enabled - display on all scale combinations
    if (powerLawData) {
      // Use ALL data for power law calculation, but only show the portion that fits the current view
      const allDaysFromGenesis = data.map(d => getDaysFromGenesis(d.timestamp))
      const yFit = allDaysFromGenesis.map(x => powerLawData.a * Math.pow(x, powerLawData.b))
      
      // Filter to match the current time period view
      const filteredIndices = data.map((d, index) => ({...d, originalIndex: index}))
        .filter(d => filteredData.some(fd => fd.timestamp === d.timestamp))
        .map(d => d.originalIndex)
      
      const viewXFit = filteredIndices.map(i => allDaysFromGenesis[i])
      const viewYFit = filteredIndices.map(i => yFit[i])
      
      let fitX: (number | Date)[]
      if (timeScale === 'Log') {
        fitX = viewXFit
      } else {
        // For linear time scale, use actual dates
        fitX = filteredIndices.map(i => new Date(data[i].timestamp))
      }

      traces.push({
        x: fitX,
        y: viewYFit,
        mode: 'lines',
        type: 'scatter',
        name: 'Power Law',
        line: { 
          color: '#ff8c00', 
          width: 2,
          dash: 'solid'
        },
        connectgaps: true,
        showlegend: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Fit: $%{y:.4f}<extra></extra>',
      })
    }

    // Add ATH marker using regular scatter (markers work better with scatter type)
    if (athData) {
      let athX: number | Date
      if (timeScale === 'Log') {
        athX = athData.daysFromGenesis
      } else {
        athX = athData.date
      }
      
      traces.push({
        x: [athX],
        y: [athData.price],
        mode: 'markers+text',
        type: 'scatter', // Use regular scatter for markers
        name: 'ATH & 1-YL',
        legendgroup: 'markers',
        marker: {
          color: '#ffffff',
          size: 8,
          line: { color: '#5B6CFF', width: 2 }
        },
        text: [`ATH ${formatCurrency(athData.price)}`],
        textposition: 'top left',
        textfont: { color: '#ffffff', size: 11 },
        showlegend: true,
        hovertemplate: `<b>All-Time High</b><br>Price: ${formatCurrency(athData.price)}<br>Date: ${athData.date.toLocaleDateString()}<extra></extra>`,
      })
    }

    // Add 1YL marker using regular scatter
    if (oylData) {
      let oylX: number | Date
      if (timeScale === 'Log') {
        oylX = oylData.daysFromGenesis
      } else {
        oylX = oylData.date
      }
      
      traces.push({
        x: [oylX],
        y: [oylData.price],
        mode: 'markers+text',
        type: 'scatter', // Use regular scatter for markers
        name: '1-YL',
        legendgroup: 'markers',
        marker: {
          color: '#ffffff',
          size: 8,
          line: { color: '#5B6CFF', width: 2 }
        },
        text: [`1YL ${formatCurrency(oylData.price)}`],
        textposition: 'bottom left',
        textfont: { color: '#ffffff', size: 11 },
        showlegend: false,
        hovertemplate: `<b>One Year Low</b><br>Price: ${formatCurrency(oylData.price)}<br>Date: ${oylData.date.toLocaleDateString()}<extra></extra>`,
      })
    }

    return traces
  }, [filteredData, timeScale, priceScale, powerLawData, athData, oylData])

  // Plotly layout
  const plotlyLayout = useMemo(() => {
    if (filteredData.length === 0) return {}

    const yValues = filteredData.map(d => d.value)
    const yMinData = Math.min(...yValues)
    const yMaxData = Math.max(...yValues)
    const athInView = athData !== null
    
    let yMinChart: number, yMaxChart: number
    
    if (priceScale === 'Log') {
      yMinChart = yMinData * 0.8
      yMaxChart = yMaxData * (athInView ? 1.50 : 1.05)
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * (athInView ? 1.15 : 1.05)
    }

    // Generate custom ticks for Y-axis if log scale
    let yTickVals: number[] | undefined
    let yTickText: string[] | undefined
    let yMinorTicks: number[] = []

    if (priceScale === 'Log') {
      const { majorTicks, intermediateTicks, minorTicks } = generateLogTicks(yMinChart, yMaxChart)
      yTickVals = [...majorTicks, ...intermediateTicks].sort((a, b) => a - b)
      yTickText = yTickVals.map(val => formatCurrency(val))
      yMinorTicks = minorTicks
    }

    // Create base layout
    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 50, r: 20, t: 20, b: 50 },
      hoverlabel: {
        bgcolor: 'rgba(15, 20, 25, 0.95)',
        bordercolor: 'rgba(91, 108, 255, 0.5)',
        font: { color: '#e2e8f0', size: 11 },
        align: 'left',
        namelength: -1,
        xanchor: 'right',  // This anchors the tooltip to the right edge, making it appear to the left of cursor
        yanchor: 'middle', // Centers vertically relative to the cursor
        x: -10,            // Move 10 pixels to the left
        y: 0               // No vertical offset
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
      // Remove crosshair and selection performance settings
      hoverdistance: 100,
      selectdirection: 'diagonal'
    }

    // Configure X-axis based on time scale
    if (timeScale === 'Log') {
      // For log time scale, calculate the actual data range
      const daysFromGenesisValues = filteredData.map(d => getDaysFromGenesis(d.timestamp))
      const minDays = Math.min(...daysFromGenesisValues)
      const maxDays = Math.max(...daysFromGenesisValues)
      
      // No padding - fit exactly to data range
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
        autorange: false, // Disable autorange to use our custom range
        minor: {
          ticklen: 6,
          gridcolor: 'rgba(255, 255, 255, 0.05)',
          gridwidth: 0.5
        },
        // Remove crosshair lines
        showspikes: false,
      }
    } else {
      // Linear time scale - use date format with data range
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
        autorange: false, // Disable autorange to use our custom range
        // Remove crosshair lines
        showspikes: false,
      }
    }

    // Configure Y-axis
    layout.yaxis = {
      title: { text: 'Price (USD)' },
      type: priceScale === 'Log' ? 'log' : 'linear',
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      range: priceScale === 'Log' 
        ? [Math.log10(yMinChart), Math.log10(yMaxChart)]
        : [yMinChart, yMaxChart],
      // Remove horizontal crosshair line
      showspikes: false
    }

    // Add log-specific Y-axis configuration
    if (priceScale === 'Log' && yTickVals && yTickText) {
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
  }, [filteredData, timeScale, priceScale, athData, height])

  return (
    <div className="space-y-6">
      {/* Interactive Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4">
          {/* Price Scale Control */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-300">Price Scale:</label>
            <select
              value={priceScale}
              onChange={(e) => setPriceScale(e.target.value as 'Linear' | 'Log')}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Log</option>
            </select>
          </div>

          {/* Time Scale Control */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-300">Time Scale:</label>
            <select
              value={timeScale}
              onChange={(e) => setTimeScale(e.target.value as 'Linear' | 'Log')}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Log</option>
            </select>
          </div>

          {/* Power Law Control */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-300">Power Law:</label>
            <select
              value={showPowerLaw}
              onChange={(e) => setShowPowerLaw(e.target.value as 'Hide' | 'Show')}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Hide">Hide</option>
              <option value="Show">Show</option>
            </select>
          </div>
        </div>

        {/* Time Period Buttons */}
        <div className="flex space-x-1">
          {(['1W', '1M', '3M', '6M', '1Y', 'All'] as const).map((period) => (
            <button
              key={period}
              onClick={() => {
                // When clicking "All", always set to "All" (not "All2")
                if (period === 'All') {
                  setTimePeriod('All')
                } else {
                  setTimePeriod(period)
                }
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timePeriod === period || (period === 'All' && timePeriod === 'Full')
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
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
          onRelayout={(eventData) => {
            // Alternative: listen for plotly relayout events
            console.log('Plotly relayout event:', eventData)
          }}
          config={{
            displayModeBar: false,
            // Improve performance
            responsive: true,
            doubleClick: 'autosize', // Use Plotly's native double-click with autosize instead of reset
            scrollZoom: true,
            editable: false
          }}
          useResizeHandler={true}
        />
      </div>

      {/* Chart Info */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-gray-400">Data Points:</span>
          <span className="text-white ml-2 font-semibold">{filteredData.length.toLocaleString()}</span>
        </div>
        
        {powerLawData && (
          <>
            <div>
              <span className="text-gray-400">Power Law R²:</span>
              <span className="text-white ml-2 font-semibold">{powerLawData.r2.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-gray-400">Power Law Slope:</span>
              <span className="text-white ml-2 font-semibold">{powerLawData.b.toFixed(4)}</span>
            </div>
          </>
        )}
        
        <div>
          <span className="text-gray-400">Time Range:</span>
          <span className="text-white ml-2 font-semibold">{timePeriod === 'Full' ? 'All' : timePeriod}</span>
        </div>
      </div>

      {/* ATH and 1YL Info */}
      {(athData || oylData) && (
        <div className="flex flex-wrap gap-6 text-sm">
          {athData && (
            <div>
              <span className="text-blue-400">All-Time High:</span>
              <span className="text-white ml-2 font-semibold">{formatCurrency(athData.price)}</span>
              <span className="text-gray-500 ml-2">({athData.date.toLocaleDateString()})</span>
            </div>
          )}
          
          {oylData && (
            <div>
              <span className="text-red-400">One Year Low:</span>
              <span className="text-white ml-2 font-semibold">{formatCurrency(oylData.price)}</span>
              <span className="text-gray-500 ml-2">({oylData.date.toLocaleDateString()})</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
