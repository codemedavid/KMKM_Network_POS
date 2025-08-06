"use client";
import { useState, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ModernNav from "./modern-nav";
import { useAuth } from "./auth-context-fixed";
import { History, ImageIcon, Search, Filter, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

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

interface FilterState {
  search: string;
  dateRange: string;
  transactionType: string;
  status: string;
  minAmount: string;
  maxAmount: string;
}

const ITEMS_PER_PAGE = 10;

export default function TransactionHistory() {
  const { user, isLoading: userLoading } = useAuth();
  const [transactions, setTransactions] = useState<ReceiptData[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    dateRange: "all",
    transactionType: "all",
    status: "all",
    minAmount: "",
    maxAmount: "",
  });

  // Fetch transactions with pagination
  const fetchTransactions = useCallback(async (page: number = 1) => {
    if (userLoading) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("receipts")
        .select("*", { count: 'exact' })
        .order("saved_at", { ascending: false });

      if (user && user.role === "cashier") {
        query = query.eq("agent_id", user.id);
      }

      // Add pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) {
        console.error("Error fetching transactions:", error);
        setError("Failed to load transactions.");
        setTransactions([]);
        setFilteredTransactions([]);
      } else {
        setTransactions(data || []);
        setFilteredTransactions(data || []);
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [user, userLoading]);

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...transactions];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.reference_number?.toLowerCase().includes(searchTerm) ||
        tx.sender_name?.toLowerCase().includes(searchTerm) ||
        tx.receiver_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.date_time);
        switch (filters.dateRange) {
          case "today":
            return txDate >= startOfDay;
          case "week":
            return txDate >= startOfWeek;
          case "month":
            return txDate >= startOfMonth;
          default:
            return true;
        }
      });
    }

    // Transaction type filter
    if (filters.transactionType !== "all") {
      filtered = filtered.filter(tx => tx.transaction_type === filters.transactionType);
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }

    // Amount range filter
    if (filters.minAmount) {
      filtered = filtered.filter(tx => tx.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(tx => tx.amount <= parseFloat(filters.maxAmount));
    }

    setFilteredTransactions(filtered);
  }, [transactions, filters]);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Fetch transactions on mount
  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  // Clear alert after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      dateRange: "all",
      transactionType: "all",
      status: "all",
      minAmount: "",
      maxAmount: "",
    });
  };

  const exportData = () => {
    const csvContent = [
      ["Date", "Reference", "Amount", "Tip", "Commission", "Customer", "Type", "Status"],
      ...filteredTransactions.map(tx => [
        format(new Date(tx.date_time), "MMM dd, yyyy hh:mm a"),
        tx.reference_number,
        tx.amount?.toString() || "0",
        tx.customer_tip?.toString() || "0",
        tx.agent_commission?.toString() || "0",
        tx.sender_name || "N/A",
        tx.transaction_type,
        tx.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <ModernNav />
      
      {/* Alert Toast */}
      {alert && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Alert className={`${
            alert.type === 'success' ? 'border-green-200 bg-green-50' :
            alert.type === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }`}>
            {alert.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
             alert.type === 'error' ? <XCircle className="h-4 w-4 text-red-600" /> :
             <AlertCircle className="h-4 w-4 text-blue-600" />}
            <AlertDescription className={
              alert.type === 'success' ? 'text-green-800' :
              alert.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {alert.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

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

        {/* Filters and Controls */}
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? "Hide" : "Show"} Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  disabled={filteredTransactions.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {showFilters && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Search by reference, customer..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label htmlFor="dateRange">Date Range</Label>
                  <Select value={filters.dateRange} onValueChange={(value: string) => setFilters(prev => ({ ...prev, dateRange: value }))}>
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

                {/* Transaction Type */}
                <div className="space-y-2">
                  <Label htmlFor="transactionType">Transaction Type</Label>
                  <Select value={filters.transactionType} onValueChange={(value: string) => setFilters(prev => ({ ...prev, transactionType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="receive">Received</SelectItem>
                      <SelectItem value="send">Sent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value: string) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Range */}
                <div className="space-y-2">
                  <Label htmlFor="minAmount">Min Amount</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    placeholder="0.00"
                    value={filters.minAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAmount">Max Amount</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    placeholder="999999.99"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        </div>

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
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions found matching your filters.</p>
                <p>Try adjusting your search criteria.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Ref No.</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Image</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap">
                            {tx.date_time ? format(new Date(tx.date_time), "MMM dd, yyyy hh:mm a") : "N/A"}
                          </TableCell>
                          <TableCell className="font-medium">{tx.reference_number}</TableCell>
                          <TableCell>
                            ₱{tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            ₱{tx.customer_tip?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            ₱{tx.agent_commission?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                          </TableCell>
                          <TableCell>{tx.sender_name || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={tx.transaction_type === "receive" ? "default" : "secondary"}>
                              {tx.transaction_type === "receive" ? "Received" : "Sent"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
