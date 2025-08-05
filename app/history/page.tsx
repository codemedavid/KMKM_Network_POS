import { ModernNav } from "@/components/modern-nav"
import { ProtectedRoute } from "@/components/protected-route"
import TransactionHistory from "@/components/transaction-history"
import { supabaseServer } from "@/lib/supabase-server"

export default async function HistoryPage() {
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) {
    // This should ideally be caught by ProtectedRoute, but good to have a fallback
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ModernNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent text-center mb-6">
            Transaction History
          </h1>
          <div className="text-center text-red-500">Please log in to view your transaction history.</div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ModernNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent text-center mb-6">
            Transaction History
          </h1>
          <TransactionHistory userId={user.id} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
