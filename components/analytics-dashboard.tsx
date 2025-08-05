"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Percent, Users } from "lucide-react"
import ModernNav from "./modern-nav"
import { useAuth } from "./auth-context-fixed"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase" // Client-side Supabase client
import { getAdminDashboardData } from "@/actions/admin" // Import the new Server Action

// Data structures for receipts (must match what's saved in Supabase)
interface ReceiptData {
  id: string
  amount: number
  reference_number: string // Changed from referenceNumber
  date_time: string // Changed from dateTime
  sender_name?: string // Changed from senderName
  customer_tip?: number // Changed from customerTip
  receiver_name?: string // Changed from receiverName
  receiver_number?: string // Changed from receiverNumber
  transaction_type: "receive" | "send" // Changed from transactionType
  status: "pending" | "completed" | "failed"
  is_valid_account: boolean // Changed from isValidAccount
  agent_commission?: number // Changed from agentCommission
  saved_at: string // Changed from savedAt
  agent_id?: string // Changed from agentId
  notes?: string // Added notes
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

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (userLoading) return // Wait for user to load

      setLoading(true)
      setError(null)

      if (user?.role === "admin") {
        // Admin: Fetch all data using the Server Action
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
          if (receipt.agent_id && receipt.agent_commission) {
            earningsMap.set(receipt.agent_id, (earningsMap.get(receipt.agent_id) || 0) + receipt.agent_commission)
          }
        })

        const agentNamesMap = new Map<string, string>()
        profiles?.forEach((profile) => {
          // Prioritize full_name from profiles, then email from auth.users, then generic fallback
          agentNamesMap.set(profile.id, profile.full_name || profile.email || `Agent ${profile.id.substring(0, 4)}`)
        })

        const calculatedEarnings = Array.from(earningsMap.entries()).map(([agentId, totalCommission]) => {
          return {
            id: agentId,
            name: agentNamesMap.get(agentId) || `Unknown Agent (${agentId.substring(0, 4)})`, // Fallback for safety
            totalCommission: totalCommission,
          }
        })
        setAgentEarnings(calculatedEarnings)
      } else if (user?.role === "cashier") {
        // Cashier: Fetch only their own receipts (RLS handles this)
        const { data: receiptsData, error: receiptsError } = await supabase
          .from("receipts")
          .select("agent_id, agent_commission, amount, customer_tip, saved_at")
          .eq("agent_id", user.id) // Ensure cashier only fetches their own

        if (receiptsError) {
          setError("Failed to load cashier analytics data: " + receiptsError.message)
          setLoading(false)
          return
        }

        setAllReceipts(receiptsData || []) // Only cashier's receipts
        setAllProfiles([]) // Cashiers don't need all profiles

        const totalCommission = receiptsData?.reduce((sum, receipt) => sum + (receipt.agent_commission || 0), 0) || 0
        setAgentEarnings([{ id: user.id, name: user.name, totalCommission }])
      } else {
        // Not logged in or role not recognized
        setError("Please log in to view analytics.")
      }
      setLoading(false)
    }

    fetchAnalyticsData()
  }, [user, userLoading]) // Re-fetch when user or userLoading changes

  // Mock data for other analytics metrics (can be replaced with real data later)
  // These calculations now use 'allReceipts' for admins, or the single agent's data for cashiers
  const totalSales = allReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalTips = allReceipts.reduce((sum, r) => sum + (r.customer_tip || 0), 0)
  const totalCommissionEarned = agentEarnings.reduce((sum, agent) => sum + agent.totalCommission, 0)
  const transactionsToday = allReceipts.filter(
    (r) => new Date(r.saved_at).toDateString() === new Date().toDateString(),
  ).length
  const averageTransaction = transactionsToday > 0 ? totalSales / transactionsToday : 0
  const topAgent =
    agentEarnings.length > 0
      ? agentEarnings.reduce((prev, current) => (prev.totalCommission > current.totalCommission ? prev : current)).name
      : "N/A"

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <ModernNav />

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

            {/* Agent Earnings */}
            {user?.role === "admin" && ( // Only show agent earnings table for admins
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
  )
}
