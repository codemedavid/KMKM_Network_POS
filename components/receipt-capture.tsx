"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react" // Import useEffect
import { Upload, Camera, Scan, Loader2, CheckCircle, X, FileImage, Zap, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import ModernNav from "./modern-nav"
import { ProtectedRoute } from "./protected-route"
import { useAuth } from "./auth-context-fixed"

// Import Tesseract.js
import Tesseract from "tesseract.js"

import { supabase } from "@/lib/supabase" // Add this import
import { v4 as uuidv4 } from "uuid" // Import uuid for unique file names

// Data structures
interface ReceiptData {
  id: string
  amount: number
  referenceNumber: string
  dateTime: string
  senderName?: string
  customerTip?: number
  receiverName?: string
  receiverNumber?: string
  transactionType: "receive" | "send"
  status: "pending" | "completed" | "failed"
  isValidAccount: boolean
  agentCommission?: number
  savedAt?: string
  agentId?: string // Added agentId
  imageUrl?: string // Add imageUrl field
}

interface OCRProcessingState {
  isProcessing: boolean
  progress: number
  status: "idle" | "processing" | "completed" | "error"
  error?: string
  rawText?: string
}

interface ImageData {
  file: File | null
  preview: string | null
  dimensions?: { width: number; height: number }
}

interface AdminConfig {
  targetGCashNumber: string
  targetGCashName: string
  requiredFields: string[]
  extractionRules: {
    amountPattern: string
    referencePattern: string
    datePattern: string
    senderPattern: string
    receiverPattern: string
    phonePattern: string
  }
  serviceCommissionRate: number
  tipCommissionRate: number
}

const defaultAdminConfig: AdminConfig = {
  targetGCashNumber: "+63 915 642 9591",
  targetGCashName: "Your Business Name",
  requiredFields: ["amount", "referenceNumber", "dateTime"],
  extractionRules: {
    amountPattern: "(?:Amount|Total Amount Sent)\\s*[£₱]?\\s*([0-9,]+\\.?[0-9]*)",
    referencePattern: "(?:Ref No\\.|Reference|Transaction)\\s*([0-9]+)",
    datePattern: "([A-Za-z]{3}\\s+[0-9]{1,2},\\s+[0-9]{4}\\s+[0-9]{1,2}:[0-9]{2}\\s*[AP]M)",
    senderPattern: "(?:From|Sender|Sent by)[:\\s]*([A-Za-z\\s]+)",
    receiverPattern: "(?:To|Receiver|Received by)[:\\s]*([A-Za-z\\s]+)",
    phonePattern: "(\\+63\\s*[0-9]{3}s*[0-9]{3}s*[0-9]{4}|09[0-9]{9})",
  },
  serviceCommissionRate: 20,
  tipCommissionRate: 50,
}

function ReceiptCaptureContent() {
  const [imageData, setImageData] = useState<ImageData>({ file: null, preview: null })
  const [ocrState, setOcrState] = useState<OCRProcessingState>({
    isProcessing: false,
    progress: 0,
    status: "idle",
  })
  const [extractedData, setExtractedData] = useState<Partial<ReceiptData>>({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [adminConfig] = useState<AdminConfig>(defaultAdminConfig)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [agentCommission, setAgentCommission] = useState<number>(0)

  const { user } = useAuth() // Get current user from AuthContext

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Effect to recalculate agent commission when amount or tip changes
  useEffect(() => {
    const totalAmount = extractedData.amount || 0
    const customerTip = extractedData.customerTip || 0
    const servicePrice = totalAmount - customerTip
    const commission =
      (servicePrice * adminConfig.serviceCommissionRate) / 100 + (customerTip * adminConfig.tipCommissionRate) / 100
    setAgentCommission(commission)
  }, [
    extractedData.amount,
    extractedData.customerTip,
    adminConfig.serviceCommissionRate,
    adminConfig.tipCommissionRate,
  ])

  const extractDataFromText = (text: string): Partial<ReceiptData> => {
    const extracted: Partial<ReceiptData> = {}
    console.log("Processing text:", text)

    try {
      const amountPatterns = [
        /(?:Total Amount Sent)\s*[£₱]?\s*([0-9,]+\.?[0-9]*)/i,
        /(?:Amount)\s*[£₱]?\s*([0-9,]+\.?[0-9]*)/i,
        /[£₱]\s*([0-9,]+\.?[0-9]*)/i,
      ]

      for (const pattern of amountPatterns) {
        const match = text.match(pattern)
        if (match) {
          extracted.amount = Number.parseFloat(match[1].replace(/,/g, ""))
          console.log("Amount extracted:", extracted.amount)
          break
        }
      }

      const refPatterns = [
        /Ref No\.\s*([0-9]+)/i,
        /Reference\s*(?:No|Number)?[:\s]*([A-Z0-9]+)/i,
        /Transaction\s*(?:ID|No)?[:\s]*([A-Z0-9]+)/i,
      ]

      for (const pattern of refPatterns) {
        const match = text.match(pattern)
        if (match) {
          extracted.referenceNumber = match[1].trim()
          console.log("Reference extracted:", extracted.referenceNumber)
          break
        }
      }

      const datePatterns = [
        /([A-Za-z]{3}\s+[0-9]{1,2},\s+[0-9]{4}\s+[0-9]{1,2}:[0-9]{2}\s*[AP]M)/i,
        /([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}\s*[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[AP]M)?)/i,
      ]

      for (const pattern of datePatterns) {
        const match = text.match(pattern)
        if (match) {
          const dateStr = match[1]
          console.log("Date string found:", dateStr)

          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, "0")
            const day = String(date.getDate()).padStart(2, "0")
            const hours = String(date.getHours()).padStart(2, "0")
            const minutes = String(date.getMinutes()).padStart(2, "0")

            extracted.dateTime = `${year}-${month}-${day}T${hours}:${minutes}`
            console.log("DateTime extracted:", extracted.dateTime)
          }
          break
        }
      }

      const phonePatterns = [/(\+63\s*[0-9]{3}\s*[0-9]{3}\s*[0-9]{4})/i, /(09[0-9]{9})/i]

      for (const pattern of phonePatterns) {
        const match = text.match(pattern)
        if (match) {
          extracted.receiverNumber = match[1].trim()
          console.log("Phone extracted:", extracted.receiverNumber)

          const normalizePhone = (phone: string) => phone.replace(/[\s+-]/g, "").replace(/^63/, "0")
          const extractedNormalized = normalizePhone(extracted.receiverNumber)
          const targetNormalized = normalizePhone(adminConfig.targetGCashNumber)

          extracted.isValidAccount = extractedNormalized === targetNormalized
          console.log("Account validation:", {
            extractedNormalized,
            targetNormalized,
            isValid: extracted.isValidAccount,
          })
          break
        }
      }

      if (text.toLowerCase().includes("sent via gcash") || text.toLowerCase().includes("sent")) {
        extracted.transactionType = "receive"
      } else {
        extracted.transactionType = "send"
      }

      extracted.status = "completed"

      const senderPatterns = [/From[:\s]+([A-Za-z\s]+?)(?:\n|$)/i, /Sender[:\s]+([A-Za-z\\s]+?)(?:\n|$)/i]

      for (const pattern of senderPatterns) {
        const match = text.match(pattern)
        if (match) {
          extracted.senderName = match[1].trim()
          console.log("Sender extracted:", extracted.senderName)
          break
        }
      }
    } catch (error) {
      console.error("Error parsing extracted text:", error)
    }

    console.log("Final extracted data:", extracted)
    return extracted
  }

  const validateExtractedData = (data: Partial<ReceiptData>): string[] => {
    const errors: string[] = []

    adminConfig.requiredFields.forEach((field) => {
      if (!data[field as keyof ReceiptData]) {
        errors.push(`${field.replace(/([A-Z])/g, " $1").toLowerCase()} is required but not found`)
      }
    })

    if (data.receiverNumber && data.isValidAccount === false) {
      errors.push(`Payment was sent to ${data.receiverNumber}, but expected ${adminConfig.targetGCashNumber}`)
    }

    if (data.amount && data.amount <= 0) {
      errors.push("Amount must be greater than 0")
    }

    return errors
  }

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageData({
          file,
          preview: e.target?.result as string,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) {
      handleFileUpload(files[0])
    }
  }

  const processOCR = async () => {
    if (!imageData.file) return

    setOcrState({ isProcessing: true, progress: 0, status: "processing" })
    setValidationErrors([])

    try {
      const {
        data: { text },
      } = await Tesseract.recognize(imageData.file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrState((prev) => ({
              ...prev,
              progress: Math.round(m.progress * 100),
            }))
          }
        },
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,+:-£₱",
      })

      console.log("Raw OCR text:", text)

      const extracted = extractDataFromText(text)
      const errors = validateExtractedData(extracted)

      setOcrState({
        isProcessing: false,
        progress: 100,
        status: errors.length > 0 ? "error" : "completed",
        rawText: text,
        error: errors.length > 0 ? "Some validation issues found" : undefined,
      })

      setExtractedData(extracted)
      setValidationErrors(errors)
    } catch (error) {
      console.error("OCR processing failed:", error)
      setOcrState({
        isProcessing: false,
        progress: 0,
        status: "error",
        error: "Failed to process image. Please try again.",
      })
    }
  }

  const clearImage = () => {
    setImageData({ file: null, preview: null })
    setExtractedData({})
    setOcrState({ isProcessing: false, progress: 0, status: "idle" })
    setValidationErrors([])
    setAgentCommission(0)
  }

  const saveReceipt = async () => {
    if (validationErrors.length > 0) {
      alert("Please fix validation errors before saving")
      return
    }

    if (!user?.id) {
      alert("User not logged in. Cannot save receipt.")
      return
    }

    let imageUrl: string | null = null

    if (imageData.file) {
      const fileExtension = imageData.file.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExtension}`
      const filePath = `${user.id}/${fileName}` // Store images under agent's ID

      try {
        const { data, error } = await supabase.storage
          .from("receipt-images") // Ensure you have a bucket named 'receipt-images'
          .upload(filePath, imageData.file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (error) {
          console.error("Error uploading image:", error)
          alert("Failed to upload image: " + error.message)
          return // Stop saving receipt if image upload fails
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage.from("receipt-images").getPublicUrl(filePath)

        if (publicUrlData) {
          imageUrl = publicUrlData.publicUrl
        }
      } catch (err) {
        console.error("Unexpected error during image upload:", err)
        alert("An unexpected error occurred while uploading the image.")
        return
      }
    }

    const receiptDataToSave = {
      amount: extractedData.amount,
      reference_number: extractedData.referenceNumber,
      date_time: extractedData.dateTime,
      sender_name: extractedData.senderName,
      customer_tip: extractedData.customerTip, // This will now be null if input is empty
      receiver_name: extractedData.receiverName,
      receiver_number: extractedData.receiverNumber,
      transaction_type: extractedData.transactionType,
      status: extractedData.status,
      is_valid_account: extractedData.isValidAccount,
      agent_commission: Number.parseFloat(agentCommission.toFixed(2)),
      agent_id: user.id,
      notes: (document.getElementById("notes") as HTMLTextAreaElement)?.value || null,
      image_url: imageUrl, // Save the image URL
    }

    try {
      const { data, error } = await supabase.from("receipts").insert([receiptDataToSave]).select()

      if (error) {
        console.error("Error saving receipt:", error)
        alert("Failed to save receipt: " + error.message)
      } else {
        console.log("Receipt saved successfully:", data)
        alert(`Receipt saved successfully! Agent Commission: ₱${agentCommission.toFixed(2)}`)
        clearImage()
      }
    } catch (err) {
      console.error("Unexpected error during save:", err)
      alert("An unexpected error occurred while saving the receipt.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <ModernNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
            Receipt Scanner
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your GCash receipt and let AI extract the payment details automatically
          </p>
        </div>

        <div className="mb-8">
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg shadow-gray-200/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  Target Account
                </Badge>
                <span className="text-gray-700 font-medium">
                  {adminConfig.targetGCashName} ({adminConfig.targetGCashNumber})
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20 h-full">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                    <FileImage className="w-4 h-4 text-white" />
                  </div>
                  Upload Receipt
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!imageData.preview ? (
                  <div
                    className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${
                      isDragOver
                        ? "border-blue-400 bg-blue-50/50 scale-[1.02] shadow-lg shadow-blue-200/25"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="space-y-6">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
                        <Upload className="w-10 h-10 text-gray-500" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-gray-900">Drop your GCash receipt here</h3>
                        <p className="text-gray-600">or choose from your device</p>
                        <p className="text-sm text-gray-500">Supports JPG, PNG, HEIC up to 10MB</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                        <Button
                          size="lg"
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Browse Files
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex-1 bg-transparent"
                          onClick={() => cameraInputRef.current?.click()}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative group">
                      <div className="relative overflow-hidden rounded-2xl bg-gray-100 shadow-inner border border-gray-200/50">
                        <Image
                          src={imageData.preview || "/placeholder.svg"}
                          alt="Receipt preview"
                          width={600}
                          height={400}
                          className="w-full h-64 sm:h-80 object-contain"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                          onClick={clearImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {ocrState.status === "idle" && (
                      <Button
                        size="lg"
                        onClick={processOCR}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Zap className="w-5 h-5 mr-2" />
                        Extract Data with AI
                      </Button>
                    )}

                    {ocrState.isProcessing && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Processing image...</p>
                              <p className="text-sm text-gray-600">Extracting payment details</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
                            {ocrState.progress}%
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                            style={{ width: `${ocrState.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {ocrState.status === "completed" && (
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-emerald-900">Extraction completed!</p>
                          <p className="text-sm text-emerald-700">Review and edit the details below</p>
                        </div>
                      </div>
                    )}

                    {ocrState.status === "error" && (
                      <Alert className="border-red-200 bg-red-50 shadow-sm">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">{ocrState.error}</AlertDescription>
                      </Alert>
                    )}

                    {ocrState.rawText && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                          View extracted text (debug)
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-gray-700 whitespace-pre-wrap text-xs border border-gray-200 shadow-inner">
                          {ocrState.rawText}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-xl shadow-gray-200/20 h-full">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                      <Scan className="w-4 h-4 text-white" />
                    </div>
                    Payment Details
                  </CardTitle>
                  {ocrState.status === "completed" && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm">AI Extracted</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {validationErrors.length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50 shadow-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <div className="space-y-1">
                        <div className="font-medium">Please review:</div>
                        {validationErrors.map((error, index) => (
                          <div key={index} className="text-sm">
                            • {error}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {extractedData.receiverNumber && (
                  <div
                    className={`p-3 rounded-xl border shadow-sm ${
                      extractedData.isValidAccount ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {extractedData.isValidAccount ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <div className="flex-1">
                        <span
                          className={`text-sm font-medium ${
                            extractedData.isValidAccount ? "text-emerald-800" : "text-amber-800"
                          }`}
                        >
                          {extractedData.isValidAccount
                            ? "✓ Payment sent to correct GCash account"
                            : "⚠ Payment sent to different account"}
                        </span>
                        <div className="text-xs text-gray-600 mt-1">Detected: {extractedData.receiverNumber}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                    Amount *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={extractedData.amount || ""}
                      onChange={(e) =>
                        setExtractedData((prev) => ({ ...prev, amount: Number.parseFloat(e.target.value) }))
                      }
                      className="pl-8 h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-lg font-semibold shadow-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference" className="text-sm font-medium text-gray-700">
                    Reference Number *
                  </Label>
                  <Input
                    id="reference"
                    value={extractedData.referenceNumber || ""}
                    onChange={(e) => setExtractedData((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                    className="h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm"
                    placeholder="8031350663152"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="datetime" className="text-sm font-medium text-gray-700">
                    Date & Time *
                  </Label>
                  <Input
                    id="datetime"
                    type="datetime-local"
                    value={extractedData.dateTime || ""}
                    onChange={(e) => setExtractedData((prev) => ({ ...prev, dateTime: e.target.value }))}
                    className="h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender" className="text-sm font-medium text-gray-700">
                    Customer Name
                  </Label>
                  <Input
                    id="sender"
                    value={extractedData.senderName || ""}
                    onChange={(e) => setExtractedData((prev) => ({ ...prev, senderName: e.target.value }))}
                    className="h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm"
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tip" className="text-sm font-medium text-gray-700">
                    Customer Tip
                  </Label>
                  <Input
                    id="tip"
                    type="number"
                    step="0.01"
                    value={extractedData.customerTip || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      setExtractedData((prev) => ({
                        ...prev,
                        customerTip: value === "" ? null : Number.parseFloat(value),
                      }))
                    }}
                    className="h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm"
                    placeholder="Tip (optional)"
                  />
                </div>

                {extractedData.transactionType && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Transaction Type</Label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={extractedData.transactionType === "receive" ? "default" : "secondary"}
                        className="shadow-sm"
                      >
                        {extractedData.transactionType === "receive" ? "Money Received" : "Money Sent"}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.amount && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Agent Commission</Label>
                    <Input
                      id="commission"
                      type="number"
                      step="0.01"
                      value={agentCommission.toFixed(2)}
                      readOnly
                      className="h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    className="bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl resize-none shadow-sm"
                    placeholder="Add any additional notes..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    size="lg"
                    onClick={saveReceipt}
                    disabled={!extractedData.amount || !extractedData.referenceNumber}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Receipt
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={clearImage}
                    className="border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 sm:w-auto shadow-sm bg-transparent"
                  >
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReceiptCapture() {
  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      <ReceiptCaptureContent />
    </ProtectedRoute>
  )
}
