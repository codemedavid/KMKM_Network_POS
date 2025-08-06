"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ModernNav from "./modern-nav";
import { useAuth } from "./auth-context-fixed";
import { History, ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Data structures (should match what's saved in Supabase)
interface ReceiptData {
  id: string;
  amount: number;
  reference_number: string;
  date_time: string;
  sender_name?: string;
  customer_tip?: number;
  receiver_name?: string;
  receiver_number?: string;
  transaction_type: "receive" | "send";
  status: "pending" | "completed" | "failed";
  is_valid_account: boolean;
  agent_commission?: number;
  saved_at: string;
  agent_id?: string;
  notes?: string;
  image_url?: string;
  commission_paid?: boolean;
}

export default function TransactionHistory() {
  const { user, isLoading: userLoading } = useAuth();
  const [transactions, setTransactions] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (userLoading) return;
      setLoading(true);
      setError(null);

      let query = supabase
        .from("receipts")
        .select("*")
        .order("saved_at", { ascending: false });

      if (user && user.role === "cashier") {
        query = query.eq("agent_id", user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching transactions:", error);
        setError("Failed to load transactions.");
        setTransactions([]);
      } else {
        setTransactions(data || []);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [user, userLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <ModernNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
            Transaction History
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            View all recorded GCash transactions and agent commissions
          </p>
        </div>

        {/* User Role Display */}
        {user && (
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              Logged in as: {user.name} ({user.role.charAt(0).toUpperCase() + user.role.slice(1)})
            </Badge>
          </div>
        )}

        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading transactions...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions recorded yet.</p>
                <p>Scan a receipt to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead><TableHead>Ref No.</TableHead><TableHead>Amount</TableHead>
                      <TableHead>Tip</TableHead><TableHead>Commission</TableHead><TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead><TableHead className="text-center">Image</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">
                          {tx.date_time ? format(new Date(tx.date_time), "MMM dd, yyyy hh:mm a") : "N/A"}
                        </TableCell><TableCell className="font-medium">{tx.reference_number}</TableCell>
                        <TableCell>
                          ₱{tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell><TableCell>
                          ₱{tx.customer_tip?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                        </TableCell><TableCell className="font-semibold text-emerald-600">
                          ₱{tx.agent_commission?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                        </TableCell><TableCell>{tx.sender_name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={tx.transaction_type === "receive" ? "default" : "secondary"}>
                            {tx.transaction_type === "receive" ? "Received" : "Sent"}
                          </Badge>
                        </TableCell><TableCell className="text-center">
                          {tx.image_url ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
                                  <ImageIcon className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl p-0">
                                <Image
                                  src={tx.image_url || "/placeholder.svg"}
                                  alt={`Receipt ${tx.reference_number}`}
                                  width={800}
                                  height={600}
                                  className="w-full h-auto object-contain rounded-lg"
                                />
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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
  );
}
