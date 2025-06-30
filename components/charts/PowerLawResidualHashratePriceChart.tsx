'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface HashrateChartProps {
  data?: KaspaMetric[]
  hashrateData?: KaspaMetric[]
  priceData?: KaspaMetric[]
  height?: number
  className?: string
}

const GENESIS_DATE = new Date('2021-11-07T00:00:00.000Z').getTime()

function getDaysFromGenesis(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - GENESIS_DATE) / (24 * 60 * 60 * 1000)) + 1)
}

function fitPowerLaw(data: KaspaMetric[]) {
  const validData = data.filter(point => point.value > 0)
  if (validData.length < 2) throw new Error("Not enough valid data points")
  
  const logX = validData.map(point => Math.log(Math.max(1, getDaysFromGenesis(point.timestamp))))
  const logY = validData.map(point => Math.log(point.value))
  
  const n = logX.length
  const sumX = logX.reduce((a, b) => a + b, 0)
  const sumY = logY.reduce((a, b) => a + b, 0)
  const sumXY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)
  const sumX2 = logX.reduce((sum, x) => sum + x * x, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return { a: Math.exp(intercept), b: slope }
}

function fitPricePowerLaw(data: Array<{hashrate: number, price: number}>) {
  if (data.length < 2) throw new Error("Not enough valid data points")
  
  const logData = data.map(point => ({
    x: Math.log(Math.max(0.0001, point.hashrate / 1e15)),
    y: Math.log(Math.max(0.0001, point.price))
  }))
  
  const n = logData.length
  const sumX = logData.reduce((sum, point) => sum + point.x, 0)
  const sumY = logData.reduce((sum, point) => sum + point.y, 0)
  const sumXY = logData.reduce((sum, point) => sum + point.x * point.y, 0)
  const sumX2 = logData.reduce((sum, point) => sum + point.x * point.x, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return { a: Math.exp(intercept), b: slope }
}

function calculateATH(data: KaspaMetric[]) {
  if (data.length === 0) return null
  const athPoint = data.reduce((max, point) => point.value > max.value ? point : max)
  return {
    hashrate: athPoint.value,
    date: new Date(athPoint.timestamp),
    timestamp: athPoint.timestamp,
    daysFromGenesis: getDaysFromGenesis(athPoint.timestamp)
  }
}

function calculate1YL(data: KaspaMetric[]) {
  if (data.length === 0) return null
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000)
  const recentData = data.filter(point => point.timestamp >= oneYearAgo)
  
  const targetData = recentData.length === 0 ? data : recentData
  const oylPoint = targetData.reduce((min, point) => point.value < min.value ? point : min)
  
  return {
    hashrate: oylPoint.value,
    date: new Date(oylPoint.timestamp),
    timestamp: oylPoint.timestamp,
    daysFromGenesis: getDaysFromGenesis(oylPoint.timestamp)
  }
}

