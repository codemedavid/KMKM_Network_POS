import ReceiptCapture from "../components/receipt-capture"
import MobileCameraInterface from "../components/mobile-camera-interface"

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
