"use client"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Percent, Users } from "lucide-react"
import ModernNav from "./modern-nav"
import { useAuth } from "./auth-context-fixed"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase" // Client-side Supabase client
import { getAdminDashboardData, markAgentCommissionPaid, getAgentPayoutHistory, type PayoutDetails } from "@/actions/admin" // Import server actions
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PayoutConfirmationDialog from "./payout-confirmation-dialog"
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts"     
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
  commission_paid?: boolean
}

// Data structure for profiles (as returned by the server action)
interface ProfileData {
  id: string // This is the user_id from the profiles table
  full_name: string | null
  role: string
  email?: string // Now includes email
}

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

export default function AnalyticsDashboard() {
  const { user, isLoading: userLoading } = useAuth()
  const [agentEarnings, setAgentEarnings] = useState<{ id: string; name: string; totalCommission: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allReceipts, setAllReceipts] = useState<ReceiptData[]>([]) // Store all receipts for admin calculations
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]) // Store all profiles for admin calculations
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryData[]>([]) // Store payout history for admin view
  const [payoutFilter, setPayoutFilter] = useState<string>("all") // Filter for payout method
  const [payoutSearch, setPayoutSearch] = useState<string>("") // Search for agent name
    const [dateFilter, setDateFilter] = useState<string>("all") // Date range filter: all, daily, weekly, monthly
  const [currentAgentCommission, setCurrentAgentCommission] = useState(0)
  const [totalAgentCommission, setTotalAgentCommission] = useState(0)

  // Helper function to filter receipts by date range
  const filterReceiptsByDate = (receipts: ReceiptData[], filter: string): ReceiptData[] => {
    if (filter === "all") return receipts

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfDay.getDate() - now.getDay()) // Start from Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date_time)
      
      switch (filter) {
        case "daily":
          return receiptDate >= startOfDay
        case "weekly":
          return receiptDate >= startOfWeek
        case "monthly":
          return receiptDate >= startOfMonth
        default:
          return true
      }
    })
  }

  // Helper function to filter payout history by date range
  const filterPayoutsByDate = (payouts: PayoutHistoryData[], filter: string): PayoutHistoryData[] => {
    if (filter === "all") return payouts

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfDay.getDate() - now.getDay()) // Start from Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return payouts.filter(payout => {
      const payoutDate = new Date(payout.created_at)
      
      switch (filter) {
        case "daily":
          return payoutDate >= startOfDay
        case "weekly":
          return payoutDate >= startOfWeek
        case "monthly":
          return payoutDate >= startOfMonth
        default:
          return true
      }
    })
  }

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

      // Fetch payout history for admin view
      const { payouts, error: payoutError } = await getAgentPayoutHistory()
      if (payoutError) {
        console.error("Failed to load payout history:", payoutError)
        setPayoutHistory([]) // Set empty array on error, don't fail the whole dashboard
      } else {
        setPayoutHistory(payouts || [])
      }

      const earningsMap = new Map<string, number>()
      receipts?.forEach((receipt) => {
        if (receipt.agent_id && receipt.agent_commission && !receipt.commission_paid) {
          earningsMap.set(
            receipt.agent_id,
            (earningsMap.get(receipt.agent_id) || 0) + receipt.agent_commission,
          )
        }
      })

      const agentNamesMap = new Map<string, string>()
      profiles?.forEach((profile) => {
        agentNamesMap.set(
          profile.id,
          profile.full_name || profile.email || `Agent ${profile.id.substring(0, 4)}`,
        )
      })

      const calculatedEarnings = Array.from(earningsMap.entries()).map(
        ([agentId, totalCommission]) => ({
          id: agentId,
          name:
            agentNamesMap.get(agentId) || `Unknown Agent (${agentId.substring(0, 4)})`,
          totalCommission,
        }),
      )
      setAgentEarnings(calculatedEarnings)
    } else if (user?.role === "cashier") {
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("receipts")
        .select("id, agent_id, agent_commission, amount, customer_tip, saved_at, commission_paid, reference_number, date_time, sender_name, receiver_name, receiver_number, transaction_type, status, is_valid_account, notes, image_url")
        .eq("agent_id", user.id)

      if (receiptsError) {
        setError("Failed to load cashier analytics data: " + receiptsError.message)
        setLoading(false)
        return
      }

      setAllReceipts(receiptsData || [])
      setAllProfiles([])

      const totalCommission =
        receiptsData?.reduce((sum, receipt) => sum + (receipt.agent_commission || 0), 0) || 0
      const currentCommission =
        receiptsData?.reduce(
          (sum, receipt) =>
            sum + (receipt.commission_paid ? 0 : receipt.agent_commission || 0),
          0,
        ) || 0
      setTotalAgentCommission(totalCommission)
      setCurrentAgentCommission(currentCommission)
    } else {
      setError("Please log in to view analytics.")
    }
    setLoading(false)
  }, [user, userLoading])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  const handleMarkPaid = async (agentId: string, payoutDetails: PayoutDetails) => {
    if (!user?.id) {
      setError("User not authenticated")
      return
    }

    try {
      const result = await markAgentCommissionPaid(agentId, payoutDetails, user.id)
      if (result.error) {
        setError(result.error)
        throw new Error(result.error)
      }
      
      // Refresh the data after successful payout
      await fetchAnalyticsData()
    } catch (err: any) {
      console.error("Error processing payout:", err)
      throw err // Re-throw to let the dialog handle the error display
    }
  }

  // Apply date filter to receipts and payouts
  const filteredReceipts = filterReceiptsByDate(allReceipts, dateFilter)
  const filteredPayouts = filterPayoutsByDate(payoutHistory, dateFilter)

  // Recalculate agent earnings based on filtered receipts
  const filteredAgentEarnings = (() => {
    if (user?.role !== "admin") return agentEarnings

    const earningsMap = new Map<string, number>()
    filteredReceipts.forEach((receipt) => {
      if (receipt.agent_id && receipt.agent_commission && !receipt.commission_paid) {
        earningsMap.set(
          receipt.agent_id,
          (earningsMap.get(receipt.agent_id) || 0) + receipt.agent_commission,
        )
      }
    })

    const agentNamesMap = new Map<string, string>()
    allProfiles.forEach((profile) => {
      agentNamesMap.set(
        profile.id,
        profile.full_name || profile.email || `Agent ${profile.id.substring(0, 4)}`,
      )
    })

    return Array.from(earningsMap.entries()).map(
      ([agentId, totalCommission]) => ({
        id: agentId,
        name: agentNamesMap.get(agentId) || `Unknown Agent (${agentId.substring(0, 4)})`,
        totalCommission,
      }),
    )
  })()

  // Recalculate cashier commission based on filtered receipts
  const filteredTotalAgentCommission = filteredReceipts.reduce((sum, receipt) => sum + (receipt.agent_commission || 0), 0)
  const filteredCurrentAgentCommission = filteredReceipts.reduce(
    (sum, receipt) => sum + (receipt.commission_paid ? 0 : receipt.agent_commission || 0),
    0,
  )

  // Filter payout history with search and method filters
  const filteredPayoutHistory = filteredPayouts.filter((payout) => {
    // Filter by payment method
    const methodMatches = payoutFilter === "all" || payout.payout_method.toLowerCase() === payoutFilter.toLowerCase()
    
    // Filter by agent name
    const agentProfile = allProfiles.find(p => p.id === payout.agent_id)
    const agentName = (payout.profiles?.full_name || 
                     agentProfile?.full_name || 
                     agentProfile?.email || 
                     '').toLowerCase()
    const nameMatches = payoutSearch === "" || agentName.includes(payoutSearch.toLowerCase())
    
    return methodMatches && nameMatches
  })

  // Analytics metrics using filtered data
  const totalSales = filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalTips = filteredReceipts.reduce((sum, r) => sum + (r.customer_tip || 0), 0)
  const totalCommissionEarned = filteredReceipts.reduce((sum, r) => sum + (r.agent_commission || 0), 0)
  const totalTransactions = filteredReceipts.length
  const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0

  // Chart data processing functions
  const processSalesTrendData = () => {
    const now = new Date()
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      const dayReceipts = filteredReceipts.filter(receipt => {
        const receiptDate = new Date(receipt.date_time)
        return receiptDate.toDateString() === date.toDateString()
      })
      const daySales = dayReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
      const dayCommission = dayReceipts.reduce((sum, r) => sum + (r.agent_commission || 0), 0)
      days.push({
        name: dayName,
        sales: daySales,
        commission: dayCommission,
        transactions: dayReceipts.length
      })
    }
    return days
  }

  const processAgentPerformanceData = () => {
    if (user?.role !== "admin") return []
    
    const agentMap = new Map<string, { name: string; sales: number; commission: number; transactions: number }>()
    
    filteredReceipts.forEach(receipt => {
      if (receipt.agent_id) {
        const agentName = allProfiles.find(p => p.id === receipt.agent_id)?.full_name || 
                         `Agent ${receipt.agent_id.substring(0, 4)}`
        
        const existing = agentMap.get(receipt.agent_id) || {
          name: agentName,
          sales: 0,
          commission: 0,
          transactions: 0
        }
        
        existing.sales += receipt.amount || 0
        existing.commission += receipt.agent_commission || 0
        existing.transactions += 1
        
        agentMap.set(receipt.agent_id, existing)
      }
    })
    
    return Array.from(agentMap.values()).sort((a, b) => b.sales - a.sales)
  }

  const processCommissionBreakdownData = () => {
    const serviceCommission = filteredReceipts.reduce((sum, r) => {
      const serviceAmount = (r.amount || 0) - (r.customer_tip || 0)
      return sum + (serviceAmount * 0.2) // Assuming 20% service commission
    }, 0)
    
    const tipCommission = filteredReceipts.reduce((sum, r) => {
      return sum + ((r.customer_tip || 0) * 0.5) // Assuming 50% tip commission
    }, 0)
    
    return [
      { name: 'Service Commission', value: serviceCommission, color: '#3B82F6' },
      { name: 'Tip Commission', value: tipCommission, color: '#10B981' }
    ]
  }

  const processTransactionTypeData = () => {
    const receiveCount = filteredReceipts.filter(r => r.transaction_type === 'receive').length
    const sendCount = filteredReceipts.filter(r => r.transaction_type === 'send').length
    
    return [
      { name: 'Received', value: receiveCount, color: '#10B981' },
      { name: 'Sent', value: sendCount, color: '#EF4444' }
    ]
  }

  // Generate chart data
  const salesTrendData = processSalesTrendData()
  const agentPerformanceData = processAgentPerformanceData()
  const commissionBreakdownData = processCommissionBreakdownData()
  const transactionTypeData = processTransactionTypeData()

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

        {/* Date Filter */}
        <div className="mb-6 flex justify-center">
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Time Period:
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="daily">Today</option>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
                <div className="text-xs text-gray-500">
                  {dateFilter === "daily" && "Showing today's transactions"}
                  {dateFilter === "weekly" && "Showing this week's transactions"}
                  {dateFilter === "monthly" && "Showing this month's transactions"}
                  {dateFilter === "all" && "Showing all transactions"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                    <CardTitle className="text-sm font-medium text-gray-700">
                      {dateFilter === "daily" ? "Transactions Today" : 
                       dateFilter === "weekly" ? "Transactions This Week" : 
                       dateFilter === "monthly" ? "Transactions This Month" : "Total Transactions"}
                    </CardTitle>
                    <Users className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{totalTransactions}</div>
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
                      ₱{filteredCurrentAgentCommission.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
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
                      ₱{filteredTotalAgentCommission.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
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
                    <div className="text-2xl font-bold text-gray-900">₱{totalTips.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">All-time tips</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              {/* Sales Trend Chart */}
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Sales Trend (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`₱${value.toLocaleString()}`, '']}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="Sales"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="commission" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="Commission"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Commission Breakdown Chart */}
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    Commission Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={commissionBreakdownData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ₱${value.toLocaleString()}`}
                      >
                        {commissionBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`₱${value.toLocaleString()}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Additional Charts for Admin */}
            {user?.role === "admin" && (
              <div className="grid gap-6 md:grid-cols-2 mb-8">
                {/* Agent Performance Chart */}
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Agent Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={agentPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => [`₱${value.toLocaleString()}`, '']}
                          labelStyle={{ color: '#374151' }}
                        />
                        <Legend />
                        <Bar dataKey="sales" fill="#3B82F6" name="Sales" />
                        <Bar dataKey="commission" fill="#10B981" name="Commission" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Transaction Types Chart */}
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Transaction Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={transactionTypeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {transactionTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
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
                  {filteredAgentEarnings.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      {dateFilter === "all" ? "No agent earnings recorded yet." : "No agent earnings found for the selected time period."}
                    </div>
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
                          {filteredAgentEarnings.map((agent) => (
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
                                <PayoutConfirmationDialog
                                  agentId={agent.id}
                                  agentName={agent.name}
                                  totalCommission={agent.totalCommission}
                                  onConfirm={(payoutDetails) => handleMarkPaid(agent.id, payoutDetails)}
                                >
                                  <Button size="sm" variant="secondary">
                                    Mark as Paid
                                  </Button>
                                </PayoutConfirmationDialog>
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

            {/* Payout History */}
            {user?.role === "admin" && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <CardTitle className="text-lg font-semibold text-gray-900">Recent Payout History</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Search by agent name..."
                          value={payoutSearch}
                          onChange={(e) => setPayoutSearch(e.target.value)}
                          className="max-w-sm"
                        />
                      </div>
                      <div className="flex-shrink-0">
                        <select
                          value={payoutFilter}
                          onChange={(e) => setPayoutFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="all">All Methods</option>
                          <option value="gcash">GCash</option>
                          <option value="bank transfer">Bank Transfer</option>
                          <option value="cash">Cash</option>
                          <option value="paymaya">PayMaya</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {payoutHistory.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No payouts recorded yet.</div>
                  ) : filteredPayoutHistory.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No payouts match your filters.</div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Filtered Results:</span>
                            <span className="ml-2 font-semibold">{filteredPayoutHistory.length} payouts</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Amount:</span>
                            <span className="ml-2 font-semibold text-emerald-600">
                              ₱{filteredPayoutHistory.reduce((sum, p) => sum + p.payout_amount, 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Period:</span>
                            <span className="ml-2 font-semibold">
                              {filteredPayoutHistory.length > 0 ? 'Last 30 days' : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Agent</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead>Payout Date</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead>Processed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPayoutHistory.slice(0, 10).map((payout) => {
                            // Find agent name from profiles
                            const agentProfile = allProfiles.find(p => p.id === payout.agent_id)
                            const agentName = payout.profiles?.full_name || 
                                            agentProfile?.full_name || 
                                            agentProfile?.email || 
                                            `Agent ${payout.agent_id.substring(0, 4)}`
                            
                            return (
                              <TableRow key={payout.id}>
                                <TableCell className="font-medium">{agentName}</TableCell>
                                <TableCell className="font-semibold text-emerald-600">
                                  ₱{payout.payout_amount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{payout.payout_method}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{payout.reference_number}</TableCell>
                                <TableCell>
                                  {new Date(payout.payout_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </TableCell>
                                <TableCell className="max-w-32 truncate" title={payout.notes || ''}>
                                  {payout.notes || '—'}
                                </TableCell>
                                <TableCell>
                                  {new Date(payout.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          </TableBody>
                        </Table>
                        {filteredPayoutHistory.length > 10 && (
                          <div className="text-center mt-4">
                            <p className="text-sm text-gray-500">
                              Showing recent 10 of {filteredPayoutHistory.length} filtered payouts
                              {payoutHistory.length !== filteredPayoutHistory.length && ` (${payoutHistory.length} total)`}
                            </p>
                          </div>
                        )}
                      </div>
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
