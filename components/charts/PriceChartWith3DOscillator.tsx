'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface DataPoint {
  timestamp: number
  value: number
}

interface PriceChartWith3DOscillatorProps {
  priceData: DataPoint[]
  hashrateData: DataPoint[]
  volumeData: KaspaMetric[]
  height?: number
}

// 3D power law fitting function
function fit3DPowerLaw(data: Array<{hashrate: number, price: number, volume: number}>) {
  if (data.length < 10) return null
  
  try {
    const logData = data.map(d => ({
      lnPrice: Math.log(Math.max(0.001, d.price)),
      lnHashrate: Math.log(Math.max(0.001, d.hashrate)),
      lnVolume: Math.log(Math.max(1, d.volume))
    }))
    
    const n = logData.length
    
    const meanLnPrice = logData.reduce((sum, d) => sum + d.lnPrice, 0) / n
    const meanLnHashrate = logData.reduce((sum, d) => sum + d.lnHashrate, 0) / n
    const meanLnVolume = logData.reduce((sum, d) => sum + d.lnVolume, 0) / n
    
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

export default function PriceChartWith3DOscillator({ 
  priceData, 
  hashrateData,
  volumeData,
  height = 800 
}: PriceChartWith3DOscillatorProps) {
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | 'All'>('All')

  // Calculate residuals
  const { mergedData, powerLaw } = useMemo(() => {
    if (!priceData || !hashrateData || !volumeData || 
        priceData.length === 0 || hashrateData.length === 0 || volumeData.length === 0) {
      return { mergedData: [], powerLaw: null }
    }

    const merged: Array<{
      date: Date,
      timestamp: number,
      hashrate: number,
      price: number,
      volume: number,
      residual?: number
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
        merged.push({
          date: new Date(pricePoint.timestamp),
          timestamp: pricePoint.timestamp,
          hashrate: correspondingHashrate.value / 1e15,
          price: pricePoint.value,
          volume: correspondingVolume.value
        })
      }
    })

    const sorted = merged.sort((a, b) => a.date.getTime() - b.date.getTime())

    if (sorted.length < 50) return { mergedData: [], powerLaw: null }

    const powerLawData = sorted.map(d => ({
      hashrate: d.hashrate,
      price: d.price,
      volume: d.volume
    }))
    
    const powerLaw = fit3DPowerLaw(powerLawData)
    if (!powerLaw) return { mergedData: sorted, powerLaw: null }

    // Calculate residuals
    sorted.forEach(point => {
      const predictedPrice = powerLaw.A * Math.pow(point.hashrate, powerLaw.B) * Math.pow(point.volume, powerLaw.C)
      point.residual = ((point.price - predictedPrice) / predictedPrice) * 100
    })

    return { mergedData: sorted, powerLaw }
  }, [priceData, hashrateData, volumeData])

  // Filter by time period
  const filteredData = useMemo(() => {
    if (timePeriod === 'All' || mergedData.length === 0) return mergedData
    
    const now = Date.now()
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    
    return mergedData.filter(point => point.timestamp >= cutoffTime)
  }, [mergedData, timePeriod])

  // Chart data
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return []

    const dates = filteredData.map(d => d.date.toISOString().split('T')[0])
    const prices = filteredData.map(d => d.price)
    const residuals = filteredData.map(d => d.residual || 0)

    // Color residuals
    const residualColors = residuals.map(r => {
      if (r < -50) return 'rgba(34, 197, 94, 0.8)'
      if (r < -25) return 'rgba(74, 222, 128, 0.8)'
      if (r > 50) return 'rgba(239, 68, 68, 0.8)'
      if (r > 25) return 'rgba(248, 113, 113, 0.8)'
      return 'rgba(139, 92, 246, 0.8)'
    })

    return [
      // Price trace
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: prices,
        name: 'Price',
        yaxis: 'y',
        line: {
          color: 'rgba(91, 108, 255, 1)',
          width: 2
        },
        hovertemplate: '<b>%{x}</b><br>Price: $%{y:.4f}<br><extra></extra>'
      },
      // Residual trace
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: dates,
        y: residuals,
        name: '3D Power Law Residual',
        yaxis: 'y2',
        line: {
          color: 'rgba(139, 92, 246, 1)',
          width: 2
        },
        marker: {
          size: 4,
          color: residualColors,
          line: {
            color: 'rgba(139, 92, 246, 1)',
            width: 1
          }
        },
        hovertemplate: '<b>%{x}</b><br>Residual: %{y:.2f}%<br><extra></extra>'
      },
      // Zero line for residuals
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(0),
        name: 'Fair Value',
        yaxis: 'y2',
        line: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          dash: 'dash'
        },
        hoverinfo: 'skip',
        showlegend: false
      },
      // Buy zone line
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(-25),
        name: 'Buy Zone',
        yaxis: 'y2',
        line: {
          color: 'rgba(74, 222, 128, 0.3)',
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip',
        showlegend: false
      },
      // Strong buy zone line
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(-50),
        name: 'Strong Buy',
        yaxis: 'y2',
        line: {
          color: 'rgba(34, 197, 94, 0.3)',
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip',
        showlegend: false
      },
      // Sell zone line
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(25),
        name: 'Sell Zone',
        yaxis: 'y2',
        line: {
          color: 'rgba(248, 113, 113, 0.3)',
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip',
        showlegend: false
      },
      // Strong sell zone line
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(50),
        name: 'Strong Sell',
        yaxis: 'y2',
        line: {
          color: 'rgba(239, 68, 68, 0.3)',
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip',
        showlegend: false
      }
    ] as any[]
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
      title: 'Price (USD)',
      titlefont: { color: '#5B6CFF' },
      tickfont: { color: '#5B6CFF' },
      showgrid: true,
      gridcolor: 'rgba(75, 85, 99, 0.2)',
      side: 'left'
    },
    yaxis2: {
      title: '3D Power Law Residual (%)',
      titlefont: { color: '#8B5CF6' },
      tickfont: { color: '#8B5CF6' },
      overlaying: 'y',
      side: 'right',
      showgrid: false,
      zeroline: true,
      zerolinecolor: 'rgba(255, 255, 255, 0.3)',
      zerolinewidth: 2
    },
    margin: { l: 60, r: 60, t: 40, b: 60 },
    hovermode: 'x unified' as const,
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
      // Oscillator zone shading
      {
        type: 'rect',
        xref: 'paper',
        yref: 'y2',
        x0: 0,
        x1: 1,
        y0: -100,
        y1: -50,
        fillcolor: 'rgba(34, 197, 94, 0.05)',
        line: { width: 0 },
        layer: 'below'
      },
      {
        type: 'rect',
        xref: 'paper',
        yref: 'y2',
        x0: 0,
        x1: 1,
        y0: -50,
        y1: -25,
        fillcolor: 'rgba(74, 222, 128, 0.05)',
        line: { width: 0 },
        layer: 'below'
      },
      {
        type: 'rect',
        xref: 'paper',
        yref: 'y2',
        x0: 0,
        x1: 1,
        y0: 25,
        y1: 50,
        fillcolor: 'rgba(248, 113, 113, 0.05)',
        line: { width: 0 },
        layer: 'below'
      },
      {
        type: 'rect',
        xref: 'paper',
        yref: 'y2',
        x0: 0,
        x1: 1,
        y0: 50,
        y1: 100,
        fillcolor: 'rgba(239, 68, 68, 0.05)',
        line: { width: 0 },
        layer: 'below'
      }
    ]
  } as any

  if (mergedData.length === 0) {
    return (
      <div className="bg-[#1A1A2E] rounded-xl p-6">
        <p className="text-[#A0A0B8] text-center">Loading chart data...</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A2E] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">
            Price Chart with 3D Power Law Oscillator
          </h3>
          <p className="text-sm text-[#A0A0B8]">
            Price movement and deviation from fundamental value (Hashrate × Volume)
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

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-green-500">
          <p className="text-xs font-semibold text-green-400 mb-1">Strong Buy</p>
          <p className="text-xs text-[#A0A0B8]">Residual &lt; -50%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-green-300">
          <p className="text-xs font-semibold text-green-300 mb-1">Buy Zone</p>
          <p className="text-xs text-[#A0A0B8]">-50% to -25%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-red-300">
          <p className="text-xs font-semibold text-red-300 mb-1">Sell Zone</p>
          <p className="text-xs text-[#A0A0B8]">+25% to +50%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-red-500">
          <p className="text-xs font-semibold text-red-400 mb-1">Strong Sell</p>
          <p className="text-xs text-[#A0A0B8]">Residual &gt; +50%</p>
        </div>
      </div>
    </div>
  )
}
