import AgentPayouts from "../../components/agent-payouts"
import ProtectedRoute from "../../components/protected-route"

export default function PayoutsPage() {
  return (
    <ProtectedRoute>
      <AgentPayouts />
    </ProtectedRoute>
  )
} 