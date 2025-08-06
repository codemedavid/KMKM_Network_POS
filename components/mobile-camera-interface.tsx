"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, Upload, Zap, Scan, Loader2, CheckCircle, AlertTriangle, ArrowLeft, RefreshCw, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { useAuth } from "./auth-context-fixed"
import ProtectedRoute from "./protected-route"
import { useRouter } from "next/navigation"
import ModernNav from "./modern-nav"
// Import our shared processing functions
import {
  processImageWithOCR,
  processImageWithOCRAndPatterns,
  saveReceiptToDatabase,
  calculateCommission,
  type ReceiptData
} from "@/lib/receipt-processing"
import { getPaymentAccounts } from "@/actions/accounts"

interface CameraState {
  isActive: boolean
  stream: MediaStream | null
  facingMode: "user" | "environment"
  hasPermission: boolean
  permissionError: string | null
}

interface CapturedImage {
  file: File
  preview: string
  timestamp: Date
}

interface OCRProcessingState {
  isProcessing: boolean
  progress: number
  status: "idle" | "processing" | "completed" | "error" | "saving"
  error?: string
  extractedText?: string
  extractedData?: Partial<ReceiptData> & { matchedPattern?: string; matchedAccount?: string }
  validationErrors?: string[]
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
    phonePattern: "(\\+63\\s*[0-9]{3}\\s*[0-9]{3}\\s*[0-9]{4}|09[0-9]{9})",
  },
  serviceCommissionRate: 20,
  tipCommissionRate: 50,
}

