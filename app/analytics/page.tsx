import { getAdminDashboardData } from "@/actions/admin"
import AnalyticsDashboard from "@/components/analytics-dashboard"
import { ModernNav } from "@/components/modern-nav"
import { ProtectedRoute } from "@/components/protected-route"

export default async function AnalyticsPage() {
  // Fetch data without initial date filters for the page load
  const { receipts, profiles, error } = await getAdminDashboardData()

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ModernNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent text-center mb-6">
            Analytics Dashboard
          </h1>
          <div className="text-center text-red-500">Error loading data: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ModernNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <AnalyticsDashboard receipts={receipts || []} profiles={profiles || []} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
