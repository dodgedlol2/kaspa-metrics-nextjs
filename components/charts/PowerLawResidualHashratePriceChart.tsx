// High and Low markers
    if (athData) {
      const athX = timeScale === 'Log' ? athData.daysFromGenesis : athData.date
      traces.push({
        x: [athX],
        y: [athData.hashrate],
        mode: 'markers+text',
        type: 'scatter',
        name: 'All-Time High',
        marker: { color: '#10B981', size: 10, line: { color: '#FFFFFF', width: 2 } },
        text: [`ATH: ${formatHashrate(athData.hashrate)}`],
        textposition: 'top center',
        textfont: { color: '#10B981', size: 11, family: 'Inter' },
        showlegend: true,
        hovertemplate: '<b>All-Time High</b><br>%{customdata}<br><b>Date:</b> %{x}<extra></extra>',
        customdata: [formatHashrate(athData.hashrate)],
      })
    }

    if (oylData'use client'
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
        name: 'Kaspa Price (USD)',
        line: { color: 'rgba(156, 163, 175, 0.4)', width: 1 },
        yaxis: 'y2',
        connectgaps: true,
        showlegend: false,
        hovertemplate: '<b>Price</b><br>%{customdata}<br><b>Date:</b> %{x}<extra></extra>',
        customdata: filteredPriceData.map(d => formatCurrency(d.value)),
      })
    }

    // Main hashrate trace
    traces.push({
      x: xValues,
      y: yValues,
      mode: 'lines',
      type: 'scatter',
      name: 'Kaspa Network Hashrate',
      line: { color: '#5B6CFF', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(91, 108, 255, 0.3)',
      connectgaps: true,
      hovertemplate: '<b>Hashrate</b><br>%{customdata}<br><b>Date:</b> %{x}<extra></extra>',
      customdata: yValues.map(v => formatHashrate(v)),
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
        name: 'Power Law Trend',
        line: { color: '#ff8c00', width: 2, dash: 'dot' },
        hovertemplate: '<b>Power Law</b><br>%{customdata}<br><b>Date:</b> %{x}<extra></extra>',
        customdata: viewYFit.map(v => formatHashrate(v)),
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
        name: 'All-Time High',
        marker: { color: '#10B981', size: 10, line: { color: '#FFFFFF', width: 2 } },
        text: [`ATH: ${formatHashrate(athData.hashrate)}`],
        textposition: 'top center',
        textfont: { color: '#10B981', size: 11, family: 'Inter' },
        showlegend: true,
        hovertemplate: '<b>All-Time High</b><br>%{customdata}<br><b>Date:</b> %{x}<extra></extra>',
        customdata: [formatHashrate(athData.hashrate)],
      })
    }

    if (oylData) {
      const oylX = timeScale === 'Log' ? oylData.daysFromGenesis : oylData.date
      traces.push({
        x: [oylX],
        y: [oylData.hashrate],
        mode: 'markers+text',
        type: 'scatter',
        name: '1-Year Low',
        legendgroup: 'markers',
        marker: { color: '#EF4444', size: 10, line: { color: '#FFFFFF', width: 2 } },
        text: [`1YL: ${formatHashrate(oylData.hashrate)}`],
        textposition: 'bottom center',
        textfont: { color: '#EF4444', size: 11, family: 'Inter' },
        showlegend: true,
        hovertemplate: '<b>1-Year Low</b><br>%{customdata}<br><b>Date:</b> %{x}<extra></extra>',
        customdata: [formatHashrate(oylData.hashrate)],
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
        name: 'Price Residual Oscillator',
        yaxis: 'y3',
        line: { color: '#8B5CF6', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(139, 92, 246, 0.2)',
        hovertemplate: '<b>Price Residual</b><br>%{y:.1f}%<br><b>Date:</b> %{x}<extra></extra>',
      })

      traces.push({
        x: residualXValues,
        y: Array(residualXValues.length).fill(0),
        mode: 'lines',
        type: 'scatter',
        name: 'Fair Value (0%)',
        yaxis: 'y3',
        line: { color: '#6B7280', width: 1, dash: 'dash' },
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
        title: { text: 'Days Since Genesis (Log Scale)', font: { size: 14, color: '#E5E7EB' } },
        type: 'log',
        showgrid: true,
        gridcolor: '#374151',
        color: '#9CA3AF',
        range: [Math.log10(Math.max(1, minDays)), Math.log10(maxDays)],
        domain: [0, 1],
        tickformat: ',d'
      }
    } else {
      const dates = filteredData.map(d => new Date(d.timestamp))
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
      
      layout.xaxis = {
        title: { text: 'Date', font: { size: 14, color: '#E5E7EB' } },
        type: 'date',
        showgrid: true,
        gridcolor: '#374151',
        color: '#9CA3AF',
        tickformat: '%b %Y',
        range: [minDate.toISOString(), maxDate.toISOString()],
        domain: [0, 1]
      }
    }

    // Primary Y-axis (hashrate)
    layout.yaxis = {
      title: { text: 'Network Hashrate', font: { size: 14, color: '#E5E7EB' } },
      type: hashrateScale === 'Log' ? 'log' : 'linear',
      gridcolor: '#374151',
      color: '#9CA3AF',
      domain: mainChartDomain,
      tickformat: hashrateScale === 'Log' ? '.2s' : '.2s',
      hoverformat: '.3s'
    }

    // Secondary Y-axis (price)
    if (filteredPriceData && filteredPriceData.length > 0) {
      layout.yaxis2 = {
        title: { text: 'Price (USD)', font: { size: 14, color: '#E5E7EB' }, standoff: 20 },
        type: priceScale === 'Log' ? 'log' : 'linear',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        color: '#9CA3AF',
        domain: mainChartDomain,
        tickformat: priceScale === 'Log' ? '.4f' : '$.4f',
        hoverformat: '$.6f'
      }
    }

    // Residual Y-axis
    if (showResidual === 'Show' && priceResidualData?.residuals) {
      layout.yaxis3 = {
        title: { text: 'Price Residual (%)', font: { size: 14, color: '#8B5CF6' } },
        type: 'linear',
        side: 'left',
        gridcolor: '#374151',
        color: '#8B5CF6',
        tickfont: { color: '#8B5CF6', size: 11 },
        zerolinecolor: '#6B7280',
        zerolinewidth: 2,
        domain: residualDomain,
        tickformat: '+.0f',
        ticksuffix: '%',
        hoverformat: '+.1f%'
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
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-[#A0A0B8] text-xs">Hashrate:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{hashrateScale}</span>
            </button>
            <div className="absolute top-full mt-1 left-0 w-56 bg-[#0F0F1A]/95 backdrop-blur-sm border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
              <div className="p-2">
                <div className="text-xs text-[#A0A0B8] mb-2 px-2">Hashrate Y-Axis Scale</div>
                {[
                  { value: 'Linear', desc: 'Standard linear scaling' },
                  { value: 'Log', desc: 'Logarithmic scaling for wide ranges' }
                ].map((option) => (
                  <div 
                    key={option.value}
                    onClick={() => setHashrateScale(option.value as 'Linear' | 'Log')}
                    className={`p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      hashrateScale === option.value ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <div className={`text-xs font-medium ${
                      hashrateScale === option.value ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {option.value} Scale
                    </div>
                    <div className="text-xs text-[#A0A0B8] mt-0.5">{option.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Price Scale Control */}
          {filteredPriceData && filteredPriceData.length > 0 && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-[#A0A0B8] text-xs">Price:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{priceScale}</span>
              </button>
              <div className="absolute top-full mt-1 left-0 w-56 bg-[#0F0F1A]/95 backdrop-blur-sm border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <div className="p-2">
                  <div className="text-xs text-[#A0A0B8] mb-2 px-2">Price Y-Axis Scale</div>
                  {[
                    { value: 'Linear', desc: 'Standard linear scaling' },
                    { value: 'Log', desc: 'Logarithmic scaling for wide ranges' }
                  ].map((option) => (
                    <div 
                      key={option.value}
                      onClick={() => setPriceScale(option.value as 'Linear' | 'Log')}
                      className={`p-2 rounded-md cursor-pointer transition-all duration-150 ${
                        priceScale === option.value ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                      }`}
                    >
                      <div className={`text-xs font-medium ${
                        priceScale === option.value ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                      }`}>
                        {option.value} Scale
                      </div>
                      <div className="text-xs text-[#A0A0B8] mt-0.5">{option.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Time Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[#A0A0B8] text-xs">Time:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{timeScale}</span>
            </button>
            <div className="absolute top-full mt-1 left-0 w-56 bg-[#0F0F1A]/95 backdrop-blur-sm border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
              <div className="p-2">
                <div className="text-xs text-[#A0A0B8] mb-2 px-2">Time X-Axis Scale</div>
                {[
                  { value: 'Linear', desc: 'Calendar dates' },
                  { value: 'Log', desc: 'Days since genesis (logarithmic)' }
                ].map((option) => (
                  <div 
                    key={option.value}
                    onClick={() => setTimeScale(option.value as 'Linear' | 'Log')}
                    className={`p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      timeScale === option.value ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <div className={`text-xs font-medium ${
                      timeScale === option.value ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {option.value} Time
                    </div>
                    <div className="text-xs text-[#A0A0B8] mt-0.5">{option.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Power Law Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="text-[#A0A0B8] text-xs">Power Law:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{showPowerLaw}</span>
            </button>
            <div className="absolute top-full mt-1 left-0 w-56 bg-[#0F0F1A]/95 backdrop-blur-sm border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
              <div className="p-2">
                <div className="text-xs text-[#A0A0B8] mb-2 px-2">Power Law Regression Line</div>
                {[
                  { value: 'Hide', desc: 'Hide the power law trend line' },
                  { value: 'Show', desc: 'Show fitted power law trend' }
                ].map((option) => (
                  <div 
                    key={option.value}
                    onClick={() => setShowPowerLaw(option.value as 'Hide' | 'Show')}
                    className={`p-2 rounded-md cursor-pointer transition-all duration-150 ${
                      showPowerLaw === option.value ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <div className={`text-xs font-medium ${
                      showPowerLaw === option.value ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                    }`}>
                      {option.value} Power Law
                    </div>
                    <div className="text-xs text-[#A0A0B8] mt-0.5">{option.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Residual Control */}
          {filteredPriceData && filteredPriceData.length > 0 && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-[#A0A0B8] text-xs">Residual:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{showResidual}</span>
              </button>
              <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/95 backdrop-blur-sm border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <div className="p-2">
                  <div className="text-xs text-[#A0A0B8] mb-2 px-2">Price vs Hashrate Residual Oscillator</div>
                  {[
                    { value: 'Hide', desc: 'Hide the residual oscillator chart' },
                    { value: 'Show', desc: 'Show price deviation from power law trend' }
                  ].map((option) => (
                    <div 
                      key={option.value}
                      onClick={() => setShowResidual(option.value as 'Hide' | 'Show')}
                      className={`p-2 rounded-md cursor-pointer transition-all duration-150 ${
                        showResidual === option.value ? 'bg-[#5B6CFF]/20' : 'hover:bg-[#1A1A2E]/80'
                      }`}
                    >
                      <div className={`text-xs font-medium ${
                        showResidual === option.value ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                      }`}>
                        {option.value} Residual
                      </div>
                      <div className="text-xs text-[#A0A0B8] mt-0.5">{option.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Period Controls */}
        <div className="flex items-center gap-2">
          {(['1W', '1M', '3M', '6M', '1Y'] as const).map((period) => (
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
                {(['2Y', '3Y', '5Y', 'All', 'Full'] as const).map((period) => (
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
                      {period === 'All' ? 'All Time' : period === 'Full' ? 'Full Range' : period}
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
