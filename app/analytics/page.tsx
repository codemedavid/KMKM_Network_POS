import AnalyticsDashboard from "../../components/analytics-dashboard"
import ProtectedRoute from "../../components/protected-route"

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsDashboard />
    </ProtectedRoute>
  )
}
