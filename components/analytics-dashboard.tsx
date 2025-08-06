"use client"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Percent, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "./auth-context-fixed"
import { getAdminDashboardData, markAgentCommissionPaid } from "@/actions/admin" // Import server actions
import { Button } from "@/components/ui/button"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://your-supabase-url.supabase.co"
const supabaseKey = "your-supabase-key"
const supabase = createClient(supabaseUrl, supabaseKey)

// Data structures for receipts (must match what's saved in Supabase)
interface ReceiptData {
  id: string
  amount: number
  reference_number: string
  date_time: string
  sender_name?: string
  customer_tip?: number
  receiver_name?: string
  receiver_number?: string
  transaction_type: "receive" | "send"
  status: "pending" | "completed" | "failed"
  is_valid_account: boolean
  agent_commission?: number
  saved_at: string
  agent_id?: string
  notes?: string
  image_url?: string
  is_commission_paid?: boolean // Corrected column name
}

// Data structure for profiles (as returned by the server action)
interface ProfileData {
  id: string // This is the user_id from the profiles table
  full_name: string | null
  role: string
  email?: string // Now includes email
}

export default function AnalyticsDashboard() {
  const { user, isLoading: userLoading } = useAuth()
  const [agentEarnings, setAgentEarnings] = useState<{ id: string; name: string; totalCommission: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allReceipts, setAllReceipts] = useState<ReceiptData[]>([]) // Store all receipts for admin calculations
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]) // Store all profiles for admin calculations
  const [currentAgentCommission, setCurrentAgentCommission] = useState(0)
  const [totalAgentCommission, setTotalAgentCommission] = useState(0)
  const [totalAgentTips, setTotalAgentTips] = useState(0) // New state for total agent tips
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<{
    id: string
    name: string
    receiptCount: number
    totalCommission: number
  } | null>(null)

  const fetchAnalyticsData = useCallback(async () => {
    if (userLoading) return

    setLoading(true)
    setError(null)

    if (user?.role === "admin") {
      const { receipts, profiles, error: adminError } = await getAdminDashboardData()

      if (adminError) {
        setError("Failed to load admin analytics data: " + adminError)
        setLoading(false)
        return
      }

      setAllReceipts(receipts || [])
      setAllProfiles(profiles || [])

      const earningsMap = new Map<string, number>()
      receipts?.forEach((receipt) => {
        if (receipt.agent_id && receipt.agent_commission && !receipt.is_commission_paid) {
          // Corrected column name
          earningsMap.set(receipt.agent_id, (earningsMap.get(receipt.agent_id) || 0) + receipt.agent_commission)
        }
      })

      const agentNamesMap = new Map<string, string>()
      profiles?.forEach((profile) => {
        agentNamesMap.set(profile.id, profile.full_name || profile.email || `Agent ${profile.id.substring(0, 4)}`)
      })

      const calculatedEarnings = Array.from(earningsMap.entries()).map(([agentId, totalCommission]) => ({
        id: agentId,
        name: agentNamesMap.get(agentId) || `Unknown Agent (${agentId.substring(0, 4)})`,
        totalCommission,
      }))
      setAgentEarnings(calculatedEarnings)
    } else if (user?.role === "cashier") {
      // For cashier, fetch only their own receipts
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("receipts")
        .select("agent_id, agent_commission, amount, customer_tip, saved_at, is_commission_paid") // Corrected column name
        .eq("agent_id", user.id)

      if (receiptsError) {
        setError("Failed to load cashier analytics data: " + receiptsError.message)
        setLoading(false)
        return
      }

      setAllReceipts(receiptsData || [])
      setAllProfiles([]) // Cashiers don't need all profiles

      const totalCommission = receiptsData?.reduce((sum, receipt) => sum + (receipt.agent_commission || 0), 0) || 0
      const currentCommission =
        receiptsData?.reduce(
          (sum, receipt) => sum + (receipt.is_commission_paid ? 0 : receipt.agent_commission || 0), // Corrected column name
          0,
        ) || 0
      const totalTips = receiptsData?.reduce((sum, receipt) => sum + (receipt.customer_tip || 0), 0) || 0

      setTotalAgentCommission(totalCommission)
      setCurrentAgentCommission(currentCommission)
      setTotalAgentTips(totalTips) // Set total tips for cashier
    } else {
      setError("Please log in to view analytics.")
    }
    setLoading(false)
  }, [user, userLoading])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  const handleMarkPaid = (agent: { id: string; name: string; totalCommission: number }) => {
    const receiptsForAgent = allReceipts.filter(
      (r) => r.agent_id === agent.id && !r.is_commission_paid,
    )
    setSelectedAgent({
      id: agent.id,
      name: agent.name,
      receiptCount: receiptsForAgent.length,
      totalCommission: receiptsForAgent.reduce((sum, r) => sum + (r.agent_commission || 0), 0),
    })
    setConfirmOpen(true)
  }

  const confirmMarkPaid = async () => {
    if (!selectedAgent) return
    setLoading(true)
    const { error } = await markAgentCommissionPaid(selectedAgent.id)
    if (error) {
      alert(`Failed to mark commissions as paid: ${error}`)
    } else {
      alert("Commissions marked as paid successfully!")
      fetchAnalyticsData()
    }
    setLoading(false)
    setConfirmOpen(false)
    setSelectedAgent(null)
  }

  // Mock data for other analytics metrics (can be replaced with real data later)
  // These calculations now use 'allReceipts' for admins, or the single agent's data for cashiers
  const totalSales = allReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalTips = allReceipts.reduce((sum, r) => sum + (r.customer_tip || 0), 0)
  const totalCommissionEarned = allReceipts.reduce((sum, r) => sum + (r.agent_commission || 0), 0)
  const transactionsToday = allReceipts.filter(
    (r) => new Date(r.saved_at).toDateString() === new Date().toDateString(),
  ).length
  const averageTransaction = transactionsToday > 0 ? totalSales / transactionsToday : 0

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
            Analytics Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Overview of your sales performance and commissions</p>
        </div>

        {user && (
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              Logged in as: {user.name} ({user.role.charAt(0).toUpperCase() + user.role.slice(1)})
            </Badge>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading analytics...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : (
          <>
            {user?.role === "admin" ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Total Sales</CardTitle>
                    <DollarSign className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">₱{totalSales.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">+20.1% from last month</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Total Tips</CardTitle>
                    <Percent className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">₱{totalTips.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">+15.5% from last month</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Commission Earned</CardTitle>
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">₱{totalCommissionEarned.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">+18.7% from last month</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Transactions Today</CardTitle>
                    <Users className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{transactionsToday}</div>
                    <p className="text-xs text-gray-500">Average: ₱{averageTransaction.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Current Commission</CardTitle>
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      ₱
                      {currentAgentCommission.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-gray-500">Unpaid commissions</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Total Commission</CardTitle>
                    <DollarSign className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      ₱
                      {totalAgentCommission.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-gray-500">All-time commissions</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Total Tips</CardTitle>
                    <Percent className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">₱{totalAgentTips.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">All-time tips</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Agent Earnings */}
            {user?.role === "admin" && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20 mb-8">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Agent Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agentEarnings.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No agent earnings recorded yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Agent Name</TableHead>
                            <TableHead className="text-right">Total Commission</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agentEarnings.map((agent) => (
                            <TableRow key={agent.id}>
                              <TableCell className="font-medium">{agent.name}</TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600">
                                ₱
                                {agent.totalCommission.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="secondary" onClick={() => handleMarkPaid(agent)}>
                                  Mark as Paid
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sales and Commission Chart Placeholder */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Daily Sales & Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200/50 text-gray-500">
                  <p>Chart will go here (e.g., LineChart from Recharts)</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payout</DialogTitle>
            <DialogDescription>
              {selectedAgent
                ? `Mark ${selectedAgent.receiptCount} receipts for ${selectedAgent.name} as paid?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p>
              <strong>Agent:</strong> {selectedAgent?.name}
            </p>
            <p>
              <strong>Receipts:</strong> {selectedAgent?.receiptCount}
            </p>
            <p>
              <strong>Total Payout:</strong> ₱
              {selectedAgent?.totalCommission.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmMarkPaid}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
