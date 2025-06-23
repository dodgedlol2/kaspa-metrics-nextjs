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

// Custom plugin for ATH/1YL annotations
const annotationPlugin = {
  id: 'athOylAnnotations',
  afterDraw: (chart: any, args: any, options: any) => {
    const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart

    ctx.save()
    
    // Draw ATH annotation if visible
    if (options.athData && options.athVisible) {
      const athX = options.timeScale === 'Log' ? options.athData.daysFromGenesis : options.athData.timestamp
      const athPixelX = x.getPixelForValue(athX)
      const athPixelY = y.getPixelForValue(options.athData.price)
      
      if (athPixelX >= left && athPixelX <= right && athPixelY >= top && athPixelY <= bottom) {
        // Draw ATH label
        ctx.fillStyle = '#1e293b'
        ctx.strokeStyle = '#5B6CFF'
        ctx.lineWidth = 1
        
        const athText = `ATH ${options.athData.price.toFixed(4)}`
        ctx.font = '11px Inter'
        const athTextWidth = ctx.measureText(athText).width
        
        const athLabelX = athPixelX + 10
        const athLabelY = athPixelY - 20
        
        // Draw label background
        ctx.fillRect(athLabelX - 4, athLabelY - 14, athTextWidth + 8, 18)
        ctx.strokeRect(athLabelX - 4, athLabelY - 14, athTextWidth + 8, 18)
        
        // Draw label text
        ctx.fillStyle = '#ffffff'
        ctx.fillText(athText, athLabelX, athLabelY)
        
        // Draw pointer line
        ctx.strokeStyle = '#5B6CFF'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(athPixelX, athPixelY)
        ctx.lineTo(athLabelX - 4, athLabelY)
        ctx.stroke()
      }
    }
    
    // Draw 1YL annotation if visible
    if (options.oylData && options.oylVisible) {
      const oylX = options.timeScale === 'Log' ? options.oylData.daysFromGenesis : options.oylData.timestamp
      const oylPixelX = x.getPixelForValue(oylX)
      const oylPixelY = y.getPixelForValue(options.oylData.price)
      
      if (oylPixelX >= left && oylPixelX <= right && oylPixelY >= top && oylPixelY <= bottom) {
        // Draw 1YL label
        ctx.fillStyle = '#1e293b'
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 1
        
        const oylText = `1YL ${options.oylData.price.toFixed(4)}`
        ctx.font = '11px Inter'
        const oylTextWidth = ctx.measureText(oylText).width
        
        const oylLabelX = oylPixelX + 10
        const oylLabelY = oylPixelY + 35
        
        // Draw label background
        ctx.fillRect(oylLabelX - 4, oylLabelY - 14, oylTextWidth + 8, 18)
        ctx.strokeRect(oylLabelX - 4, oylLabelY - 14, oylTextWidth + 8, 18)
        
        // Draw label text
        ctx.fillStyle = '#ffffff'
        ctx.fillText(oylText, oylLabelX, oylLabelY)
        
        // Draw pointer line
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(oylPixelX, oylPixelY)
        ctx.lineTo(oylLabelX - 4, oylLabelY)
        ctx.stroke()
      }
    }
    
    ctx.restore()
  }
}

