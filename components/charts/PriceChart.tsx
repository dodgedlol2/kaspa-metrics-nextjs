'use client'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { KaspaMetric } from '@/lib/sheets'

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

// Enhanced power law regression function
function fitPowerLaw(data: KaspaMetric[]) {
  const validData = data.filter(point => point.value > 0)
  
  if (validData.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  // Always use days from genesis for power law calculation
  const logX = validData.map(point => {
    const daysFromGenesis = getDaysFromGenesis(point.timestamp)
    return Math.log(Math.max(1, daysFromGenesis))
  })
  const logY = validData.map(point => Math.log(point.value))
  
  // Linear regression on log-transformed data
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

// Generate power law prediction data
function generatePowerLawData(data: KaspaMetric[], a: number, b: number, multiplier: number = 1, useGenesisDaysForDisplay: boolean = false) {
  return data.map(point => {
    const daysFromGenesis = getDaysFromGenesis(point.timestamp)
    const xValue = useGenesisDaysForDisplay ? daysFromGenesis : point.timestamp
    const yValue = a * Math.pow(Math.max(1, daysFromGenesis), b) * multiplier
    
    return { x: xValue, y: yValue }
  })
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
  
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000)
  const recentData = data.filter(point => point.timestamp >= oneYearAgo)
  
  if (recentData.length === 0) {
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

// Professional currency formatting
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
    return `$${value.toExponential(1)}`
  }
}

// Generate precise logarithmic ticks (1,2,5 pattern) - CRITICAL FOR PROFESSIONAL CHARTS
function generateLogTicks(min: number, max: number): number[] {
  const ticks: number[] = []
  const logMin = Math.floor(Math.log10(min))
  const logMax = Math.ceil(Math.log10(max))
  
  for (let i = logMin - 1; i <= logMax + 1; i++) {
    const base = Math.pow(10, i)
    
    // Professional 1,2,5 pattern for logarithmic scales
    for (const mult of [1, 2, 3, 5]) {
      const value = mult * base
      if (value >= min * 0.3 && value <= max * 3) {
        ticks.push(value)
      }
    }
  }
  
  return Array.from(new Set(ticks)).sort((a, b) => a - b)
}

// Generate time-based logarithmic ticks for days from genesis
function generateTimeTicks(min: number, max: number): number[] {
  const ticks: number[] = []
  
  // Key milestone days that make sense for Kaspa analysis
  const milestones = [
    50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 
    600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500,
    1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000
  ]
  
  return milestones.filter(day => day >= min * 0.8 && day <= max * 1.2)
}

export default function PriceChart({ data, height = 600 }: PriceChartProps) {
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timePeriod, setTimePeriod] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'All'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  
  const svgRef = useRef<SVGSVGElement>(null)

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
      const { a, b, r2 } = fitPowerLaw(filteredData)
      const useGenesisDaysForDisplay = timeScale === 'Log'
      
      return {
        regression: generatePowerLawData(filteredData, a, b, 1, useGenesisDaysForDisplay),
        support: generatePowerLawData(filteredData, a, b, 0.4, useGenesisDaysForDisplay),
        resistance: generatePowerLawData(filteredData, a, b, 2.2, useGenesisDaysForDisplay),
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

  // Professional D3 Chart Creation
  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const margin = { top: 40, right: 80, bottom: 100, left: 100 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Prepare data for D3
    const chartData = filteredData.map(d => ({
      x: timeScale === 'Log' ? getDaysFromGenesis(d.timestamp) : d.timestamp,
      y: d.value,
      date: new Date(d.timestamp),
      originalTimestamp: d.timestamp
    }))

    // Create scales with proper domains
    const xExtent = d3.extent(chartData, d => d.x) as [number, number]
    const yExtent = d3.extent(chartData, d => d.y) as [number, number]

    let xScale: any, yScale: any

    // Time scale setup
    if (timeScale === 'Log') {
      xScale = d3.scaleLog()
        .domain([Math.max(1, xExtent[0] * 0.9), xExtent[1] * 1.1])
        .range([0, width])
        .clamp(true)
    } else {
      const dateExtent = d3.extent(chartData, d => d.date) as [Date, Date]
      xScale = d3.scaleTime()
        .domain(dateExtent)
        .range([0, width])
    }

    // Price scale setup
    if (priceScale === 'Log') {
      yScale = d3.scaleLog()
        .domain([Math.max(0.0001, yExtent[0] * 0.5), yExtent[1] * 2])
        .range([chartHeight, 0])
        .clamp(true)
    } else {
      yScale = d3.scaleLinear()
        .domain([0, yExtent[1] * 1.1])
        .range([chartHeight, 0])
    }

    // Create professional gradient
    const defs = svg.append("defs")
    
    const gradient = defs.append("linearGradient")
      .attr("id", "priceGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", chartHeight + margin.top)
      .attr("x2", 0).attr("y2", margin.top)

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#5B6CFF")
      .attr("stop-opacity", 0.2)

    gradient.append("stop")
      .attr("offset", "50%")
      .attr("stop-color", "#5B6CFF")
      .attr("stop-opacity", 0.4)

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#5B6CFF")
      .attr("stop-opacity", 0.1)

    // Power law lines (draw first, behind price data)
    if (powerLawData) {
      const powerLine = d3.line<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX)

      // Support line (lower band)
      g.append("path")
        .datum(powerLawData.support.filter(d => d.y > 0))
        .attr("fill", "none")
        .attr("stroke", "rgba(255, 255, 255, 0.5)")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "8,4")
        .attr("d", powerLine)

      // Resistance line (upper band)
      g.append("path")
        .datum(powerLawData.resistance.filter(d => d.y > 0))
        .attr("fill", "none")
        .attr("stroke", "rgba(255, 255, 255, 0.5)")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "8,4")
        .attr("d", powerLine)

      // Main power law regression line
      g.append("path")
        .datum(powerLawData.regression.filter(d => d.y > 0))
        .attr("fill", "none")
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 3)
        .attr("d", powerLine)
    }

    // Create area fill
    const area = d3.area<{x: number, y: number}>()
      .x(d => xScale(d.x))
      .y0(chartHeight)
      .y1(d => yScale(d.y))
      .curve(d3.curveMonotoneX)

    g.append("path")
      .datum(chartData)
      .attr("fill", "url(#priceGradient)")
      .attr("d", area)

    // Main price line
    const line = d3.line<{x: number, y: number}>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveMonotoneX)

    g.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#5B6CFF")
      .attr("stroke-width", 3)
      .attr("d", line)

    // Professional axis creation with precise ticks
    let xAxis: any, yAxis: any

    if (timeScale === 'Log') {
      const xTicks = generateTimeTicks(xExtent[0], xExtent[1])
      xAxis = d3.axisBottom(xScale)
        .tickValues(xTicks)
        .tickFormat((d: any) => d3.format(".0f")(d))
        .tickSize(6)
    } else {
      xAxis = d3.axisBottom(xScale as d3.ScaleTime<number, number, never>)
        .ticks(8)
        .tickFormat((d: any) => d3.timeFormat("%b %Y")(d))
        .tickSize(6)
    }

    if (priceScale === 'Log') {
      const yTicks = generateLogTicks(yExtent[0] * 0.5, yExtent[1] * 2)
      yAxis = d3.axisLeft(yScale)
        .tickValues(yTicks)
        .tickFormat((d: any) => formatCurrency(d))
        .tickSize(6)
    } else {
      yAxis = d3.axisLeft(yScale)
        .ticks(8)
        .tickFormat((d: any) => formatCurrency(d))
        .tickSize(6)
    }

    // Add grid lines (subtle, professional)
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis.tickSize(-chartHeight).tickFormat(""))
      .selectAll("line")
      .style("stroke", "rgba(148, 163, 184, 0.15)")
      .style("stroke-width", 1)

    g.append("g")
      .attr("class", "grid")
      .call(yAxis.tickSize(-width).tickFormat(""))
      .selectAll("line")
      .style("stroke", "rgba(148, 163, 184, 0.15)")
      .style("stroke-width", 1)

    // Add main axes
    const xAxisGroup = g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .attr("class", "x-axis")
      .call(xAxis)

    const yAxisGroup = g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)

    // Style axes professionally
    g.selectAll(".domain")
      .style("stroke", "#475569")
      .style("stroke-width", 1.5)

    g.selectAll(".tick line")
      .style("stroke", "#475569")
      .style("stroke-width", 1)

    g.selectAll(".tick text")
      .style("fill", "#94a3b8")
      .style("font-family", "Inter, system-ui, sans-serif")
      .style("font-size", "12px")
      .style("font-weight", "500")

    // Professional axis labels
    g.append("text")
      .attr("transform", `translate(${width/2}, ${chartHeight + 70})`)
      .style("text-anchor", "middle")
      .style("fill", "#cbd5e1")
      .style("font-family", "Inter, system-ui, sans-serif")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .text(timeScale === 'Log' ? 'Days Since Genesis (Log Scale)' : 'Date')

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - (chartHeight / 2))
      .style("text-anchor", "middle")
      .style("fill", "#cbd5e1")
      .style("font-family", "Inter, system-ui, sans-serif")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .text(`Price (USD) ${priceScale === 'Log' ? '- Log Scale' : ''}`)

    // ATH marker
    if (athData) {
      const athX = timeScale === 'Log' ? athData.daysFromGenesis : athData.timestamp
      const athDisplayX = xScale(athX)
      const athDisplayY = yScale(athData.price)

      // ATH circle
      g.append("circle")
        .attr("cx", athDisplayX)
        .attr("cy", athDisplayY)
        .attr("r", 8)
        .style("fill", "#ffffff")
        .style("stroke", "#5B6CFF")
        .style("stroke-width", 3)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))")

      // ATH label with background
      const athLabel = g.append("g")
        .attr("transform", `translate(${athDisplayX + 15}, ${athDisplayY - 15})`)

      athLabel.append("rect")
        .attr("x", -5)
        .attr("y", -12)
        .attr("width", 85)
        .attr("height", 20)
        .attr("rx", 4)
        .style("fill", "rgba(0, 0, 0, 0.8)")
        .style("stroke", "#5B6CFF")
        .style("stroke-width", 1)

      athLabel.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "#ffffff")
        .style("font-family", "Inter, system-ui, sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "700")
        .text(`ATH ${formatCurrency(athData.price)}`)
    }

    // 1YL marker
    if (oylData) {
      const oylX = timeScale === 'Log' ? oylData.daysFromGenesis : oylData.timestamp
      const oylDisplayX = xScale(oylX)
      const oylDisplayY = yScale(oylData.price)

      // 1YL circle
      g.append("circle")
        .attr("cx", oylDisplayX)
        .attr("cy", oylDisplayY)
        .attr("r", 8)
        .style("fill", "#ffffff")
        .style("stroke", "#ef4444")
        .style("stroke-width", 3)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))")

      // 1YL label with background
      const oylLabel = g.append("g")
        .attr("transform", `translate(${oylDisplayX + 15}, ${oylDisplayY + 25})`)

      oylLabel.append("rect")
        .attr("x", -5)
        .attr("y", -12)
        .attr("width", 85)
        .attr("height", 20)
        .attr("rx", 4)
        .style("fill", "rgba(0, 0, 0, 0.8)")
        .style("stroke", "#ef4444")
        .style("stroke-width", 1)

      oylLabel.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "#ffffff")
        .style("font-family", "Inter, system-ui, sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "700")
        .text(`1YL ${formatCurrency(oylData.price)}`)
    }

  }, [filteredData, priceScale, timeScale, powerLawData, athData, oylData, height])

  return (
    <div className="space-y-8">
      {/* Professional Control Panel */}
      <div className="flex flex-wrap gap-6 items-center justify-between bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex flex-wrap gap-6">
          {/* Price Scale Control */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-slate-300">Price Scale:</label>
            <select
              value={priceScale}
              onChange={(e) => setPriceScale(e.target.value as 'Linear' | 'Log')}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="Linear">Linear</option>
              <option value="Log">Logarithmic</option>
            </select>
          </div>

          {/* Time Scale Control */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-slate-300">Time Scale:</label>
            <select
              value={timeScale}
              onChange={(e) => setTimeScale(e.target.value as 'Linear' | 'Log')}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="Linear">Date</option>
              <option value="Log">Days from Genesis</option>
            </select>
          </div>

          {/* Power Law Control */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-semibold text-slate-300">Power Law:</label>
            <select
              value={showPowerLaw}
              onChange={(e) => setShowPowerLaw(e.target.value as 'Hide' | 'Show')}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="Hide">Hidden</option>
              <option value="Show">Visible</option>
            </select>
          </div>
        </div>

        {/* Time Period Buttons */}
        <div className="flex space-x-2">
          {(['1W', '1M', '3M', '6M', '1Y', 'All'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                timePeriod === period
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Professional Chart Container */}
      <div 
        style={{ height: `${height}px` }} 
        className="w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 shadow-2xl"
      >
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Professional Analytics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="text-slate-400 text-sm font-medium">Data Points</div>
          <div className="text-white text-2xl font-bold mt-1">{filteredData.length.toLocaleString()}</div>
        </div>
        
        {powerLawData && (
          <>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="text-slate-400 text-sm font-medium">Power Law R²</div>
              <div className="text-emerald-400 text-2xl font-bold mt-1">{powerLawData.r2.toFixed(4)}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="text-slate-400 text-sm font-medium">Power Law Slope</div>
              <div className="text-blue-400 text-2xl font-bold mt-1">{powerLawData.slope.toFixed(4)}</div>
            </div>
          </>
        )}
        
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="text-slate-400 text-sm font-medium">Time Range</div>
          <div className="text-white text-2xl font-bold mt-1">{timePeriod}</div>
        </div>
      </div>

      {/* ATH and 1YL Professional Stats */}
      {(athData || oylData) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {athData && (
            <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 rounded-xl p-6 border border-blue-500/30">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <div className="text-blue-400 text-sm font-semibold">ALL-TIME HIGH</div>
              </div>
              <div className="text-white text-3xl font-bold mt-2">{formatCurrency(athData.price)}</div>
              <div className="text-slate-400 text-sm mt-1">{athData.date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
              <div className="text-blue-300 text-xs mt-2">Day {athData.daysFromGenesis} from Genesis</div>
            </div>
          )}
          
          {oylData && (
            <div className="bg-gradient-to-r from-red-900/30 to-red-800/30 rounded-xl p-6 border border-red-500/30">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <div className="text-red-400 text-sm font-semibold">ONE YEAR LOW</div>
              </div>
              <div className="text-white text-3xl font-bold mt-2">{formatCurrency(oylData.price)}</div>
              <div className="text-slate-400 text-sm mt-1">{oylData.date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
              <div className="text-red-300 text-xs mt-2">Day {oylData.daysFromGenesis} from Genesis</div>
            </div>
          )}
        </div>
      )}

      {/* Power Law Analysis Legend */}
      {powerLawData && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-white text-lg font-bold mb-4">Power Law Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-1 bg-red-500 rounded"></div>
              <div>
                <div className="text-white text-sm font-semibold">Regression Line</div>
                <div className="text-slate-400 text-xs">y = {powerLawData.coefficient.toFixed(6)} × x^{powerLawData.slope.toFixed(4)}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-1 border-t-2 border-dashed border-white/50 rounded"></div>
              <div>
                <div className="text-white text-sm font-semibold">Support (-60%)</div>
                <div className="text-slate-400 text-xs">Lower power law band</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-1 border-t-2 border-dashed border-white/50 rounded"></div>
              <div>
                <div className="text-white text-sm font-semibold">Resistance (+120%)</div>
                <div className="text-slate-400 text-xs">Upper power law band</div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
            <div className="text-slate-300 text-sm">
              <strong>R² = {powerLawData.r2.toFixed(4)}</strong> • 
              The power law model explains <strong>{(powerLawData.r2 * 100).toFixed(1)}%</strong> of Kaspa's price variance since genesis.
              A higher R² indicates stronger adherence to the power law growth pattern.
            </div>
          </div>
        </div>
      )}

      {/* Professional Footer */}
      <div className="text-center text-slate-500 text-sm">
        <div>Kaspa Power Law Analysis • Genesis: November 7, 2021</div>
        <div className="mt-1">Professional-grade cryptocurrency analytics powered by D3.js</div>
      </div>
    </div>
  )
}
