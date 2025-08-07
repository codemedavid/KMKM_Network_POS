"use client"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Calendar, CreditCard, CheckCircle, Clock } from "lucide-react"
import ModernNav from "./modern-nav"
import { useAuth } from "./auth-context-fixed"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"

// Data structure for payout history
interface PayoutHistoryData {
  id: string
  agent_id: string
  payout_amount: number
  payout_method: string
  reference_number: string
  payout_date: string
  notes?: string
  created_at: string
  created_by?: string
  profiles?: { full_name: string | null }
}

// Data structure for receipts
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
  commission_paid?: boolean
}

export default function AgentPayouts() {
  const { user, isLoading: userLoading } = useAuth()
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryData[]>([])
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [payoutFilter, setPayoutFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Helper function to filter payouts by date range
  const filterPayoutsByDate = (payouts: PayoutHistoryData[], filter: string): PayoutHistoryData[] => {
    if (filter === "all") return payouts

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfDay.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return payouts.filter(payout => {
      const payoutDate = new Date(payout.payout_date)
      
      switch (filter) {
        case "today":
          return payoutDate >= startOfDay
        case "week":
          return payoutDate >= startOfWeek
        case "month":
          return payoutDate >= startOfMonth
        default:
          return true
      }
    })
  }

  // Helper function to filter receipts by date range
  const filterReceiptsByDate = (receipts: ReceiptData[], filter: string): ReceiptData[] => {
    if (filter === "all") return receipts

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfDay.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date_time)
      
      switch (filter) {
        case "today":
          return receiptDate >= startOfDay
        case "week":
          return receiptDate >= startOfWeek
        case "month":
          return receiptDate >= startOfMonth
        default:
          return true
      }
    })
  }

  const fetchAgentData = useCallback(async () => {
    if (userLoading || !user?.id) return

    setLoading(true)
    setError(null)

    try {
      console.log("Fetching payouts for agent:", user.id)
      console.log("User role:", user.role)
      
      // Fetch agent's payout history
      const { data: payoutsData, error: payoutsError } = await supabase
        .from("payouts")
        .select("*")
        .eq("agent_id", user.id)
        .order("payout_date", { ascending: false })

      console.log("Payouts query result:", { payoutsData, payoutsError })

      if (payoutsError) {
        console.error("Error fetching payouts:", payoutsError)
        // Check if it's a table not found error
        if (payoutsError.message.includes("Could not find a relationship") || 
            payoutsError.message.includes("relation") || 
            payoutsError.message.includes("does not exist")) {
          setError("Payouts table not set up yet. Please contact admin to run the database migration.")
        } else if (payoutsError.message.includes("permission denied")) {
          setError("Payouts feature is being set up. You'll be able to view your payouts once the setup is complete.")
        } else {
          setError(`Failed to load payout history: ${payoutsError.message}`)
        }
        setPayoutHistory([])
      } else {
        setPayoutHistory(payoutsData || [])
        console.log("Set payout history:", payoutsData?.length || 0, "items")
      }

      // Fetch agent's receipts
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("receipts")
        .select("*")
        .eq("agent_id", user.id)
        .order("saved_at", { ascending: false })

      if (receiptsError) {
        console.error("Error fetching receipts:", receiptsError)
        setError("Failed to load receipts.")
        setReceipts([])
      } else {
        setReceipts(receiptsData || [])
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }, [user, userLoading])

  useEffect(() => {
    fetchAgentData()
  }, [fetchAgentData])

  // Apply filters
  const filteredPayouts = filterPayoutsByDate(payoutHistory, dateFilter)
  const filteredReceipts = filterReceiptsByDate(receipts, dateFilter)

  // Filter payouts by method and search
  const displayPayouts = filteredPayouts.filter(payout => {
    const methodMatches = payoutFilter === "all" || payout.payout_method.toLowerCase() === payoutFilter.toLowerCase()
    const searchMatches = searchTerm === "" || 
      payout.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return methodMatches && searchMatches
  })

  // Calculate metrics
  const totalPayouts = filteredPayouts.reduce((sum, p) => sum + p.payout_amount, 0)
  const totalEarnings = filteredReceipts.reduce((sum, r) => sum + (r.agent_commission || 0), 0)
  const pendingEarnings = filteredReceipts.reduce((sum, r) => 
    sum + (r.commission_paid ? 0 : (r.agent_commission || 0)), 0)
  const totalTransactions = filteredReceipts.length

  // Get unique payout methods for filter
  const payoutMethods = Array.from(new Set(payoutHistory.map(p => p.payout_method)))

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ModernNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "cashier") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ModernNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <div className="text-center py-8 text-red-500">
            Access denied. This page is for agents only.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <ModernNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
            My Payouts
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            View your payout history and earnings summary
          </p>
        </div>

        {/* Agent Info */}
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
            Logged in as: {user.name} (Agent)
          </Badge>
        </div>

        {/* Filters */}
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20 mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date Range</label>
                <Select value={dateFilter} onValueChange={(value: string) => setDateFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payout Method</label>
                <Select value={payoutFilter} onValueChange={(value: string) => setPayoutFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {payoutMethods.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <Input
                  placeholder="Search by reference or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₱{totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-gray-500">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Payouts</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">₱{totalPayouts.toLocaleString()}</div>
              <p className="text-xs text-gray-500">Received payouts</p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Earnings</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₱{pendingEarnings.toLocaleString()}</div>
              <p className="text-xs text-gray-500">Awaiting payout</p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{totalTransactions}</div>
              <p className="text-xs text-gray-500">Processed receipts</p>
            </CardContent>
          </Card>
        </div>

        {/* Payout History */}
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payout History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading payout history...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : displayPayouts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No payouts found matching your filters.</p>
                <p>Your payouts will appear here once processed by admin.</p>
                <p className="text-sm mt-2">If you're expecting payouts, please contact your administrator.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayPayouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(payout.payout_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ₱{payout.payout_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payout.payout_method}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payout.reference_number}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {payout.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20 mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReceipts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions found for the selected date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.slice(0, 10).map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(receipt.date_time), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          ₱{receipt.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600">
                          ₱{receipt.agent_commission?.toLocaleString() || "0"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={receipt.commission_paid ? "default" : "secondary"}
                            className={receipt.commission_paid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                          >
                            {receipt.commission_paid ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {receipt.reference_number}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 