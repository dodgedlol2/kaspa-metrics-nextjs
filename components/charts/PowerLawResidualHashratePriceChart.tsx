layout.xaxis = {
        title: { text: 'Days Since Genesis (Log Scale)' },
        type: 'log',
        showgrid: true,
        gridwidth: 1,
        gridcolor: 'rgba(255, 255, 255, 0.1)',
        linecolor: '#3A3C4A',
        zerolinecolor: '#3A3C4A',
        color: '#9CA3AF',
        range: [logMin, logMax],
        autorange: false,
        minor: {
          ticklen: 6,
          gridcolor: 'rgba(255, 255, 255, 0.05)',
          gridwidth: 0.5
        },
        showspikes: false,
        domain: [0, 1]
      }
    } else {
      const dates = filteredData.map(d => new Date(d.timestamp))
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
      
      layout.xaxis = {
        title: { text: 'Date' },
        type: 'date',
        showgrid: true,
        gridwidth: 1,
        gridcolor: '#363650',
        linecolor: '#3A3C4A',
        zerolinecolor: '#3A3C4A',
        color: '#9CA3AF',
        tickformat: '%b %Y',
        hoverformat: '%B %d, %Y',
        range: [minDate.toISOString(), maxDate.toISOString()],
        autorange: false,
        showspikes: false,
        domain: [0, 1]
      }
    }

    // Configure primary Y-axis (hashrate)
    layout.yaxis = {
      title: { text: 'Hashrate (H/s)' },
      type: hashrateScale === 'Log' ? 'log' : 'linear',
      gridcolor: '#363650',
      gridwidth: 1,
      color: '#9CA3AF',
      range: hashrateScale === 'Log' 
        ? [Math.log10(yMinChart), Math.log10(yMaxChart)]
        : [yMinChart, yMaxChart],
      showspikes: false,
      tickmode: 'array',
      tickvals: yTickVals,
      ticktext: yTickText,
      domain: mainChartDomain
    }

    // Add log-specific Y-axis configuration
    if (hashrateScale === 'Log') {
      layout.yaxis.minor = {
        showgrid: true,
        gridwidth: 0.5,
        gridcolor: 'rgba(54, 54, 80, 0.3)',
        tickmode: 'array',
        tickvals: yMinorTicks
      }
    }

    // Configure secondary Y-axis (price) if price data exists
    if (filteredPriceData && filteredPriceData.length > 0 && priceYRange && priceYTickVals && priceYTickText) {
      layout.yaxis2 = {
        title: { text: 'Price (USD)', standoff: 20 },
        type: priceScale === 'Log' ? 'log' : 'linear',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        color: '#9CA3AF',
        range: priceYRange,
        tickmode: 'array',
        tickvals: priceYTickVals,
        ticktext: priceYTickText,
        showspikes: false,
        domain: mainChartDomain
      }

      if (priceScale === 'Log') {
        layout.yaxis2.minor = {
          showgrid: false,
          gridwidth: 0.5,
          gridcolor: 'rgba(54, 54, 80, 0.3)',
          tickmode: 'array',
          tickvals: priceYMinorTicks
        }
      }
    }

    // Residual Y-axis
    if (showResidual === 'Show' && priceResidualData?.residuals) {
      layout.yaxis3 = {
        title: { text: 'Price Residual (%)', font: { size: 14, color: '#8B5CF6' } },
        type: 'linear',
        side: 'left',
        gridcolor: '#363650',
        color: '#8B5CF6',
        tickfont: { color: '#8B5CF6', size: 11 },
        zerolinecolor: '#6B7280',
        zerolinewidth: 2,
        domain: residualDomain,
        tickformat: '+.0f',
        ticksuffix: '%',
        hoverformat: '+.1f%'
      }
    }

    return layout
  }, [filteredData, filteredPriceData, timeScale, hashrateScale, priceScale, height, showResidual, priceResidualData])

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Interactive Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Hashrate Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.27,4.73L19.27,9.73C19.65,10.11 19.65,10.74 19.27,11.12L14.27,16.12C13.89,16.5 13.26,16.5 12.88,16.12C12.5,15.74 12.5,15.11 12.88,14.73L16.16,11.45H8.91L12.19,14.73C12.57,15.11 12.57,15.74 12.19,16.12C11.81,16.5 11.18,16.5 10.8,16.12L5.8,11.12C5.42,10.74 5.42,10.11 5.8,9.73L10.8,4.73C11.18,4.35 11.81,4.35 12.19,4.73C12.57,5.11 12.57,5.74 12.19,6.12L8.91,9.4H16.16L12.88,6.12C12.5,5.74 12.5,5.11 12.88,4.73C13.26,4.35 13.89,4.35 14.27,4.73Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Hashrate Scale:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{hashrateScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setHashrateScale('Linear')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    hashrateScale === 'Linear' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${hashrateScale === 'Linear' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Linear Scale
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Equal spacing between hashrate intervals
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setHashrateScale('Log')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    hashrateScale === 'Log' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${hashrateScale === 'Log' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Logarithmic Scale
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Better for analyzing percentage changes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price Scale Control */}
          {filteredPriceData && filteredPriceData.length > 0 && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7H13V9H11V7M11,11H13V17H11V11Z"/>
                </svg>
                <span className="text-[#A0A0B8] text-xs">Price Scale:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{priceScale}</span>
                <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
                <div className="p-1.5">
                  <div 
                    onClick={() => setPriceScale('Linear')}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      priceScale === 'Linear' 
                        ? 'bg-[#5B6CFF]/20' 
                        : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
                    </svg>
                    <div className="flex-1">
                      <div className={`font-medium text-xs ${priceScale === 'Linear' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                        Linear Scale
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                        Equal spacing between price intervals
                      </div>
                    </div>
                  </div>
                  <div 
                    onClick={() => setPriceScale('Log')}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      priceScale === 'Log' 
                        ? 'bg-[#5B6CFF]/20' 
                        : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M7,10H9V16H7V10M11,7H13V16H11V7M15,13H17V16H15V13Z"/>
                    </svg>
                    <div className="flex-1">
                      <div className={`font-medium text-xs ${priceScale === 'Log' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                        Logarithmic Scale
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                        Better for analyzing percentage changes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Time Scale Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Time Scale:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{timeScale}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setTimeScale('Linear')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    timeScale === 'Linear' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${timeScale === 'Linear' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Linear Time
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Standard calendar-based time axis
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setTimeScale('Log')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    timeScale === 'Log' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${timeScale === 'Log' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Logarithmic Time
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Days from genesis, log-scaled
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Power Law Control */}
          <div className="relative group">
            <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
              <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
              </svg>
              <span className="text-[#A0A0B8] text-xs">Power Law:</span>
              <span className="font-medium text-[#FFFFFF] text-xs">{showPowerLaw}</span>
              <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setShowPowerLaw('Hide')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showPowerLaw === 'Hide' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9H21M19,19H5V3H13V9H19V19Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showPowerLaw === 'Hide' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Hide Power Law
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Display only the hashrate data
                    </div>
                  </div>
                </div>
                <div 
                  onClick={() => setShowPowerLaw('Show')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                    showPowerLaw === 'Show' 
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22,7L20.59,5.59L13.5,12.68L9.91,9.09L2,17L3.41,18.41L9.91,11.91L13.5,15.5L22,7Z"/>
                  </svg>
                  <div className="flex-1">
                    <div className={`font-medium text-xs ${showPowerLaw === 'Show' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                      Show Power Law
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                      Display regression trend line
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Residual Control */}
          {filteredPriceData && filteredPriceData.length > 0 && (
            <div className="relative group">
              <button className="flex items-center space-x-1.5 bg-[#1A1A2E] rounded-md px-2.5 py-1.5 text-xs text-white hover:bg-[#2A2A3E] transition-all duration-200">
                <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                </svg>
                <span className="text-[#A0A0B8] text-xs">Residual:</span>
                <span className="font-medium text-[#FFFFFF] text-xs">{showResidual}</span>
                <svg className="w-3 h-3 text-[#6B7280] group-hover:text-[#5B6CFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full mt-1 left-0 w-64 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
                <div className="p-1.5">
                  <div 
                    onClick={() => setShowResidual('Hide')}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      showResidual === 'Hide' 
                        ? 'bg-[#5B6CFF]/20' 
                        : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9H21M19,19H5V3H13V9H19V19Z"/>
                    </svg>
                    <div className="flex-1">
                      <div className={`font-medium text-xs ${showResidual === 'Hide' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                        Hide Residual
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                        Hide the residual oscillator chart
                      </div>
                    </div>
                  </div>
                  <div 
                    onClick={() => setShowResidual('Show')}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      showResidual === 'Show' 
                        ? 'bg-[#5B6CFF]/20' 
                        : 'hover:bg-[#1A1A2E]/80'
                    }`}
                  >
                    <svg className="w-5 h-5 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                    <div className="flex-1">
                      <div className={`font-medium text-xs ${showResidual === 'Show' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'}`}>
                        Show Residual
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                        Show price deviation from power law trend
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Period Buttons */}
        <div className="flex items-center gap-2">
          {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                timePeriod === period
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
          
          {/* Max Time Dropdown */}
          <div className="relative group">
            <button 
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                timePeriod === 'All' || timePeriod === 'Full' || timePeriod === '1W' || timePeriod === '2Y' || timePeriod === '3Y' || timePeriod === '5Y'
                  ? 'bg-[#5B6CFF] text-white'
                  : 'bg-[#1A1A2E] text-[#A0A0B8] hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              <svg className={`w-3 h-3 ${
                timePeriod === 'All' || timePeriod === 'Full' || timePeriod === '1W' || timePeriod === '2Y' || timePeriod === '3Y' || timePeriod === '5Y'
                  ? 'text-white' 
                  : 'text-[#6366F1]'
              }`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
              </svg>
              <span>Max</span>
              <svg className={`w-3 h-3 transition-colors ${
                timePeriod === 'All' || timePeriod === 'Full' || timePeriod === '1W' || timePeriod === '2Y' || timePeriod === '3Y' || timePeriod === '5Y'
                  ? 'text-white group-hover:text-gray-200' 
                  : 'text-current group-hover:text-[#5B6CFF]'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full mt-1 right-0 w-32 bg-[#0F0F1A]/60 border border-[#2D2D45]/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 backdrop-blur-md">
              <div className="p-1.5">
                <div 
                  onClick={() => setTimePeriod('1W')}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === '1W'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === '1W' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    1 Week
                  </span>
                </div>
                <div 
                  onClick={() => setTimePeriod('2Y' as any)}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === '2Y'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === '2Y' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    2 Years
                  </span>
                </div>
                <div 
                  onClick={() => setTimePeriod('3Y' as any)}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === '3Y'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === '3Y' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    3 Years
                  </span>
                </div>
                <div 
                  onClick={() => setTimePeriod('5Y' as any)}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === '5Y'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19M19,6H5V5H19V6Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === '5Y' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    5 Years
                  </span>
                </div>
                <div 
                  onClick={() => setTimePeriod('All')}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                    timePeriod === 'All' || timePeriod === 'Full'
                      ? 'bg-[#5B6CFF]/20' 
                      : 'hover:bg-[#1A1A2E]/80'
                  }`}
                >
                  <svg className="w-4 h-4 text-[#6366F1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                  </svg>
                  <span className={`text-xs font-medium ${
                    timePeriod === 'All' || timePeriod === 'Full' ? 'text-[#5B6CFF]' : 'text-[#FFFFFF]'
                  }`}>
                    All Time
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plotly Chart */}
      <div style={{ height: `${height}px` }} className="w-full">
        <Plot
          data={plotlyData}
          layout={plotlyLayout}
          style={{ width: '100%', height: '100%' }}
          onDoubleClick={handleDoubleClickReset}
          onRelayout={(eventData) => {
            console.log('Plotly relayout event:', eventData)
          }}
          config={{
            displayModeBar: false,
            responsive: true,
            doubleClick: 'autosize',
            scrollZoom: true,
            editable: false
          }}
          useResizeHandler={true}
        />
      </div>
    </div>
  )
}'use client'
import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KaspaMetric } from '@/lib/sheets'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface HashrateChartProps {
  data?: KaspaMetric[]
  hashrateData?: KaspaMetric[]
  priceData?: KaspaMetric[]
  height?: number
  className?: string
}

const GENESIS_DATE = new Date('2021-11-07T00:00:00.000Z').getTime()

function getDaysFromGenesis(timestamp: number): number {
  return Math.max(1, Math.floor((timestamp - GENESIS_DATE) / (24 * 60 * 60 * 1000)) + 1)
}

function fitPowerLaw(data: KaspaMetric[]) {
  const validData = data.filter(point => point.value > 0)
  if (validData.length < 2) throw new Error("Not enough valid data points")
  
  const logX = validData.map(point => Math.log(Math.max(1, getDaysFromGenesis(point.timestamp))))
  const logY = validData.map(point => Math.log(point.value))
  
  const n = logX.length
  const sumX = logX.reduce((a, b) => a + b, 0)
  const sumY = logY.reduce((a, b) => a + b, 0)
  const sumXY = logX.reduce((sum, x, i) => sum + x * logY[i], 0)
  const sumX2 = logX.reduce((sum, x) => sum + x * x, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return { a: Math.exp(intercept), b: slope }
}

function fitPricePowerLaw(data: Array<{hashrate: number, price: number}>) {
  if (data.length < 2) throw new Error("Not enough valid data points")
  
  const logData = data.map(point => ({
    x: Math.log(Math.max(0.0001, point.hashrate / 1e15)),
    y: Math.log(Math.max(0.0001, point.price))
  }))
  
  const n = logData.length
  const sumX = logData.reduce((sum, point) => sum + point.x, 0)
  const sumY = logData.reduce((sum, point) => sum + point.y, 0)
  const sumXY = logData.reduce((sum, point) => sum + point.x * point.y, 0)
  const sumX2 = logData.reduce((sum, point) => sum + point.x * point.x, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return { a: Math.exp(intercept), b: slope }
}

function calculateATH(data: KaspaMetric[]) {
  if (data.length === 0) return null
  const athPoint = data.reduce((max, point) => point.value > max.value ? point : max)
  return {
    hashrate: athPoint.value,
    date: new Date(athPoint.timestamp),
    timestamp: athPoint.timestamp,
    daysFromGenesis: getDaysFromGenesis(athPoint.timestamp)
  }
}

function calculate1YL(data: KaspaMetric[]) {
  if (data.length === 0) return null
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000)
  const recentData = data.filter(point => point.timestamp >= oneYearAgo)
  
  const targetData = recentData.length === 0 ? data : recentData
  const oylPoint = targetData.reduce((min, point) => point.value < min.value ? point : min)
  
  return {
    hashrate: oylPoint.value,
    date: new Date(oylPoint.timestamp),
    timestamp: oylPoint.timestamp,
    daysFromGenesis: getDaysFromGenesis(oylPoint.timestamp)
  }
}

function formatHashrate(value: number): string {
  if (value >= 1e18) return `${(value/1e18).toFixed(2)} EH/s`
  if (value >= 1e15) return `${(value/1e15).toFixed(2)} PH/s`
  if (value >= 1e12) return `${(value/1e12).toFixed(2)} TH/s`
  if (value >= 1e9) return `${(value/1e9).toFixed(2)} GH/s`
  if (value >= 1e6) return `${(value/1e6).toFixed(2)} MH/s`
  if (value >= 1e3) return `${(value/1e3).toFixed(2)} KH/s`
  return `${value.toFixed(2)} H/s`
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value/1000).toFixed(1)}k`
  if (value >= 100) return `$${value.toFixed(0)}`
  if (value >= 10) return `$${value.toFixed(1)}`
  if (value >= 1) return `$${value.toFixed(2)}`
  if (value >= 0.01) return `$${value.toFixed(3)}`
  if (value >= 0.001) return `$${value.toFixed(4)}`
  if (value >= 0.0001) return `$${value.toFixed(5)}`
  return `$${value.toExponential(1)}`
}

// Generate log ticks with proper formatting
function generateLogTicks(dataMin: number, dataMax: number) {
  const logMin = Math.floor(Math.log10(dataMin))
  const logMax = Math.ceil(Math.log10(dataMax))
  
  const majorTicks: number[] = []
  const intermediateTicks: number[] = []
  const minorTicks: number[] = []
  
  for (let i = logMin; i <= logMax + 1; i++) {
    const base = Math.pow(10, i)
    
    if (dataMin <= base && base <= dataMax) {
      majorTicks.push(base)
    }
    
    for (const factor of [2, 5]) {
      const intermediateVal = factor * base
      if (dataMin <= intermediateVal && intermediateVal <= dataMax) {
        intermediateTicks.push(intermediateVal)
      }
    }
    
    for (const j of [3, 4, 6, 7, 8, 9]) {
      const minorVal = j * base
      if (dataMin <= minorVal && minorVal <= dataMax) {
        minorTicks.push(minorVal)
      }
    }
  }
  
  return { majorTicks, intermediateTicks, minorTicks }
}

// Generate linear ticks with appropriate spacing
function generateLinearTicks(dataMin: number, dataMax: number, numTicks: number = 8) {
  const range = dataMax - dataMin
  const rawStep = range / (numTicks - 1)
  
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalizedStep = rawStep / magnitude
  
  let niceStep: number
  if (normalizedStep <= 1) {
    niceStep = 1
  } else if (normalizedStep <= 2) {
    niceStep = 2
  } else if (normalizedStep <= 5) {
    niceStep = 5
  } else {
    niceStep = 10
  }
  
  const step = niceStep * magnitude
  const niceMin = Math.floor(dataMin / step) * step
  const niceMax = Math.ceil(dataMax / step) * step
  
  const ticks: number[] = []
  for (let i = niceMin; i <= niceMax + step/2; i += step) {
    if (i >= 0) {
      ticks.push(i)
    }
  }
  
  return ticks
}

export default function PowerLawResidualHashratePriceChart({ 
  data, 
  hashrateData, 
  priceData, 
  height = 800,
  className 
}: HashrateChartProps) {
  const actualHashrateData = hashrateData || data || []

  const [hashrateScale, setHashrateScale] = useState<'Linear' | 'Log'>('Log')
  const [priceScale, setPriceScale] = useState<'Linear' | 'Log'>('Log')
  const [timeScale, setTimeScale] = useState<'Linear' | 'Log'>('Linear')
  const [timePeriod, setTimePeriod] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | 'All' | 'Full'>('All')
  const [showPowerLaw, setShowPowerLaw] = useState<'Hide' | 'Show'>('Show')
  const [showResidual, setShowResidual] = useState<'Hide' | 'Show'>('Show')

  // Function to handle double-click reset to full view
  const handleDoubleClickReset = () => {
    if (timePeriod === 'All') {
      setTimePeriod('Full')
    } else if (timePeriod === 'Full') {
      setTimePeriod('All')
    } else {
      setTimePeriod('All')
    }
  }

  const filteredData = useMemo(() => {
    if (timePeriod === 'All' || timePeriod === 'Full' || actualHashrateData.length === 0) return actualHashrateData
    
    const now = Date.now()
    const days = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '3Y': 1095, '5Y': 1825 }
    const cutoffTime = now - days[timePeriod as keyof typeof days] * 24 * 60 * 60 * 1000
    return actualHashrateData.filter(point => point.timestamp >= cutoffTime)
  }, [actualHashrateData, timePeriod])

  const filteredPriceData = useMemo(() => {
    if (!priceData || timePeriod === 'All' || timePeriod === 'Full' || priceData.length === 0) return priceData || []
    
    const now = Date.now()
    const days = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '3Y': 1095, '5Y': 1825 }
    const cutoffTime = now - days[timePeriod as keyof typeof days] * 24 * 60 * 60 * 1000
    return priceData.filter(point => point.timestamp >= cutoffTime)
  }, [priceData, timePeriod])

  const mergedData = useMemo(() => {
    if (!priceData || !actualHashrateData || priceData.length === 0 || actualHashrateData.length === 0) return []

    const merged: Array<{ timestamp: number, hashrate: number, price: number }> = []
    filteredPriceData.forEach(pricePoint => {
      const priceDate = new Date(pricePoint.timestamp).toDateString()
      const correspondingHashrate = filteredData.find(hashratePoint => {
        const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
        return priceDate === hashrateDate
      })

      if (correspondingHashrate && pricePoint.value > 0 && correspondingHashrate.value > 0) {
        merged.push({
          timestamp: pricePoint.timestamp,
          hashrate: correspondingHashrate.value,
          price: pricePoint.value
        })
      }
    })

    return merged.sort((a, b) => a.timestamp - b.timestamp)
  }, [filteredData, filteredPriceData, actualHashrateData, priceData])

  const powerLawData = useMemo(() => {
    if (showPowerLaw === 'Hide' || actualHashrateData.length < 10) return null
    try {
      return fitPowerLaw(actualHashrateData)
    } catch (error) {
      console.error('Power law calculation failed:', error)
      return null
    }
  }, [actualHashrateData, showPowerLaw])

  const priceResidualData = useMemo(() => {
    if (showResidual === 'Hide' || mergedData.length < 10 || !priceData) return null

    try {
      const allMergedData: Array<{hashrate: number, price: number}> = []
      
      if (priceData && actualHashrateData) {
        priceData.forEach(pricePoint => {
          const priceDate = new Date(pricePoint.timestamp).toDateString()
          const correspondingHashrate = actualHashrateData.find(hashratePoint => {
            const hashrateDate = new Date(hashratePoint.timestamp).toDateString()
            return priceDate === hashrateDate
          })

          if (correspondingHashrate && pricePoint.value > 0 && correspondingHashrate.value > 0) {
            allMergedData.push({
              hashrate: correspondingHashrate.value,
              price: pricePoint.value
            })
          }
        })
      }

      if (allMergedData.length < 10) return null

      const { a, b } = fitPricePowerLaw(allMergedData)

      const residuals = mergedData.map(d => {
        const hashrateInPH = d.hashrate / 1e15
        const expectedPrice = a * Math.pow(hashrateInPH, b)
        const actualPrice = d.price
        const residualPercent = ((actualPrice - expectedPrice) / expectedPrice) * 100
        
        return {
          timestamp: d.timestamp,
          residual: residualPercent
        }
      })

      return { residuals }
    } catch (error) {
      console.error('Price power law residual calculation failed:', error)
      return null
    }
  }, [mergedData, actualHashrateData, priceData, showResidual])

  const athData = useMemo(() => calculateATH(filteredData), [filteredData])
  const oylData = useMemo(() => calculate1YL(filteredData), [filteredData])

  const plotlyData = useMemo(() => {
    if (filteredData.length === 0) return []

    const traces: any[] = []
    
    let xValues: (number | Date)[]
    if (timeScale === 'Log') {
      xValues = filteredData.map(d => getDaysFromGenesis(d.timestamp))
    } else {
      xValues = filteredData.map(d => {
        const date = new Date(d.timestamp)
        if (isNaN(date.getTime())) {
          console.warn('Invalid timestamp:', d.timestamp)
          return new Date()
        }
        return date
      })
    }

    const yValues = filteredData.map(d => d.value)

    // Calculate Y-axis range
    const yMinData = Math.min(...yValues)
    const yMaxData = Math.max(...yValues)
    const athInView = athData !== null
    
    let yMinChart: number, yMaxChart: number
    if (hashrateScale === 'Log') {
      yMinChart = yMinData * 0.8
      yMaxChart = yMaxData * (athInView ? 1.50 : 1.05)
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * (athInView ? 1.15 : 1.05)
    }

    // Add price background trace if price data is available
    if (filteredPriceData && filteredPriceData.length > 0) {
      let priceXValues: (number | Date)[]
      if (timeScale === 'Log') {
        priceXValues = filteredPriceData.map(d => getDaysFromGenesis(d.timestamp))
      } else {
        priceXValues = filteredPriceData.map(d => {
          const date = new Date(d.timestamp)
          if (isNaN(date.getTime())) {
            console.warn('Invalid price timestamp:', d.timestamp)
            return new Date()
          }
          return date
        })
      }

      traces.push({
        x: priceXValues,
        y: filteredPriceData.map(d => d.value),
        mode: 'lines',
        type: 'scatter',
        name: 'Kaspa Price',
        line: { color: 'rgba(156, 163, 175, 0.4)', width: 1 },
        yaxis: 'y2',
        connectgaps: true,
        showlegend: false,
        hovertemplate: timeScale === 'Linear' 
          ? '<b>%{fullData.name}</b><br>Price: %{y}<extra></extra>'
          : '%{text}<br><b>%{fullData.name}</b><br>Price: %{y}<extra></extra>',
        hoverinfo: 'none',
        text: filteredPriceData.map(d => new Date(d.timestamp).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })),
      })
    }

    // For log scale: add invisible baseline using regular scatter
    if (hashrateScale === 'Log') {
      traces.push({
        x: xValues,
        y: Array(xValues.length).fill(yMinChart),
        mode: 'lines',
        type: 'scatter',
        name: 'baseline',
        line: { color: 'rgba(0,0,0,0)', width: 0 },
        showlegend: false,
        hoverinfo: 'skip',
      })
    }

    // Main hashrate trace
    traces.push({
      x: xValues,
      y: yValues,
      mode: 'lines',
      type: 'scatter',
      name: 'Kaspa Network Hashrate',
      line: { color: '#5B6CFF', width: 2 },
      fill: hashrateScale === 'Log' ? 'tonexty' : 'tozeroy',
      fillgradient: {
        type: "vertical",
        colorscale: [
          [0, "rgba(13, 13, 26, 0.01)"],
          [1, "rgba(91, 108, 255, 0.6)"]
        ]
      },
      connectgaps: true,
      hovertemplate: timeScale === 'Linear' 
        ? '<b>%{fullData.name}</b><br>Hashrate: %{y}<extra></extra>'
        : '%{text}<br><b>%{fullData.name}</b><br>Hashrate: %{y}<extra></extra>',
      hoverinfo: 'none',
      text: filteredData.map(d => new Date(d.timestamp).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })),
    })

    // Power law trace
    if (powerLawData) {
      const allDaysFromGenesis = actualHashrateData.map(d => getDaysFromGenesis(d.timestamp))
      const yFit = allDaysFromGenesis.map(x => powerLawData.a * Math.pow(x, powerLawData.b))
      
      const filteredIndices = actualHashrateData.map((d, index) => ({...d, originalIndex: index}))
        .filter(d => filteredData.some(fd => fd.timestamp === d.timestamp))
        .map(d => d.originalIndex)
      
      const viewXFit = filteredIndices.map(i => allDaysFromGenesis[i])
      const viewYFit = filteredIndices.map(i => yFit[i])
      
      let fitX: (number | Date)[]
      if (timeScale === 'Log') {
        fitX = viewXFit
      } else {
        fitX = filteredIndices.map(i => new Date(actualHashrateData[i].timestamp))
      }

      traces.push({
        x: fitX,
        y: viewYFit,
        mode: 'lines',
        type: 'scatter',
        name: 'Power Law',
        line: { color: '#ff8c00', width: 2, dash: 'solid' },
        connectgaps: true,
        showlegend: true,
        hovertemplate: '<b>%{fullData.name}</b><br>Fit: %{y}<extra></extra>',
      })
    }

    // High marker
    if (athData) {
      let athX: number | Date
      if (timeScale === 'Log') {
        athX = athData.daysFromGenesis
      } else {
        athX = athData.date
      }
      
      traces.push({
        x: [athX],
        y: [athData.hashrate],
        mode: 'markers+text',
        type: 'scatter',
        name: 'High & Low',
        legendgroup: 'markers',
        marker: {
          color: '#ffffff',
          size: 8,
          line: { color: '#5B6CFF', width: 2 }
        },
        text: [`High ${formatHashrate(athData.hashrate)}`],
        textposition: 'top left',
        textfont: { color: '#ffffff', size: 11 },
        showlegend: true,
        hovertemplate: `<b>High</b><br>Hashrate: ${formatHashrate(athData.hashrate)}<br>Date: ${athData.date.toLocaleDateString()}<extra></extra>`,
      })
    }

    // Low marker
    if (oylData) {
      let oylX: number | Date
      if (timeScale === 'Log') {
        oylX = oylData.daysFromGenesis
      } else {
        oylX = oylData.date
      }
      
      traces.push({
        x: [oylX],
        y: [oylData.hashrate],
        mode: 'markers+text',
        type: 'scatter',
        name: 'Low',
        legendgroup: 'markers',
        marker: {
          color: '#ffffff',
          size: 8,
          line: { color: '#5B6CFF', width: 2 }
        },
        text: [`Low ${formatHashrate(oylData.hashrate)}`],
        textposition: 'bottom left',
        textfont: { color: '#ffffff', size: 11 },
        showlegend: false,
        hovertemplate: `<b>Low</b><br>Hashrate: ${formatHashrate(oylData.hashrate)}<br>Date: ${oylData.date.toLocaleDateString()}<extra></extra>`,
      })
    }

    // Residual oscillator
    if (showResidual === 'Show' && priceResidualData?.residuals && priceResidualData.residuals.length > 0) {
      let residualXValues: (number | Date)[]
      if (timeScale === 'Log') {
        residualXValues = priceResidualData.residuals.map(r => getDaysFromGenesis(r.timestamp))
      } else {
        residualXValues = priceResidualData.residuals.map(r => new Date(r.timestamp))
      }

      const residualValues = priceResidualData.residuals.map(r => r.residual)

      traces.push({
        x: residualXValues,
        y: residualValues,
        mode: 'lines',
        type: 'scatter',
        name: 'Price Residual Oscillator',
        yaxis: 'y3',
        line: { color: '#8B5CF6', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(139, 92, 246, 0.2)',
        hovertemplate: '<b>Price Residual</b><br>%{y:.1f}%<br><b>Date:</b> %{x}<extra></extra>',
      })

      traces.push({
        x: residualXValues,
        y: Array(residualXValues.length).fill(0),
        mode: 'lines',
        type: 'scatter',
        name: 'Fair Value (0%)',
        yaxis: 'y3',
        line: { color: '#6B7280', width: 1, dash: 'dash' },
        hoverinfo: 'skip',
        showlegend: false
      })
    }

    return traces
  }, [filteredData, filteredPriceData, timeScale, hashrateScale, priceScale, powerLawData, athData, oylData, showResidual, priceResidualData, actualHashrateData])

  const plotlyLayout = useMemo(() => {
    if (filteredData.length === 0) return {}

    const mainChartDomain = showResidual === 'Show' && priceResidualData?.residuals ? [0.35, 1] : [0, 1]
    const residualDomain = [0, 0.25]

    const yValues = filteredData.map(d => d.value)
    const yMinData = Math.min(...yValues)
    const yMaxData = Math.max(...yValues)
    const athInView = athData !== null
    
    let yMinChart: number, yMaxChart: number
    if (hashrateScale === 'Log') {
      yMinChart = yMinData * 0.8
      yMaxChart = yMaxData * (athInView ? 1.50 : 1.05)
    } else {
      yMinChart = 0
      yMaxChart = yMaxData * (athInView ? 1.15 : 1.05)
    }

    // Generate custom ticks for Y-axis
    let yTickVals: number[] | undefined
    let yTickText: string[] | undefined
    let yMinorTicks: number[] = []

    if (hashrateScale === 'Log') {
      const { majorTicks, intermediateTicks, minorTicks } = generateLogTicks(yMinChart, yMaxChart)
      yTickVals = [...majorTicks, ...intermediateTicks].sort((a, b) => a - b)
      yTickText = yTickVals.map(val => formatHashrate(val))
      yMinorTicks = minorTicks
    } else {
      const linearTicks = generateLinearTicks(yMinChart, yMaxChart)
      yTickVals = linearTicks
      yTickText = linearTicks.map(val => formatHashrate(val))
    }

    // Calculate price Y-axis range and ticks if price data exists
    let priceYTickVals: number[] | undefined
    let priceYTickText: string[] | undefined
    let priceYRange: [number, number] | undefined
    let priceYMinorTicks: number[] = []

    if (filteredPriceData && filteredPriceData.length > 0) {
      const priceValues = filteredPriceData.map(d => d.value)
      const priceMin = Math.min(...priceValues)
      const priceMax = Math.max(...priceValues)
      
      if (priceScale === 'Log') {
        const priceMinChart = priceMin * 0.8
        const priceMaxChart = priceMax * 1.2
        priceYRange = [Math.log10(priceMinChart), Math.log10(priceMaxChart)]
        
        const { majorTicks, intermediateTicks, minorTicks } = generateLogTicks(priceMinChart, priceMaxChart)
        priceYTickVals = [...majorTicks, ...intermediateTicks].sort((a, b) => a - b)
        priceYTickText = priceYTickVals.map(val => formatCurrency(val))
        priceYMinorTicks = minorTicks
      } else {
        priceYRange = [priceMin * 0.95, priceMax * 1.05]
        
        const priceTicks = generateLinearTicks(priceYRange[0], priceYRange[1], 6)
        priceYTickVals = priceTicks
        priceYTickText = priceTicks.map(val => formatCurrency(val))
      }
    }

    const layout: any = {
      height: height,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#9CA3AF', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
      hovermode: 'x unified',
      showlegend: true,
      margin: { l: 80, r: filteredPriceData && filteredPriceData.length > 0 ? 80 : 20, t: 20, b: 50 },
      hoverlabel: {
        bgcolor: 'rgba(15, 20, 25, 0.95)',
        bordercolor: 'rgba(91, 108, 255, 0.5)',
        font: { color: '#e2e8f0', size: 11 },
        align: 'left',
        namelength: -1,
        xanchor: 'right',
        yanchor: 'middle',
        x: -10,
        y: 0
      },
      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.02,
        xanchor: "left",
        x: 0,
        bgcolor: 'rgba(0,0,0,0)',
        bordercolor: 'rgba(0,0,0,0)',
        borderwidth: 0,
        font: { size: 11 }
      },
      hoverdistance: 100,
      selectdirection: 'diagonal'
    }

    // Configure X-axis based on time scale
    if (timeScale === 'Log') {
      const daysFromGenesisValues = filteredData.map(d => getDaysFromGenesis(d.timestamp))
      const minDays = Math.min(...daysFromGenesisValues)
      const maxDays = Math.max(...daysFromGenesisValues)
      
      const logMin = Math.log10(Math.max(1, minDays))
      const logMax = Math.log10(maxDays)
      
      layout.xaxis = {
        title: { text: 'Days Since Genesis (Log Scale)' },
        type: 'log',
        showgrid: true,
        gridwidth: 1,
        gridcolor: 'rgba(255, 255, 255, 0.1)',
        linecolor: '#3A3C4A',
        zerolinecolor: '#3A3C4A',
        color: '#9CA3AF',
        range: [logMin, logMax],
        autorange: false,
        minor: {
          ticklen: 6,
          gridcolor: 'rgba(255, 255, 255, 0.05)',
          gridwidth: 0.5
        },
        showspikes: false,
        domain: [0, 1]
      }
    } else {
      const dates = filteredData.map(d => new Date(d.timestamp))
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
      
      layout.xaxis = {
        title: { text: 'Date' },
        type: 'date',
        showgrid: true,
        gridwidth: 1,
        gridcolor: '#363650',
        linecolor: '#3A3C4A',
        zerolinecolor: '#3A3C4A',
        color: '#9CA3AF',
        tickformat: '%b %Y',
        hoverformat: '%B %d, %Y',
        range: [minDate.toISOString(), maxDate.toISOString()],
        autorange: false,
        showspikes: false,
        domain: [0, 1]
      }
    }
