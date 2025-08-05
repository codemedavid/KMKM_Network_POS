import TransactionHistory from "../../components/transaction-history"
import ProtectedRoute from "../../components/protected-route"

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <TransactionHistory />
    </ProtectedRoute>
  )
}