function formatHashrate(value: number): string {
  if (value >= 1e18) return `${(value/1e18).toFixed(2)} EH/s`
  if (value >= 1e15) return `${(value/1e15).toFixed(2)} PH/s`
  if (value >= 1e12) return `${(value/1e12).toFixed(2)} TH/s`
  if (value >= 1e9) return `${(value/1e9).toFixed(2)} GH/s`
  if (value >= 1e6) return `${(value/1e6).toFixed(2)} MH/s`
  if (value >= 1e3) return `${(value/1e3).toFixed(2)} KH/s`
  return `${value.toFixed(2)} H/s`
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value/1000).toFixed(1)}k`
  if (value >= 100) return `$${value.toFixed(0)}`
  if (value >= 10) return `$${value.toFixed(1)}`
  if (value >= 1) return `$${value.toFixed(2)}`
  if (value >= 0.01) return `$${value.toFixed(3)}`
  if (value >= 0.001) return `$${value.toFixed(4)}`
  if (value >= 0.0001) return `$${value.toFixed(5)}`
  return `$${value.toExponential(1)}`
}

export default function PowerLawResidualHashratePriceChart({ 
  data, 
  hashrateData, 
  priceData, 
  height = 800,
  className 
}: HashrateChartProps) {
  // Use hashrateData if provided, otherwise fall back to data
  const actualHashrateData = hashrateData || data || []

  const [hashrateScale, setHashrateScale] = useState<'Linear' | 'Log'>('Log')
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timePeriod, setTimePeriod] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | 'All' | 'Full'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  const [showResidual, setShowResidual] = useState<'Hide' | 'Show'>('Show')

  const filteredData = useMemo(() => {
    if (timePeriod === 'All' || timePeriod === 'Full' || actualHashrateData.length === 0) return actualHashrateData
    
    const now = Date.now()
    const days = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '3Y': 1095, '5Y': 1825 }
    const cutoffTime = now - days[timePeriod as keyof typeof days] * 24 * 60 * 60 * 1000
    return actualHashrateData.filter(point => point.timestamp >= cutoffTime)
  }, [actualHashrateData, timePeriod])

  const filteredPriceData = useMemo(() => {
    if (!priceData || timePeriod === 'All' || timePeriod === 'Full' || priceData.length === 0) return priceData || []
    
    const now = Date.now()
    const days = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '3Y': 1095, '5Y': 1825 }
    const cutoffTime = now - days[timePeriod as keyof typeof days] * 24 * 60 * 60 * 1000
    return priceData.filter(point => point.timestamp >= cutoffTime)
  }, [priceData, timePeriod])

  const mergedData = useMemo(() => {
    if (!priceData || !actualHashrateData || priceData.length === 0 || actualHashrateData.length === 0) return []

    const merged: Array<{ timestamp: number, hashrate: number, price: number }> = []
    filteredPriceData.forEach(pricePoint => {
      const priceDate = new Date(pricePoint.timestamp).toDateString()
      const correspondingHashrate = filteredData.find(hashratePoint => {
        const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
        return priceDate === hashrateDate
      })

      if (correspondingHashrate && pricePoint.value > 0 && correspondingHashrate.value > 0) {
        merged.push({
          timestamp: pricePoint.timestamp,
          hashrate: correspondingHashrate.value,
          price: pricePoint.value
        })
      }
    })

    return merged.sort((a, b) => a.timestamp - b.timestamp)
  }, [filteredData, filteredPriceData, actualHashrateData, priceData])

  const powerLawData = useMemo(() => {
    if (showPowerLaw === 'Hide' || actualHashrateData.length < 10) return null
    try {
      return fitPowerLaw(actualHashrateData)
    } catch (error) {
      console.error('Power law calculation failed:', error)
      return null
    }
  }, [actualHashrateData, showPowerLaw])

  const priceResidualData = useMemo(() => {
    if (showResidual === 'Hide' || mergedData.length < 10 || !priceData) return null

    try {
      const allMergedData: Array<{hashrate: number, price: number}> = []
      
      if (priceData && actualHashrateData) {
        priceData.forEach(pricePoint => {
          const priceDate = new Date(pricePoint.timestamp).toDateString()
          const correspondingHashrate = actualHashrateData.find(hashratePoint => {
            const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
            return priceDate === hashrateDate
          })

          if (correspondingHashrate && pricePoint.value > 0 && correspondingHashrate.value > 0) {
            allMergedData.push({
              hashrate: correspondingHashrate.value,
              price: pricePoint.value
            })
          }
        })
      }

      if (allMergedData.length < 10) return null

      const { a, b } = fitPricePowerLaw(allMergedData)

      const residuals = mergedData.map(d => {
        const hashrateInPH = d.hashrate / 1e15
        const expectedPrice = a * Math.pow(hashrateInPH, b)
        const actualPrice = d.price
        const residualPercent = ((actualPrice - expectedPrice) / expectedPrice) * 100
        
        return {
          timestamp: d.timestamp,
          residual: residualPercent
        }
      })

      return { residuals }
    } catch (error) {
      console.error('Price power law residual calculation failed:', error)
      return null
    }
  }, [mergedData, actualHashrateData, priceData, showResidual])

  const athData = useMemo(() => calculateATH(filteredData), [filteredData])
  const oylData = useMemo(() => calculate1YL(filteredData), [filteredData])

  const plotlyData = useMemo(() => {
    if (filteredData.length === 0) return []

    const traces: any[] = []
    
    let xValues: (number | Date)[]
    if (timeScale === 'Log') {
      xValues = filteredData.map(d => getDaysFromGenesis(d.timestamp))
    } else {
      xValues = filteredData.map(d => new Date(d.timestamp))
    }

    const yValues = filteredData.map(d => d.value)

    // Price background trace
    if (filteredPriceData && filteredPriceData.length > 0) {
      let priceXValues: (number | Date)[]
      if (timeScale === 'Log') {
        priceXValues = filteredPriceData.map(d => getDaysFromGenesis(d.timestamp))
      } else {
        priceXValues = filteredPriceData.map(d => new Date(d.timestamp))
      }

      traces.push({
        x: priceXValues,
        y: filteredPriceData.map(d => d.value),
        mode: 'lines',
        type: 'scatter',
        name: 'Kaspa Price',
        line: { color: 'rgba(156, 163, 175, 0.4)', width: 1 },
        yaxis: 'y2',
        connectgaps: true,
        showlegend: false,
        hovertemplate: '<b>Price</b><br>$%{y:.4f}<extra></extra>',
      })
    }

    // Main hashrate trace
    traces.push({
      x: xValues,
      y: yValues,
      mode: 'lines',
      type: 'scatter',
      name: 'Kaspa Hashrate',
      line: { color: '#5B6CFF', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(91, 108, 255, 0.3)',
      connectgaps: true,
      hovertemplate: '<b>Hashrate</b><br>%{y}<extra></extra>',
    })

    // Power law trace
    if (powerLawData) {
      const allDaysFromGenesis = actualHashrateData.map(d => getDaysFromGenesis(d.timestamp))
      const yFit = allDaysFromGenesis.map(x => powerLawData.a * Math.pow(x, powerLawData.b))
      
      const filteredIndices = actualHashrateData.map((d, index) => ({...d, originalIndex: index}))
        .filter(d => filteredData.some(fd => fd.timestamp === d.timestamp))
        .map(d => d.originalIndex)
      
      const viewXFit = filteredIndices.map(i => allDaysFromGenesis[i])
      const viewYFit = filteredIndices.map(i => yFit[i])
      
      let fitX: (number | Date)[]
      if (timeScale === 'Log') {
        fitX = viewXFit
      } else {
        fitX = filteredIndices.map(i => new Date(actualHashrateData[i].timestamp))
      }

      traces.push({
        x: fitX,
        y: viewYFit,
        mode: 'lines',
        type: 'scatter',
        name: 'Power Law',
        line: { color: '#ff8c00', width: 2 },
        hovertemplate: '<b>Power Law</b><br>%{y}<extra></extra>',
      })
    }

    // High and Low markers
    if (athData) {
      const athX = timeScale === 'Log' ? athData.daysFromGenesis : athData.date
      traces.push({
        x: [athX],
        y: [athData.hashrate],
        mode: 'markers+text',
        type: 'scatter',
        name: 'High & Low',
        marker: { color: '#ffffff', size: 8, line: { color: '#5B6CFF', width: 2 } },
        text: [`High ${formatHashrate(athData.hashrate)}`],
        textposition: 'top left',
        textfont: { color: '#ffffff', size: 11 },
        showlegend: true,
      })
    }

    if (oylData) {
      const oylX = timeScale === 'Log' ? oylData.daysFromGenesis : oylData.date
      traces.push({
        x: [oylX],
        y: [oylData.hashrate],
        mode: 'markers+text',
        type: 'scatter',
        name: 'Low',
        legendgroup: 'markers',
        marker: { color: '#ffffff', size: 8, line: { color: '#5B6CFF', width: 2 } },
        text: [`Low ${formatHashrate(oylData.hashrate)}`],
        textposition: 'bottom left',
        textfont: { color: '#ffffff', size: 11 },
        showlegend: false,
      })
    }

    // Residual oscillator
    if (showResidual === 'Show' && priceResidualData?.residuals && priceResidualData.residuals.length > 0) {
      let residualXValues: (number | Date)[]
      if (timeScale === 'Log') {
        residualXValues = priceResidualData.residuals.map(r => getDaysFromGenesis(r.timestamp))
      } else {
        residualXValues = priceResidualData.residuals.map(r => new Date(r.timestamp))
      }

      const residualValues = priceResidualData.residuals.map(r => r.residual)

      traces.push({
        x: residualXValues,
        y: residualValues,
        mode: 'lines',
        type: 'scatter',
        name: 'Power Law Residual (%)',
        yaxis: 'y3',
        line: { color: '#8B5CF6', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(139, 92, 246, 0.2)',
        hovertemplate: '<b>Residual</b><br>%{y:.1f}%<extra></extra>',
      })

      traces.push({
        x: residualXValues,
        y: Array(residualXValues.length).fill(0),
        mode: 'lines',
        type: 'scatter',
        name: 'Fair Value Line',
        yaxis: 'y3',
        line: { color: '#6B7280', width: 1 },
        hoverinfo: 'skip',
        showlegend: false
      })
    }

    return traces
  }, [filteredData, filteredPriceData, timeScale, powerLawData, athData, oylData, showResidual, priceResidualData])

  const plotlyLayout = useMemo(() => {
    if (filteredData.length === 0) return {}

    const mainChartDomain = showResidual === 'Show' && priceResidualData?.residuals ? [0.35, 1] : [0, 1]
    const residualDomain = [0, 0.25]

    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 80, r: filteredPriceData && filteredPriceData.length > 0 ? 80 : 20, t: 20, b: 50 },
      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.02,
        xanchor: "left",
        x: 0,
        bgcolor: 'rgba(0,0,0,0)',
        font: { size: 11 }
      }
    }

    // X-axis configuration
    if (timeScale === 'Log') {
      const daysFromGenesisValues = filteredData.map(d => getDaysFromGenesis(d.timestamp))
      const minDays = Math.min(...daysFromGenesisValues)
      const maxDays = Math.max(...daysFromGenesisValues)
      
      layout.xaxis = {
        title: { text: 'Days Since Genesis (Log Scale)' },
        type: 'log',
        showgrid: true,
        gridcolor: 'rgba(255, 255, 255, 0.1)',
        color: '#9CA3AF',
        range: [Math.log10(Math.max(1, minDays)), Math.log10(maxDays)],
        domain: [0, 1]
      }
    } else {
      const dates = filteredData.map(d => new Date(d.timestamp))
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
      
      layout.xaxis = {
        title: { text: 'Date' },
        type: 'date',
        showgrid: true,
        gridcolor: '#363650',
        color: '#9CA3AF',
        tickformat: '%b %Y',
        range: [minDate.toISOString(), maxDate.toISOString()],
        domain: [0, 1]
      }
    }

    // Primary Y-axis (hashrate)
    layout.yaxis = {
      title: { text: 'Hashrate (H/s)' },
      type: hashrateScale === 'Log' ? 'log' : 'linear',
      gridcolor: '#363650',
      color: '#9CA3AF',
      domain: mainChartDomain
    }

    // Secondary Y-axis (price)
    if (filteredPriceData && filteredPriceData.length > 0) {
      layout.yaxis2 = {
        title: { text: 'Price (USD)', standoff: 20 },
        type: priceScale === 'Log' ? 'log' : 'linear',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        color: '#9CA3AF',
        domain: mainChartDomain
      }
    }

    // Residual Y-axis
    if (showResidual === 'Show' && priceResidualData?.residuals) {
      layout.yaxis3 = {
        title: { text: 'Power Law Residual (%)', font: { size: 14, color: '#8B5CF6' } },
        type: 'linear',
        side: 'left',
        gridcolor: '#363650',
        color: '#8B5CF6',
        tickfont: { color: '#8B5CF6' },
        zerolinecolor: '#6B7280',
        zerolinewidth: 2,
        domain: residualDomain,
        tickformat: '.0f',
        ticksuffix: '%'
      }
    }

    return layout
  }, [filteredData, filteredPriceData, timeScale, hashrateScale, priceScale, height, showResidual, priceResidualData])

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Hashrate Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <span className="text-[#A0A0B8] text-xs">Hashrate:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{hashrateScale}</span>
            </button>
            <div className="absolute top-full mt-1 left-0 w-48 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
              <div className="p-1.5">
                {['Linear', 'Log'].map((scale) => (
                  <div 
                    key={scale}
                    onClick={() => setHashrateScale(scale as 'Linear' | 'Log')}
                    className={`p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      hashrateScale === scale ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      hashrateScale === scale ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {scale} Hashrate
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Residual Control */}
          {filteredPriceData && filteredPriceData.length > 0 && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <span className="text-[#A0A0B8] text-xs">Residual:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{showResidual}</span>
              </button>
              <div className="absolute top-full mt-1 left-0 w-48 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <div className="p-1.5">
                  {['Hide', 'Show'].map((option) => (
                    <div 
                      key={option}
                      onClick={() => setShowResidual(option as 'Hide' | 'Show')}
                      className={`p-2 rounded-md cursor-pointer transition-all duration-150 ${
                        showResidual === option ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                      }`}
                    >
                      <span className={`text-xs font-medium ${
                        showResidual === option ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                      }`}>
                        {option} Residual
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Period Controls */}
        <div className="flex items-center gap-2">
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
                timePeriod === 'All' || timePeriod === 'Full' || timePeriod === '2Y' || timePeriod === '3Y' || timePeriod === '5Y'
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              <span>Max</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 right-0 w-32 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
              <div className="p-1.5">
                {(['2Y', '3Y', '5Y', 'All'] as const).map((period) => (
                  <div 
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      timePeriod === period ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
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
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }} className="w-full">
        <Plot
          data={plotlyData}
          layout={plotlyLayout}
          style={{ width: '100%', height: '100%' }}
          config={{
            displayModeBar: false,
            responsive: true,
            doubleClick: 'autosize',
            scrollZoom: true,
            editable: false
          }}
          useResizeHandler={true}
        />
      </div>
    </div>
  )
}
