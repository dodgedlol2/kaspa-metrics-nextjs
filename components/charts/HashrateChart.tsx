'use client'
import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { KaspaMetric } from '@/lib/sheets'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

interface HashrateChartProps {
  data: KaspaMetric[]
  height?: number
}

export default function HashrateChart({ data, height = 300 }: HashrateChartProps) {
  const chartData = {
    labels: data.map(d => new Date(d.date)),
    datasets: [
      {
        label: 'Hashrate (H/s)',
        data: data.map(d => d.value),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#10B981',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 2,
      },
    ],
  }

  const formatHashrate = (value: number) => {
    if (value >= 1e18) return `${(value / 1e18).toFixed(2)} EH/s`
    if (value >= 1e15) return `${(value / 1e15).toFixed(2)} PH/s`
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)} TH/s`
    return `${value.toLocaleString()} H/s`
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#10B981',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: (context: any) => `Hashrate: ${formatHashrate(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
          callback: (value: any) => formatHashrate(Number(value)),
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
