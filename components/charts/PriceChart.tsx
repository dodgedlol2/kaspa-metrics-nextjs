'use client'
import React, { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { KaspaMetric } from '@/lib/sheets'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

interface PriceChartProps {
  data: KaspaMetric[]
  height?: number
}

// Power law regression function
function fitPowerLaw(data: KaspaMetric[], xKey: 'timestamp' | 'days_from_genesis' = 'timestamp') {
  // Filter valid data points
  const validData = data.filter(point => {
    const xValue = xKey === 'days_from_genesis' 
      ? (point.timestamp - data[0].timestamp) / (24 * 60 * 60 * 1000) + 1
      : point.timestamp
    return xValue > 0 && point.value > 0
  })
  
  if (validData.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  // Transform to log space
  const logX = validData.map(point => {
    const xValue = xKey === 'days_from_genesis' 
      ? (point.timestamp - data[0].timestamp) / (24 * 60 * 60 * 1000) + 1
      : point.timestamp / (24 * 60 * 60 * 1000) // Convert to days for stability
    return Math.log(xValue)
  })
  const logY = validData.map(point => Math.log(point.value))
  
  // Linear regression on log-transformed data
  const n = logX.length
  const sumX = logX.reduce((a, b) => a + b, 0)
  const sumY = logY.reduce((a, b) => a + b, 0)
  const sumXY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)
  const sumX2 = logX.reduce((sum, x) => sum + x * x, 0)
  
  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Calculate R²
  const meanY = sumY / n
  const ssRes = logY.reduce((sum, y, i) => {
    const predicted = intercept + slope * logX[i]
    return sum + Math.pow(y - predicted, 2)
  }, 0)
  const ssTot = logY.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0)
  const r2 = 1 - (ssRes / ssTot)
  
  // Convert back to power law coefficients
  const a = Math.exp(intercept)
  const b = slope
  
  return { a, b, r2 }
}

// Generate power law prediction data
function generatePowerLawData(data: KaspaMetric[], a: number, b: number, multiplier: number = 1, xKey: 'timestamp' | 'days_from_genesis' = 'timestamp') {
  return data.map(point => {
    const xValue = xKey === 'days_from_genesis' 
      ? (point.timestamp - data[0].timestamp) / (24 * 60 * 60 * 1000) + 1
      : point.timestamp / (24 * 60 * 60 * 1000)
    
    return {
      x: xKey === 'days_from_genesis' ? xValue : point.timestamp,
      y: a * Math.pow(xValue, b) * multiplier
    }
  })
}

// Format currency values for display
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
    return `$${value.toExponential(2)}`
  }
}

