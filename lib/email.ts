import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'in-v3.mailjet.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAILJET_API_KEY!,
    pass: process.env.MAILJET_API_SECRET!,
  },
})

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    await transporter.sendMail({
      from: `"Kaspa Metrics" <${process.env.MAILJET_FROM_EMAIL || 'noreply@kaspametrics.com'}>`,
      to: email,
      subject: 'Welcome to Kaspa Metrics! 🚀',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Kaspa Metrics!</h1>
          </div>
          
          <div style="padding: 40px 20px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${name}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Welcome to Kaspa Metrics - your premier destination for real-time Kaspa cryptocurrency analytics!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #5B6CFF; margin-top: 0;">What you get with Kaspa Metrics:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>📊 Real-time hashrate and mining analytics</li>
                <li>💰 Live price tracking and market data</li>
                <li>📈 Interactive charts and visualizations</li>
                <li>🔔 Price alerts and notifications (Premium)</li>
                <li>📤 Data export capabilities (Premium)</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://kaspa-metrics-nextjs-production.up.railway.app/dashboard" 
                 style="background: linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Explore Your Dashboard →
              </a>
            </div>
            
            <p style="color: #888; font-size: 14px; text-align: center; margin-top: 40px;">
              Questions? Reply to this email - we're here to help!<br>
              The Kaspa Metrics Team
            </p>
          </div>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetToken: string) {
  const resetUrl = `https://kaspa-metrics-nextjs-production.up.railway.app/reset-password?token=${resetToken}`
  
  try {
    await transporter.sendMail({
      from: `"Kaspa Metrics" <${process.env.MAILJET_FROM_EMAIL || 'noreply@kaspametrics.com'}>`,
      to: email,
      subject: 'Reset Your Kaspa Metrics Password 🔐',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
          </div>
          
          <div style="padding: 40px 20px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${name}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your Kaspa Metrics account.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5B6CFF;">
              <p style="color: #333; margin: 0; font-weight: bold;">Click the button below to reset your password:</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset Password →
              </a>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                ⚠️ This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
              </p>
            </div>
            
            <p style="color: #888; font-size: 14px; text-align: center; margin-top: 40px;">
              Having trouble? Copy and paste this link: <br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending password reset email:', error)
  }
}

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verifyUrl = `https://kaspa-metrics-nextjs-production.up.railway.app/verify-email?token=${token}`
  
  try {
    await transporter.sendMail({
      from: `"Kaspa Metrics" <${process.env.MAILJET_FROM_EMAIL || 'noreply@kaspametrics.com'}>`,
      to: email,
      subject: 'Please verify your Kaspa Metrics account 📧',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Almost there! 🎉</h1>
          </div>
          
          <div style="padding: 40px 20px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${name}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Welcome to Kaspa Metrics! Just one more step to complete your account setup.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5B6CFF;">
              <p style="color: #333; margin: 0; font-weight: bold;">Please verify your email address to unlock all features:</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" 
                 style="background: linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Verify Email Address →
              </a>
            </div>
            
            <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #0066cc; margin: 0; font-size: 14px;">
                ✨ Once verified, you'll get full access to premium alerts, data exports, and priority support!
              </p>
            </div>
            
            <p style="color: #888; font-size: 14px; text-align: center; margin-top: 40px;">
              This link will expire in 24 hours. Having trouble? Copy and paste this link: <br>
              <span style="word-break: break-all; font-size: 12px;">${verifyUrl}</span>
            </p>
          </div>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending verification email:', error)
  }
}
