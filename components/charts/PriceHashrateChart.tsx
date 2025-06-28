'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface DataPoint {
  timestamp: number
  value: number
}

interface PriceHashrateChartProps {
  priceData: DataPoint[]
  hashrateData: DataPoint[]
  className?: string
}

// Kaspa genesis date - November 7, 2021
const GENESIS_DATE = new Date('2021-11-07T00:00:00.000Z').getTime()

// Calculate days from genesis for a timestamp
function getDaysFromGenesis(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - GENESIS_DATE) / (24 * 60 * 60 * 1000)) + 1)
}

// Power law regression function (same as Python version)
function fitPowerLaw(data: Array<{x: number, y: number}>) {
  if (data.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  // Log transform for linear regression
  const logData = data.map(point => ({
    x: Math.log(Math.max(0.0001, point.x)),
    y: Math.log(Math.max(0.0001, point.y))
  }))
  
  // Linear regression on log-transformed data
  const n = logData.length
  const sumX = logData.reduce((sum, point) => sum + point.x, 0)
  const sumY = logData.reduce((sum, point) => sum + point.y, 0)
  const sumXY = logData.reduce((sum, point) => sum + point.x * point.y, 0)
  const sumX2 = logData.reduce((sum, point) => sum + point.x * point.x, 0)
  const sumY2 = logData.reduce((sum, point) => sum + point.y * point.y, 0)
  
  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Calculate R²
  const meanY = sumY / n
  const ssRes = logData.reduce((sum, point, i) => {
    const predicted = intercept + slope * point.x
    return sum + Math.pow(point.y - predicted, 2)
  }, 0)
  const ssTot = logData.reduce((sum, point) => {
    return sum + Math.pow(point.y - meanY, 2)
  }, 0)
  const r2 = 1 - (ssRes / ssTot)
  
  // Convert back to power law coefficients: y = a * x^b
  const a = Math.exp(intercept)
  const b = slope
  
  return { a, b, r2 }
}

export default function PriceHashrateChart({ priceData, hashrateData, className = '' }: PriceHashrateChartProps) {
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [hashrateScale, setHashrateScale] = useState<'Linear' | 'Log'>('Log')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  const [ratioScale, setRatioScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [showRatioFit, setShowRatioFit] = useState<'Hide' | 'Show'>('Show')

  // Merge and process data (like Python version)
  const analysisData = useMemo(() => {
    if (!priceData || !hashrateData || priceData.length === 0 || hashrateData.length === 0) {
      return []
    }

    const merged: Array<{
      date: Date,
      hashrate: number,
      price: number,
      ratio: number,
      daysFromGenesis: number
    }> = []

    // Merge price and hashrate data by date
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
        const ratio = price / hashrate
        const daysFromGenesis = getDaysFromGenesis(pricePoint.timestamp)

        merged.push({
          date,
          hashrate,
          price,
          ratio,
          daysFromGenesis
        })
      }
    })

    return merged.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [priceData, hashrateData])

  // Calculate power law fits
  const powerLawData = useMemo(() => {
    if (analysisData.length < 10) return null

    try {
      // Price vs Hashrate relationship
      const priceHashrateData = analysisData.map(d => ({ x: d.hashrate, y: d.price }))
      const priceHashrateFit = fitPowerLaw(priceHashrateData)

      // Ratio vs Time relationship
      const ratioTimeData = analysisData.map(d => ({ x: d.daysFromGenesis, y: d.ratio }))
      const ratioTimeFit = fitPowerLaw(ratioTimeData)

      return {
        priceHashrate: priceHashrateFit,
        ratioTime: ratioTimeFit
      }
    } catch (error) {
      console.error('Power law calculation failed:', error)
      return null
    }
  }, [analysisData])

  // Get last 7 points with gradient colors (like Python version)
  const last7Points = useMemo(() => {
    const last7 = analysisData.slice(-7)
    const colors = ['#00FFCC', '#40E0D0', '#80C0FF', '#A080FF', '#C040FF', '#E000FF', '#FF00FF']
    return last7.map((point, index) => ({ ...point, color: colors[index] || '#FF00FF' }))
  }, [analysisData])

  // Prepare main chart data
  const mainChartData = useMemo(() => {
    if (analysisData.length === 0) return []

    const traces: any[] = []

    // Main scatter plot points
    traces.push({
      x: analysisData.map(d => d.hashrate),
      y: analysisData.map(d => d.price),
      mode: 'markers',
      type: 'scattergl',
      name: 'Price vs Hashrate',
      marker: {
        color: '#00FFCC',
        size: 8,
        opacity: 0.7,
        line: { width: 1, color: 'DarkSlateGrey' }
      },
      hovertemplate: '<b>Hashrate</b>: %{x:.2f} PH/s<br><b>Price</b>: $%{y:.4f}<br><b>Date</b>: %{text}<extra></extra>',
      text: analysisData.map(d => d.date.toISOString().split('T')[0])
    })

    // Last 7 points with gradient colors
    last7Points.forEach((point, index) => {
      traces.push({
        x: [point.hashrate],
        y: [point.price],
        mode: 'markers',
        type: 'scattergl',
        name: index === last7Points.length - 1 ? `Recent (${point.date.toISOString().split('T')[0]})` : null,
        marker: {
          color: point.color,
          size: 12,
          opacity: 0.9,
          line: { width: 1.5, color: 'DarkSlateGrey' }
        },
        showlegend: false,
        hovertemplate: '<b>Hashrate</b>: %{x:.2f} PH/s<br><b>Price</b>: $%{y:.4f}<br><b>Date</b>: %{text}<extra></extra>',
        text: [point.date.toISOString().split('T')[0]]
      })
    })

    // Power law fit line
    if (showPowerLaw === 'Show' && powerLawData?.priceHashrate) {
      const { a, b, r2 } = powerLawData.priceHashrate
      const minHashrate = Math.min(...analysisData.map(d => d.hashrate))
      const maxHashrate = Math.max(...analysisData.map(d => d.hashrate))
      const xFit = []
      const yFit = []
      
      for (let i = 0; i <= 100; i++) {
        const x = minHashrate + (maxHashrate - minHashrate) * (i / 100)
        const y = a * Math.pow(x, b)
        xFit.push(x)
        yFit.push(y)
      }

      traces.push({
        x: xFit,
        y: yFit,
        mode: 'lines',
        type: 'scatter',
        name: `Power-Law Fit (R²=${r2.toFixed(3)})`,
        line: { color: '#FFA726', dash: 'dot', width: 2 }
      })

      // Deviation bands
      traces.push({
        x: xFit,
        y: yFit.map(y => y * 0.4),
        mode: 'lines',
        type: 'scatter',
        name: '-60% Deviation',
        line: { color: 'rgba(255, 255, 255, 0.5)', dash: 'dot', width: 1 },
        hoverinfo: 'skip',
        fill: null
      })

      traces.push({
        x: xFit,
        y: yFit.map(y => y * 2.2),
        mode: 'lines',
        type: 'scatter',
        name: '+120% Deviation',
        line: { color: 'rgba(255, 255, 255, 0.5)', dash: 'dot', width: 1 },
        hoverinfo: 'skip',
        fill: 'tonexty',
        fillcolor: 'rgba(100, 100, 100, 0.2)'
      })
    }

    return traces
  }, [analysisData, last7Points, showPowerLaw, powerLawData])

  // Prepare ratio chart data
  const ratioChartData = useMemo(() => {
    if (analysisData.length === 0) return []

    const traces: any[] = []
    const xValues = timeScale === 'Log' ? analysisData.map(d => d.daysFromGenesis) : analysisData.map(d => d.date)
    const xTitle = timeScale === 'Log' ? 'Days Since Genesis (Log Scale)' : 'Date'

    // Main ratio line
    traces.push({
      x: xValues,
      y: analysisData.map(d => d.ratio),
      mode: 'lines+markers',
      type: 'scattergl',
      name: 'Price/Hashrate Ratio',
      line: { color: '#00FFCC', width: 2 },
      marker: { size: 5, color: '#00FFCC' },
      hovertemplate: timeScale === 'Log' 
        ? '<b>Days</b>: %{x:.1f}<br><b>Date</b>: %{customdata}<br><b>Ratio</b>: %{y:.6f}<extra></extra>'
        : '<b>Date</b>: %{x|%Y-%m-%d}<br><b>Ratio</b>: %{y:.6f}<extra></extra>',
      customdata: analysisData.map(d => d.date.toISOString().split('T')[0])
    })

    // Last 7 points with gradient colors
    last7Points.forEach(point => {
      const xVal = timeScale === 'Log' ? point.daysFromGenesis : point.date
      traces.push({
        x: [xVal],
        y: [point.ratio],
        mode: 'markers',
        type: 'scattergl',
        marker: {
          color: point.color,
          size: 8,
          line: { width: 1.5, color: 'DarkSlateGrey' }
        },
        showlegend: false,
        hoverinfo: 'skip'
      })
    })

    // Ratio power law fit
    if (showRatioFit === 'Show' && powerLawData?.ratioTime) {
      const { a, b, r2 } = powerLawData.ratioTime
      const xFit = []
      const yFit = []

      if (timeScale === 'Log') {
        const minDays = Math.min(...analysisData.map(d => d.daysFromGenesis))
        const maxDays = Math.max(...analysisData.map(d => d.daysFromGenesis))
        
        for (let i = 0; i <= 100; i++) {
          const logMin = Math.log10(minDays)
          const logMax = Math.log10(maxDays)
          const x = Math.pow(10, logMin + (logMax - logMin) * (i / 100))
          const y = a * Math.pow(x, b)
          xFit.push(x)
          yFit.push(y)
        }
      } else {
        // For linear time scale
        const minDate = new Date(Math.min(...analysisData.map(d => d.date.getTime())))
        const maxDate = new Date(Math.max(...analysisData.map(d => d.date.getTime())))
        const dateSpan = maxDate.getTime() - minDate.getTime()

        for (let i = 0; i <= 100; i++) {
          const dateTime = minDate.getTime() + (dateSpan * (i / 100))
          const date = new Date(dateTime)
          const daysSinceGenesis = getDaysFromGenesis(dateTime)
          const y = a * Math.pow(daysSinceGenesis, b)
          xFit.push(date)
          yFit.push(y)
        }
      }

      traces.push({
        x: xFit,
        y: yFit,
        mode: 'lines',
        type: 'scatter',
        name: `Ratio Power-Law Fit (R²=${r2.toFixed(3)})`,
        line: { color: '#FFA726', dash: 'dot', width: 2 }
      })
    }

    return traces
  }, [analysisData, last7Points, timeScale, showRatioFit, powerLawData])

  // Chart layouts
  const mainLayout = {
    plot_bgcolor: '#262730',
    paper_bgcolor: '#262730',
    font: { color: '#e0e0e0' },
    height: 500,
    margin: { l: 20, r: 20, t: 60, b: 100 },
    yaxis: {
      title: 'Price (USD)',
      type: priceScale === 'Log' ? 'log' : 'linear',
      showgrid: true,
      gridwidth: 1,
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      linecolor: '#3A3C4A',
      zerolinecolor: '#3A3C4A'
    },
    xaxis: {
      title: 'Hashrate (PH/s)',
      type: hashrateScale === 'Log' ? 'log' : 'linear',
      showgrid: true,
      gridwidth: 1,
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      linecolor: '#3A3C4A',
      zerolinecolor: '#3A3C4A'
    },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "right",
      x: 1,
      bgcolor: 'rgba(38, 39, 48, 0.8)'
    },
    hovermode: 'closest'
  }

  const ratioLayout = {
    plot_bgcolor: '#262730',
    paper_bgcolor: '#262730',
    font: { color: '#e0e0e0' },
    height: 250,
    margin: { l: 20, r: 20, t: 30, b: 50 },
    yaxis: {
      title: 'Price/Hashrate Ratio (USD/PH/s)',
      type: ratioScale === 'Log' ? 'log' : 'linear',
      showgrid: true,
      gridwidth: 1,
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      linecolor: '#3A3C4A',
      zerolinecolor: '#3A3C4A'
    },
    xaxis: {
      title: timeScale === 'Log' ? 'Days Since Genesis (Log Scale)' : 'Date',
      type: timeScale === 'Log' ? 'log' : 'linear',
      showgrid: true,
      gridwidth: 1,
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      linecolor: '#3A3C4A',
      zerolinecolor: '#3A3C4A'
    },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "right",
      x: 1,
      bgcolor: 'rgba(38, 39, 48, 0.8)'
    },
    hovermode: 'x unified'
  }

  if (analysisData.length === 0) {
    return (
      <div className={`bg-[#1A1A2E] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="text-red-400 text-lg font-medium mb-2">No Data Available</div>
            <div className="text-[#6B7280] text-sm">Unable to correlate price and hashrate data</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Price Scale */}
          <div className="flex flex-col">
            <label className="text-xs text-[#A0A0B8] mb-1">Price Scale</label>
            <select 
              value={priceScale} 
              onChange={(e) => setPriceScale(e.target.value as 'Linear' | 'Log')}
              className="px-2 py-1 text-xs bg-[#1A1A2E] border border-[#2D2D45] rounded text-white"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Log</option>
            </select>
          </div>

          {/* Hashrate Scale */}
          <div className="flex flex-col">
            <label className="text-xs text-[#A0A0B8] mb-1">Hashrate Scale</label>
            <select 
              value={hashrateScale} 
              onChange={(e) => setHashrateScale(e.target.value as 'Linear' | 'Log')}
              className="px-2 py-1 text-xs bg-[#1A1A2E] border border-[#2D2D45] rounded text-white"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Log</option>
            </select>
          </div>

          {/* Power Law */}
          <div className="flex flex-col">
            <label className="text-xs text-[#A0A0B8] mb-1">Power Law Fit</label>
            <select 
              value={showPowerLaw} 
              onChange={(e) => setShowPowerLaw(e.target.value as 'Hide' | 'Show')}
              className="px-2 py-1 text-xs bg-[#1A1A2E] border border-[#2D2D45] rounded text-white"
            >
              <option value="Hide">Hide</option>
              <option value="Show">Show</option>
            </select>
          </div>

          {/* Ratio Scale */}
          <div className="flex flex-col">
            <label className="text-xs text-[#A0A0B8] mb-1">Ratio Scale</label>
            <select 
              value={ratioScale} 
              onChange={(e) => setRatioScale(e.target.value as 'Linear' | 'Log')}
              className="px-2 py-1 text-xs bg-[#1A1A2E] border border-[#2D2D45] rounded text-white"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Log</option>
            </select>
          </div>

          {/* Time Scale */}
          <div className="flex flex-col">
            <label className="text-xs text-[#A0A0B8] mb-1">Time Scale</label>
            <select 
              value={timeScale} 
              onChange={(e) => setTimeScale(e.target.value as 'Linear' | 'Log')}
              className="px-2 py-1 text-xs bg-[#1A1A2E] border border-[#2D2D45] rounded text-white"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Log</option>
            </select>
          </div>

          {/* Ratio Fit */}
          <div className="flex flex-col">
            <label className="text-xs text-[#A0A0B8] mb-1">Ratio Fit</label>
            <select 
              value={showRatioFit} 
              onChange={(e) => setShowRatioFit(e.target.value as 'Hide' | 'Show')}
              className="px-2 py-1 text-xs bg-[#1A1A2E] border border-[#2D2D45] rounded text-white"
            >
              <option value="Hide">Hide</option>
              <option value="Show">Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-[#262730] rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Price vs Hashrate Analysis</h3>
        <Plot
          data={mainChartData}
          layout={mainLayout}
          style={{ width: '100%', height: '500px' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>

      {/* Ratio Chart */}
      <div className="bg-[#262730] rounded-xl p-4">
        <h4 className="text-md font-semibold text-white mb-4">Price/Hashrate Ratio</h4>
        <Plot
          data={ratioChartData}
          layout={ratioLayout}
          style={{ width: '100%', height: '250px' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>

      {/* Statistics */}
      {powerLawData && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-[#262730] rounded-lg p-4 text-center">
            <div className="text-xs text-[#A0A0B8] mb-1">Power-Law Slope</div>
            <div className="text-lg font-semibold text-[#00FFCC]">
              {powerLawData.priceHashrate.b.toFixed(3)}
            </div>
          </div>
          <div className="bg-[#262730] rounded-lg p-4 text-center">
            <div className="text-xs text-[#A0A0B8] mb-1">Price-HR Fit (R²)</div>
            <div className="text-lg font-semibold text-[#00FFCC]">
              {powerLawData.priceHashrate.r2.toFixed(3)}
            </div>
          </div>
          <div className="bg-[#262730] rounded-lg p-4 text-center">
            <div className="text-xs text-[#A0A0B8] mb-1">Ratio-Time Slope</div>
            <div className="text-lg font-semibold text-[#00FFCC]">
              {powerLawData.ratioTime.b.toFixed(3)}
            </div>
          </div>
          <div className="bg-[#262730] rounded-lg p-4 text-center">
            <div className="text-xs text-[#A0A0B8] mb-1">Ratio-Time Fit (R²)</div>
            <div className="text-lg font-semibold text-[#00FFCC]">
              {powerLawData.ratioTime.r2.toFixed(3)}
            </div>
          </div>
          <div className="bg-[#262730] rounded-lg p-4 text-center">
            <div className="text-xs text-[#A0A0B8] mb-1">Current Hashrate</div>
            <div className="text-lg font-semibold text-[#00FFCC]">
              {analysisData.length > 0 ? `${analysisData[analysisData.length - 1].hashrate.toFixed(2)} PH/s` : 'N/A'}
            </div>
          </div>
          <div className="bg-[#262730] rounded-lg p-4 text-center">
            <div className="text-xs text-[#A0A0B8] mb-1">Current Price</div>
            <div className="text-lg font-semibold text-[#00FFCC]">
              {analysisData.length > 0 ? `$${analysisData[analysisData.length - 1].price.toFixed(4)}` : 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