function MobileCameraContent() {
  const { user } = useAuth()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    stream: null,
    facingMode: "environment", // Start with back camera for receipts
    hasPermission: false,
    permissionError: null
  })

  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null)
  const [ocrState, setOcrState] = useState<OCRProcessingState>({
    isProcessing: false,
    progress: 0,
    status: "idle"
  })
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(defaultAdminConfig)

  // Load accounts and update config - with caching
  const loadAccounts = useCallback(async () => {
    try {
      const { accounts } = await getPaymentAccounts()
      const activeAccounts = accounts?.filter((a: any) => a.is_active) || []
      
      if (activeAccounts.length > 0) {
        // Use the first primary account, or the first active account
        const primaryAccount = activeAccounts.find((a: any) => a.is_primary) || activeAccounts[0]
        
        const newConfig: AdminConfig = {
          ...defaultAdminConfig,
          targetGCashNumber: primaryAccount.account_number,
          targetGCashName: primaryAccount.account_holder_name,
        }
        
        setAdminConfig(newConfig)
        console.log("Updated admin config with account:", primaryAccount.account_name)
      }
    } catch (error) {
      console.error("Failed to load accounts:", error)
    }
  }, [])

  // Initialize camera on component mount (only in browser)
  useEffect(() => {
    // Only start camera in browser environment
    if (typeof window !== 'undefined') {
      // Start camera immediately, load accounts in background
      startCamera()
      loadAccounts()
    }
  }, [loadAccounts])

  const startCamera = async () => {
    try {
      setCameraState(prev => ({ ...prev, permissionError: null }))
      
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error("Camera not available in server environment")
      }

      // Debug log current environment
      console.log('Camera debug info:', {
        hasNavigator: !!navigator,
        hasMediaDevices: !!(navigator && navigator.mediaDevices),
        hasGetUserMedia: !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent
      })

      // Check if navigator exists
      if (!navigator) {
        throw new Error("Navigator not available. Please try refreshing the page.")
      }

      // Check if mediaDevices is available
      if (!navigator.mediaDevices) {
        throw new Error("MediaDevices API not available. This might be due to:\n• HTTP connection (HTTPS required)\n• Unsupported browser\n• Privacy/security settings")
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported. Please:\n• Use a modern browser (Chrome 53+, Firefox 36+, Safari 11+)\n• Enable camera permissions\n• Access via HTTPS")
      }

      // Check if we're on HTTPS (required for camera access) but be more flexible for development
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.endsWith('.local')

      if (!isSecure) {
        throw new Error("Camera access requires HTTPS. Current: " + window.location.protocol + "//" + window.location.hostname + "\n\nTo access from mobile devices:\n• Set up HTTPS with a tool like ngrok\n• Or use localhost:3000 from the same machine\n• File upload will still work without HTTPS")
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraState.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraState(prev => ({
        ...prev,
        isActive: true,
        stream,
        hasPermission: true
      }))
    } catch (error: any) {
      console.error("Camera access error:", error)
      let errorMessage = "Camera access denied. Please allow camera permissions and try again."
      
      if (error.message.includes("not supported")) {
        errorMessage = "Camera not supported. Please use a modern browser with HTTPS."
      } else if (error.message.includes("HTTPS")) {
        errorMessage = "Camera requires HTTPS. Please access via secure connection."
      } else if (error.name === "NotAllowedError") {
        errorMessage = "Camera permission denied. Please allow camera access and refresh."
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera found. Please connect a camera and try again."
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is being used by another application. Please close other apps using the camera."
      }
      
      setCameraState(prev => ({
        ...prev,
        permissionError: errorMessage,
        hasPermission: false
      }))
    }
  }

  const stopCamera = () => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach(track => track.stop())
    }
    setCameraState(prev => ({
      ...prev,
      isActive: false,
      stream: null
    }))
  }

  const switchCamera = async () => {
    stopCamera()
    const newFacingMode = cameraState.facingMode === "user" ? "environment" : "user"
    setCameraState(prev => ({ ...prev, facingMode: newFacingMode }))
    
    // Small delay to ensure camera is stopped
    setTimeout(startCamera, 100)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" })
        const preview = URL.createObjectURL(blob)
        
        setCapturedImage({
          file,
          preview,
          timestamp: new Date()
        })
        
        // Stop camera after capture
        stopCamera()
      }
    }, "image/jpeg", 0.9)
  }

  const retakePhoto = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.preview)
      setCapturedImage(null)
    }
    startCamera()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file)
      setCapturedImage({
        file,
        preview,
        timestamp: new Date()
      })
      stopCamera()
    }
  }

  const processWithAI = async () => {
    if (!capturedImage || !user?.id) return

    setOcrState({
      isProcessing: true,
      progress: 0,
      status: "processing"
    })

    try {
      // Use enhanced OCR processing with pattern matching
      const { text, extractedData, errors, matchedPattern, matchedAccount } = await processImageWithOCRAndPatterns(
        capturedImage.file,
        (progress) => {
          setOcrState(prev => ({
            ...prev,
            progress
          }))
        }
      )

      // Calculate commission using admin config rates
      const commission = calculateCommission(
        extractedData.amount || 0,
        extractedData.customerTip || 0,
        adminConfig.serviceCommissionRate,
        adminConfig.tipCommissionRate
      )

      // Include matched pattern and account info in the extracted data
      const enhancedData = {
        ...extractedData,
        agentCommission: commission,
        matchedPattern: matchedPattern?.pattern_name,
        matchedAccount: matchedAccount?.account_name
      }

      setOcrState({
        isProcessing: false,
        progress: 100,
        status: errors.length > 0 ? "error" : "completed",
        extractedText: text,
        extractedData: enhancedData,
        validationErrors: errors,
        error: errors.length > 0 ? "Some validation issues found" : undefined
      })
      
    } catch (error: any) {
      setOcrState({
        isProcessing: false,
        progress: 0,
        status: "error",
        error: error.message || "Failed to process image"
      })
    }
  }

  const saveReceipt = async () => {
    if (!capturedImage || !user?.id || !ocrState.extractedData) return

    setOcrState(prev => ({ ...prev, status: "saving", isProcessing: true }))

    try {
      // Get customer name and tip from the form inputs
      const customerNameInput = document.getElementById('customerName') as HTMLInputElement
      const customerTipInput = document.getElementById('customerTip') as HTMLInputElement
      
      const customerName = customerNameInput?.value?.trim() || undefined
      const customerTip = parseFloat(customerTipInput?.value || '0') || 0

      // Update extracted data with customer info
      const finalExtractedData = {
        ...ocrState.extractedData,
        senderName: customerName || ocrState.extractedData.senderName,
        customerTip: customerTip,
        // Recalculate commission with final tip amount using admin config rates
        agentCommission: calculateCommission(
          ocrState.extractedData.amount || 0,
          customerTip,
          adminConfig.serviceCommissionRate,
          adminConfig.tipCommissionRate
        )
      }

      const result = await saveReceiptToDatabase(
        finalExtractedData,
        capturedImage.file,
        user.id,
        finalExtractedData.agentCommission || 0
      )

      if (result.success) {
        // Reset state and show success
        setCapturedImage(null)
        setOcrState({ isProcessing: false, progress: 0, status: "idle" })
        
        // Show success message with final commission
        const tipText = customerTip > 0 ? ` (Tip: ₱${customerTip.toFixed(2)})` : ''
        alert(`Receipt saved!${tipText}\nFinal Commission: ₱${(finalExtractedData.agentCommission || 0).toFixed(2)}`)
        
        // Restart camera for next capture
        startCamera()
      } else {
        setOcrState(prev => ({
          ...prev,
          status: "error",
          isProcessing: false,
          error: result.error || "Failed to save receipt"
        }))
      }
    } catch (error: any) {
      setOcrState(prev => ({
        ...prev,
        status: "error",
        isProcessing: false,
        error: error.message || "Failed to save receipt"
      }))
    }
  }

  const openManualEntry = () => {
    // Store the captured image in sessionStorage for the manual entry page
    if (capturedImage) {
      const imageData = {
        preview: capturedImage.preview,
        timestamp: capturedImage.timestamp.toISOString()
      }
      sessionStorage.setItem('capturedReceiptImage', JSON.stringify(imageData))
    }
    
    // Navigate to the existing receipt capture page for manual entry
    router.push('/receipt-capture')
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between text-white">
          <h1 className="text-base font-semibold">GCash Scanner</h1>
          {cameraState.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={switchCamera}
              className="text-white hover:bg-white/20 p-2"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-screen">
        {!capturedImage ? (
          <>
            {/* Live Camera Feed */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            
            {/* Camera Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Receipt Frame Guide */}
              <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
              </div>
              
              {/* Center Guide Text */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
                <p className="text-sm opacity-80 bg-black/50 px-3 py-1 rounded-full">
                  Position receipt within frame
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Captured Image Preview */
          <div className="relative w-full h-full">
            <Image
              src={capturedImage.preview}
              alt="Captured receipt"
              fill
              className="object-contain bg-black"
            />
            
            {/* Back Button */}
            <Button
              onClick={retakePhoto}
              className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white border-none"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retake
            </Button>
          </div>
        )}

        {/* Permission Error */}
        {cameraState.permissionError && (
          <div className="absolute inset-0 bg-black flex items-center justify-center p-4">
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 max-w-md w-full text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">Camera Not Available</h3>
              <div className="text-red-200 text-sm mb-4 text-left">
                {cameraState.permissionError.split('\n').map((line, index) => (
                  <div key={index} className="mb-1">{line}</div>
                ))}
              </div>
              
              {/* Debug Info */}
              <details className="mb-4 text-left">
                <summary className="text-gray-300 text-xs cursor-pointer hover:text-white">
                  Show Debug Info
                </summary>
                <div className="mt-2 text-xs text-gray-400 bg-black/30 p-2 rounded">
                  <div>Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</div>
                  <div>Host: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</div>
                  <div>Navigator: {typeof navigator !== 'undefined' ? 'Available' : 'Not Available'}</div>
                  <div>MediaDevices: {typeof navigator !== 'undefined' && navigator.mediaDevices ? 'Available' : 'Not Available'}</div>
                  <div>getUserMedia: {typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' ? 'Available' : 'Not Available'}</div>
                </div>
              </details>

              <div className="space-y-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image Instead
                </Button>
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Camera Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* OCR Processing Overlay */}
        {ocrState.isProcessing && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-white text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold">Processing with AI...</p>
              <p className="text-sm opacity-80 mt-2">{ocrState.progress}% complete</p>
              <div className="w-48 bg-gray-700 rounded-full h-2 mt-4 mx-auto">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ocrState.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* OCR Success/Error Results */}
        {(ocrState.status === "completed" || ocrState.status === "error") && ocrState.extractedData && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
              <div className="text-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Receipt Data Extracted</h3>
              </div>
              
              {/* Extracted Data Summary */}
              <div className="space-y-3 mb-4">
                {ocrState.extractedData.amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-green-600">₱{ocrState.extractedData.amount.toFixed(2)}</span>
                  </div>
                )}
                {ocrState.extractedData.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reference:</span>
                    <span className="font-mono text-sm">{ocrState.extractedData.referenceNumber}</span>
                  </div>
                )}
                {ocrState.extractedData.dateTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-sm">{new Date(ocrState.extractedData.dateTime).toLocaleString()}</span>
                  </div>
                )}
                
                {/* Pattern and Account Match Info */}
                {(ocrState.extractedData.matchedPattern || ocrState.extractedData.matchedAccount) && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                    <h4 className="text-blue-800 font-medium text-sm">Detection Info</h4>
                    {ocrState.extractedData.matchedPattern && (
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">Pattern Used:</span>
                        <span className="font-medium text-blue-800">{ocrState.extractedData.matchedPattern}</span>
                      </div>
                    )}
                    {ocrState.extractedData.matchedAccount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">Matched Account:</span>
                        <span className="font-medium text-blue-800">{ocrState.extractedData.matchedAccount}</span>
                      </div>
                    )}
                    {ocrState.extractedData.isValidAccount !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">Account Valid:</span>
                        <span className={`font-medium ${ocrState.extractedData.isValidAccount ? 'text-green-600' : 'text-red-600'}`}>
                          {ocrState.extractedData.isValidAccount ? '✓ Yes' : '✗ No'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {ocrState.extractedData.agentCommission !== undefined && (
                  <div className="border-t pt-2 space-y-1">
                    {ocrState.extractedData.customerTip && ocrState.extractedData.customerTip > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Customer Tip:</span>
                        <span className="font-medium text-orange-600">₱{ocrState.extractedData.customerTip.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Commission:</span>
                      <span className="font-semibold text-blue-600">₱{ocrState.extractedData.agentCommission.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Fields for Tips and Customer Name */}
              <div className="space-y-4 mb-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Tip (Optional)
                  </label>
                  <input
                    type="number"
                    id="customerTip"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    onChange={(e) => {
                      const tipAmount = parseFloat(e.target.value) || 0
                      // Recalculate commission when tip changes using admin config rates
                      const newCommission = calculateCommission(
                        ocrState.extractedData?.amount || 0,
                        tipAmount,
                        adminConfig.serviceCommissionRate,
                        adminConfig.tipCommissionRate
                      )
                      setOcrState(prev => ({
                        ...prev,
                        extractedData: prev.extractedData ? {
                          ...prev.extractedData,
                          customerTip: tipAmount,
                          agentCommission: newCommission
                        } : prev.extractedData
                      }))
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Commission updates automatically with tip amount
                  </p>
                </div>
              </div>

              {/* Validation Errors */}
              {ocrState.validationErrors && ocrState.validationErrors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <h4 className="text-yellow-800 font-medium text-sm mb-2">⚠️ Validation Warnings:</h4>
                  {ocrState.validationErrors.map((error, index) => (
                    <p key={index} className="text-yellow-700 text-xs">• {error}</p>
                  ))}
                  <p className="text-yellow-600 text-xs mt-2">
                    You can still save the receipt, but please verify the account details.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={saveReceipt}
                  disabled={ocrState.isProcessing}
                  className={`w-full ${ocrState.validationErrors && ocrState.validationErrors.length > 0 ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {ocrState.isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    ocrState.validationErrors && ocrState.validationErrors.length > 0 ? "Save Anyway" : "Save Receipt"
                  )}
                </Button>
                
                {ocrState.validationErrors && ocrState.validationErrors.length > 0 && (
                  <Button 
                    onClick={openManualEntry}
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit & Save
                  </Button>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setOcrState(prev => ({ ...prev, status: "idle" }))}
                    className="flex-1"
                    disabled={ocrState.isProcessing}
                  >
                    Close
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={retakePhoto}
                    className="flex-1"
                    disabled={ocrState.isProcessing}
                  >
                    Retake
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-6">
        {!capturedImage ? (
          /* Camera Controls */
          <div className="flex items-center justify-center space-x-8">
            {/* Attach Image Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 border-2 border-white/50"
              disabled={!cameraState.hasPermission}
            >
              <Upload className="h-6 w-6 text-white" />
            </Button>

            {/* Capture Button */}
            <Button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 border-4 border-white shadow-lg"
              disabled={!cameraState.isActive}
            >
              <Camera className="h-8 w-8 text-black" />
            </Button>

            {/* Gallery/Recent */}
            <div className="w-16 h-16 rounded-lg bg-white/20 border-2 border-white/50 flex items-center justify-center">
              <div className="w-8 h-8 bg-white/40 rounded"></div>
            </div>
          </div>
        ) : (
          /* Image Action Controls */
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={processWithAI}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
                disabled={ocrState.isProcessing}
              >
                <Zap className="h-5 w-5 mr-2" />
                Extract with AI
              </Button>
              
              <Button
                onClick={openManualEntry}
                variant="outline"
                className="flex-1 bg-white/10 border-white/30 text-white py-3 hover:bg-white/20"
              >
                <Edit3 className="h-5 w-5 mr-2" />
                Manual Entry
              </Button>
            </div>
            
            <p className="text-white/70 text-sm text-center">
              Use AI extraction for automatic data capture or manual entry for custom input
            </p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default function MobileCameraInterface() {
  return (
    <ProtectedRoute>
      <MobileCameraContent />
    </ProtectedRoute>
  )
}