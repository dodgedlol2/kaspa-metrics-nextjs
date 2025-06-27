'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
      </svg>
    ),
    description: 'Main metrics dashboard'
  },
  {
    name: 'Mining',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.27,4.73L19.27,9.73C19.65,10.11 19.65,10.74 19.27,11.12L14.27,16.12C13.89,16.5 13.26,16.5 12.88,16.12C12.5,15.74 12.5,15.11 12.88,14.73L16.16,11.45H8.91L12.19,14.73C12.57,15.11 12.57,15.74 12.19,16.12C11.81,16.5 11.18,16.5 10.8,16.12L5.8,11.12C5.42,10.74 5.42,10.11 5.8,9.73L10.8,4.73C11.18,4.35 11.81,4.35 12.19,4.73C12.57,5.11 12.57,5.74 12.19,6.12L8.91,9.4H16.16L12.88,6.12C12.5,5.74 12.5,5.11 12.88,4.73C13.26,4.35 13.89,4.35 14.27,4.73Z"/>
      </svg>
    ),
    children: [
      { 
        name: 'Hashrate', 
        href: '/mining/hashrate', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
          </svg>
        )
      },
      { 
        name: 'Difficulty', 
        href: '/mining/difficulty', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
          </svg>
        )
      },
      { 
        name: 'Pool Stats', 
        href: '/mining/pools', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/>
          </svg>
        )
      },
    ]
  },
  {
    name: 'Market Data',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
      </svg>
    ),
    children: [
      { 
        name: 'Price Chart', 
        href: '/market/price', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
          </svg>
        )
      },
      { 
        name: 'Volume', 
        href: '/market/volume', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
          </svg>
        )
      },
      { 
        name: 'Market Cap', 
        href: '/market/marketcap', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5,16L3,14L5,12V13H12V15H5V16M19,8L21,10L19,12V11H12V9H19V8M2,20V4H4V20H2M22,20V4H20V20H22Z"/>
          </svg>
        )
      },
    ]
  },
  {
    name: 'Network',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17,3A2,2 0 0,1 19,5V15A2,2 0 0,1 17,17H13V19H14A1,1 0 0,1 15,20H22V22H15A1,1 0 0,1 14,23H10A1,1 0 0,1 9,22H2V20H9A1,1 0 0,1 10,19H11V17H7C5.89,17 5,16.1 5,15V5A2,2 0 0,1 7,3H17Z"/>
      </svg>
    ),
    children: [
      { 
        name: 'Transactions', 
        href: '/network/transactions', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H8V4H20V16M16,6V14L12,10.5L8,14V6H16Z"/>
          </svg>
        )
      },
      { 
        name: 'Blocks', 
        href: '/network/blocks', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V7H5V5H19M5,19V9H19V19H5Z"/>
          </svg>
        )
      },
      { 
        name: 'Addresses', 
        href: '/network/addresses', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C18.67,14 24,15.33 24,18V20H8V18C8,15.33 13.33,14 16,14M8.5,6A2.5,2.5 0 0,1 11,8.5A2.5,2.5 0 0,1 8.5,11A2.5,2.5 0 0,1 6,8.5A2.5,2.5 0 0,1 8.5,6M8.5,13C10.83,13 15.5,14.17 15.5,16.5V18H1.5V16.5C1.5,14.17 6.17,13 8.5,13Z"/>
          </svg>
        )
      },
    ]
  },
  {
    name: 'Premium Features',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5,16L3,14L5,12V13H12V15H5V16M19,8L21,10L19,12V11H12V9H19V8M12,2L15.09,8.26L22,9L17,14L18.18,21L12,17.77L5.82,21L7,14L2,9L8.91,8.26L12,2Z"/>
      </svg>
    ),
    premium: true,
    children: [
      { 
        name: 'Alerts', 
        href: '/premium/alerts', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21"/>
          </svg>
        )
      },
      { 
        name: 'API Access', 
        href: '/premium/api', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.5,8.5L11,11L8.5,13.5L9.91,14.91L14.41,10.41L15.83,9L14.41,7.59L9.91,3.09L8.5,4.5L11,7H2V9H11L8.5,11.5V8.5M22,7V9H15V7H22M22,15V17H15V15H22Z"/>
          </svg>
        )
      },
      { 
        name: 'Export Data', 
        href: '/premium/export', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9,10V12H7V10H9M13,10V12H11V10H13M17,10V12H15V10H17M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19M19,19V8H5V19H19M19,6V5H5V6H19Z"/>
          </svg>
        )
      },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(['Market Data'])

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    )
  }

  const isActive = (href: string) => pathname === href

  return (
    <div className="w-64 bg-[#0F0F1A]/80 backdrop-blur-xl border-r border-[#2D2D45]/30 h-full overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#2D2D45]/30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#5B6CFF] to-[#8B5CF6] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2L13.09,8.26L22,9L17,14L18.18,21L12,17.77L5.82,21L7,14L2,9L8.91,8.26L12,2Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">Kaspa</h1>
            <p className="text-[#A0A0B8] text-xs">Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4">
        <nav className="space-y-1">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.href ? (
                // Single navigation item
                <Link
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-[#5B6CFF] text-white shadow-lg shadow-[#5B6CFF]/25'
                      : 'text-[#A0A0B8] hover:bg-[#1A1A2E] hover:text-white'
                  }`}
                >
                  <span className={`mr-3 transition-colors duration-200 ${
                    isActive(item.href) ? 'text-white' : 'text-[#6366F1] group-hover:text-[#5B6CFF]'
                  }`}>
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              ) : (
                // Expandable section
                <div>
                  <button
                    onClick={() => toggleSection(item.name)}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.premium 
                        ? 'text-[#F59E0B] hover:bg-[#1A1A2E]/80' 
                        : 'text-[#A0A0B8] hover:bg-[#1A1A2E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className={`mr-3 transition-colors duration-200 ${
                        item.premium 
                          ? 'text-[#F59E0B]' 
                          : 'text-[#6366F1] group-hover:text-[#5B6CFF]'
                      }`}>
                        {item.icon}
                      </span>
                      <span className="flex items-center">
                        {item.name}
                        {item.premium && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-[#F59E0B] to-[#EAB308] text-black rounded-md">
                            PRO
                          </span>
                        )}
                      </span>
                    </div>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedSections.includes(item.name) ? 'rotate-90' : ''
                      } ${item.premium ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  {expandedSections.includes(item.name) && item.children && (
                    <div className="ml-8 mt-1 space-y-1 border-l border-[#2D2D45]/30 pl-4">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`group flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            isActive(child.href)
                              ? 'bg-[#5B6CFF]/20 text-[#5B6CFF] font-medium border-l-2 border-[#5B6CFF] ml-[-1px]'
                              : 'text-[#9CA3AF] hover:bg-[#1A1A2E]/60 hover:text-white'
                          }`}
                        >
                          <span className={`mr-3 transition-colors duration-200 ${
                            isActive(child.href) 
                              ? 'text-[#5B6CFF]' 
                              : 'text-[#6B7280] group-hover:text-[#6366F1]'
                          }`}>
                            {child.icon}
                          </span>
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

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#2D2D45]/30 bg-[#0F0F1A]/90 backdrop-blur-sm">
        <div className="text-center">
          <p className="text-[#6B7280] text-xs">
            Kaspa Analytics v2.0
          </p>
          <div className="flex items-center justify-center mt-2 space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[#9CA3AF] text-xs">Live Data</span>
          </div>
        </div>
      </div>
    </div>
  )
}
