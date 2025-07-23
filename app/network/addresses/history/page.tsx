'use client'

import { useState, useEffect } from 'react'
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
  const [currentBalance, setCurrentBalance] = useState(0)
  const [totalReceived, setTotalReceived] = useState(0)
  const [totalSent, setTotalSent] = useState(0)
  const [transactionCount, setTransactionCount] = useState(0)

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

  // Fetch UTXOs for current balance
  const fetchUTXOs = async (addr: string) => {
    try {
      const response = await fetch('https://api.kaspa.org/addresses/utxos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addresses: [addr]
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data as UTXO[]
    } catch (err) {
      console.error('Error fetching UTXOs:', err)
      throw err
    }
  }

  // Fetch transaction history
  const fetchTransactions = async (addr: string, limit = 500) => {
    try {
      const response = await fetch(
        `https://api.kaspa.org/addresses/${encodeURIComponent(addr)}/full-transactions-page?limit=${limit}&resolve_previous_outpoints=light`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data as Transaction[]
    } catch (err) {
      console.error('Error fetching transactions:', err)
      throw err
    }
  }

  // Calculate balance history from transactions
  const calculateBalanceHistory = (txs: Transaction[], targetAddress: string): BalancePoint[] => {
    const points: BalancePoint[] = []
    let runningBalance = 0
    let totalRec = 0
    let totalSnt = 0

    // Sort transactions by time (oldest first)
    const sortedTxs = [...txs].sort((a, b) => a.accepting_block_time - b.accepting_block_time)

    sortedTxs.forEach(tx => {
      let txChange = 0
      let type: 'received' | 'sent' = 'received'

      // Calculate received amount (outputs to our address)
      const received = tx.outputs
        .filter(output => output.script_public_key_address === targetAddress)
        .reduce((sum, output) => sum + formatKAS(output.amount), 0)

      // Calculate sent amount (inputs from our address)
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
    setSearchAddress(address.trim())

    try {
      // Fetch UTXOs and transactions in parallel
      const [utxoData, txData] = await Promise.all([
        fetchUTXOs(address.trim()),
        fetchTransactions(address.trim(), 1000)
      ])

      setUtxos(utxoData)
      setTransactions(txData)
      setTransactionCount(txData.length)

      // Calculate current balance from UTXOs
      const balance = utxoData.reduce((sum, utxo) => 
        sum + formatKAS(utxo.utxoEntry.amount), 0
      )
      setCurrentBalance(balance)

      // Calculate balance history
      const history = calculateBalanceHistory(txData, address.trim())
      setBalanceHistory(history)

    } catch (err) {
      setError('Failed to fetch address data. Please check the address and try again.')
      console.error(err)
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#5B6CFF] to-[#9333EA] bg-clip-text text-transparent mb-2">
            Address Balance History
          </h1>
          <p className="text-[#A0A0B8] text-lg">
            Track the balance history of any Kaspa address over time
          </p>
        </div>

        {/* Search Section */}
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
                    Loading...
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
            </div>
          )}
        </div>

        {/* Results Section */}
        {searchAddress && !loading && (
          <>
            {/* Address Info Cards */}
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

            {/* Address Display */}
            <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-3">Address</h3>
              <div className="bg-[#0F0F1A] rounded-lg p-4 border border-[#2D2D45]/30">
                <p className="text-[#A0A0B8] font-mono text-sm break-all">
                  {searchAddress}
                </p>
              </div>
            </div>

            {/* Balance History Chart */}
            {balanceHistory.length > 0 && (
              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-6">Balance History</h3>
                <div className="h-96">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            {balanceHistory.length > 0 && (
              <div className="bg-[#1A1A2E]/60 backdrop-blur-sm rounded-xl border border-[#2D2D45]/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Recent Balance Changes</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {balanceHistory.slice(-10).reverse().map((point, index) => (
                    <div key={point.txId} className="flex items-center justify-between p-4 bg-[#0F0F1A]/50 rounded-lg border border-[#2D2D45]/30">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          point.type === 'received' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-white font-medium">
                            {point.type === 'received' ? 'Received' : 'Sent'}
                          </p>
                          <p className="text-[#6B7280] text-sm font-mono">
                            {point.txId.substring(0, 16)}...
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
                        <p className="text-[#6B7280] text-xs">
                          {new Date(point.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Data Message */}
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
