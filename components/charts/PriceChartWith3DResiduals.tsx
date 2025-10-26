'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface DataPoint {
  timestamp: number
  value: number
}

interface PriceChartWith3DResidualsProps {
  priceData: KaspaMetric[]
  hashrateData: KaspaMetric[]
  volumeData: KaspaMetric[]
  height?: number
}

// Kaspa genesis date - November 7, 2021
const GENESIS_DATE = new Date('2021-11-07T00:00:00.000Z').getTime()

function getDaysFromGenesis(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - GENESIS_DATE) / (24 * 60 * 60 * 1000)) + 1)
}

// Enhanced power law regression function for price data
function fitPowerLaw(data: KaspaMetric[]) {
  const validData = data.filter(point => point.value > 0)
  
  if (validData.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  const logX = validData.map(point => {
    const daysFromGenesis = getDaysFromGenesis(point.timestamp)
    return Math.log(Math.max(1, daysFromGenesis))
  })
  const logY = validData.map(point => Math.log(point.value))
  
  const n = logX.length
  const sumX = logX.reduce((a, b) => a + b, 0)
  const sumY = logY.reduce((a, b) => a + b, 0)
  const sumXY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)
  const sumX2 = logX.reduce((sum, x) => sum + x * x, 0)
  const sumY2 = logY.reduce((sum, y) => sum + y * y, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
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

export default function PriceChartWith3DResiduals({ 
  priceData, 
  hashrateData,
  volumeData,
  height = 1000 
}: PriceChartWith3DResidualsProps) {
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | 'All'>('All')
  const [priceScale, setPriceScale] = useState<'linear' | 'log'>('log')

  // Calculate 3D residuals
  const residualData = useMemo(() => {
    if (!priceData || !hashrateData || !volumeData || 
        priceData.length === 0 || hashrateData.length === 0 || volumeData.length === 0) {
      return []
    }

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

    if (sorted.length < 50) return []

    const powerLawData = sorted.map(d => ({
      hashrate: d.hashrate,
      price: d.price,
      volume: d.volume
    }))
    
    const powerLaw = fit3DPowerLaw(powerLawData)
    if (!powerLaw) return []

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
  const filteredPriceData = useMemo(() => {
    if (timePeriod === 'All' || !priceData || priceData.length === 0) {
      return priceData.map(p => ({ ...p }))
    }
    
    const now = Date.now()
    const days = {
      '1M': 30, '3M': 90, '6M': 180, 
      '1Y': 365, '2Y': 730, '3Y': 1095
    }
    
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    return priceData.filter(point => point.timestamp >= cutoffTime)
  }, [priceData, timePeriod])

  const filteredResidualData = useMemo(() => {
    if (timePeriod === 'All' || residualData.length === 0) return residualData
    
    const now = Date.now()
    const days = {
      '1M': 30, '3M': 90, '6M': 180, 
      '1Y': 365, '2Y': 730, '3Y': 1095
    }
    
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    return residualData.filter(point => point.timestamp >= cutoffTime)
  }, [residualData, timePeriod])

  // Calculate power law for price chart
  const powerLawLine = useMemo(() => {
    if (!filteredPriceData || filteredPriceData.length === 0) return null
    
    try {
      const { a, b } = fitPowerLaw(filteredPriceData)
      
      return filteredPriceData.map(point => {
        const daysFromGenesis = getDaysFromGenesis(point.timestamp)
        return {
          timestamp: point.timestamp,
          value: a * Math.pow(daysFromGenesis, b)
        }
      })
    } catch (error) {
      return null
    }
  }, [filteredPriceData])

  // Main chart data
  const chartData = useMemo(() => {
    if (!filteredPriceData || filteredPriceData.length === 0) return []

    const dates = filteredPriceData.map(d => new Date(d.timestamp).toISOString().split('T')[0])
    const prices = filteredPriceData.map(d => d.value)

    // Get residuals for coloring
    const priceColors = filteredPriceData.map(pricePoint => {
      const residualPoint = filteredResidualData.find(r => 
        new Date(r.timestamp).toDateString() === new Date(pricePoint.timestamp).toDateString()
      )
      
      if (!residualPoint) return 'rgba(91, 108, 255, 0.3)'
      
      const r = residualPoint.residual
      if (r < -60) return 'rgba(34, 197, 94, 1)' // Strong buy - bright green
      if (r < -40) return 'rgba(74, 222, 128, 1)' // Buy - light green
      if (r > 100) return 'rgba(239, 68, 68, 1)' // Strong sell - bright red
      if (r > 80) return 'rgba(248, 113, 113, 1)' // Sell - light red
      return 'rgba(139, 92, 246, 0.5)' // Fair value - purple
    })

    const priceSizes = filteredPriceData.map(pricePoint => {
      const residualPoint = filteredResidualData.find(r => 
        new Date(r.timestamp).toDateString() === new Date(pricePoint.timestamp).toDateString()
      )
      
      if (!residualPoint) return 3
      
      const r = Math.abs(residualPoint.residual)
      if (r > 100) return 8 // Large bubble for extreme values (strong sell)
      if (r > 80) return 6 // Medium bubble
      if (r > 60) return 8 // Large bubble for strong buy
      if (r > 40) return 6 // Medium bubble for buy zone
      return 3 // Small bubble
    })

    const traces: any[] = [
      // Price line with colored bubbles
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: dates,
        y: prices,
        name: 'Price',
        xaxis: 'x',
        yaxis: 'y',
        line: {
          color: 'rgba(91, 108, 255, 0.6)',
          width: 2
        },
        marker: {
          size: priceSizes,
          color: priceColors,
          line: {
            color: 'rgba(255, 255, 255, 0.3)',
            width: 1
          }
        },
        hovertemplate: '<b>%{x}</b><br>Price: $%{y:.4f}<br><extra></extra>'
      }
    ]

    // Add power law line
    if (powerLawLine) {
      const plDates = powerLawLine.map(d => new Date(d.timestamp).toISOString().split('T')[0])
      const plValues = powerLawLine.map(d => d.value)
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: plDates,
        y: plValues,
        name: 'Power Law',
        xaxis: 'x',
        yaxis: 'y',
        line: {
          color: 'rgba(239, 68, 68, 0.5)',
          width: 2,
          dash: 'dash'
        },
        hovertemplate: '<b>%{x}</b><br>Power Law: $%{y:.4f}<br><extra></extra>'
      })
    }

    return traces
  }, [filteredPriceData, filteredResidualData, powerLawLine])

  // Oscillator chart data
  const oscillatorData = useMemo(() => {
    if (filteredResidualData.length === 0) return []

    const dates = filteredResidualData.map(d => d.date.toISOString().split('T')[0])
    const residuals = filteredResidualData.map(d => d.residual)

    const colors = residuals.map(r => {
      if (r < -60) return 'rgba(34, 197, 94, 0.8)'
      if (r < -40) return 'rgba(74, 222, 128, 0.8)'
      if (r > 100) return 'rgba(239, 68, 68, 0.8)'
      if (r > 80) return 'rgba(248, 113, 113, 0.8)'
      return 'rgba(139, 92, 246, 0.8)'
    })

    return [
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: dates,
        y: residuals,
        name: '3D Residual',
        xaxis: 'x2',
        yaxis: 'y2',
        line: {
          color: 'rgba(139, 92, 246, 1)',
          width: 2
        },
        marker: {
          size: 4,
          color: colors
        },
        hovertemplate: '<b>%{x}</b><br>Residual: %{y:.2f}%<br><extra></extra>'
      },
      {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: Array(dates.length).fill(0),
        name: 'Fair Value',
        xaxis: 'x2',
        yaxis: 'y2',
        line: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          dash: 'dash'
        },
        hoverinfo: 'skip',
        showlegend: false
      }
    ]
  }, [filteredResidualData])

  const layout = {
    autosize: true,
    height: height,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(26, 26, 46, 0.5)',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: '#E5E7EB'
    },
    grid: {
      rows: 2,
      columns: 1,
      pattern: 'independent',
      roworder: 'top to bottom'
    },
    xaxis: {
      showgrid: true,
      gridcolor: 'rgba(75, 85, 99, 0.2)',
      zeroline: false,
      color: '#9CA3AF',
      anchor: 'y'
    },
    yaxis: {
      title: 'Price (USD)',
      type: priceScale,
      showgrid: true,
      gridcolor: 'rgba(75, 85, 99, 0.2)',
      zeroline: false,
      color: '#9CA3AF',
      domain: [0.3, 1]
    },
    xaxis2: {
      showgrid: true,
      gridcolor: 'rgba(75, 85, 99, 0.2)',
      zeroline: false,
      color: '#9CA3AF',
      title: 'Date',
      anchor: 'y2'
    },
    yaxis2: {
      title: '3D Power Law Residual (%)',
      showgrid: true,
      gridcolor: 'rgba(75, 85, 99, 0.2)',
      zeroline: true,
      zerolinecolor: 'rgba(255, 255, 255, 0.3)',
      zerolinewidth: 2,
      color: '#9CA3AF',
      domain: [0, 0.25]
    },
    margin: { l: 60, r: 40, t: 40, b: 60 },
    hovermode: 'x unified' as const,
    showlegend: true,
    legend: {
      x: 0.01,
      y: 0.99,
      bgcolor: 'rgba(15, 15, 26, 0.8)',
      bordercolor: 'rgba(75, 85, 99, 0.3)',
      borderwidth: 1,
      font: { size: 10 }
    }
  } as any

  if (!priceData || priceData.length === 0) {
    return (
      <div className="bg-[#1A1A2E] rounded-xl p-6">
        <p className="text-[#A0A0B8] text-center">Loading chart data...</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A2E] rounded-xl p-6">
      {/* Header with controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">
            Price Chart with 3D Power Law Signals
          </h3>
          <p className="text-sm text-[#A0A0B8]">
            Colored bubbles show buy/sell signals based on 3D power law residuals
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Scale Toggle */}
          <div className="flex items-center gap-2 bg-[#0F0F1A] rounded-md p-1">
            <button
              onClick={() => setPriceScale('linear')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                priceScale === 'linear'
                  ? 'bg-[#5B6CFF] text-white'
                  : 'text-[#A0A0B8] hover:text-white'
              }`}
            >
              Linear
            </button>
            <button
              onClick={() => setPriceScale('log')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                priceScale === 'log'
                  ? 'bg-[#5B6CFF] text-white'
                  : 'text-[#A0A0B8] hover:text-white'
              }`}
            >
              Log
            </button>
          </div>

          {/* Time Period */}
          <div className="flex items-center gap-2">
            {(['1M', '3M', '6M', '1Y', 'All'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
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
      </div>

      {/* Chart */}
      <div className="w-full">
        <Plot
          data={[...chartData, ...oscillatorData]}
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

      {/* Signal Legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <p className="text-xs font-semibold text-green-400">Strong Buy</p>
          </div>
          <p className="text-xs text-[#A0A0B8]">Residual &lt; -60%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-green-300">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-300"></div>
            <p className="text-xs font-semibold text-green-300">Buy Zone</p>
          </div>
          <p className="text-xs text-[#A0A0B8]">-60% to -40%</p>
        </div>

        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-purple-400">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-purple-400"></div>
            <p className="text-xs font-semibold text-purple-400">Fair Value</p>
          </div>
          <p className="text-xs text-[#A0A0B8]">-40% to +80%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-red-300">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-300"></div>
            <p className="text-xs font-semibold text-red-300">Sell Zone</p>
          </div>
          <p className="text-xs text-[#A0A0B8]">+80% to +100%</p>
        </div>
        
        <div className="bg-[#0F0F1A] rounded-lg p-3 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <p className="text-xs font-semibold text-red-400">Strong Sell</p>
          </div>
          <p className="text-xs text-[#A0A0B8]">Residual &gt; +100%</p>
        </div>
      </div>
    </div>
  )
}
