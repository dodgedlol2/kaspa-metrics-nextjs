import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailVerificationToken } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    const userId = await verifyEmailVerificationToken(token)

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Email verified successfully',
        userId 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
