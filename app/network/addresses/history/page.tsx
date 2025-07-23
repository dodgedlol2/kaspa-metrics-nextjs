'use client'

import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'

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

interface UTXO {
  address: string
  outpoint: {
    transactionId: string
    index: number
  }
  utxoEntry: {
    amount: string
    scriptPublicKey: {
      scriptPublicKey: string
    }
    blockDaaScore: string
    isCoinbase: boolean
  }
}

interface Transaction {
  transaction_id: string
  block_time: number
  is_accepted: boolean
  accepting_block_time: number
  inputs: Array<{
    previous_outpoint_address: string | null
    previous_outpoint_amount: number | null
  }>
  outputs: Array<{
    amount: number
    script_public_key_address: string
  }>
}

interface BalancePoint {
  timestamp: number
  balance: number
  change: number
  txId: string
  type: 'received' | 'sent'
}

export default function AddressHistoryPage() {
  const [address, setAddress] = useState('')
  const [searchAddress, setSearchAddress] = useState('')
  const [utxos, setUtxos] = useState<UTXO[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balanceHistory, setBalanceHistory] = useState<BalancePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [totalReceived, setTotalReceived] = useState(0)
  const [totalSent, setTotalSent] = useState(0)
  // Add state for pagination progress
  const [transactionCount, setTransactionCount] = useState(0)
  const [fetchProgress, setFetchProgress] = useState<{
    currentPage: number,
    totalPages: number,
    isComplete: boolean
  }>({ currentPage: 0, totalPages: 0, isComplete: false })

  // Function to format KAS amount (convert from sompi to KAS)
  const formatKAS = (sompi: number | string): number => {
    return Number(sompi) / 100000000 // 1 KAS = 100,000,000 sompi
  }

  // Function to format display values
  const formatDisplay = (kas: number): string => {
    if (kas >= 1000000000) return `${(kas / 1000000000).toFixed(2)}B`
    if (kas >= 1000000) return `${(kas / 1000000).toFixed(2)}M`
    if (kas >= 1000) return `${(kas / 1000).toFixed(2)}K`
    return kas.toFixed(2)
  }

  // Validate Kaspa address format
  const isValidKaspaAddress = (addr: string): boolean => {
    const kaspaRegex = /^kaspa:[a-z0-9]{61,63}$/
    return kaspaRegex.test(addr)
  }

  // Add debug logging function
  const addDebugInfo = (message: string) => {
    console.log('DEBUG:', message)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Fetch UTXOs for current balance
  const fetchUTXOs = async (addr: string) => {
    addDebugInfo(`Starting UTXO fetch for address: ${addr.substring(0, 20)}...`)
    
    try {
      let response;
      
      try {
        addDebugInfo('Attempting to use proxy API for UTXOs...')
        response = await fetch('/api/kaspa/utxos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addresses: [addr]
          })
        })
        addDebugInfo(`Proxy UTXO Response status: ${response.status} ${response.statusText}`)
      } catch (proxyError) {
        addDebugInfo('Proxy API failed, trying direct API...')
        response = await fetch('https://api.kaspa.org/addresses/utxos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          body: JSON.stringify({
            addresses: [addr]
          })
        })
        addDebugInfo(`Direct UTXO Response status: ${response.status} ${response.statusText}`)
      }

      if (!response.ok) {
        const errorText = await response.text()
        addDebugInfo(`UTXO Error response: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const data = await response.json()
      addDebugInfo(`UTXO Success: Found ${data.length} UTXOs`)
      return data as UTXO[]
    } catch (err: any) {
      addDebugInfo(`UTXO Fetch Error: ${err.message}`)
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        addDebugInfo('Network error detected - this might be a CORS issue')
      }
      throw err
    }
  }

  // Fetch ALL transaction history with pagination
  const fetchAllTransactions = async (addr: string, maxPages = 20): Promise<Transaction[]> => {
    addDebugInfo(`Starting complete transaction fetch for address: ${addr.substring(0, 20)}...`)
    
    let allTransactions: Transaction[] = []
    let currentBefore: number | null = null
    let pageCount = 0
    let hasMorePages = true

    while (hasMorePages && pageCount < maxPages) {
      pageCount++
      addDebugInfo(`Fetching page ${pageCount}/${maxPages}...`)

      try {
        const result = await fetchTransactionsPage(addr, 500, currentBefore)
        
        if (result.transactions.length === 0) {
          addDebugInfo(`No more transactions found on page ${pageCount}`)
          break
        }

        allTransactions = [...allTransactions, ...result.transactions]
        addDebugInfo(`Page ${pageCount}: Found ${result.transactions.length} transactions (total: ${allTransactions.length})`)

        // Check if there are more pages
        if (result.nextPageBefore) {
          currentBefore = result.nextPageBefore
          addDebugInfo(`Next page available before timestamp: ${new Date(currentBefore).toLocaleString()}`)
        } else {
          addDebugInfo(`No more pages available`)
          hasMorePages = false
        }

        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error: any) {
        addDebugInfo(`Error on page ${pageCount}: ${error.message}`)
        break
      }
    }

    addDebugInfo(`✅ Complete fetch finished: ${allTransactions.length} total transactions across ${pageCount} pages`)
    return allTransactions
  }

  // Fetch single page of transactions with pagination support
  const fetchTransactionsPage = async (addr: string, limit = 500, before?: number | null): Promise<{
    transactions: Transaction[],
    nextPageBefore?: number,
    nextPageAfter?: number
  }> => {
    const tryFetch = async (currentLimit: number): Promise<{
      transactions: Transaction[],
      nextPageBefore?: number,
      nextPageAfter?: number
    }> => {
      try {
        let response;
        let url: string;
        
        try {
          // Build URL with pagination parameters
          const params = new URLSearchParams({
            limit: currentLimit.toString(),
            resolve_previous_outpoints: 'light'
          })
          
          if (before) {
            params.append('before', before.toString())
          }

          const proxyUrl = `/api/kaspa/transactions/${encodeURIComponent(addr)}?${params.toString()}`
          addDebugInfo(`Proxy Transaction URL: ${proxyUrl}`)
          
          response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
            }
          })
          addDebugInfo(`Proxy Response status: ${response.status} ${response.statusText}`)
        } catch (proxyError) {
          addDebugInfo('Proxy API failed, trying direct API...')
          
          const params = new URLSearchParams({
            limit: currentLimit.toString(),
            resolve_previous_outpoints: 'light'
          })
          
          if (before) {
            params.append('before', before.toString())
          }

          url = `https://api.kaspa.org/addresses/${encodeURIComponent(addr)}/full-transactions-page?${params.toString()}`
          addDebugInfo(`Direct Transaction URL: ${url}`)
          
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
            },
            mode: 'cors',
          })
          addDebugInfo(`Direct Response status: ${response.status} ${response.statusText}`)
        }

        if (!response.ok) {
          const errorText = await response.text()
          addDebugInfo(`Transaction Error response: ${errorText}`)
          
          if (response.status === 422 && errorText.includes('limit') && currentLimit > 100) {
            const newLimit = Math.min(500, Math.floor(currentLimit * 0.8))
            addDebugInfo(`Limit too high (${currentLimit}), retrying with ${newLimit}...`)
            return await tryFetch(newLimit)
          }
          
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        }

        const data = await response.json()
        
        // Extract pagination headers
        const nextPageBefore = response.headers.get('X-Next-Page-Before')
        const nextPageAfter = response.headers.get('X-Next-Page-After')
        
        addDebugInfo(`Page Success: Found ${data.length} transactions`)
        if (nextPageBefore) addDebugInfo(`Next page before: ${nextPageBefore}`)
        
        return {
          transactions: data as Transaction[],
          nextPageBefore: nextPageBefore ? parseInt(nextPageBefore) : undefined,
          nextPageAfter: nextPageAfter ? parseInt(nextPageAfter) : undefined
        }
      } catch (err: any) {
        addDebugInfo(`Transaction Page Fetch Error with limit ${currentLimit}: ${err.message}`)
        throw err
      }
    }

    return await tryFetch(Math.min(limit, 500))
  }

  // Calculate balance history from transactions with daily aggregation
  const calculateBalanceHistory = (txs: Transaction[], targetAddress: string): BalancePoint[] => {
    const points: BalancePoint[] = []
    let runningBalance = 0
    let totalRec = 0
    let totalSnt = 0

    // Sort transactions by time (oldest first)
    const sortedTxs = [...txs].sort((a, b) => a.accepting_block_time - b.accepting_block_time)

    // For high-volume addresses (500 transactions = API limit), aggregate by day
    if (sortedTxs.length >= 500) {
      addDebugInfo('⚠️ High-volume address detected - aggregating by day for better performance')
      
      // Group transactions by day
      const dailyGroups = new Map<string, Transaction[]>()
      
      sortedTxs.forEach(tx => {
        const date = new Date(tx.accepting_block_time).toDateString()
        if (!dailyGroups.has(date)) {
          dailyGroups.set(date, [])
        }
        dailyGroups.get(date)!.push(tx)
      })

      // Process each day
      Array.from(dailyGroups.entries())
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .forEach(([date, dayTxs]) => {
          let dayChange = 0
          let dayReceived = 0
          let daySent = 0

          dayTxs.forEach(tx => {
            const received = tx.outputs
              .filter(output => output.script_public_key_address === targetAddress)
              .reduce((sum, output) => sum + formatKAS(output.amount), 0)

            const sent = tx.inputs
              .filter(input => input.previous_outpoint_address === targetAddress)
              .reduce((sum, input) => sum + formatKAS(input.previous_outpoint_amount || 0), 0)

            dayReceived += received
            daySent += sent
            dayChange += (received - sent)
          })

          totalRec += dayReceived
          totalSnt += daySent

          if (dayChange !== 0) {
            runningBalance += dayChange
            points.push({
              timestamp: new Date(date).getTime(),
              balance: runningBalance,
              change: dayChange,
              txId: `${dayTxs.length} transactions on ${date}`,
              type: dayChange > 0 ? 'received' : 'sent'
            })
          }
        })
    } else {
      // Normal processing for addresses with < 500 transactions
      sortedTxs.forEach(tx => {
        let txChange = 0
        let type: 'received' | 'sent' = 'received'

        const received = tx.outputs
          .filter(output => output.script_public_key_address === targetAddress)
          .reduce((sum, output) => sum + formatKAS(output.amount), 0)

        const sent = tx.inputs
          .filter(input => input.previous_outpoint_address === targetAddress)
          .reduce((sum, input) => sum + formatKAS(input.previous_outpoint_amount || 0), 0)

        txChange = received - sent

        if (txChange > 0) {
          type = 'received'
          totalRec += received
        } else if (txChange < 0) {
          type = 'sent'
          totalSnt += Math.abs(sent)
        }

        if (txChange !== 0) {
          runningBalance += txChange
          points.push({
            timestamp: tx.accepting_block_time,
            balance: runningBalance,
            change: txChange,
            txId: tx.transaction_id,
            type
          })
        }
      })
    }

    setTotalReceived(totalRec)
    setTotalSent(totalSnt)
    return points
  }

  // Handle search
  const handleSearch = async () => {
    if (!address.trim()) {
      setError('Please enter a Kaspa address')
      return
    }

    if (!isValidKaspaAddress(address.trim())) {
      setError('Please enter a valid Kaspa address (format: kaspa:...)')
      return
    }

    setLoading(true)
    setError('')
    setDebugInfo([])
    setSearchAddress(address.trim())
    addDebugInfo('Starting address lookup process')

    try {
      addDebugInfo('Attempting to fetch address data...')
      
      // First, get UTXOs for current balance
      const utxoData = await fetchUTXOs(address.trim())
      setUtxos(utxoData)
      
      // Calculate current balance from UTXOs
      const balance = utxoData.reduce((sum, utxo) => 
        sum + formatKAS(utxo.utxoEntry.amount), 0
      )
      setCurrentBalance(balance)
      addDebugInfo(`Calculated current balance: ${balance} KAS from ${utxoData.length} UTXOs`)

      // Then fetch complete transaction history with pagination
      addDebugInfo('Starting complete transaction history fetch...')
      setFetchProgress({ currentPage: 0, totalPages: 20, isComplete: false })
      
      const allTxData = await fetchAllTransactions(address.trim(), 20) // Max 20 pages = 10,000 transactions
      
      setTransactions(allTxData)
      setTransactionCount(allTxData.length)
      setFetchProgress({ currentPage: 20, totalPages: 20, isComplete: true })

      // Calculate balance history with complete data
      const history = calculateBalanceHistory(allTxData, address.trim())
      setBalanceHistory(history)
      addDebugInfo(`Generated balance history with ${history.length} points from ${allTxData.length} total transactions`)

      addDebugInfo('✅ Complete address lookup finished successfully!')

    } catch (err: any) {
      let errorMessage = 'Failed to fetch address data. '
      
      if (err.message.includes('CORS')) {
        errorMessage += 'CORS error detected. This might require a backend proxy to access the Kaspa API.'
      } else if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
        errorMessage += 'Network error - please check your internet connection and try again.'
      } else if (err.message.includes('422')) {
        errorMessage += 'Invalid request parameters. The address might be valid but the request format is incorrect.'
      } else if (err.message.includes('404')) {
        errorMessage += 'Address not found or has no transaction history.'
      } else if (err.message.includes('500')) {
        errorMessage += 'Server error - the Kaspa API might be temporarily unavailable.'
      } else {
        errorMessage += 'Please check the address and try again.'
      }
      
      setError(errorMessage)
      addDebugInfo(`❌ Error: ${err.message}`)
      console.error('Address lookup error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Chart configuration
  const chartData = {
    labels: balanceHistory.map(point => new Date(point.timestamp)),
    datasets: [
      {
        label: 'Balance (KAS)',
        data: balanceHistory.map(point => point.balance),
        borderColor: '#5B6CFF',
        backgroundColor: 'rgba(91, 108, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointBackgroundColor: balanceHistory.map(point => 
          point.type === 'received' ? '#10B981' : '#EF4444'
        ),
        pointBorderColor: balanceHistory.map(point => 
          point.type === 'received' ? '#10B981' : '#EF4444'
        ),
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#E5E7EB',
          font: {
            family: 'Inter, sans-serif'
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(15, 15, 26, 0.95)',
        titleColor: '#E5E7EB',
        bodyColor: '#E5E7EB',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const point = balanceHistory[context.dataIndex]
            const changeStr = point.change > 0 ? `+${formatDisplay(point.change)}` : formatDisplay(point.change)
            return [
              `Balance: ${formatDisplay(context.parsed.y)} KAS`,
              `Change: ${changeStr} KAS`,
              `Type: ${point.type === 'received' ? 'Received' : 'Sent'}`,
              `TX: ${point.txId.substring(0, 8)}...`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MMM dd'
          }
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            family: 'Inter, sans-serif'
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            family: 'Inter, sans-serif'
          },
          callback: function(value: any) {
            return formatDisplay(value) + ' KAS'
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#5B6CFF] to-[#9333EA] bg-clip-text text-transparent mb-2">
            Address Balance History
          </h1>
          <p className="text-[#A0A0B8] text-lg">
            Track the balance history of any Kaspa address over time
          </p>
        </div>

        <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="address" className="block text-sm font-medium text-[#E5E7EB] mb-2">
                Kaspa Address
              </label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="kaspa:qqkqkzjvr7zwxxmjxjkmxxdwju9kjs6e9u82uh59z07vgaks6gg62v8707g73"
                className="w-full px-4 py-3 bg-[#0F0F1A] border border-[#2D2D45]/50 rounded-lg text-white placeholder-[#6B7280] focus:border-[#5B6CFF] focus:ring-1 focus:ring-[#5B6CFF] focus:outline-none transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-[#5B6CFF] to-[#9333EA] text-white font-medium rounded-lg hover:from-[#4F46E5] hover:to-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {fetchProgress.currentPage > 0 ? (
                      `Page ${fetchProgress.currentPage}/${fetchProgress.totalPages}...`
                    ) : (
                      'Loading...'
                    )}
                  </div>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
              
              <div className="mt-3 pt-3 border-t border-red-500/20">
                <p className="text-red-300 text-xs font-medium mb-2">Troubleshooting suggestions:</p>
                <ul className="text-red-200 text-xs space-y-1 list-disc list-inside">
                  <li>Check if the address format is correct (starts with "kaspa:")</li>
                  <li>Verify the address exists and has transaction history</li>
                  <li>Try refreshing the page and searching again</li>
                  <li>Check your internet connection</li>
                  {error.includes('CORS') && (
                    <li className="text-yellow-300">CORS issue detected - this requires backend proxy setup</li>
                  )}
                </ul>
              </div>
              
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="mt-3 text-xs text-red-300 hover:text-red-200 underline"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Information
              </button>
            </div>
          )}

          {!loading && !error && searchAddress && balanceHistory.length > 0 && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-green-400 text-sm">
                  ✅ Successfully loaded {balanceHistory.length} balance changes from {transactionCount} transactions
                </p>
              </div>
              <p className="text-green-300 text-xs mt-1">
                {fetchProgress.isComplete 
                  ? `Complete transaction history loaded (${Math.ceil(transactionCount / 500)} API pages)`
                  : 'Partial transaction history loaded'
                }
              </p>
            </div>
          )}

          {/* Remove high volume warning since we can now fetch complete history */}
          {!loading && !error && searchAddress && transactionCount >= 10000 && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-blue-400 text-sm">
                  🚀 High-volume address: Successfully loaded {transactionCount.toLocaleString()} transactions using pagination
                </p>
              </div>
              <p className="text-blue-300 text-xs mt-1">
                This address required {Math.ceil(transactionCount / 500)} API requests to fetch complete history
              </p>
            </div>
          )}

          {showDebug && debugInfo.length > 0 && (
            <div className="mt-4 p-4 bg-gray-800/50 border border-gray-600/30 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Debug Information
              </h4>
              <div className="bg-black/50 rounded-md p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                  {debugInfo.join('\n')}
                </pre>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <p className="text-xs text-gray-400">
                  This information helps diagnose connection issues
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(debugInfo.join('\n'))}
                    className="text-xs text-gray-400 hover:text-gray-300 underline"
                  >
                    Copy Log
                  </button>
                  <button
                    onClick={() => setDebugInfo([])}
                    className="text-xs text-gray-400 hover:text-gray-300 underline"
                  >
                    Clear Debug Log
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {searchAddress && !loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[#A0A0B8]">Current Balance</h3>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatDisplay(currentBalance)} KAS
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  {currentBalance.toLocaleString()} KAS
                </p>
              </div>

              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[#A0A0B8]">Total Received</h3>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatDisplay(totalReceived)} KAS
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  {totalReceived.toLocaleString()} KAS
                </p>
              </div>

              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[#A0A0B8]">Total Sent</h3>
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatDisplay(totalSent)} KAS
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  {totalSent.toLocaleString()} KAS
                </p>
              </div>

              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[#A0A0B8]">Transactions</h3>
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                </div>
                <p className="text-2xl font-bold text-white">
                  {transactionCount.toLocaleString()}
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Total transactions
                </p>
              </div>
            </div>

            <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-3">Address</h3>
              <div className="bg-[#0F0F1A] rounded-lg p-4 border border-[#2D2D45]/30">
                <p className="text-[#A0A0B8] font-mono text-sm break-all">
                  {searchAddress}
                </p>
              </div>
            </div>

            {balanceHistory.length > 0 && (
              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Balance History</h3>
                  {transactionCount >= 500 && (
                    <span className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
                      Daily Aggregated
                    </span>
                  )}
                </div>
                <div className="h-96">
                  <Line data={chartData} options={chartOptions} />
                </div>
                {transactionCount >= 500 && (
                  <p className="text-xs text-[#6B7280] mt-3 text-center">
                    Chart shows daily net balance changes due to high transaction volume
                  </p>
                )}
              </div>
            )}

            {balanceHistory.length > 0 && (
              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">
                  {transactionCount >= 500 ? 'Recent Daily Changes' : 'Recent Balance Changes'}
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {balanceHistory.slice(-10).reverse().map((point, index) => (
                    <div key={point.txId} className="flex items-center justify-between p-4 bg-[#0F0F1A]/50 rounded-lg border border-[#2D2D45]/30">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          point.type === 'received' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-white font-medium">
                            {transactionCount >= 500 
                              ? (point.change > 0 ? 'Net Received' : 'Net Sent')
                              : (point.type === 'received' ? 'Received' : 'Sent')
                            }
                          </p>
                          <p className="text-[#6B7280] text-sm font-mono">
                            {transactionCount >= 500 
                              ? point.txId
                              : `${point.txId.substring(0, 16)}...`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          point.change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {point.change > 0 ? '+' : ''}{formatDisplay(point.change)} KAS
                        </p>
                        <p className="text-[#6B7280] text-sm">
                          Balance: {formatDisplay(point.balance)} KAS
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          {new Date(point.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {transactionCount >= 500 && (
                  <p className="text-xs text-[#6B7280] mt-4 text-center">
                    Showing daily aggregated changes from recent transactions
                  </p>
                )}
              </div>
            )}

            {!loading && balanceHistory.length === 0 && searchAddress && (
              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-12 text-center">
                <div className="w-16 h-16 bg-[#2D2D45]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Transaction History</h3>
                <p className="text-[#A0A0B8]">
                  This address has no transaction history or the transactions couldn't be loaded.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
