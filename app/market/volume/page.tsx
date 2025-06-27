import { getCurrentMetrics, getVolumeData } from '@/lib/sheets'
import VolumeChart from '@/components/charts/VolumeChart'

export default async function VolumePage() {
  // Fetch real data from Google Sheets
  const [metrics, volumeData] = await Promise.all([
    getCurrentMetrics(),
    getVolumeData()
  ])
  
  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="mb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-b from-[#FFFFFF] to-[#A0A0B8] bg-clip-text text-transparent drop-shadow-sm">
          Kaspa Trading Volume
        </h1>
      </div>
      {/* Clean Volume Chart - No borders, no containers */}
      <div className="mb-8">
        <VolumeChart data={volumeData} height={650} />
      </div>
    </div>
  )
}
