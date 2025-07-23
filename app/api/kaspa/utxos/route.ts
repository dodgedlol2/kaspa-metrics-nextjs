// app/api/kaspa/utxos/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch('https://api.kaspa.org/addresses/utxos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Kaspa API error: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('UTXO proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch UTXOs', details: error.message },
      { status: 500 }
    )
  }
}

// app/api/kaspa/transactions/[address]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '500'
    const before = searchParams.get('before') || '0'
    const after = searchParams.get('after') || '0'
    const resolve = searchParams.get('resolve_previous_outpoints') || 'light'
    
    const kaspaUrl = `https://api.kaspa.org/addresses/${encodeURIComponent(params.address)}/full-transactions-page?limit=${limit}&before=${before}&after=${after}&resolve_previous_outpoints=${resolve}`
    
    const response = await fetch(kaspaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Kaspa API error: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Transactions proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error.message },
      { status: 500 }
    )
  }
}
