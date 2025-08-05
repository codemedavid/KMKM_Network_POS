"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "./auth-context-fixed"
import { createReceipt } from "@/actions/receipt" // Import the server action

export default function ReceiptCapture() {
  const { user } = useAuth()
  const [amount, setAmount] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [senderName, setSenderName] = useState("")
  const [customerTip, setCustomerTip] = useState("")
  const [receiverName, setReceiverName] = useState("")
  const [receiverNumber, setReceiverNumber] = useState("")
  const [transactionType, setTransactionType] = useState<"receive" | "send">("receive")
  const [notes, setNotes] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImageFile(null)
      setPreviewImage(null)
    }
  }

  const handleClearForm = useCallback(() => {
    setAmount("")
    setReferenceNumber("")
    setSenderName("")
    setCustomerTip("")
    setReceiverName("")
    setReceiverNumber("")
    setTransactionType("receive")
    setNotes("")
    setImageFile(null)
    setPreviewImage(null)
    setError(null)
    setSuccess(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // Clear the file input
    }
  }, [])

  const saveReceiptHandler = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      if (!user) {
        setError("User not authenticated.")
        setIsSaving(false)
        return
      }

      const parsedAmount = Number.parseFloat(amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError("Please enter a valid amount.")
        setIsSaving(false)
        return
      }

      const parsedCustomerTip = customerTip === "" ? null : Number.parseFloat(customerTip)
      if (customerTip !== "" && isNaN(parsedCustomerTip!)) {
        setError("Please enter a valid tip amount or leave it empty.")
        setIsSaving(false)
        return
      }

      const receiptDataToSave = {
        amount: parsedAmount,
        reference_number: referenceNumber,
        date_time: new Date().toISOString(), // Current timestamp
        sender_name: senderName || null,
        customer_tip: parsedCustomerTip,
        receiver_name: receiverName || null,
        receiver_number: receiverNumber || null,
        transaction_type: transactionType,
        status: "completed" as const, // Default to completed for new captures
        is_valid_account: true, // Assuming valid for now
        agent_id: user.id,
        notes: notes || null,
      }

      try {
        const { success: actionSuccess, error: actionError } = await createReceipt(receiptDataToSave, imageFile)

        if (actionError) {
          setError(`Failed to save receipt: ${actionError}`)
        } else {
          setSuccess("Receipt saved successfully!")
          handleClearForm()
        }
      } catch (err: any) {
        console.error("Unexpected error saving receipt:", err)
        setError("An unexpected error occurred while saving the receipt.")
      } finally {
        setIsSaving(false)
      }
    },
    [
      amount,
      referenceNumber,
      senderName,
      customerTip,
      receiverName,
      receiverNumber,
      transactionType,
      notes,
      imageFile,
      user,
      handleClearForm,
    ],
  )

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">New Transaction</CardTitle>
        <CardDescription className="text-gray-600">Fill in the details for the GCash transaction.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={saveReceiptHandler} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₱)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="e.g., 500.00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="neumorphic-input"
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              placeholder="e.g., 1234567890"
              required
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="neumorphic-input"
            />
          </div>

          {/* Transaction Type */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="transactionType">Transaction Type</Label>
            <Select value={transactionType} onValueChange={(value: "receive" | "send") => setTransactionType(value)}>
              <SelectTrigger id="transactionType" className="neumorphic-input">
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receive">Receive Money</SelectItem>
                <SelectItem value="send">Send Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sender Name (Conditional) */}
          {transactionType === "receive" && (
            <div className="space-y-2">
              <Label htmlFor="senderName">Sender Name (Optional)</Label>
              <Input
                id="senderName"
                placeholder="e.g., Juan Dela Cruz"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="neumorphic-input"
              />
            </div>
          )}

          {/* Customer Tip (Conditional) */}
          {transactionType === "receive" && (
            <div className="space-y-2">
              <Label htmlFor="customerTip">Customer Tip (₱, Optional)</Label>
              <Input
                id="customerTip"
                type="number"
                step="0.01"
                placeholder="e.g., 20.00"
                value={customerTip}
                onChange={(e) => setCustomerTip(e.target.value)}
                className="neumorphic-input"
              />
            </div>
          )}

          {/* Receiver Name (Conditional) */}
          {transactionType === "send" && (
            <div className="space-y-2">
              <Label htmlFor="receiverName">Receiver Name (Optional)</Label>
              <Input
                id="receiverName"
                placeholder="e.g., Maria Santos"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="neumorphic-input"
              />
            </div>
          )}

          {/* Receiver Number (Conditional) */}
          {transactionType === "send" && (
            <div className="space-y-2">
              <Label htmlFor="receiverNumber">Receiver Number (Optional)</Label>
              <Input
                id="receiverNumber"
                type="tel"
                placeholder="e.g., 09171234567"
                value={receiverNumber}
                onChange={(e) => setReceiverNumber(e.target.value)}
                className="neumorphic-input"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="neumorphic-input min-h-[80px]"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="image">Upload Receipt Image (Optional)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="neumorphic-input file:text-gray-700 file:bg-gray-100 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-2"
            />
            {previewImage && (
              <div className="mt-4">
                <img
                  src={previewImage || "/placeholder.svg"}
                  alt="Receipt Preview"
                  className="max-w-full h-auto rounded-md shadow-md"
                />
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && <p className="text-red-500 text-sm md:col-span-2 text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm md:col-span-2 text-center">{success}</p>}

          {/* Action Buttons */}
          <div className="md:col-span-2 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearForm}
              disabled={isSaving}
              className="neumorphic-button bg-transparent"
            >
              Clear Form
            </Button>
            <Button type="submit" disabled={isSaving} className="neumorphic-button">
              {isSaving ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
