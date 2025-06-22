'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: '📊',
    description: 'Main metrics dashboard'
  },
  {
    name: 'Mining',
    icon: '⛏️',
    children: [
      { name: 'Hashrate', href: '/mining/hashrate', icon: '📈' },
      { name: 'Difficulty', href: '/mining/difficulty', icon: '🎯' },
      { name: 'Pool Stats', href: '/mining/pools', icon: '🏊‍♂️' },
    ]
  },
  {
    name: 'Market Data',
    icon: '💰',
    children: [
      { name: 'Price Chart', href: '/market/price', icon: '💹' },
      { name: 'Volume', href: '/market/volume', icon: '📊' },
      { name: 'Market Cap', href: '/market/marketcap', icon: '💎' },
    ]
  },
  {
    name: 'Network',
    icon: '🌐',
    children: [
      { name: 'Transactions', href: '/network/transactions', icon: '🔄' },
      { name: 'Blocks', href: '/network/blocks', icon: '⛓️' },
      { name: 'Addresses', href: '/network/addresses', icon: '👥' },
    ]
  },
  {
    name: 'Premium Features',
    icon: '👑',
    premium: true,
    children: [
      { name: 'Alerts', href: '/premium/alerts', icon: '🔔' },
      { name: 'API Access', href: '/premium/api', icon: '🔌' },
      { name: 'Export Data', href: '/premium/export', icon: '📤' },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(['Mining', 'Market Data'])

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    )
  }

  const isActive = (href: string) => pathname === href

  return (
    <div className="w-64 bg-black/20 backdrop-blur-sm border-r border-white/10 h-full overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-2">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.href ? (
                // Single navigation item
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-kaspa-gradient text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ) : (
                // Expandable section
                <div>
                  <button
                    onClick={() => toggleSection(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      item.premium ? 'text-yellow-400' : 'text-gray-300'
                    } hover:bg-white/10 hover:text-white`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                      {item.premium && <span className="ml-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded">PRO</span>}
                    </div>
                    <span className={`transform transition-transform ${
                      expandedSections.includes(item.name) ? 'rotate-90' : ''
                    }`}>
                      ▶
                    </span>
                  </button>
                  
                  {expandedSections.includes(item.name) && item.children && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.href)
                              ? 'bg-kaspa-gradient text-white'
                              : 'text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="mr-3">{child.icon}</span>
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
