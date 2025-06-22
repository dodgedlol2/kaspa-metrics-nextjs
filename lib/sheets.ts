import { GoogleSpreadsheet } from 'google-spreadsheet'

// Your Google Sheets IDs (from your Streamlit setup)
const SHEETS_CONFIG = {
  hashrate: process.env.HASHRATE_SHEET_ID || 'your_hashrate_sheet_id',
  price: process.env.PRICE_SHEET_ID || 'your_price_sheet_id',
  volume: process.env.VOLUME_SHEET_ID || 'your_volume_sheet_id',
  marketcap: process.env.MARKETCAP_SHEET_ID || 'your_marketcap_sheet_id',
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

// Fetch current price data
export async function getPriceData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.price)
    await doc.useServiceAccountAuth(serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByIndex[0]
    const rows = await sheet.getRows()
    
    return rows
      .map(row => ({
        date: row.get('Date') || row.get('date') || row.get('timestamp'),
        value: parseFloat(row.get('Price') || row.get('price') || row.get('value') || '0'),
        timestamp: new Date(row.get('Date') || row.get('date')).getTime()
      }))
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching price data:', error)
    return []
  }
}

// Fetch hashrate data
export async function getHashrateData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.hashrate)
    await doc.useServiceAccountAuth(serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByIndex[0]
    const rows = await sheet.getRows()
    
    return rows
      .map(row => ({
        date: row.get('Date') || row.get('date') || row.get('timestamp'),
        value: parseFloat(row.get('Hashrate') || row.get('hashrate') || row.get('value') || '0'),
        timestamp: new Date(row.get('Date') || row.get('date')).getTime()
      }))
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching hashrate data:', error)
    return []
  }
}

// Fetch volume data
export async function getVolumeData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.volume)
    await doc.useServiceAccountAuth(serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByIndex[0]
    const rows = await sheet.getRows()
    
    return rows
      .map(row => ({
        date: row.get('Date') || row.get('date') || row.get('timestamp'),
        value: parseFloat(row.get('Volume') || row.get('volume') || row.get('value') || '0'),
        timestamp: new Date(row.get('Date') || row.get('date')).getTime()
      }))
      .filter(item => !isNaN(item.value) && item.value > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error fetching volume data:', error)
    return []
  }
}

// Fetch market cap data
export async function getMarketCapData(): Promise<KaspaMetric[]> {
  try {
    const doc = new GoogleSpreadsheet(SHEETS_CONFIG.marketcap)
    await doc.useServiceAccountAuth(serviceAccountAuth)
    await doc.loadInfo()
    
    const sheet = doc.sheetsByIndex[0]
    const rows = await sheet.getRows()
    
    return rows
      .map(row => ({
        date: row.get('Date') || row.get('date') || row.get('timestamp'),
        value: parseFloat(row.get('MarketCap') || row.get('marketcap') || row.get('market_cap') || row.get('value') || '0'),
        timestamp: new Date(row.get('Date') || row.get('date')).getTime()
      }))
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

    // Get 24h ago values (approximate)
    const now = Date.now()
    const yesterday = now - (24 * 60 * 60 * 1000)
    
    const price24hAgo = priceData.find(d => Math.abs(d.timestamp - yesterday) < (2 * 60 * 60 * 1000))?.value || latestPrice
    const hashrate24hAgo = hashrateData.find(d => Math.abs(d.timestamp - yesterday) < (2 * 60 * 60 * 1000))?.value || latestHashrate
    const volume24hAgo = volumeData.find(d => Math.abs(d.timestamp - yesterday) < (2 * 60 * 60 * 1000))?.value || latestVolume
    const marketCap24hAgo = marketCapData.find(d => Math.abs(d.timestamp - yesterday) < (2 * 60 * 60 * 1000))?.value || latestMarketCap

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
