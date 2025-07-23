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