export default function PriceChart({ data, height = 400 }: PriceChartProps) {
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timePeriod, setTimePeriod] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'All'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')

  // Filter data based on time period
  const filteredData = useMemo(() => {
    if (timePeriod === 'All' || data.length === 0) return data
    
    const now = Date.now()
    const days = {
      '1W': 7, '1M': 30, '3M': 90, 
      '6M': 180, '1Y': 365
    }
    
    const cutoffTime = now - days[timePeriod] * 24 * 60 * 60 * 1000
    return data.filter(point => point.timestamp >= cutoffTime)
  }, [data, timePeriod])

  // Calculate power law regression
  const powerLawData = useMemo(() => {
    if (showPowerLaw === 'Hide' || filteredData.length < 10) return null
    
    try {
      const xKey = timeScale === 'Log' ? 'days_from_genesis' : 'timestamp'
      const { a, b, r2 } = fitPowerLaw(filteredData, xKey)
      
      return {
        regression: generatePowerLawData(filteredData, a, b, 1, xKey),
        support: generatePowerLawData(filteredData, a, b, 0.4, xKey), // -60%
        resistance: generatePowerLawData(filteredData, a, b, 2.2, xKey), // +120%
        r2: r2
      }
    } catch (error) {
      console.error('Power law calculation failed:', error)
      return null
    }
  }, [filteredData, timeScale, showPowerLaw])

  // Prepare chart data
  const chartData = useMemo(() => {
    const datasets: any[] = [
      {
        label: 'Kaspa Price (USD)',
        data: filteredData.map(point => ({
          x: timeScale === 'Log' 
            ? (point.timestamp - filteredData[0]?.timestamp) / (24 * 60 * 60 * 1000) + 1
            : point.timestamp,
          y: point.value
        })),
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#00d4ff',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      }
    ]

    // Add power law datasets if enabled
    if (powerLawData) {
      // Support line (first, for fill reference)
      datasets.push({
        label: 'Support (-60%)',
        data: powerLawData.support,
        borderColor: 'rgba(255, 255, 255, 0.7)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        tension: 0
      })

      // Resistance line (with fill to support)
      datasets.push({
        label: 'Resistance (+120%)',
        data: powerLawData.resistance,
        borderColor: 'rgba(255, 255, 255, 0.7)',
        backgroundColor: 'rgba(100, 100, 100, 0.05)',
        borderWidth: 1.5,
        borderDash: [5, 5],
        fill: '-1', // Fill to previous dataset (support line)
        pointRadius: 0,
        tension: 0
      })

      // Power law regression line
      datasets.push({
        label: `Power Law Fit (R²=${powerLawData.r2.toFixed(3)})`,
        data: powerLawData.regression,
        borderColor: '#ff8c00',
        backgroundColor: 'transparent',
        borderWidth: 3,
        fill: false,
        pointRadius: 0,
        tension: 0
      })
    }

    return { datasets }
  }, [filteredData, timeScale, powerLawData])

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#e2e8f0',
          font: {
            family: 'Inter',
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'line'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (tooltipItems: any[]) => {
            const item = tooltipItems[0]
            if (timeScale === 'Log') {
              return `Day ${Math.round(item.parsed.x)}`
            } else {
              return new Date(item.parsed.x).toLocaleDateString()
            }
          },
          label: (context: any) => {
            const value = context.parsed.y
            return `${context.dataset.label}: ${formatCurrency(value)}`
          }
        }
      },
    },
    scales: {
      x: {
        type: timeScale === 'Log' ? 'logarithmic' as const : 'time' as const,
        title: {
          display: true,
          text: timeScale === 'Log' ? 'Days Since Genesis (Log Scale)' : 'Date',
          color: '#cbd5e1',
          font: {
            family: 'Inter',
            size: 13,
            weight: '600'
          }
        },
        grid: {
          color: timeScale === 'Log' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
          lineWidth: 1.2,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            family: 'Inter',
            size: 11
          }
        }
      },
      y: {
        type: priceScale === 'Log' ? 'logarithmic' as const : 'linear' as const,
        title: {
          display: true,
          text: `Price (USD) ${priceScale === 'Log' ? '- Log Scale' : ''}`,
          color: '#cbd5e1',
          font: {
            family: 'Inter',
            size: 13,
            weight: '600'
          }
        },
        grid: {
          color: priceScale === 'Log' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
          lineWidth: 1.2,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            family: 'Inter',
            size: 11
          },
          callback: (value: any) => formatCurrency(Number(value))
        }
      },
    },
  }

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
              className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-kaspa-blue"
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
              className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-kaspa-blue"
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
              className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-kaspa-blue"
            >
              <option value="Hide">Hide</option>
              <option value="Show">Show</option>
            </select>
          </div>
        </div>

        {/* Time Period Buttons */}
        <div className="flex space-x-2">
          {(['1W', '1M', '3M', '6M', '1Y', 'All'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timePeriod === period
                  ? 'bg-kaspa-gradient text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div style={{ height: `${height}px` }} className="bg-white/5 rounded-lg p-4">
        {filteredData.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 mb-2">No data available for selected time period</p>
              <p className="text-sm text-gray-500">Try selecting a different time range</p>
            </div>
          </div>
        )}
      </div>

      {/* Chart Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-white/5 rounded-lg p-3">
          <span className="text-gray-400">Data Points:</span>
          <span className="text-white ml-2 font-semibold">{filteredData.length}</span>
        </div>
        
        {powerLawData && (
          <div className="bg-white/5 rounded-lg p-3">
            <span className="text-gray-400">Power Law R²:</span>
            <span className="text-white ml-2 font-semibold">{powerLawData.r2.toFixed(4)}</span>
          </div>
        )}
        
        <div className="bg-white/5 rounded-lg p-3">
          <span className="text-gray-400">Time Range:</span>
          <span className="text-white ml-2 font-semibold">{timePeriod}</span>
        </div>
      </div>
    </div>
  )
}
