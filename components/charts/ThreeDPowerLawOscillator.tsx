'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface DataPoint {
  timestamp: number
  value: number
}

interface ThreeDPowerLawOscillatorProps {
  priceData: DataPoint[]
  hashrateData: DataPoint[]
  volumeData: KaspaMetric[]
  height?: number
}

// 3D power law fitting function: Price = A × Hashrate^B × Volume^C
function fit3DPowerLaw(data: Array<{hashrate: number, price: number, volume: number}>) {
  if (data.length < 10) return null
  
  try {
    // Transform to log space: ln(Price) = ln(A) + B*ln(Hashrate) + C*ln(Volume)
    const logData = data.map(d => ({
      lnPrice: Math.log(Math.max(0.001, d.price)),
      lnHashrate: Math.log(Math.max(0.001, d.hashrate)),
      lnVolume: Math.log(Math.max(1, d.volume))
    }))
    
    const n = logData.length
    
    // Calculate means
    const meanLnPrice = logData.reduce((sum, d) => sum + d.lnPrice, 0) / n
    const meanLnHashrate = logData.reduce((sum, d) => sum + d.lnHashrate, 0) / n
    const meanLnVolume = logData.reduce((sum, d) => sum + d.lnVolume, 0) / n
    
    // Calculate sums for normal equations
    let sumHH = 0, sumVV = 0, sumHV = 0
    let sumHP = 0, sumVP = 0
    
    for (const d of logData) {
      const h = d.lnHashrate - meanLnHashrate
      const v = d.lnVolume - meanLnVolume
      const p = d.lnPrice - meanLnPrice
      
      sumHH += h * h
      sumVV += v * v
      sumHV += h * v
      sumHP += h * p
      sumVP += v * p
    }
    
    // Solve 2x2 system for B and C coefficients
    const det = sumHH * sumVV - sumHV * sumHV
    if (Math.abs(det) < 0.001) return null
    
    const B = (sumHP * sumVV - sumVP * sumHV) / det
    const C = (sumVP * sumHH - sumHP * sumHV) / det
    const A = Math.exp(meanLnPrice - B * meanLnHashrate - C * meanLnVolume)
    
    return { A, B, C }
  } catch (error) {
    console.error('3D Power law fitting error:', error)
    return null
  }
}

