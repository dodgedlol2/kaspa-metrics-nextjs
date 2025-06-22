'use client'
import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { KaspaMetric } from '@/lib/sheets'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

interface VolumeChartProps {
  data: KaspaMetric[]
  height?: number
}

export default function VolumeChart({ data, height = 300 }: VolumeChartProps) {
  const chartData = {
    labels: data.map(d => new Date(d.date)),
    datasets: [
      {
        label: 'Volume (USD)',
        data: data.map(d => d.value),
        backgroundColor: 'rgba(251, 191, 36, 0.6)',
        borderColor: '#F59E0B',
        borderWidth: 1,
      },
    ],
  }

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
    return `$${value.toLocaleString()}`
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
        borderColor: '#F59E0B',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: (context: any) => `Volume: ${formatVolume(context.parsed.y)}`,
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
          callback: (value: any) => formatVolume(Number(value)),
        },
      },
    },
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}
