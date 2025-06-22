interface MetricCardProps {
  title: string
  value: string
  change: number
  subtitle?: string
  icon?: string
}

export default function MetricCard({ title, value, change, subtitle, icon }: MetricCardProps) {
  const isPositive = change > 0
  const isNegative = change < 0
  
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {change !== 0 && (
          <span className={`text-sm ${
            isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'
          }`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="flex items-center">
        {icon && <span className="text-2xl mr-3">{icon}</span>}
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
