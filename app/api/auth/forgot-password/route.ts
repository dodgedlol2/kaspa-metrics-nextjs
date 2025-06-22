import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, createPasswordResetToken } from '@/lib/database'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await findUserByEmail(email)
    if (!user) {
      // Don't reveal if user exists - security best practice
      return NextResponse.json(
        { message: 'If an account with that email exists, we sent a reset link' },
        { status: 200 }
      )
    }

    // Create reset token
    const token = await createPasswordResetToken(user.id)
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to create reset token' },
        { status: 500 }
      )
    }

    // Send reset email
    try {
      await sendPasswordResetEmail(email, user.name || 'User', token)
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send reset email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, we sent a reset link' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
