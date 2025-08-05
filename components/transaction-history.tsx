"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { format, parseISO } from "date-fns"

interface Receipt {
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

interface TransactionHistoryProps {
  userId: string
}

export default function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("agent_id", userId) // Filter by current user's ID
      .order("saved_at", { ascending: false }) // Order by most recent first

    if (error) {
      console.error("Error fetching receipts:", error.message)
      setError("Failed to load transaction history.")
    } else {
      setReceipts(data || [])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchReceipts()

    // Set up real-time listener for receipts table
    const channel = supabase
      .channel("receipts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "receipts", filter: `agent_id=eq.${userId}` },
        (payload) => {
          console.log("Receipt change received!", payload)
          fetchReceipts() // Re-fetch receipts on any change relevant to this user
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchReceipts, userId])

  return (
    <Card className="w-full mx-auto bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Your Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading transactions...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No transactions found for your account.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Ref. No.</TableHead>
                  <TableHead>Sender/Receiver</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>{format(parseISO(receipt.saved_at), "MMM dd, yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={receipt.transaction_type === "receive" ? "default" : "secondary"}>
                        {receipt.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>₱{receipt.amount.toFixed(2)}</TableCell>
                    <TableCell>{receipt.reference_number}</TableCell>
                    <TableCell>{receipt.sender_name || receipt.receiver_name || "N/A"}</TableCell>
                    <TableCell>₱{(receipt.customer_tip || 0).toFixed(2)}</TableCell>
                    <TableCell>₱{(receipt.agent_commission || 0).toFixed(2)}</TableCell>
                    <TableCell>{receipt.is_commission_paid ? "Yes" : "No"}</TableCell> {/* Corrected column name */}
                    <TableCell>
                      <Badge
                        variant={
                          receipt.status === "completed"
                            ? "default"
                            : receipt.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {receipt.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{receipt.notes || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
