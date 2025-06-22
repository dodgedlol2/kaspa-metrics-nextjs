import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface User {
  id: string
  email: string
  name?: string
  image?: string
  password_hash?: string
  email_verified: boolean
  is_premium: boolean
  created_at: string
  updated_at: string
}

export interface PasswordResetToken {
  id: string
  user_id: string
  token: string
  expires_at: string
  used: boolean
}

// Create user with email/password
export async function createUser(email: string, password: string, name?: string): Promise<User | null> {
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        name,
        password_hash: passwordHash,
        email_verified: false,
        is_premium: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating user:', error)
    return null
  }
}

// Verify user credentials
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user || !user.password_hash) {
      return null
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error verifying credentials:', error)
    return null
  }
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      return null
    }

    return user
  } catch (error) {
    return null
  }
}

// Create or update OAuth user
export async function createOrUpdateOAuthUser(
  email: string,
  name: string,
  image?: string,
  provider?: string
): Promise<User | null> {
  try {
    // Check if user exists
    const existingUser = await findUserByEmail(email)
    
    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({
          name,
          image,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
        .select()
        .single()

      return error ? null : data
    } else {
      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert({
          email,
          name,
          image,
          email_verified: true, // OAuth users are pre-verified
          is_premium: false,
        })
        .select()
        .single()

      return error ? null : data
    }
  } catch (error) {
    console.error('Error creating/updating OAuth user:', error)
    return null
  }
}

// Create password reset token
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  try {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        used: false,
      })

    if (error) {
      console.error('Error creating reset token:', error)
      return null
    }

    return token
  } catch (error) {
    console.error('Error creating reset token:', error)
    return null
  }
}

// Verify password reset token
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    return null
  }
}

// Reset password
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    const userId = await verifyPasswordResetToken(token)
    if (!userId) {
      return false
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId)

    if (updateError) {
      return false
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token)

    return true
  } catch (error) {
    return false
  }
}
// Create email verification token
export async function createEmailVerificationToken(userId: string): Promise<string | null> {
  try {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15) // Longer token for email verification
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry

    const { error } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (error) {
      console.error('Error creating verification token:', error)
      return null
    }

    return token
  } catch (error) {
    console.error('Error creating verification token:', error)
    return null
  }
}

// Verify email verification token
export async function verifyEmailVerificationToken(token: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    // Mark user as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', data.user_id)

    if (updateError) {
      return null
    }

    // Delete the used token
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('token', token)

    return data.user_id
  } catch (error) {
    return null
  }
}

// Get user verification status
export async function getUserVerificationStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', userId)
      .single()

    return data?.email_verified || false
  } catch (error) {
    return false
  }
}
