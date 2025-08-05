import { ModernNav } from "@/components/modern-nav"
import { ProtectedRoute } from "@/components/protected-route"
import ReceiptCapture from "@/components/receipt-capture"

export default function Home() {
  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ModernNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
              New Transaction
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Capture new GCash transactions quickly and accurately
            </p>
          </div>
          <ReceiptCapture />
        </div>
      </div>
    </ProtectedRoute>
  )
}
