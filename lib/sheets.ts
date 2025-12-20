import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

// Your Google Sheets IDs
const SHEETS_CONFIG = {
  hashrate: process.env.HASHRATE_SHEET_ID!,
  price: process.env.PRICE_SHEET_ID!,
  volume: process.env.VOLUME_SHEET_ID!,
  marketcap: process.env.MARKETCAP_SHEET_ID!,
  openinterest: process.env.OPENINTEREST_SHEET_ID!, // NEW: Open Interest sheet
  addresses: '1Nl8SI-x2lSdSvz5jAFBuWwidk-5L8P_UNoRUb7UNVuQ', // Address distribution sheet
}

// Create JWT auth
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL!,
  key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
})

export interface KaspaMetric {
  date: string
  value: number
  timestamp: number
}

export interface CurrentMetrics {
  price: number
  priceChange24h: number
  marketCap: number
  marketCapChange24h: number
  hashrate: number
  hashrateChange24h: number
  volume24h: number
  volumeChange24h: number
  openInterest: number // NEW: Open Interest metric
  openInterestChange24h: number // NEW: Open Interest 24h change
  lastUpdated: string
}

// Helper function to parse dates with flexible formats
function parseDate(dateStr: string): number {
  if (!dateStr || typeof dateStr !== 'string') return 0
  
  try {
    // Clean the date string
    let cleanDate = dateStr.trim()
    
    // Handle different formats:
    // Format 1: "9 Jun 2025, 02:00'" (with time)
    // Format 2: "15 jun 2025" (without time)
    
    // Remove trailing single quote if present
    if (cleanDate.endsWith("'")) {
      cleanDate = cleanDate.slice(0, -1)
    }
    
    // If it has a comma and time, extract just the date part
    if (cleanDate.includes(',')) {
      cleanDate = cleanDate.split(',')[0].trim()
    }
    
    // Standardize the month capitalization
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const standardMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    months.forEach((month, index) => {
      const regex = new RegExp(`\\b${month}\\b`, 'gi')
      cleanDate = cleanDate.replace(regex, standardMonths[index])
    })
    
    // Parse the date
    const timestamp = new Date(cleanDate).getTime()
    
    // Verify it's a valid timestamp
    if (isNaN(timestamp)) {
      console.warn(`Failed to parse date: "${dateStr}" -> "${cleanDate}"`)
      return 0
    }
    
    return timestamp
  } catch (error) {
    console.warn(`Error parsing date: "${dateStr}"`, error)
    return 0
  }
}

