import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kaspa Metrics - Real-time Cryptocurrency Analytics',
  description: 'Professional Kaspa cryptocurrency metrics with real-time charts, mining data, and market insights.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-kaspa-dark min-h-screen`}>
        <div className="flex h-screen">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto bg-gradient-to-br from-kaspa-dark via-kaspa-darker to-kaspa-dark">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
