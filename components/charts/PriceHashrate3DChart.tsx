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

// Kaspa Genesis Date (November 7, 2021)
const KASPA_GENESIS = new Date('2021-11-07').getTime()

// 3D power law fitting function: Price = A × Hashrate^B × Days^C
function fit3DPowerLaw(data: Array<{hashrate: number, price: number, daysSinceGenesis: number}>) {
  if (data.length < 10) return null
  
  try {
    // Transform to log space: ln(Price) = ln(A) + B*ln(Hashrate) + C*ln(Days)
    const logData = data.map(d => ({
      lnPrice: Math.log(Math.max(0.001, d.price)),
      lnHashrate: Math.log(Math.max(0.001, d.hashrate)),
      lnDays: Math.log(Math.max(1, d.daysSinceGenesis))
    }))
    
    const n = logData.length
    
    // Calculate means
    const meanLnPrice = logData.reduce((sum, d) => sum + d.lnPrice, 0) / n
    const meanLnHashrate = logData.reduce((sum, d) => sum + d.lnHashrate, 0) / n
    const meanLnDays = logData.reduce((sum, d) => sum + d.lnDays, 0) / n
    
    // Calculate sums for normal equations
    let sumHH = 0, sumDD = 0, sumHD = 0
    let sumHP = 0, sumDP = 0
    
    for (const d of logData) {
      const h = d.lnHashrate - meanLnHashrate
      const day = d.lnDays - meanLnDays
      const p = d.lnPrice - meanLnPrice
      
      sumHH += h * h
      sumDD += day * day
      sumHD += h * day
      sumHP += h * p
      sumDP += day * p
    }
    
    // Solve 2x2 system for B and C coefficients
    const det = sumHH * sumDD - sumHD * sumHD
    if (Math.abs(det) < 0.001) return null
    
    const B = (sumHP * sumDD - sumDP * sumHD) / det
    const C = (sumDP * sumHH - sumHP * sumHD) / det
    const A = Math.exp(meanLnPrice - B * meanLnHashrate - C * meanLnDays)
    
    // Calculate R²
    let ssRes = 0, ssTot = 0
    for (const d of logData) {
      const predicted = Math.log(A) + B * d.lnHashrate + C * d.lnDays
      ssRes += Math.pow(d.lnPrice - predicted, 2)
      ssTot += Math.pow(d.lnPrice - meanLnPrice, 2)
    }
    const r2 = Math.max(0, 1 - ssRes / ssTot)
    
    return { A, B, C, r2 }
  } catch (error) {
    console.error('3D Power law fitting error:', error)
    return null
  }
}

