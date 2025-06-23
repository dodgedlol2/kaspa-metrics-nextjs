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

// Kaspa genesis date - November 7, 2021
const GENESIS_DATE = new Date('2021-11-07T00:00:00.000Z').getTime()

// Calculate days from genesis for a timestamp
function getDaysFromGenesis(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - GENESIS_DATE) / (24 * 60 * 60 * 1000)) + 1)
}

// Enhanced power law regression function (from Streamlit data_manager.py)
function fitPowerLaw(data: KaspaMetric[], useGenesisDays: boolean = false) {
  // Filter valid data points
  const validData = data.filter(point => point.value > 0)
  
  if (validData.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  // Transform to log space using days from genesis or timestamp
  const logX = validData.map(point => {
    const xValue = useGenesisDays 
      ? getDaysFromGenesis(point.timestamp)
      : point.timestamp / (24 * 60 * 60 * 1000) // Convert to days
    return Math.log(Math.max(1, xValue))
  })
  const logY = validData.map(point => Math.log(point.value))
  
  // Linear regression on log-transformed data (scipy.stats.linregress equivalent)
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
  
  // Get data from last 365 days
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000)
  const recentData = data.filter(point => point.timestamp >= oneYearAgo)
  
  if (recentData.length === 0) {
    // Fallback to global minimum
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

// Generate power law prediction data with proper genesis days calculation
function generatePowerLawData(data: KaspaMetric[], a: number, b: number, multiplier: number = 1, useGenesisDays: boolean = false) {
  return data.map(point => {
    const xValue = useGenesisDays 
      ? getDaysFromGenesis(point.timestamp)
      : point.timestamp / (24 * 60 * 60 * 1000)
    
    return {
      x: useGenesisDays ? xValue : point.timestamp,
      y: a * Math.pow(Math.max(1, xValue), b) * multiplier
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
      const useGenesisDays = timeScale === 'Log'
      const { a, b, r2 } = fitPowerLaw(filteredData, useGenesisDays)
      
      return {
        regression: generatePowerLawData(filteredData, a, b, 1, useGenesisDays),
        support: generatePowerLawData(filteredData, a, b, 0.4, useGenesisDays), // -60%
        resistance: generatePowerLawData(filteredData, a, b, 2.2, useGenesisDays), // +120%
        r2: r2,
        slope: b,
        coefficient: a
      }
    } catch (error) {
      console.error('Power law calculation failed:', error)
      return null
    }
  }, [filteredData, timeScale, showPowerLaw])

  // Calculate ATH and 1YL points
  const athData = useMemo(() => calculateATH(filteredData), [filteredData])
  const oylData = useMemo(() => calculate1YL(filteredData), [filteredData])

  // Prepare chart data with Streamlit-inspired styling
  const chartData = useMemo(() => {
    const datasets: any[] = []

    // Main price line with gradient fill (inspired by Streamlit #5B6CFF)
    const priceDataPoints = filteredData.map(point => ({
      x: timeScale === 'Log' 
        ? getDaysFromGenesis(point.timestamp)
        : point.timestamp,
      y: point.value
    }))

    datasets.push({
      label: 'Kaspa Price (USD)',
      data: priceDataPoints,
      borderColor: '#5B6CFF', // Streamlit primary color
      backgroundColor: 'rgba(91, 108, 255, 0.1)',
      borderWidth: 3,
      tension: 0.3,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#5B6CFF',
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 2,
    })

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

      // Power law regression line (orange like Streamlit)
      datasets.push({
        label: `Power Law Fit (R²=${powerLawData.r2.toFixed(3)})`,
        data: powerLawData.regression,
        borderColor: '#ff8c00', // Orange power law line
        backgroundColor: 'transparent',
        borderWidth: 3,
        fill: false,
        pointRadius: 0,
        tension: 0
      })
    }

    // Add ATH point if visible
    if (athData) {
      const athX = timeScale === 'Log' ? athData.daysFromGenesis : athData.timestamp
      // Check if ATH is in current view
      const minX = Math.min(...priceDataPoints.map(p => p.x))
      const maxX = Math.max(...priceDataPoints.map(p => p.x))
      
      if (athX >= minX && athX <= maxX) {
        datasets.push({
          label: 'ATH',
          data: [{ x: athX, y: athData.price }],
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: 'rgba(91, 108, 255, 0.8)',
          borderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
          fill: false
        })
      }
    }

    // Add 1YL point if visible
    if (oylData) {
      const oylX = timeScale === 'Log' ? oylData.daysFromGenesis : oylData.timestamp
      // Check if 1YL is in current view
      const minX = Math.min(...priceDataPoints.map(p => p.x))
      const maxX = Math.max(...priceDataPoints.map(p => p.x))
      
      if (oylX >= minX && oylX <= maxX) {
        datasets.push({
          label: '1YL',
          data: [{ x: oylX, y: oylData.price }],
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: 'rgba(239, 68, 68, 0.8)',
          borderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
          fill: false
        })
      }
    }

    return { datasets }
  }, [filteredData, timeScale, powerLawData, athData, oylData])

  // Chart options with proper typing
  const chartOptions: any = useMemo(() => {
    const baseOptions = {
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
          type: timeScale === 'Log' ? 'logarithmic' : 'time',
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
          type: priceScale === 'Log' ? 'logarithmic' : 'linear',
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

    return baseOptions
  }, [priceScale, timeScale])

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
              className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-white/5 rounded-lg p-3">
          <span className="text-gray-400">Data Points:</span>
          <span className="text-white ml-2 font-semibold">{filteredData.length}</span>
        </div>
        
        {powerLawData && (
          <>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-gray-400">Power Law R²:</span>
              <span className="text-white ml-2 font-semibold">{powerLawData.r2.toFixed(4)}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-gray-400">Power Law Slope:</span>
              <span className="text-white ml-2 font-semibold">{powerLawData.slope.toFixed(4)}</span>
            </div>
          </>
        )}
        
        <div className="bg-white/5 rounded-lg p-3">
          <span className="text-gray-400">Time Range:</span>
          <span className="text-white ml-2 font-semibold">{timePeriod}</span>
        </div>
      </div>

      {/* ATH and 1YL Info */}
      {(athData || oylData) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
          {athData && (
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-gray-400">All-Time High:</span>
              <span className="text-white ml-2 font-semibold">{formatCurrency(athData.price)}</span>
              <div className="text-xs text-gray-500 mt-1">
                {athData.date.toLocaleDateString()}
              </div>
            </div>
          )}
          
          {oylData && (
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-gray-400">One Year Low:</span>
              <span className="text-white ml-2 font-semibold">{formatCurrency(oylData.price)}</span>
              <div className="text-xs text-gray-500 mt-1">
                {oylData.date.toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
