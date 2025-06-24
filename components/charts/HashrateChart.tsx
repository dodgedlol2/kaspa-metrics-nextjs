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

// Enhanced currency formatting (EXACT match to Streamlit format_currency)
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

// EXACT replication of Streamlit generate_log_ticks function - SCIENTIFIC PRECISION
function generateLogTicks(dataMin: number, dataMax: number): { major: number[], intermediate: number[], minor: number[], all: number[] } {
  const logMin = Math.floor(Math.log10(dataMin))
  const logMax = Math.ceil(Math.log10(dataMax))
  
  const majorTicks: number[] = []
  const intermediateTicks: number[] = []  // For 2 and 5
  const minorTicks: number[] = []  // For 3, 4, 6, 7, 8, 9
  
  for (let i = logMin - 1; i <= logMax + 1; i++) {
    const base = Math.pow(10, i)
    
    // Major tick at 1 * 10^i (1, 10, 100, 1000...)
    if (dataMin <= base && base <= dataMax) {
      majorTicks.push(base)
    }
    
    // Intermediate ticks at 2 and 5 * 10^i (2, 5, 20, 50, 200, 500...)
    for (const factor of [2, 5]) {
      const intermediateVal = factor * base
      if (dataMin * 0.5 <= intermediateVal && intermediateVal <= dataMax * 2) {
        intermediateTicks.push(intermediateVal)
      }
    }
    
    // Minor ticks at 3, 4, 6, 7, 8, 9 * 10^i (3, 4, 6, 7, 8, 9, 30, 40, 60...)
    for (const j of [3, 4, 6, 7, 8, 9]) {
      const minorVal = j * base
      if (dataMin * 0.5 <= minorVal && minorVal <= dataMax * 2) {
        minorTicks.push(minorVal)
      }
    }
  }
  
  // Combine ALL ticks for scientific precision (like Plotly)
  const allTicks = [...majorTicks, ...intermediateTicks, ...minorTicks].sort((a, b) => a - b)
  
  return { 
    major: majorTicks, 
    intermediate: intermediateTicks, 
    minor: minorTicks,
    all: allTicks  // This gives us the full scientific precision
  }
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

  // D3 Chart Creation - EXACT replication of Plotly behavior
  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove() // Clear previous chart

    const margin = { top: 20, right: 20, bottom: 50, left: 80 }
    const width = svgRef.current.clientWidth - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    // Create main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Prepare data for D3 - EXACT match to Plotly logic
    const chartData = filteredData.map(d => ({
      x: timeScale === 'Log' ? getDaysFromGenesis(d.timestamp) : d.timestamp,
      y: d.value,
      date: new Date(d.timestamp),
      originalTimestamp: d.timestamp
    }))

    // Calculate Y-axis range EXACTLY like Plotly (eliminate gaps, accommodate ATH/1YL labels)
    const yMinData = d3.min(chartData, d => d.y) || 0
    const yMaxData = d3.max(chartData, d => d.y) || 1
    
    // Check if ATH/1YL points are in current view (same logic as Plotly)
    const athInView = athData !== null
    const oylInView = oylData !== null
    
    let yMinChart: number, yMaxChart: number
    
    if (priceScale === 'Log') {
      // For log scale, set a sensible minimum that's lower than data min but not too extreme
      yMinChart = yMinData * 0.8  // 20% below minimum data point
      // Add extra padding at top if ATH is visible (for text label)
      yMaxChart = yMaxData * (athInView ? 1.50 : 1.05)  // Extra padding for ATH text
    } else {
      // For linear scale, start from zero
      yMinChart = 0
      // Add extra padding at top if ATH is visible (for text label)
      yMaxChart = yMaxData * (athInView ? 1.15 : 1.05)  // Extra padding for ATH text
    }

    // Create scales - EXACT match to Plotly behavior
    const xExtent = d3.extent(chartData, d => d.x) as [number, number]

    let xScale: any, yScale: any

    if (timeScale === 'Log') {
      xScale = d3.scaleLog()
        .domain([Math.max(1, xExtent[0]), xExtent[1]])
        .range([0, width])
        .clamp(true)
    } else {
      // For linear time scale, use date extent
      const dateExtent = d3.extent(chartData, d => d.date) as [Date, Date]
      xScale = d3.scaleTime()
        .domain(dateExtent)
        .range([0, width])
    }

    if (priceScale === 'Log') {
      yScale = d3.scaleLog()
        .domain([yMinChart, yMaxChart])
        .range([chartHeight, 0])
        .clamp(true)
    } else {
      yScale = d3.scaleLinear()
        .domain([yMinChart, yMaxChart])
        .range([chartHeight, 0])
    }

    // Add gradient EXACTLY like Plotly
    const defs = svg.append("defs")
    const gradient = defs.append("linearGradient")
      .attr("id", "priceGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", chartHeight + margin.top)
      .attr("x2", 0).attr("y2", margin.top)

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "rgba(13, 13, 26, 0.01)")  // Top: transparent

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "rgba(91, 108, 255, 0.6)")   // Bottom: full opacity

    // For log scale: add invisible baseline (EXACT Plotly behavior)
    if (priceScale === 'Log') {
      const baselineData = chartData.map(d => ({ x: d.x, y: yMinChart }))
      
      const baselineLine = d3.line<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX)

      g.append("path")
        .datum(baselineData)
        .attr("fill", "none")
        .attr("stroke", "rgba(0,0,0,0)")
        .attr("stroke-width", 0)
        .attr("d", baselineLine)
    }

    // Add area fill - EXACT Plotly behavior (separate generators for TypeScript compatibility)
    let area: d3.Area<{x: number, y: number}>
    
    if (priceScale === 'Log') {
      // For log scale: fill to baseline
      area = d3.area<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y0(() => yScale(yMinChart))  // Fill to baseline
        .y1(d => yScale(d.y))
        .curve(d3.curveMonotoneX)
    } else {
      // For linear scale: fill to zero
      area = d3.area<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y0(chartHeight)  // Fill to zero
        .y1(d => yScale(d.y))
        .curve(d3.curveMonotoneX)
    }

    g.append("path")
      .datum(chartData)
      .attr("fill", "url(#priceGradient)")
      .attr("d", area)

    // Add power law if enabled - EXACT styling as Plotly
    if (powerLawData) {
      const powerLine = d3.line<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX)

      // Power law regression line - EXACT color and width from Plotly
      g.append("path")
        .datum(powerLawData.regression.filter(d => d.y > 0))
        .attr("fill", "none")
        .attr("stroke", "#ff8c00")  // EXACT color from Plotly
        .attr("stroke-width", 2)    // EXACT width from Plotly
        .attr("d", powerLine)
    }

    // Main price line - EXACT styling as Plotly
    const line = d3.line<{x: number, y: number}>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveMonotoneX)

    g.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#5B6CFF")  // EXACT color from Plotly
      .attr("stroke-width", 2)    // EXACT width from Plotly
      .attr("d", line)

    // Create axes with EXACT tick formatting as Plotly - PROPER D3.js implementation
    let xAxis: any, yAxis: any
    let xTickValues: any[] = []
    let yTickValues: number[] = []

    // X-AXIS CONFIGURATION - PROPER D3.js LOG SCALE APPROACH  
    if (timeScale === 'Log') {
      // D3.js log scales automatically generate scientific ticks - let D3 handle it!
      xAxis = d3.axisBottom(xScale)
        .ticks(10) // Request more ticks, D3 will automatically generate scientific intervals
        .tickFormat((d: any) => {
          // Use D3's built-in log tick formatting
          const logFormat = xScale.tickFormat(100, ".0f") // Integer formatting for days
          const formatted = logFormat(d)
          
          // Keep D3's automatic filtering but ensure integers
          return formatted === "" ? "" : d3.format(".0f")(d)
        })
        .tickSize(6)
      
      // Get D3's automatically generated tick values for grid alignment
      xTickValues = xScale.ticks(100) // Request many ticks, D3 will filter appropriately
      console.log('D3 X-axis ticks:', xTickValues.length, xTickValues.slice(0, 20))
    } else {
      // Linear time scale - use D3's time ticks
      const timeInterval = d3.timeMonth.every(2)
      if (timeInterval) {
        xAxis = d3.axisBottom(xScale as d3.ScaleTime<number, number, never>)
          .ticks(timeInterval)
          .tickFormat((d: any) => d3.timeFormat("%b %Y")(d))
          .tickSize(6)
        
        // Get the actual tick values for grid alignment
        xTickValues = (xScale as d3.ScaleTime<number, number, never>).ticks(timeInterval)
      } else {
        // Fallback to regular ticks
        xAxis = d3.axisBottom(xScale as d3.ScaleTime<number, number, never>)
          .ticks(8)
          .tickFormat((d: any) => d3.timeFormat("%b %Y")(d))
          .tickSize(6)
        
        xTickValues = (xScale as d3.ScaleTime<number, number, never>).ticks(8)
      }
    }

    // Y-AXIS CONFIGURATION - PROPER D3.js LOG SCALE APPROACH
    if (priceScale === 'Log') {
      // D3.js log scales automatically generate scientific ticks - let D3 handle it!
      yAxis = d3.axisLeft(yScale)
        .ticks(10, "~s") // Request more ticks, use scientific notation format
        .tickFormat((d: any) => {
          // Use D3's built-in log tick formatting with custom currency wrapper
          const logFormat = yScale.tickFormat(100, ".1~s") // Get D3's default log formatter
          const formatted = logFormat(d)
          
          // Convert D3's scientific notation to currency format
          if (formatted === "") return "" // Keep D3's filtering
          
          // For very small numbers, use our custom currency formatter
          if (d < 0.01) return formatCurrency(d)
          
          // For larger numbers, convert scientific notation to currency
          return `${formatted.replace('m', 'M').replace('k', 'k')}`
        })
        .tickSize(6)
      
      // Get D3's automatically generated tick values for grid alignment
      yTickValues = yScale.ticks(100) // Request many ticks, D3 will filter appropriately
      console.log('D3 Y-axis ticks:', yTickValues.length, yTickValues.slice(0, 20))
    } else {
      // Linear scale - generate nice round numbers
      const yMax = yMaxChart
      const yMin = yMinChart
      const range = yMax - yMin
      const step = Math.pow(10, Math.floor(Math.log10(range))) * 
                   (range / Math.pow(10, Math.floor(Math.log10(range))) > 5 ? 1 : 
                    range / Math.pow(10, Math.floor(Math.log10(range))) > 2 ? 0.5 : 0.2)
      
      yTickValues = []
      for (let val = Math.ceil(yMin / step) * step; val <= yMax; val += step) {
        yTickValues.push(val)
      }
      
      yAxis = d3.axisLeft(yScale)
        .tickValues(yTickValues)
        .tickFormat((d: any) => formatCurrency(d))
        .tickSize(6)
        .tickSizeOuter(0)
    }

    // ADD GRID LINES FIRST (behind everything)
    // X-axis grid lines
    const xGridGroup = g.append("g")
      .attr("class", "x-grid")
      .attr("transform", `translate(0,${chartHeight})`)

    xGridGroup.selectAll("line")
      .data(xTickValues)
      .enter()
      .append("line")
      .attr("x1", (d: any) => xScale(d))
      .attr("x2", (d: any) => xScale(d))
      .attr("y1", 0)
      .attr("y2", -chartHeight)
      .style("stroke", "#363650")
      .style("stroke-width", 1)
      .style("opacity", 0.7)

    // Y-axis grid lines
    const yGridGroup = g.append("g")
      .attr("class", "y-grid")

    yGridGroup.selectAll("line")
      .data(yTickValues)
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d: number) => yScale(d))
      .attr("y2", (d: number) => yScale(d))
      .style("stroke", "#363650")
      .style("stroke-width", 1)
      .style("opacity", 0.7)

    // ADD MAIN AXES WITH TICK LABELS
    // X-axis
    const xAxisGroup = g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .attr("class", "x-axis")
      .call(xAxis)

    // Style X-axis
    xAxisGroup.selectAll("text")
      .style("fill", "#9CA3AF")
      .style("font-family", "Inter, system-ui, sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "400")

    xAxisGroup.selectAll(".tick line")
      .style("stroke", "#3A3C4A")
      .style("stroke-width", 1)

    xAxisGroup.select(".domain")
      .style("stroke", "#3A3C4A")
      .style("stroke-width", 1)

    // Y-axis
    const yAxisGroup = g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)

    // Style Y-axis
    yAxisGroup.selectAll("text")
      .style("fill", "#9CA3AF")
      .style("font-family", "Inter, system-ui, sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "400")

    yAxisGroup.selectAll(".tick line")
      .style("stroke", "#3A3C4A")
      .style("stroke-width", 1)

    yAxisGroup.select(".domain")
      .style("stroke", "#3A3C4A")
      .style("stroke-width", 1)

    // Add axis labels
    g.append("text")
      .attr("transform", `translate(${width/2}, ${chartHeight + 40})`)
      .style("text-anchor", "middle")
      .style("fill", "#9CA3AF")
      .style("font-family", "Inter")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(timeScale === 'Log' ? 'Days Since Genesis (Log Scale)' : 'Date')

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - (chartHeight / 2))
      .style("text-anchor", "middle")
      .style("fill", "#9CA3AF")
      .style("font-family", "Inter")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text("Price (USD)")

    // Add ATH/1YL markers - EXACT implementation from Plotly add_ath_to_chart function
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
