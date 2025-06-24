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

// Enhanced power law regression function (from Streamlit data_manager.py)
function fitPowerLaw(data: KaspaMetric[], useGenesisDays: boolean = true) {
  // Filter valid data points
  const validData = data.filter(point => point.value > 0)
  
  if (validData.length < 2) {
    throw new Error("Not enough valid data points for power law fitting")
  }
  
  // CRITICAL: Always use days from genesis for power law calculation
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

// Enhanced currency formatting (from Streamlit format_currency)
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

// Generate precise logarithmic ticks (1,2,5 pattern)
function generateLogTicks(min: number, max: number): number[] {
  const ticks: number[] = []
  const logMin = Math.floor(Math.log10(min))
  const logMax = Math.ceil(Math.log10(max))
  
  for (let i = logMin - 1; i <= logMax + 1; i++) {
    const base = Math.pow(10, i)
    
    // Add 1, 2, 3, 5 multiples
    for (const mult of [1, 2, 3, 5]) {
      const value = mult * base
      if (value >= min * 0.5 && value <= max * 2) {
        ticks.push(value)
      }
    }
  }
  
  return Array.from(new Set(ticks)).sort((a, b) => a - b)
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
      // CRITICAL FIX: Always use genesis days for calculation
      const { a, b, r2 } = fitPowerLaw(filteredData, true)
      
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

  // D3 Chart Creation
  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove() // Clear previous chart

    const margin = { top: 60, right: 60, bottom: 80, left: 80 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    // Create main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Prepare data for D3
    const chartData = filteredData.map(d => ({
      x: timeScale === 'Log' ? getDaysFromGenesis(d.timestamp) : d.timestamp,
      y: d.value,
      date: new Date(d.timestamp)
    }))

    // Create scales
    const xExtent = d3.extent(chartData, d => d.x) as [number, number]
    const yExtent = d3.extent(chartData, d => d.y) as [number, number]

    let xScale: any, yScale: any

    if (timeScale === 'Log') {
      xScale = d3.scaleLog()
        .domain([Math.max(1, xExtent[0] * 0.9), xExtent[1] * 1.1])
        .range([0, width])
    } else {
      // For linear time scale, use date extent
      const dateExtent = d3.extent(chartData, d => d.date) as [Date, Date]
      xScale = d3.scaleTime()
        .domain(dateExtent)
        .range([0, width])
    }

    if (priceScale === 'Log') {
      yScale = d3.scaleLog()
        .domain([Math.max(0.0001, yExtent[0] * 0.8), yExtent[1] * 1.5])
        .range([chartHeight, 0])
    } else {
      yScale = d3.scaleLinear()
        .domain([0, yExtent[1] * 1.1])
        .range([chartHeight, 0])
    }

    // Create line generator
    const line = d3.line<{x: number, y: number}>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveMonotoneX)

    // Add gradient for fill
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "priceGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", chartHeight)
      .attr("x2", 0).attr("y2", 0)

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#5B6CFF")
      .attr("stop-opacity", 0.6)

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#5B6CFF")
      .attr("stop-opacity", 0.1)

    // Add area (fill)
    const area = d3.area<{x: number, y: number}>()
      .x(d => xScale(d.x))
      .y0(chartHeight)
      .y1(d => yScale(d.y))
      .curve(d3.curveMonotoneX)

    g.append("path")
      .datum(chartData)
      .attr("fill", "url(#priceGradient)")
      .attr("d", area)

    // Add power law lines if enabled
    if (powerLawData) {
      // Support line
      const supportLine = d3.line<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX)

      g.append("path")
        .datum(powerLawData.support)
        .attr("fill", "none")
        .attr("stroke", "rgba(255, 255, 255, 0.7)")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5")
        .attr("d", supportLine)

      // Resistance line
      g.append("path")
        .datum(powerLawData.resistance)
        .attr("fill", "none")
        .attr("stroke", "rgba(255, 255, 255, 0.7)")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5")
        .attr("d", supportLine)

      // Power law regression line
      g.append("path")
        .datum(powerLawData.regression)
        .attr("fill", "none")
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 3)
        .attr("d", supportLine)
    }

    // Add main price line
    g.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#5B6CFF")
      .attr("stroke-width", 3)
      .attr("d", line)

    // Create custom axes with precise ticks
    let xAxis: any, yAxis: any

    if (timeScale === 'Log') {
      const xTicks = generateLogTicks(xExtent[0], xExtent[1])
      xAxis = d3.axisBottom(xScale)
        .tickValues(xTicks)
        .tickFormat((d) => d3.format(".0f")(d as number))
    } else {
      xAxis = d3.axisBottom(xScale as d3.ScaleTime<number, number, never>)
        .ticks(8)
        .tickFormat((d) => d3.timeFormat("%b %Y")(d as Date))
    }

    if (priceScale === 'Log') {
      const yTicks = generateLogTicks(yExtent[0] * 0.8, yExtent[1] * 1.5)
      yAxis = d3.axisLeft(yScale)
        .tickValues(yTicks)
        .tickFormat(d => formatCurrency(d as number))
    } else {
      yAxis = d3.axisLeft(yScale)
        .ticks(8)
        .tickFormat(d => formatCurrency(d as number))
    }

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .attr("class", "x-axis")
      .call(xAxis)
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-family", "Inter")
      .style("font-size", "11px")

    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-family", "Inter")
      .style("font-size", "11px")

    // Style axes
    g.selectAll(".domain, .tick line")
      .style("stroke", "#475569")
      .style("stroke-width", 1)

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis.tickSize(-chartHeight).tickFormat(""))
      .selectAll("line")
      .style("stroke", "rgba(71, 85, 105, 0.3)")
      .style("stroke-width", 1)

    g.append("g")
      .attr("class", "grid")
      .call(yAxis.tickSize(-width).tickFormat(""))
      .selectAll("line")
      .style("stroke", "rgba(71, 85, 105, 0.3)")
      .style("stroke-width", 1)

    // Add axis labels
    g.append("text")
      .attr("transform", `translate(${width/2}, ${chartHeight + 60})`)
      .style("text-anchor", "middle")
      .style("fill", "#94a3b8")
      .style("font-family", "Inter")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(timeScale === 'Log' ? 'Days Since Genesis (Log Scale)' : 'Date')

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (chartHeight / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "#94a3b8")
      .style("font-family", "Inter")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text("Price (USD)")

    // Add ATH/1YL markers if visible
    if (athData) {
      const athX = timeScale === 'Log' ? athData.daysFromGenesis : athData.timestamp
      const athDisplayX = xScale(athX)
      const athDisplayY = yScale(athData.price)

      g.append("circle")
        .attr("cx", athDisplayX)
        .attr("cy", athDisplayY)
        .attr("r", 6)
        .style("fill", "#ffffff")
        .style("stroke", "#5B6CFF")
        .style("stroke-width", 2)

      g.append("text")
        .attr("x", athDisplayX + 10)
        .attr("y", athDisplayY - 10)
        .style("fill", "#ffffff")
        .style("font-family", "Inter")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .text(`ATH ${formatCurrency(athData.price)}`)
    }

    if (oylData) {
      const oylX = timeScale === 'Log' ? oylData.daysFromGenesis : oylData.timestamp
      const oylDisplayX = xScale(oylX)
      const oylDisplayY = yScale(oylData.price)

      g.append("circle")
        .attr("cx", oylDisplayX)
        .attr("cy", oylDisplayY)
        .attr("r", 6)
        .style("fill", "#ffffff")
        .style("stroke", "#ef4444")
        .style("stroke-width", 2)

      g.append("text")
        .attr("x", oylDisplayX + 10)
        .attr("y", oylDisplayY + 20)
        .style("fill", "#ffffff")
        .style("font-family", "Inter")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .text(`1YL ${formatCurrency(oylData.price)}`)
    }

  }, [filteredData, priceScale, timeScale, powerLawData, athData, oylData, height])

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
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Hide">Hide</option>
              <option value="Show">Show</option>
            </select>
          </div>
        </div>

        {/* Time Period Buttons */}
        <div className="flex space-x-1">
          {(['1W', '1M', '3M', '6M', '1Y', 'All'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timePeriod === period
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* D3 Chart Container */}
      <div style={{ height: `${height}px` }} className="w-full">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Chart Info */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-gray-400">Data Points:</span>
          <span className="text-white ml-2 font-semibold">{filteredData.length.toLocaleString()}</span>
        </div>
        
        {powerLawData && (
          <>
            <div>
              <span className="text-gray-400">Power Law R²:</span>
              <span className="text-white ml-2 font-semibold">{powerLawData.r2.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-gray-400">Power Law Slope:</span>
              <span className="text-white ml-2 font-semibold">{powerLawData.slope.toFixed(4)}</span>
            </div>
          </>
        )}
        
        <div>
          <span className="text-gray-400">Time Range:</span>
          <span className="text-white ml-2 font-semibold">{timePeriod}</span>
        </div>
      </div>

      {/* ATH and 1YL Info */}
      {(athData || oylData) && (
        <div className="flex flex-wrap gap-6 text-sm">
          {athData && (
            <div>
              <span className="text-blue-400">All-Time High:</span>
              <span className="text-white ml-2 font-semibold">{formatCurrency(athData.price)}</span>
              <span className="text-gray-500 ml-2">({athData.date.toLocaleDateString()})</span>
            </div>
          )}
          
          {oylData && (
            <div>
              <span className="text-red-400">One Year Low:</span>
              <span className="text-white ml-2 font-semibold">{formatCurrency(oylData.price)}</span>
              <span className="text-gray-500 ml-2">({oylData.date.toLocaleDateString()})</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
