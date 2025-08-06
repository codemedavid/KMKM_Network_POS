import dynamic from "next/dynamic"
import ReceiptCapture from "../components/receipt-capture"

// Dynamically import mobile component to reduce initial bundle size
const MobileCameraInterface = dynamic(() => import("../components/mobile-camera-interface"), {
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading camera...</p>
      </div>
    </div>
  ),
  ssr: false // Disable SSR for camera component
})

export default function Page() {
  return (
    <>
      {/* Mobile Camera Interface - shown on mobile devices */}
      <div className="block md:hidden">
        <MobileCameraInterface />
      </div>

      {/* Desktop Receipt Capture - shown on desktop */}
      <div className="hidden md:block">
        <ReceiptCapture />
      </div>
    </>
  )
}