ChartJS.register(annotationPlugin)

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
function fitPowerLaw(data: KaspaMetric[], useGenesisDays: boolean = true) {
  // Filter valid data points
  const validData = data.filter(point => point.value > 0)
  
  if (validData.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  // CRITICAL: Always use days from genesis for power law calculation
  // This matches the Streamlit behavior where power law is always calculated
  // against days_from_genesis, regardless of display scale
  const logX = validData.map(point => {
    const daysFromGenesis = getDaysFromGenesis(point.timestamp)
    return Math.log(Math.max(1, daysFromGenesis))
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
function generatePowerLawData(data: KaspaMetric[], a: number, b: number, multiplier: number = 1, useGenesisDaysForDisplay: boolean = false) {
  return data.map(point => {
    // ALWAYS calculate Y values using days from genesis (for power law consistency)
    const daysFromGenesis = getDaysFromGenesis(point.timestamp)
    
    // Choose X coordinate based on display preference
    const xValue = useGenesisDaysForDisplay ? daysFromGenesis : point.timestamp
    
    // Power law: y = a * (days_from_genesis)^b * multiplier
    const yValue = a * Math.pow(Math.max(1, daysFromGenesis), b) * multiplier
    
    return {
      x: xValue,
      y: yValue
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

  // Calculate power law regression - ALWAYS use days from genesis for calculation
  const powerLawData = useMemo(() => {
    if (showPowerLaw === 'Hide' || filteredData.length < 10) return null
    
    try {
      // CRITICAL FIX: Always use genesis days for power law calculation,
      // regardless of display scale (matches Streamlit behavior)
      const { a, b, r2 } = fitPowerLaw(filteredData, true) // Always use genesis days
      
      // Generate data for display based on timeScale
      const useGenesisDaysForDisplay = timeScale === 'Log'
      
      return {
        regression: generatePowerLawData(filteredData, a, b, 1, useGenesisDaysForDisplay),
        support: generatePowerLawData(filteredData, a, b, 0.4, useGenesisDaysForDisplay), // -60%
        resistance: generatePowerLawData(filteredData, a, b, 2.2, useGenesisDaysForDisplay), // +120%
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

    // Add ATH point with label annotation if visible
    if (athData) {
      const athX = timeScale === 'Log' ? athData.daysFromGenesis : athData.timestamp
      // Check if ATH is in current view
      const minX = Math.min(...priceDataPoints.map(p => p.x))
      const maxX = Math.max(...priceDataPoints.map(p => p.x))
      
      if (athX >= minX && athX <= maxX) {
        datasets.push({
          label: 'ATH',
          data: [{ x: athX, y: athData.price }],
          backgroundColor: '#ffffff',
          borderColor: '#5B6CFF',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false,
          fill: false
        })
      }
    }

    // Add 1YL point with label annotation if visible
    if (oylData) {
      const oylX = timeScale === 'Log' ? oylData.daysFromGenesis : oylData.timestamp
      // Check if 1YL is in current view
      const minX = Math.min(...priceDataPoints.map(p => p.x))
      const maxX = Math.max(...priceDataPoints.map(p => p.x))
      
      if (oylX >= minX && oylX <= maxX) {
        datasets.push({
          label: '1YL',
          data: [{ x: oylX, y: oylData.price }],
          backgroundColor: '#ffffff',
          borderColor: '#ef4444',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false,
          fill: false
        })
      }
    }

    return { datasets }
  }, [filteredData, timeScale, powerLawData, athData, oylData])

  // Chart options with professional styling and detailed tick marks
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
          align: 'start' as const,
          labels: {
            color: '#e2e8f0',
            font: {
              family: 'Inter',
              size: 12,
              weight: 500
            },
            usePointStyle: true,
            pointStyle: 'line',
            padding: 20,
            generateLabels: (chart: any) => {
              const original = ChartJS.defaults.plugins.legend.labels.generateLabels
              const labels = original(chart)
              
              // Customize legend labels to match your images
              return labels.map((label: any) => {
                if (label.text === 'Kaspa Price (USD)') {
                  label.text = 'Kaspa Price'
                  label.strokeStyle = '#5B6CFF'
                  label.lineWidth = 3
                }
                if (label.text.includes('Power Law')) {
                  label.text = 'Power Law'
                  label.strokeStyle = '#ff8c00'
                  label.lineWidth = 3
                }
                if (label.text === 'ATH') {
                  label.pointStyle = 'circle'
                  label.strokeStyle = '#5B6CFF'
                  label.fillStyle = '#ffffff'
                }
                if (label.text === '1YL') {
                  label.pointStyle = 'circle'
                  label.strokeStyle = '#ef4444'
                  label.fillStyle = '#ffffff'
                }
                return label
              })
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          borderColor: '#475569',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          titleFont: {
            family: 'Inter',
            size: 13,
            weight: 600
          },
          bodyFont: {
            family: 'Inter',
            size: 12
          },
          callbacks: {
            title: (tooltipItems: any[]) => {
              const item = tooltipItems[0]
              if (timeScale === 'Log') {
                return `Day ${Math.round(item.parsed.x)} Since Genesis`
              } else {
                return new Date(item.parsed.x).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              }
            },
            label: (context: any) => {
              const value = context.parsed.y
              const label = context.dataset.label
              
              if (label === 'ATH') {
                return `ATH: ${formatCurrency(value)}`
              } else if (label === '1YL') {
                return `1YL: ${formatCurrency(value)}`
              } else {
                return `${label}: ${formatCurrency(value)}`
              }
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
            color: '#94a3b8',
            font: {
              family: 'Inter',
              size: 12,
              weight: 500
            },
            padding: 10
          },
          grid: {
            color: 'rgba(71, 85, 105, 0.3)',
            lineWidth: 1,
            drawTicks: true,
            tickLength: 6,
            tickColor: 'rgba(71, 85, 105, 0.5)'
          },
          border: {
            color: '#475569',
            width: 1
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'Inter',
              size: 11
            },
            maxTicksLimit: timeScale === 'Log' ? 8 : 10,
            padding: 8,
            callback: timeScale === 'Log' ? 
              (value: any) => {
                // Custom formatting for log scale days
                const num = Number(value)
                if (num >= 1000) return `${(num/1000).toFixed(0)}k`
                if (num >= 100) return num.toFixed(0)
                return num.toFixed(0)
              } : undefined
          },
          ...(timeScale === 'Log' && {
            min: Math.min(...filteredData.map(p => getDaysFromGenesis(p.timestamp))),
            max: Math.max(...filteredData.map(p => getDaysFromGenesis(p.timestamp)))
          })
        },
        y: {
          type: priceScale === 'Log' ? 'logarithmic' : 'linear',
          title: {
            display: true,
            text: 'Price (USD)',
            color: '#94a3b8',
            font: {
              family: 'Inter',
              size: 12,
              weight: 500
            },
            padding: 15
          },
          grid: {
            color: 'rgba(71, 85, 105, 0.3)',
            lineWidth: 1,
            drawTicks: true,
            tickLength: 6,
            tickColor: 'rgba(71, 85, 105, 0.5)'
          },
          border: {
            color: '#475569',
            width: 1
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'Inter',
              size: 11
            },
            padding: 8,
            maxTicksLimit: priceScale === 'Log' ? 8 : 10,
            callback: (value: any) => {
              const num = Number(value)
              if (priceScale === 'Log') {
                // Enhanced log scale formatting
                if (num >= 1) {
                  if (num >= 10) return `${num.toFixed(0)}`
                  return `${num.toFixed(1)}`
                } else if (num >= 0.1) {
                  return `${num.toFixed(2)}`
                } else if (num >= 0.01) {
                  return `${num.toFixed(3)}`
                } else if (num >= 0.001) {
                  return `${num.toFixed(4)}`
                } else {
                  return `${num.toFixed(5)}`
                }
              } else {
                return formatCurrency(num)
              }
            }
          },
          ...(priceScale === 'Log' && {
            min: Math.min(...filteredData.map(p => p.value)) * 0.8,
            max: Math.max(...filteredData.map(p => p.value)) * 1.3
          })
        },
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 4,
          hitRadius: 8
        },
        line: {
          tension: 0.1
        }
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      }
    }

    return baseOptions
  }, [priceScale, timeScale, filteredData])

  return (
    <div className="space-y-8">
      {/* Interactive Controls - BetterStack Style */}
      <div className="flex flex-wrap gap-6 items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-slate-800/40 to-slate-900/40 border border-slate-700/30 backdrop-blur-sm">
        <div className="flex flex-wrap gap-6">
          {/* Price Scale Control */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-300">Price Scale:</label>
            <select
              value={priceScale}
              onChange={(e) => setPriceScale(e.target.value as 'Linear' | 'Log')}
              className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Log</option>
            </select>
          </div>

          {/* Time Scale Control */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-300">Time Scale:</label>
            <select
              value={timeScale}
              onChange={(e) => setTimeScale(e.target.value as 'Linear' | 'Log')}
              className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Log</option>
            </select>
          </div>

          {/* Power Law Control */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-300">Power Law:</label>
            <select
              value={showPowerLaw}
              onChange={(e) => setShowPowerLaw(e.target.value as 'Hide' | 'Show')}
              className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                timePeriod === period
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container - Completely Clean */}
      <div style={{ height: `${height}px` }} className="w-full">
        {filteredData.length > 0 ? (
          <Line 
            data={chartData} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                athOylAnnotations: {
                  athData: athData,
                  oylData: oylData,
                  athVisible: athData && timeScale === 'Log' ? 
                    athData.daysFromGenesis >= Math.min(...filteredData.map(p => getDaysFromGenesis(p.timestamp))) &&
                    athData.daysFromGenesis <= Math.max(...filteredData.map(p => getDaysFromGenesis(p.timestamp))) :
                    athData && athData.timestamp >= Math.min(...filteredData.map(p => p.timestamp)) &&
                    athData.timestamp <= Math.max(...filteredData.map(p => p.timestamp)),
                  oylVisible: oylData && timeScale === 'Log' ? 
                    oylData.daysFromGenesis >= Math.min(...filteredData.map(p => getDaysFromGenesis(p.timestamp))) &&
                    oylData.daysFromGenesis <= Math.max(...filteredData.map(p => getDaysFromGenesis(p.timestamp))) :
                    oylData && oylData.timestamp >= Math.min(...filteredData.map(p => p.timestamp)) &&
                    oylData.timestamp <= Math.max(...filteredData.map(p => p.timestamp)),
                  timeScale: timeScale
                }
              }
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center rounded-2xl bg-slate-800/30 border border-slate-700/30">
            <div className="text-center">
              <p className="text-slate-400 mb-2">No data available for selected time period</p>
              <p className="text-sm text-slate-500">Try selecting a different time range</p>
            </div>
          </div>
        )}
      </div>

      {/* Chart Info - BetterStack Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 text-center">
          <div className="text-sm text-slate-400 mb-1">Data Points</div>
          <div className="text-lg font-bold text-white">{filteredData.length.toLocaleString()}</div>
        </div>
        
        {powerLawData && (
          <>
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 text-center">
              <div className="text-sm text-slate-400 mb-1">Power Law R²</div>
              <div className="text-lg font-bold text-white">{powerLawData.r2.toFixed(4)}</div>
            </div>
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 text-center">
              <div className="text-sm text-slate-400 mb-1">Power Law Slope</div>
              <div className="text-lg font-bold text-white">{powerLawData.slope.toFixed(4)}</div>
            </div>
          </>
        )}
        
        <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 text-center">
          <div className="text-sm text-slate-400 mb-1">Time Range</div>
          <div className="text-lg font-bold text-white">{timePeriod}</div>
        </div>
      </div>

      {/* ATH and 1YL Info */}
      {(athData || oylData) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {athData && (
            <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-300 uppercase tracking-wide">All-Time High</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatCurrency(athData.price)}</div>
              <div className="text-sm text-slate-400">
                {athData.date.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          )}
          
          {oylData && (
            <div className="rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 p-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-300 uppercase tracking-wide">One Year Low</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatCurrency(oylData.price)}</div>
              <div className="text-sm text-slate-400">
                {oylData.date.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