export default function PriceHashrate3DChart({ priceData, hashrateData, className = '' }: PriceHashrate3DChartProps) {
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [showTrajectory, setShowTrajectory] = useState<'Hide' | 'Show'>('Show')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Hide')
  const [colorBy, setColorBy] = useState<'Time' | 'Price' | 'Hashrate'>('Time')
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [hashrateScale, setHashrateScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')

  const analysisData = useMemo(() => {
    if (!priceData || !hashrateData || priceData.length === 0 || hashrateData.length === 0) {
      return []
    }

    const merged: Array<{
      date: Date,
      timestamp: number,
      hashrate: number,
      price: number,
      timeIndex: number,
      daysSinceGenesis: number
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
          timeIndex: 0, // Will be set below
          daysSinceGenesis: Math.max(1, Math.floor((pricePoint.timestamp - KASPA_GENESIS) / (24 * 60 * 60 * 1000)))
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

  // Calculate 3D power law
  const powerLaw3D = useMemo(() => {
    if (analysisData.length < 50) return null
    
    const powerLawData = analysisData.map(d => ({
      hashrate: d.hashrate,
      price: d.price,
      daysSinceGenesis: d.daysSinceGenesis
    }))
    
    return fit3DPowerLaw(powerLawData)
  }, [analysisData])

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

    const allTraces: any[] = []

    // Calculate colors and sizes
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

    // 3D Scatter plot with hashrate, price, days since genesis
    allTraces.push({
      x: filteredAnalysisData.map(d => d.hashrate),
      y: filteredAnalysisData.map(d => d.price),
      z: filteredAnalysisData.map(d => timeScale === 'Log' ? Math.log10(Math.max(1, d.daysSinceGenesis)) : d.daysSinceGenesis),
      mode: 'markers',
      type: 'scatter3d',
      name: 'Hashrate vs Price vs Network Age',
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
        'Days Since Genesis: %{text}<br>' +
        '<extra></extra>',
      text: filteredAnalysisData.map(d => `${d.daysSinceGenesis} days (${d.date.toISOString().split('T')[0]})`)
    })

    // Add trajectory line if enabled
    if (showTrajectory === 'Show') {
      allTraces.push({
        x: filteredAnalysisData.map(d => d.hashrate),
        y: filteredAnalysisData.map(d => d.price),
        z: filteredAnalysisData.map(d => timeScale === 'Log' ? Math.log10(Math.max(1, d.daysSinceGenesis)) : d.daysSinceGenesis),
        mode: 'lines',
        type: 'scatter3d',
        name: 'Market Evolution Path',
        line: {
          color: '#F59E0B',
          width: 3
        },
        hoverinfo: 'skip',
        showlegend: true
      })
    }

    // Add 3D Power Law as perfectly straight line if enabled
    if (showPowerLaw === 'Show' && powerLaw3D) {
      const { A, B, C, r2 } = powerLaw3D
      
      // Get data ranges
      const hashrateRange = {
        min: Math.min(...filteredAnalysisData.map(d => d.hashrate)),
        max: Math.max(...filteredAnalysisData.map(d => d.hashrate))
      }
      
      const daysRange = {
        min: Math.min(...filteredAnalysisData.map(d => d.daysSinceGenesis)),
        max: Math.max(...filteredAnalysisData.map(d => d.daysSinceGenesis))
      }
      
      // PURE MATHEMATICAL LINE GENERATION IN LOG₁₀ SPACE
      // Power law: Price = A × Hashrate^B × Days^C
      // In log₁₀: log₁₀(Price) = log₁₀(A) + B×log₁₀(Hashrate) + C×log₁₀(Days)
      const log10A = Math.log10(A)
      
      // Define line endpoints in log₁₀ space
      const log10HashrateMin = Math.log10(hashrateRange.min)
      const log10HashrateMax = Math.log10(hashrateRange.max)
      const log10DaysMin = Math.log10(daysRange.min)
      const log10DaysMax = Math.log10(daysRange.max)
      
      // Generate perfectly straight line in log₁₀ coordinates
      const linePoints = []
      const numPoints = 100
      
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        
        // Linear interpolation in LOG₁₀ space (guarantees straight line)
        const log10Hashrate = log10HashrateMin + (log10HashrateMax - log10HashrateMin) * t
        const log10Days = log10DaysMin + (log10DaysMax - log10DaysMin) * t
        
        // Calculate log₁₀(Price) using the linear equation in log space
        const log10Price = log10A + B * log10Hashrate + C * log10Days
        
        // Convert back to actual values for Plotly
        const hashrate = Math.pow(10, log10Hashrate)
        const days = Math.pow(10, log10Days)
        const price = Math.pow(10, log10Price)
        
        linePoints.push({
          hashrate: hashrate,
          days: days,
          predictedPrice: price
        })
      }
      
      // Add power law as a single straight line
      allTraces.push({
        x: linePoints.map(p => p.hashrate),
        y: linePoints.map(p => p.predictedPrice),
        z: linePoints.map(p => timeScale === 'Log' ? Math.log10(Math.max(1, p.days)) : p.days),
        mode: 'lines',
        type: 'scatter3d',
        name: `3D Power Law Line (R²=${r2.toFixed(3)})`,
        line: {
          color: '#EF4444',
          width: 6
        },
        hovertemplate: 
          'Hashrate: %{x:.1f} PH/s<br>' +
          'Predicted Price: $%{y:.2f}<br>' +
          'Days Since Genesis: %{text}<br>' +
          '<extra>Power Law Line</extra>',
        text: linePoints.map(p => `${Math.round(p.days)} days`),
        showlegend: true
      })
      
      // Add equation text annotation
      const midPoint = linePoints[Math.floor(linePoints.length / 2)]
      
      allTraces.push({
        x: [midPoint.hashrate * 1.2],
        y: [midPoint.predictedPrice * 1.5],
        z: [timeScale === 'Log' ? Math.log10(Math.max(1, midPoint.days)) : midPoint.days],
        mode: 'markers+text',
        type: 'scatter3d',
        marker: { size: 0, opacity: 0 },
        text: [`Price = ${A.toFixed(3)} × HR^${B.toFixed(2)} × Days^${C.toFixed(2)}<br>R² = ${r2.toFixed(3)}`],
        textposition: 'middle center',
        textfont: { 
          color: '#EF4444', 
          size: 11,
          family: 'monospace'
        },
        name: '3D Power Law Equation',
        hoverinfo: 'skip',
        showlegend: false
      })
    }

    return allTraces
  }, [filteredAnalysisData, showTrajectory, colorBy, timeScale, showPowerLaw, powerLaw3D])

  const layout: any = {
    height: 900,
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
          text: 'Days Since Genesis',
          font: { color: '#9CA3AF', size: 12 }
        },
        type: timeScale === 'Log' ? 'log' : 'linear',
        color: '#9CA3AF',
        gridcolor: '#363650',
        backgroundcolor: 'rgba(0,0,0,0)',
        showbackground: true
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
          {/* Time Period Controls */}
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

        <div className="flex flex-wrap gap-2">
          {/* Show Power Law */}
          <button
            onClick={() => setShowPowerLaw(showPowerLaw === 'Show' ? 'Hide' : 'Show')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              showPowerLaw === 'Show'
                ? 'bg-[#EF4444] text-white'
                : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
            }`}
          >
            3D Power Law
          </button>

          {/* Show Trajectory */}
          <button
            onClick={() => setShowTrajectory(showTrajectory === 'Show' ? 'Hide' : 'Show')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              showTrajectory === 'Show'
                ? 'bg-[#F59E0B] text-white'
                : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
            }`}
          >
            Trajectory
          </button>

          {/* Scale Controls */}
          <select
            value={priceScale}
            onChange={(e) => setPriceScale(e.target.value as 'Linear' | 'Log')}
            className="px-2.5 py-1.5 rounded-md text-xs bg-[#1A1A2E] text-[#A0A0B8] border border-[#2D2D45] hover:bg-[#2A2A3E]"
          >
            <option value="Linear">Price: Linear</option>
            <option value="Log">Price: Log</option>
          </select>

          <select
            value={hashrateScale}
            onChange={(e) => setHashrateScale(e.target.value as 'Linear' | 'Log')}
            className="px-2.5 py-1.5 rounded-md text-xs bg-[#1A1A2E] text-[#A0A0B8] border border-[#2D2D45] hover:bg-[#2A2A3E]"
          >
            <option value="Linear">HR: Linear</option>
            <option value="Log">HR: Log</option>
          </select>

          <select
            value={timeScale}
            onChange={(e) => setTimeScale(e.target.value as 'Linear' | 'Log')}
            className="px-2.5 py-1.5 rounded-md text-xs bg-[#1A1A2E] text-[#A0A0B8] border border-[#2D2D45] hover:bg-[#2A2A3E]"
          >
            <option value="Linear">Time: Linear</option>
            <option value="Log">Time: Log</option>
          </select>

          <select
            value={colorBy}
            onChange={(e) => setColorBy(e.target.value as 'Time' | 'Price' | 'Hashrate')}
            className="px-2.5 py-1.5 rounded-md text-xs bg-[#1A1A2E] text-[#A0A0B8] border border-[#2D2D45] hover:bg-[#2A2A3E]"
          >
            <option value="Time">Color: Time</option>
            <option value="Price">Color: Price</option>
            <option value="Hashrate">Color: Hashrate</option>
          </select>
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
