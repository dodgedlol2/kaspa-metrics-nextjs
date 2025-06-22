import { GoogleSpreadsheet } from 'google-spreadsheet'

// Your Google Sheets IDs
const SHEETS_CONFIG = {
  hashrate: process.env.HASHRATE_SHEET_ID!,
  price: process.env.PRICE_SHEET_ID!,
  volume: process.env.VOLUME_SHEET_ID!,
  marketcap: process.env.MARKETCAP_SHEET_ID!,
}

// Service account authentication
const serviceAccountAuth = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL!,
  private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
}

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
  lastUpdated: string
}

// Fetch hashrate data from "kaspa_daily_hashrate (3)" sheet
export async function getHashrateData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.hashrate)
    await doc.useServiceAccountAuth(serviceAccountAuth)
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
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.price)
    await doc.useServiceAccountAuth(serviceAccountAuth)
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
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.volume)
    await doc.useServiceAccountAuth(serviceAccountAuth)
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
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.marketcap)
    await doc.useServiceAccountAuth(serviceAccountAuth)
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

// Calculate percentage change
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Get current metrics with 24h changes
export async function getCurrentMetrics(): Promise<CurrentMetrics> {
  try {
    const [priceData, hashrateData, volumeData, marketCapData] = await Promise.all([
      getPriceData(),
      getHashrateData(),
      getVolumeData(),
      getMarketCapData()
    ])

    // Get latest values
    const latestPrice = priceData[priceData.length - 1]?.value || 0
    const latestHashrate = hashrateData[hashrateData.length - 1]?.value || 0
    const latestVolume = volumeData[volumeData.length - 1]?.value || 0
    const latestMarketCap = marketCapData[marketCapData.length - 1]?.value || 0

    // Get previous day values (if available)
    const price24hAgo = priceData[priceData.length - 2]?.value || latestPrice
    const hashrate24hAgo = hashrateData[hashrateData.length - 2]?.value || latestHashrate
    const volume24hAgo = volumeData[volumeData.length - 2]?.value || latestVolume
    const marketCap24hAgo = marketCapData[marketCapData.length - 2]?.value || latestMarketCap

    return {
      price: latestPrice,
      priceChange24h: calculateChange(latestPrice, price24hAgo),
      marketCap: latestMarketCap,
      marketCapChange24h: calculateChange(latestMarketCap, marketCap24hAgo),
      hashrate: latestHashrate,
      hashrateChange24h: calculateChange(latestHashrate, hashrate24hAgo),
      volume24h: latestVolume,
      volumeChange24h: calculateChange(latestVolume, volume24hAgo),
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
      lastUpdated: new Date().toISOString()
    }
  }
}