// Updated helper function to parse monetary values like '$78.41M' or '$1.21M'
function parseMonetaryValue(value: string): number {
  if (!value || typeof value !== 'string') return 0
  
  try {
    // Remove $, ', and whitespace characters, convert to lowercase
    const cleanValue = value.replace(/[$'\s]/g, '').toLowerCase().trim()
    
    if (!cleanValue) return 0
    
    // Handle different suffixes
    if (cleanValue.endsWith('m')) {
      const num = parseFloat(cleanValue.slice(0, -1))
      return isNaN(num) ? 0 : num * 1000000
    } else if (cleanValue.endsWith('k')) {
      const num = parseFloat(cleanValue.slice(0, -1))
      return isNaN(num) ? 0 : num * 1000
    } else if (cleanValue.endsWith('b')) {
      const num = parseFloat(cleanValue.slice(0, -1))
      return isNaN(num) ? 0 : num * 1000000000
    } else {
      const num = parseFloat(cleanValue)
      return isNaN(num) ? 0 : num
    }
  } catch (error) {
    console.warn(`Error parsing monetary value: "${value}"`, error)
    return 0
  }
}

// Fetch hashrate data from "kaspa_daily_hashrate (3)" sheet
export async function getHashrateData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.hashrate, serviceAccountAuth)
    await doc.loadInfo()
    
    // Find the sheet by name
    const sheet = doc.sheetsByTitle['kaspa_daily_hashrate (3)']
    if (!sheet) {
      console.error('Sheet "kaspa_daily_hashrate (3)" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const hashrate = parseFloat(row.get('Hashrate (H/s)'))
        
        return {
          date: date,
          value: hashrate,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching hashrate data:', error)
    return []
  }
}

// Fetch price data from "kaspa_daily_price" sheet
export async function getPriceData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.price, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['kaspa_daily_price']
    if (!sheet) {
      console.error('Sheet "kaspa_daily_price" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const price = parseFloat(row.get('Price'))
        
        return {
          date: date,
          value: price,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching price data:', error)
    return []
  }
}

// Fetch volume data from "KAS_VOLUME_ETC" sheet
export async function getVolumeData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.volume, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['KAS_VOLUME_ETC']
    if (!sheet) {
      console.error('Sheet "KAS_VOLUME_ETC" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('date')
        const volume = parseFloat(row.get('total_volume'))
        
        return {
          date: date,
          value: volume,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching volume data:', error)
    return []
  }
}

// Fetch market cap data from "kaspa_market_cap" sheet
export async function getMarketCapData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.marketcap, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['kaspa_market_cap']
    if (!sheet) {
      console.error('Sheet "kaspa_market_cap" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const marketCap = parseFloat(row.get('MarketCap'))
        
        return {
          date: date,
          value: marketCap,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching market cap data:', error)
    return []
  }
}

// NEW: Fetch open interest data from Kaspa open interest sheet
export async function getOpenInterestData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.openinterest, serviceAccountAuth)
    await doc.loadInfo()
    
    // Get the first sheet (assuming it's the main data sheet)
    const sheet = doc.sheetsByIndex[0]
    if (!sheet) {
      console.error('Open interest sheet not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        // Handle different possible column names for date
        const date = row.get('Date') || row.get('date') || row.get('DATE')
        // Handle different possible column names for open interest
        const openInterestRaw = row.get('Total_open_interest') || 
                               row.get('total_open_interest') || 
                               row.get('Open Interest') || 
                               row.get('open_interest') ||
                               row.get('OpenInterest')
        
        if (!date || !openInterestRaw) {
          return null
        }
        
        // Parse the timestamp using our flexible date parser
        const timestamp = parseDate(date)
        if (!timestamp) {
          console.warn(`Skipping row with invalid date: "${date}"`)
          return null
        }
        
        // Parse the monetary value (e.g., '$78.41M' -> 78410000)
        const openInterest = parseMonetaryValue(openInterestRaw)
        if (!openInterest || openInterest <= 0) {
          console.warn(`Skipping row with invalid open interest value: "${openInterestRaw}"`)
          return null
        }
        
        return {
          date: date,
          value: openInterest,
          timestamp: timestamp
        }
      })
      .filter((item): item is KaspaMetric => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching open interest data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 1-100 KAS
export async function getAddressDistribution1to100Data(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 1-100 KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 1-100 KAS address distribution data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 100-1K KAS
export async function getAddressDistribution100to1kData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 100-1K KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 100-1K KAS address distribution data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 1K-10K KAS
export async function getAddressDistribution1kto10kData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 1K-10K KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 1K-10K KAS address distribution data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 10K-100K KAS
export async function getAddressDistribution10kto100kData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 10K-100K KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 10K-100K KAS address distribution data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 100K-1M KAS
export async function getAddressDistribution100kto1mData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 100K-1M KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 100K-1M KAS address distribution data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 1M-10M KAS
export async function getAddressDistribution1mto10mData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 1M-10M KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 1M-10M KAS address distribution data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 10M-100M KAS
export async function getAddressDistribution10mto100mData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 10M-100M KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 10M-100M KAS address distribution data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 100M-1B KAS
export async function getAddressDistribution100mto1bData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 100M-1B KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 100M-1B KAS address distribution data:', error)
    return []
  }
}

// NEW: Fetch address distribution data for 1B+ KAS
export async function getAddressDistribution1bPlusData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.addresses, serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByTitle['all_kaspa_address_buckets']
    if (!sheet) {
      console.error('Sheet "all_kaspa_address_buckets" not found')
      return []
    }
    
    const rows = await sheet.getRows()
    
    return rows
      .map(row => {
        const date = row.get('Date')
        const addressCount = parseFloat(row.get('Addresses Holding 1B+ KAS'))
        
        return {
          date: date,
          value: addressCount,
          timestamp: new Date(date).getTime()
        }
      })
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching 1B+ KAS address distribution data:', error)
    return []
  }
}

// Calculate percentage change
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Get current metrics with 24h changes (Updated to include Open Interest)
export async function getCurrentMetrics(): Promise<CurrentMetrics> {
  try {
    const [priceData, hashrateData, volumeData, marketCapData, openInterestData] = await Promise.all([
      getPriceData(),
      getHashrateData(),
      getVolumeData(),
      getMarketCapData(),
      getOpenInterestData() // NEW: Include open interest data
    ])

    // Get latest values
    const latestPrice = priceData[priceData.length - 1]?.value || 0
    const latestHashrate = hashrateData[hashrateData.length - 1]?.value || 0
    const latestVolume = volumeData[volumeData.length - 1]?.value || 0
    const latestMarketCap = marketCapData[marketCapData.length - 1]?.value || 0
    const latestOpenInterest = openInterestData[openInterestData.length - 1]?.value || 0 // NEW

    // Get previous day values (if available)
    const price24hAgo = priceData[priceData.length - 2]?.value || latestPrice
    const hashrate24hAgo = hashrateData[hashrateData.length - 2]?.value || latestHashrate
    const volume24hAgo = volumeData[volumeData.length - 2]?.value || latestVolume
    const marketCap24hAgo = marketCapData[marketCapData.length - 2]?.value || latestMarketCap
    const openInterest24hAgo = openInterestData[openInterestData.length - 2]?.value || latestOpenInterest // NEW

    return {
      price: latestPrice,
      priceChange24h: calculateChange(latestPrice, price24hAgo),
      marketCap: latestMarketCap,
      marketCapChange24h: calculateChange(latestMarketCap, marketCap24hAgo),
      hashrate: latestHashrate,
      hashrateChange24h: calculateChange(latestHashrate, hashrate24hAgo),
      volume24h: latestVolume,
      volumeChange24h: calculateChange(latestVolume, volume24hAgo),
      openInterest: latestOpenInterest, // NEW
      openInterestChange24h: calculateChange(latestOpenInterest, openInterest24hAgo), // NEW
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error getting current metrics:', error)
    
    // Return fallback data if sheets fail
    return {
      price: 0,
      priceChange24h: 0,
      marketCap: 0,
      marketCapChange24h: 0,
      hashrate: 0,
      hashrateChange24h: 0,
      volume24h: 0,
      volumeChange24h: 0,
      openInterest: 0, // NEW
      openInterestChange24h: 0, // NEW
      lastUpdated: new Date().toISOString()
    }
  }
  // Inactive Supply data interface
export interface InactiveSupplyDataPoint {
  date: Date
  timestamp: number
  percent: number
  daysFromGenesis: number
}

// Kaspa genesis date
const KASPA_GENESIS = new Date('2021-11-07T00:00:00.000Z')

/**
 * Fetch inactive supply data from Kaspalytics
 * @param minAge - Timeframe identifier (e.g., '2years', '1year', '6months')
 * @returns Array of inactive supply data points
 */
export async function getInactiveSupplyData(minAge: string): Promise<InactiveSupplyDataPoint[]> {
  try {
    const url = `https://www.kaspalytics.com/app/supply/inactive?minAge=${minAge}`
    
    console.log(`Fetching inactive supply data from: ${url}`)
    
    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch inactive supply data: ${response.statusText}`)
    }
    
    const html = await response.text()
    
    // Extract chartData from the HTML
    const chartDataStart = html.indexOf('chartData:{labels:[')
    if (chartDataStart === -1) {
      console.error('Could not find chartData in HTML')
      return []
    }
    
    // Find the closing of chartData by counting braces
    let braceCount = 0
    let inChartData = false
    let chartDataEnd = chartDataStart
    
    for (let i = chartDataStart; i < html.length; i++) {
      const char = html[i]
      if (char === '{') {
        braceCount++
        inChartData = true
      } else if (char === '}') {
        braceCount--
        if (inChartData && braceCount === 0) {
          chartDataEnd = i + 1
          break
        }
      }
    }
    
    const chartDataStr = html.substring(chartDataStart, chartDataEnd)
    
    // Extract labels (timestamps)
    const labelsMatch = chartDataStr.match(/labels:\[(.*?)\],datasets:/)
    if (!labelsMatch) {
      console.error('Could not extract labels from chartData')
      return []
    }
    
    const labelsStr = labelsMatch[1]
    const timestampMatches = labelsStr.matchAll(/new Date\((\d+)\)/g)
    const timestamps: number[] = []
    
    for (const match of timestampMatches) {
      timestamps.push(parseInt(match[1]))
    }
    
    // Extract datasets
    const datasetsStart = chartDataStr.indexOf('datasets:[')
    if (datasetsStart === -1) {
      console.error('Could not find datasets array')
      return []
    }
    
    const remaining = chartDataStr.substring(datasetsStart + 'datasets:['.length)
    
    // Find end of datasets array
    let bracketCount = 1
    let datasetsEnd = 0
    
    for (let i = 0; i < remaining.length; i++) {
      const char = remaining[i]
      if (char === '[') {
        bracketCount++
      } else if (char === ']') {
        bracketCount--
        if (bracketCount === 0) {
          datasetsEnd = i
          break
        }
      }
    }
    
    const datasetsStr = remaining.substring(0, datasetsEnd)
    
    // Extract CSPERCENT dataset
    const cspercentMatch = datasetsStr.match(/label:"CSPERCENT".*?data:\[([\d.,e\-+\s]+)\]/)
    
    if (!cspercentMatch) {
      console.error('Could not find CSPERCENT data')
      return []
    }
    
    const dataStr = cspercentMatch[1].replace(/\s+/g, '')
    const percentValues = dataStr.split(',').map(v => parseFloat(v)).filter(v => !isNaN(v))
    
    // Combine timestamps and values
    const data: InactiveSupplyDataPoint[] = []
    const minLength = Math.min(timestamps.length, percentValues.length)
    
    for (let i = 0; i < minLength; i++) {
      const timestamp = timestamps[i]
      const date = new Date(timestamp)
      const daysFromGenesis = Math.floor((timestamp - KASPA_GENESIS.getTime()) / (24 * 60 * 60 * 1000))
      
      // Only include data points after genesis
      if (daysFromGenesis >= 0 && percentValues[i] > 0) {
        data.push({
          date,
          timestamp,
          percent: percentValues[i],
          daysFromGenesis
        })
      }
    }
    
    console.log(`✓ Fetched ${data.length} inactive supply data points for ${minAge}`)
    
    return data
    
  } catch (error) {
    console.error('Error fetching inactive supply data:', error)
    return []
  }
}

/**
 * Calculate power law parameters for inactive supply data
 * @param data - Array of inactive supply data points
 * @returns Power law parameters (intercept, slope, r2, constant)
 */
export function calculateInactiveSupplyPowerLaw(data: InactiveSupplyDataPoint[]) {
  try {
    // Filter valid data points (positive values only)
    const validData = data.filter(d => d.daysFromGenesis > 0 && d.percent > 0)
    
    if (validData.length < 10) {
      console.warn('Not enough valid data points for power law calculation')
      return null
    }
    
    // Log transformation
    const logX = validData.map(d => Math.log10(d.daysFromGenesis))
    const logY = validData.map(d => Math.log10(d.percent))
    
    // Linear regression on log-transformed data
    const n = logX.length
    const sumX = logX.reduce((a, b) => a + b, 0)
    const sumY = logY.reduce((a, b) => a + b, 0)
    const sumXY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)
    const sumX2 = logX.reduce((sum, x) => sum + x * x, 0)
    const sumY2 = logY.reduce((sum, y) => sum + y * y, 0)
    
    // Calculate slope (b) and intercept (a) for log-log fit
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // Calculate R² (coefficient of determination)
    const meanX = sumX / n
    const meanY = sumY / n
    const ssXY = sumXY - n * meanX * meanY
    const ssXX = sumX2 - n * meanX * meanX
    const ssYY = sumY2 - n * meanY * meanY
    const rValue = ssXY / Math.sqrt(ssXX * ssYY)
    const r2 = rValue * rValue
    
    // Convert back to power law: y = constant * x^slope
    const constant = Math.pow(10, intercept)
    
    console.log(`Power Law calculated: y = ${constant.toFixed(6)} * x^${slope.toFixed(6)} (R² = ${r2.toFixed(6)})`)
    
    return {
      intercept,
      slope,
      r2,
      constant
    }
    
  } catch (error) {
    console.error('Error calculating power law:', error)
    return null
  }
}
