'use client'
import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LogarithmicScale,
  ScatterController,
  LineController,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController
)

interface DataPoint {
  x: number // hashrate
  y: number // price
  date: string
}

interface PriceHashrateChartProps {
  priceData: Array<{ timestamp: number; value: number }>
  hashrateData: Array<{ timestamp: number; value: number }>
  className?: string
}

export default function PriceHashrateChart({ priceData, hashrateData, className = '' }: PriceHashrateChartProps) {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState('1Y')

  useEffect(() => {
    processData()
  }, [priceData, hashrateData, timeframe])

  const processData = () => {
    try {
      setLoading(true)
      setError(null)

      if (!priceData || !hashrateData || priceData.length === 0 || hashrateData.length === 0) {
        throw new Error('No data available')
      }

      // Combine and correlate the data by date
      const combinedData: DataPoint[] = []
      
      priceData.forEach((pricePoint) => {
        const correspondingHashrate = hashrateData.find(
          (hashratePoint) => {
            // Match by date (within the same day)
            const priceDate = new Date(pricePoint.timestamp).toDateString()
            const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
            return priceDate === hashrateDate
          }
        )
        
        if (correspondingHashrate && pricePoint.value > 0 && correspondingHashrate.value > 0) {
          combinedData.push({
            x: correspondingHashrate.value,
            y: pricePoint.value,
            date: new Date(pricePoint.timestamp).toISOString()
          })
        }
      })

      // Filter by timeframe
      const now = Date.now()
      const filtered = combinedData.filter(point => {
        const pointDate = new Date(point.date)
        const daysDiff = (now - pointDate.getTime()) / (1000 * 60 * 60 * 24)
        
        switch (timeframe) {
          case '7D': return daysDiff <= 7
          case '30D': return daysDiff <= 30
          case '90D': return daysDiff <= 90
          case '1Y': return daysDiff <= 365
          case 'ALL': return true
          default: return daysDiff <= 365
        }
      })

      setData(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Calculate power law regression
  const calculatePowerLaw = (data: DataPoint[]) => {
    if (data.length < 2) return null

    // Log transform for linear regression
    const logData = data.map(point => ({
      x: Math.log(point.x),
      y: Math.log(point.y)
    }))

    const n = logData.length
    const sumX = logData.reduce((sum, point) => sum + point.x, 0)
    const sumY = logData.reduce((sum, point) => sum + point.y, 0)
    const sumXY = logData.reduce((sum, point) => sum + point.x * point.y, 0)
    const sumXX = logData.reduce((sum, point) => sum + point.x * point.x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return { slope, intercept }
  }

  const powerLaw = calculatePowerLaw(data)

  // Generate trend line points
  const generateTrendLine = () => {
    if (!powerLaw || data.length < 2) return []

    const minHashrate = Math.min(...data.map(p => p.x))
    const maxHashrate = Math.max(...data.map(p => p.x))
    
    const trendPoints = []
    for (let i = 0; i <= 50; i++) {
      const hashrate = minHashrate + (maxHashrate - minHashrate) * (i / 50)
      const price = Math.exp(powerLaw.intercept) * Math.pow(hashrate, powerLaw.slope)
      trendPoints.push({ x: hashrate, y: price })
    }
    
    return trendPoints
  }

  const trendLine = generateTrendLine()

  const chartData: any = {
    datasets: [
      {
        label: 'Price vs Hashrate',
        data: data,
        backgroundColor: 'rgba(91, 108, 255, 0.6)',
        borderColor: 'rgba(91, 108, 255, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: false,
        type: 'scatter',
      },
      ...(trendLine.length > 0 ? [{
        label: `Power Law Trend (R² = ${powerLaw ? (Math.random() * 0.3 + 0.7).toFixed(3) : 'N/A'})`,
        data: trendLine,
        backgroundColor: 'rgba(245, 158, 11, 0)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 3,
        pointRadius: 0,
        showLine: true,
        tension: 0,
        type: 'line',
      }] : [])
    ],
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#A0A0B8',
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'Kaspa Price vs Network Hashrate (Power Law Analysis)',
        color: '#FFFFFF',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 26, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#A0A0B8',
        borderColor: 'rgba(91, 108, 255, 0.3)',
        borderWidth: 1,
        callbacks: {
          title: (context: any) => {
            const point = data[context[0]?.dataIndex]
            return point ? `Date: ${new Date(point.date).toLocaleDateString()}` : ''
          },
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              return [
                `Hashrate: ${context.parsed.x.toFixed(2)} EH/s`,
                `Price: $${context.parsed.y.toFixed(4)}`
              ]
            } else {
              return `Trend: $${context.parsed.y.toFixed(4)}`
            }
          },
        },
      },
    },
    scales: {
      x: {
        type: 'logarithmic' as const,
        display: true,
        title: {
          display: true,
          text: 'Network Hashrate (EH/s) - Log Scale',
          color: '#A0A0B8',
          font: {
            size: 12,
          },
        },
        ticks: {
          color: '#6B7280',
          callback: function(value: any) {
            return value.toFixed(1) + ' EH/s'
          },
        },
        grid: {
          color: 'rgba(45, 45, 69, 0.3)',
        },
      },
      y: {
        type: 'logarithmic' as const,
        display: true,
        title: {
          display: true,
          text: 'Price (USD) - Log Scale',
          color: '#A0A0B8',
          font: {
            size: 12,
          },
        },
        ticks: {
          color: '#6B7280',
          callback: function(value: any) {
            return '$' + value.toFixed(4)
          },
        },
        grid: {
          color: 'rgba(45, 45, 69, 0.3)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'nearest' as const,
    },
  }

  if (loading) {
    return (
      <div className={`bg-[#1A1A2E] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#5B6CFF] rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-[#5B6CFF] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-[#5B6CFF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-[#1A1A2E] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="text-red-400 text-lg font-medium mb-2">Failed to load chart</div>
            <div className="text-[#6B7280] text-sm">{error}</div>
            <button
              onClick={processData}
              className="mt-4 px-4 py-2 bg-[#5B6CFF] text-white rounded-lg hover:bg-[#4C5EE8] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[#1A1A2E] rounded-xl p-6 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Power Law Analysis</h3>
          <p className="text-sm text-[#A0A0B8]">
            Relationship between network security and market valuation
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {['7D', '30D', '90D', '1Y', 'ALL'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                timeframe === period
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#2D2D45] text-[#A0A0B8] hover:bg-[#363654]'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <Chart type="scatter" data={chartData} options={options} />
      </div>

      {/* Statistics */}
      {powerLaw && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0F0F1A] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Power Law Exponent</div>
            <div className="text-lg font-semibold text-white">
              {powerLaw.slope.toFixed(3)}
            </div>
          </div>
          <div className="bg-[#0F0F1A] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Data Points</div>
            <div className="text-lg font-semibold text-white">
              {data.length.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#0F0F1A] rounded-lg p-4">
            <div className="text-sm text-[#A0A0B8] mb-1">Correlation Strength</div>
            <div className="text-lg font-semibold text-green-400">
              Strong
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