export default function ThreeDPowerLawOscillator({ 
  priceData, 
  hashrateData, 
  volumeData,
  height = 400 
}: ThreeDPowerLawOscillatorProps) {
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | 'All'>('All')

  // Merge and calculate residuals
  const residualData = useMemo(() => {
    if (!priceData || !hashrateData || !volumeData || 
        priceData.length === 0 || hashrateData.length === 0 || volumeData.length === 0) {
      return []
    }

    // Merge all three datasets
    const merged: Array<{
      date: Date,
      timestamp: number,
      hashrate: number,
      price: number,
      volume: number
    }> = []

    priceData.forEach(pricePoint => {
      const priceDate = new Date(pricePoint.timestamp).toDateString()
      
      const correspondingHashrate = hashrateData.find(hashratePoint => {
        const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
        return priceDate === hashrateDate
      })
      
      const correspondingVolume = volumeData.find(volumePoint => {
        const volumeDate = new Date(volumePoint.timestamp).toDateString()
        return priceDate === volumeDate
      })

      if (correspondingHashrate && correspondingVolume && 
          pricePoint.value > 0 && correspondingHashrate.value > 0 && correspondingVolume.value > 0) {
        const date = new Date(pricePoint.timestamp)
        const hashrate = correspondingHashrate.value / 1e15 // Convert to PH/s
        const price = pricePoint.value
        const volume = correspondingVolume.value

        merged.push({
          date,
          timestamp: pricePoint.timestamp,
          hashrate,
          price,
          volume
        })
      }
    })

    // Sort by date
    const sorted = merged.sort((a, b) => a.date.getTime() - b.date.getTime())

    if (sorted.length < 50) return []

    // Fit 3D power law
    const powerLawData = sorted.map(d => ({
      hashrate: d.hashrate,
      price: d.price,
      volume: d.volume
    }))
    
    const powerLaw = fit3DPowerLaw(powerLawData)
    if (!powerLaw) return []

    // Calculate residuals for each point
    const residuals = sorted.map(point => {
      const predictedPrice = powerLaw.A * Math.pow(point.hashrate, powerLaw.B) * Math.pow(point.volume, powerLaw.C)
      const residual = ((point.price - predictedPrice) / predictedPrice) * 100
      
      return {
        date: point.date,
        timestamp: point.timestamp,
        residual: residual,
        price: point.price,
        predictedPrice: predictedPrice
      }
    })

    return residuals
  }, [priceData, hashrateData, volumeData])

  // Filter data based on time period
  const filteredData = useMemo(() => {
    if (timePeriod === 'All' || residualData.length === 0) return residualData
    
    const now = Date.now()
    const days = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365
    }
    
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    return residualData.filter(point => point.timestamp >= cutoffTime)
  }, [residualData, timePeriod])

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null

    const residuals = filteredData.map(d => d.residual)
    const current = residuals[residuals.length - 1]
    const min = Math.min(...residuals)
    const max = Math.max(...residuals)
    const avg = residuals.reduce((a, b) => a + b, 0) / residuals.length

    // Find extreme buy/sell signals
    const strongBuyZones = filteredData.filter(d => d.residual < -50)
    const strongSellZones = filteredData.filter(d => d.residual > 50)

    return {
      current: current.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
      strongBuyCount: strongBuyZones.length,
      strongSellCount: strongSellZones.length
    }
  }, [filteredData])

  // Create chart data
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return []

    const dates = filteredData.map(d => d.date.toISOString().split('T')[0])
    const residuals = filteredData.map(d => d.residual)

    // Create color array based on residual value
    const colors = residuals.map(r => {
      if (r < -50) return 'rgba(34, 197, 94, 0.8)' // Strong buy - green
      if (r < -25) return 'rgba(74, 222, 128, 0.8)' // Buy - light green
      if (r > 50) return 'rgba(239, 68, 68, 0.8)' // Strong sell - red
      if (r > 25) return 'rgba(248, 113, 113, 0.8)' // Sell - light red
      return 'rgba(139, 92, 246, 0.8)' // Fair value - purple
    })

    return [
      // Main residual line
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: dates,
        y: residuals,
        name: '3D Power Law Residual',
        line: {
          color: 'rgba(139, 92, 246, 1)',
          width: 2
        },
        marker: {
          size: 4,
          color: colors,
          line: {
            color: 'rgba(139, 92, 246, 1)',
            width: 1
          }
        },
        hovertemplate: '<b>%{x}</b><br>Residual: %{y:.2f}%<br><extra></extra>'
      },
      // Zero line
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(0),
        name: 'Fair Value',
        line: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          dash: 'dash'
        },
        hoverinfo: 'skip'
      },
      // Strong buy zone (-50%)
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(-50),
        name: 'Strong Buy Zone',
        line: {
          color: 'rgba(34, 197, 94, 0.3)',
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip'
      },
      // Buy zone (-25%)
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(-25),
        name: 'Buy Zone',
        line: {
          color: 'rgba(74, 222, 128, 0.3)',
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip'
      },
      // Sell zone (+25%)
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(25),
        name: 'Sell Zone',
        line: {
          color: 'rgba(248, 113, 113, 0.3)',
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip'
      },
      // Strong sell zone (+50%)
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(50),
        name: 'Strong Sell Zone',
        line: {
          color: 'rgba(239, 68, 68, 0.3)',
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip'
      }
    ]
  }, [filteredData])

  const layout = {
    autosize: true,
    height: height,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(26, 26, 46, 0.5)',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: '#E5E7EB'
    },
    xaxis: {
      showgrid: true,
      gridcolor: 'rgba(75, 85, 99, 0.2)',
      zeroline: false,
      color: '#9CA3AF',
      title: {
        text: 'Date',
        font: { size: 12 }
      }
    },
    yaxis: {
      showgrid: true,
      gridcolor: 'rgba(75, 85, 99, 0.2)',
      zeroline: true,
      zerolinecolor: 'rgba(255, 255, 255, 0.3)',
      zerolinewidth: 2,
      color: '#9CA3AF',
      title: {
        text: 'Residual %',
        font: { size: 12 }
      }
    },
    margin: { l: 60, r: 20, t: 40, b: 60 },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      x: 0.01,
      y: 0.99,
      bgcolor: 'rgba(15, 15, 26, 0.8)',
      bordercolor: 'rgba(75, 85, 99, 0.3)',
      borderwidth: 1,
      font: { size: 10 }
    },
    shapes: [
      // Strong buy zone shading
      {
        type: 'rect',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        x1: 1,
        y0: -100,
        y1: -50,
        fillcolor: 'rgba(34, 197, 94, 0.1)',
        line: { width: 0 }
      },
      // Buy zone shading
      {
        type: 'rect',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        x1: 1,
        y0: -50,
        y1: -25,
        fillcolor: 'rgba(74, 222, 128, 0.1)',
        line: { width: 0 }
      },
      // Sell zone shading
      {
        type: 'rect',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        x1: 1,
        y0: 25,
        y1: 50,
        fillcolor: 'rgba(248, 113, 113, 0.1)',
        line: { width: 0 }
      },
      // Strong sell zone shading
      {
        type: 'rect',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        x1: 1,
        y0: 50,
        y1: 100,
        fillcolor: 'rgba(239, 68, 68, 0.1)',
        line: { width: 0 }
      }
    ]
  }

  if (residualData.length === 0) {
    return (
      <div className="bg-[#1A1A2E] rounded-xl p-6">
        <p className="text-[#A0A0B8] text-center">
          Loading 3D Power Law oscillator data...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A2E] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">
            3D Power Law Oscillator
          </h3>
          <p className="text-sm text-[#A0A0B8]">
            Price deviation from 3D power law model (Price × Hashrate × Volume)
          </p>
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center gap-2">
          {(['1M', '3M', '6M', '1Y', 'All'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                timePeriod === period
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#0F0F1A] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <div className="bg-[#0F0F1A] rounded-lg p-3">
            <p className="text-xs text-[#A0A0B8] mb-1">Current</p>
            <p className={`text-lg font-bold ${
              parseFloat(stats.current) < -25 ? 'text-green-400' :
              parseFloat(stats.current) > 25 ? 'text-red-400' :
              'text-purple-400'
            }`}>
              {stats.current}%
            </p>
          </div>
          
          <div className="bg-[#0F0F1A] rounded-lg p-3">
            <p className="text-xs text-[#A0A0B8] mb-1">Average</p>
            <p className="text-lg font-bold text-white">{stats.avg}%</p>
          </div>
          
          <div className="bg-[#0F0F1A] rounded-lg p-3">
            <p className="text-xs text-[#A0A0B8] mb-1">Min</p>
            <p className="text-lg font-bold text-green-400">{stats.min}%</p>
          </div>
          
          <div className="bg-[#0F0F1A] rounded-lg p-3">
            <p className="text-xs text-[#A0A0B8] mb-1">Max</p>
            <p className="text-lg font-bold text-red-400">{stats.max}%</p>
          </div>

          <div className="bg-[#0F0F1A] rounded-lg p-3">
            <p className="text-xs text-[#A0A0B8] mb-1">Strong Buys</p>
            <p className="text-lg font-bold text-green-400">{stats.strongBuyCount}</p>
          </div>

          <div className="bg-[#0F0F1A] rounded-lg p-3">
            <p className="text-xs text-[#A0A0B8] mb-1">Strong Sells</p>
            <p className="text-lg font-bold text-red-400">{stats.strongSellCount}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="w-full">
        <Plot
          data={chartData}
          layout={layout}
          style={{ width: '100%', height: '100%' }}
          config={{
            displayModeBar: true,
            responsive: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
          }}
          useResizeHandler={true}
        />
      </div>

      {/* Signal Interpretation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-green-500">
          <p className="text-xs font-semibold text-green-400 mb-1">Strong Buy Signal</p>
          <p className="text-xs text-[#A0A0B8]">Residual &lt; -50%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-green-300">
          <p className="text-xs font-semibold text-green-300 mb-1">Buy Signal</p>
          <p className="text-xs text-[#A0A0B8]">-50% &lt; Residual &lt; -25%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-red-300">
          <p className="text-xs font-semibold text-red-300 mb-1">Sell Signal</p>
          <p className="text-xs text-[#A0A0B8]">25% &lt; Residual &lt; 50%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-red-500">
          <p className="text-xs font-semibold text-red-400 mb-1">Strong Sell Signal</p>
          <p className="text-xs text-[#A0A0B8]">Residual &gt; 50%</p>
        </div>
      </div>
    </div>
  )
}
