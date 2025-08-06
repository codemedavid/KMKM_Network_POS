"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DollarSign, Calendar, FileText, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PayoutConfirmationDialogProps {
  agentId: string
  agentName: string
  totalCommission: number
  onConfirm: (payoutDetails: PayoutDetails) => Promise<void>
  children: React.ReactNode
}

export interface PayoutDetails {
  payoutAmount: number
  payoutMethod: string
  referenceNumber: string
  notes?: string
  payoutDate: string
}

export default function PayoutConfirmationDialog({
  agentId,
  agentName,
  totalCommission,
  onConfirm,
  children
}: PayoutConfirmationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [payoutAmount, setPayoutAmount] = useState(totalCommission)
  const [payoutMethod, setPayoutMethod] = useState("GCash")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().slice(0, 16))

  const resetForm = () => {
    setPayoutAmount(totalCommission)
    setPayoutMethod("GCash")
    setReferenceNumber("")
    setNotes("")
    setPayoutDate(new Date().toISOString().slice(0, 16))
    setError(null)
    setSuccess(false)
    setIsProcessing(false)
  }

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!referenceNumber.trim()) {
      setError("Reference number is required")
      return
    }

    if (payoutAmount <= 0) {
      setError("Payout amount must be greater than zero")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const payoutDetails: PayoutDetails = {
        payoutAmount,
        payoutMethod,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim() || undefined,
        payoutDate
      }

      await onConfirm(payoutDetails)
      setSuccess(true)
      
      // Close dialog after a brief success message
      setTimeout(() => {
        setOpen(false)
        resetForm()
      }, 1500)
      
    } catch (err: any) {
      setError(err.message || "Failed to process payout")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isProcessing) {
      resetForm()
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Confirm Payout
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 text-center py-6">
            <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-emerald-700">Payout Confirmed!</h3>
              <p className="text-gray-600">Commission has been marked as paid</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmPayout} className="space-y-4">
            {/* Agent Info */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm font-medium text-gray-700">Agent</Label>
                <Badge variant="secondary">{agentName}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-gray-700">Total Commission</Label>
                <span className="text-lg font-semibold text-emerald-600">
                  ₱{totalCommission.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Payout Amount */}
            <div className="space-y-2">
              <Label htmlFor="payoutAmount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payout Amount
              </Label>
              <Input
                id="payoutAmount"
                type="number"
                step="0.01"
                min="0"
                max={totalCommission}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter payout amount"
                required
              />
            </div>

            {/* Payout Method */}
            <div className="space-y-2">
              <Label htmlFor="payoutMethod">Payout Method</Label>
              <select
                id="payoutMethod"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="PayMaya">PayMaya</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="referenceNumber" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Reference Number *
              </Label>
              <Input
                id="referenceNumber"
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter transaction/reference number"
                required
              />
            </div>

            {/* Payout Date */}
            <div className="space-y-2">
              <Label htmlFor="payoutDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Payout Date
              </Label>
              <Input
                id="payoutDate"
                type="datetime-local"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about the payout..."
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Confirm Payout"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}