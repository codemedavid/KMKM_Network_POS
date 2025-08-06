import Tesseract from "tesseract.js"
import { supabase } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"
import { getPaymentAccounts, getExtractionPatterns, type PaymentAccount, type ExtractionPattern } from "@/actions/accounts"

// Data structures
export interface ReceiptData {
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
  agentId?: string
  imageUrl?: string
  matchedPattern?: string
  matchedAccount?: string
}

export interface AdminConfig {
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

export const defaultAdminConfig: AdminConfig = {
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

export const extractDataFromText = (text: string, adminConfig: AdminConfig = defaultAdminConfig): Partial<ReceiptData> => {
  console.log("Extracting data from text:", text)
  const extracted: Partial<ReceiptData> = {}
  
  // Clean up the text for better extraction
  const cleanText = text.replace(/\s+/g, ' ').trim()
  console.log("Cleaned text:", cleanText)

  try {
    // Extract amount - multiple patterns for flexibility
    const amountPatterns = [
      /(?:Amount|Total Amount Sent|Total)\s*[£₱]?\s*([0-9,]+\.?[0-9]*)/i,
      /[£₱]\s*([0-9,]+\.?[0-9]*)/i,
      /([0-9,]+\.?[0-9]*)\s*(?:PHP|php|Php)/i,
      /Amount\s+([0-9,]+\.?[0-9]*)/i, // Simple "Amount 999.00" format
    ]

    for (const pattern of amountPatterns) {
      const match = cleanText.match(pattern)
      if (match) {
        const amountStr = match[1].replace(/,/g, "")
        extracted.amount = parseFloat(amountStr)
        console.log("Amount extracted:", extracted.amount)
        break
      }
    }

    // Extract reference number - multiple patterns
    const refPatterns = [
      /(?:Ref No\.|Reference|Transaction|Ref)\s*([0-9\s]+)/i,
      /Reference\s*[#:]?\s*([0-9\s]+)/i,
      /Transaction\s*ID\s*[#:]?\s*([0-9\s]+)/i,
      /Ref No\.\s*([0-9\s]+)/i, // Simple "Ref No. 3031 394 951918" format
    ]

    for (const pattern of refPatterns) {
      const match = cleanText.match(pattern)
      if (match) {
        extracted.referenceNumber = match[1].trim()
        console.log("Reference extracted:", extracted.referenceNumber)
        break
      }
    }

    // Extract date/time - multiple patterns
    const datePatterns = [
      /([A-Za-z]{3}\s+[0-9]{1,2},\s+[0-9]{4}\s+[0-9]{1,2}:[0-9]{2}\s*[AP]M)/i,
      /([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}\s*[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[AP]M)?)/i,
    ]

    for (const pattern of datePatterns) {
      const match = cleanText.match(pattern)
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

    // Extract phone number and validate account
    const phonePatterns = [/(\+63\s*[0-9]{3}\s*[0-9]{3}\s*[0-9]{4})/i, /(09[0-9]{9})/i]

    for (const pattern of phonePatterns) {
      const match = cleanText.match(pattern)
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

    // Determine transaction type
    if (cleanText.toLowerCase().includes("sent via gcash") || cleanText.toLowerCase().includes("sent")) {
      extracted.transactionType = "receive"
    } else {
      extracted.transactionType = "send"
    }

    extracted.status = "completed"

    // Extract sender name
    const senderPatterns = [/From[:\s]+([A-Za-z\s]+?)(?:\n|$)/i, /Sender[:\s]+([A-Za-z\s]+?)(?:\n|$)/i]

    for (const pattern of senderPatterns) {
      const match = cleanText.match(pattern)
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

export const validateExtractedData = (data: Partial<ReceiptData>, adminConfig: AdminConfig = defaultAdminConfig): string[] => {
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

export const processImageWithOCR = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ text: string; extractedData: Partial<ReceiptData>; errors: string[] }> => {
  const { data: { text } } = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    }
  })

  console.log("Raw OCR text:", text)

  const extractedData = extractDataFromText(text)
  const errors = validateExtractedData(extractedData)

  return { text, extractedData, errors }
}

export const saveReceiptToDatabase = async (
  extractedData: Partial<ReceiptData>,
  file: File,
  userId: string,
  agentCommission: number = 0,
  notes?: string
): Promise<{ success: boolean; error?: string; data?: any }> => {
  let imageUrl: string | null = null

  // Upload image to Supabase Storage
  if (file) {
    const fileExtension = file.name.split(".").pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    const filePath = `${userId}/${fileName}`

    try {
      const { data, error } = await supabase.storage
        .from("receipt-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (error) {
        console.error("Error uploading image:", error)
        return { success: false, error: `Failed to upload image: ${error.message}` }
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from("receipt-images").getPublicUrl(filePath)
      if (publicUrlData) {
        imageUrl = publicUrlData.publicUrl
      }
    } catch (err) {
      console.error("Unexpected error during image upload:", err)
      return { success: false, error: "An unexpected error occurred while uploading the image." }
    }
  }

  // Save receipt to database
  const receiptDataToSave = {
    amount: extractedData.amount,
    reference_number: extractedData.referenceNumber,
    date_time: extractedData.dateTime,
    sender_name: extractedData.senderName,
    customer_tip: extractedData.customerTip,
    receiver_name: extractedData.receiverName,
    receiver_number: extractedData.receiverNumber,
    transaction_type: extractedData.transactionType,
    status: extractedData.status,
    is_valid_account: extractedData.isValidAccount,
    agent_commission: Number.parseFloat(agentCommission.toFixed(2)),
    agent_id: userId,
    notes: notes || null,
    image_url: imageUrl,
  }

  try {
    const { data, error } = await supabase.from("receipts").insert([receiptDataToSave]).select()

    if (error) {
      console.error("Error saving receipt:", error)
      return { success: false, error: `Failed to save receipt: ${error.message}` }
    }

    console.log("Receipt saved successfully:", data)
    return { success: true, data }
  } catch (err) {
    console.error("Unexpected error during save:", err)
    return { success: false, error: "An unexpected error occurred while saving the receipt." }
  }
}

export const calculateCommission = (
  amount: number,
  customerTip: number = 0,
  serviceRate: number = 20,
  tipRate: number = 50
): number => {
  // Match the exact calculation from receipt-capture component
  const totalAmount = amount || 0
  const tip = customerTip || 0
  const servicePrice = totalAmount - tip
  const serviceCommission = (servicePrice * serviceRate) / 100
  const tipCommission = (tip * tipRate) / 100
  return serviceCommission + tipCommission
}

// Enhanced extraction that uses database patterns
export const extractDataFromTextWithPatterns = async (text: string): Promise<{
  extractedData: Partial<ReceiptData>
  matchedPattern?: ExtractionPattern
  matchedAccount?: PaymentAccount
}> => {
  console.log("Extracting data from text with database patterns:", text)
  
  // Get all active patterns, sorted by priority
  const { patterns } = await getExtractionPatterns()
  const activePatterns = patterns?.filter(p => p.is_active) || []
  
  // Get all active accounts
  const { accounts } = await getPaymentAccounts()
  const activeAccounts = accounts?.filter(a => a.is_active) || []
  
  console.log("Available active accounts:", activeAccounts.map(a => ({
    name: a.account_name,
    type: a.account_type,
    number: a.account_number,
    isPrimary: a.is_primary
  })))
  
  // Debug: Log all accounts including inactive ones
  console.log("All accounts (including inactive):", accounts?.map(a => ({
    name: a.account_name,
    type: a.account_type,
    number: a.account_number,
    isActive: a.is_active,
    isPrimary: a.is_primary
  })))
  
  let extractedData: Partial<ReceiptData> = {}
  let matchedPattern: ExtractionPattern | undefined
  let matchedAccount: PaymentAccount | undefined
  let bestMatch: { pattern: ExtractionPattern; data: Partial<ReceiptData> } | undefined
  
  // Try each pattern in priority order
  for (const pattern of activePatterns) {
    const result = tryExtractWithPattern(text, pattern)
    
    if (result.amount && result.referenceNumber) {
      // Store the best match so far (first pattern with amount and reference)
      if (!bestMatch) {
        bestMatch = { pattern, data: result }
      }
      
      // Try to match against accounts of the same type
      const matchingAccounts = activeAccounts.filter(a => a.account_type === pattern.account_type)
      console.log(`Pattern "${pattern.pattern_name}" matched. Checking ${matchingAccounts.length} accounts of type "${pattern.account_type}"`)
      
      // Check if extracted phone/account number matches any account
      if (result.receiverNumber) {
        const normalizedReceiver = normalizeAccountNumber(result.receiverNumber)
        console.log(`Normalized receiver number: "${normalizedReceiver}"`)
        
        // Try to find matching account
        matchedAccount = matchingAccounts.find(account => {
          const normalizedAccount = normalizeAccountNumber(account.account_number)
          const isMatch = normalizedAccount === normalizedReceiver
          console.log(`Checking account "${account.account_name}": "${normalizedAccount}" vs "${normalizedReceiver}" = ${isMatch}`)
          return isMatch
        })
        
        // If no exact match, try partial match (last 4 digits)
        if (!matchedAccount && normalizedReceiver.length >= 4) {
          const last4Receiver = normalizedReceiver.slice(-4)
          matchedAccount = matchingAccounts.find(account => {
            const normalizedAccount = normalizeAccountNumber(account.account_number)
            const last4Account = normalizedAccount.slice(-4)
            const isPartialMatch = last4Account === last4Receiver
            console.log(`Partial match check "${account.account_name}": last4 "${last4Account}" vs "${last4Receiver}" = ${isPartialMatch}`)
            return isPartialMatch
          })
        }
        
        if (matchedAccount) {
          console.log(`Found matching account: "${matchedAccount.account_name}"`)
          extractedData = result
          matchedPattern = pattern
          break
        }
      }
    }
  }
  
  // If no account was matched but we have a best match, use it
  if (!matchedAccount && bestMatch) {
    console.log(`No account matched, using best pattern: "${bestMatch.pattern.pattern_name}"`)
    extractedData = bestMatch.data
    matchedPattern = bestMatch.pattern
  }
  
  // If no patterns matched at all, fall back to original extraction logic
  if (!extractedData.amount && !extractedData.referenceNumber) {
    console.log("No patterns matched, using fallback extraction logic")
    extractedData = extractDataFromText(text)
    
    // Validate account against configured accounts
    if (extractedData.receiverNumber) {
      const normalizedReceiver = normalizeAccountNumber(extractedData.receiverNumber)
      console.log(`Fallback: Normalized receiver number: "${normalizedReceiver}"`)
      
      // Check against all active accounts
      const matchedAccountFromFallback = activeAccounts.find(account => {
        const normalizedAccount = normalizeAccountNumber(account.account_number)
        const isMatch = normalizedAccount === normalizedReceiver
        console.log(`Fallback: Checking account "${account.account_name}": "${normalizedAccount}" vs "${normalizedReceiver}" = ${isMatch}`)
        return isMatch
      })
      
      if (matchedAccountFromFallback) {
        console.log(`Fallback: Found matching account: "${matchedAccountFromFallback.account_name}"`)
        extractedData.isValidAccount = true
        extractedData.receiverName = matchedAccountFromFallback.account_holder_name
        matchedAccount = matchedAccountFromFallback
      } else {
        console.log("Fallback: No matching account found")
        extractedData.isValidAccount = false
      }
    }
  }
  
  // Set validation based on matched account
  if (matchedAccount) {
    extractedData.isValidAccount = true
    extractedData.receiverName = matchedAccount.account_holder_name
  } else {
    extractedData.isValidAccount = false
  }
  
  // Determine transaction type
  if (text.toLowerCase().includes("sent via") || text.toLowerCase().includes("sent")) {
    extractedData.transactionType = "receive"
  } else {
    extractedData.transactionType = "send"
  }
  
  extractedData.status = "completed"
  
  console.log("Enhanced extraction result:", { extractedData, matchedPattern: matchedPattern?.pattern_name, matchedAccount: matchedAccount?.account_name })
  
  return { extractedData, matchedPattern, matchedAccount }
}

// Helper function to try extraction with a specific pattern
const tryExtractWithPattern = (text: string, pattern: ExtractionPattern): Partial<ReceiptData> => {
  const extracted: Partial<ReceiptData> = {}
  
  try {
    // Extract amount
    if (pattern.amount_pattern) {
      const amountMatch = text.match(new RegExp(pattern.amount_pattern, 'i'))
      if (amountMatch) {
        const amountStr = amountMatch[1].replace(/,/g, "")
        extracted.amount = parseFloat(amountStr)
      }
    }
    
    // Extract reference number
    if (pattern.reference_pattern) {
      const refMatch = text.match(new RegExp(pattern.reference_pattern, 'i'))
      if (refMatch) {
        extracted.referenceNumber = refMatch[1].trim()
      }
    }
    
    // Extract date/time
    if (pattern.date_pattern) {
      const dateMatch = text.match(new RegExp(pattern.date_pattern, 'i'))
      if (dateMatch) {
        const dateStr = dateMatch[1]
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const day = String(date.getDate()).padStart(2, "0")
          const hours = String(date.getHours()).padStart(2, "0")
          const minutes = String(date.getMinutes()).padStart(2, "0")
          extracted.dateTime = `${year}-${month}-${day}T${hours}:${minutes}`
        }
      }
    }
    
    // Extract sender name
    if (pattern.sender_pattern) {
      const senderMatch = text.match(new RegExp(pattern.sender_pattern, 'i'))
      if (senderMatch) {
        extracted.senderName = senderMatch[1].trim()
      }
    }
    
    // Extract receiver name
    if (pattern.receiver_pattern) {
      const receiverMatch = text.match(new RegExp(pattern.receiver_pattern, 'i'))
      if (receiverMatch) {
        extracted.receiverName = receiverMatch[1].trim()
      }
    }
    
    // Extract phone number
    if (pattern.phone_pattern) {
      const phoneMatch = text.match(new RegExp(pattern.phone_pattern, 'i'))
      if (phoneMatch) {
        extracted.receiverNumber = phoneMatch[1].trim()
      }
    }
    
    // Extract account number (for bank transfers)
    if (pattern.account_number_pattern) {
      const accountMatch = text.match(new RegExp(pattern.account_number_pattern, 'i'))
      if (accountMatch) {
        extracted.receiverNumber = accountMatch[1].trim()
      }
    }
    
  } catch (error) {
    console.error("Error applying pattern:", pattern.pattern_name, error)
  }
  
  return extracted
}

// Helper function to normalize account numbers for comparison
const normalizeAccountNumber = (accountNumber: string): string => {
  return accountNumber.replace(/[\s+\-()]/g, "").toLowerCase()
}

// Enhanced validation that considers multiple accounts
export const validateExtractedDataWithAccounts = async (data: Partial<ReceiptData>): Promise<string[]> => {
  const errors: string[] = []
  
  // Basic required field validation
  const requiredFields = ["amount", "referenceNumber", "dateTime"]
  requiredFields.forEach((field) => {
    if (!data[field as keyof ReceiptData]) {
      errors.push(`${field.replace(/([A-Z])/g, " $1").toLowerCase()} is required but not found`)
    }
  })
  
  // Amount validation
  if (data.amount && data.amount <= 0) {
    errors.push("Amount must be greater than 0")
  }
  
  // Account validation - only show warning, don't block save
  if (data.receiverNumber && data.isValidAccount === false) {
    // Get all configured accounts for better error message
    const { accounts } = await getPaymentAccounts()
    const activeAccounts = accounts?.filter(a => a.is_active) || []
    
    if (activeAccounts.length > 0) {
      const accountNumbers = activeAccounts.map(a => a.account_number).join(", ")
      errors.push(`Payment was sent to ${data.receiverNumber}, but expected one of: ${accountNumbers}`)
    } else {
      errors.push(`Payment was sent to ${data.receiverNumber}, but no accounts are configured`)
    }
  } else if (data.receiverNumber && data.isValidAccount === true) {
    // Log successful account match
    console.log(`✅ Account validation successful: ${data.receiverNumber} matches a configured account`)
  }
  
  return errors
}

// Enhanced OCR processing with pattern matching
export const processImageWithOCRAndPatterns = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ 
  text: string
  extractedData: Partial<ReceiptData>
  errors: string[]
  matchedPattern?: ExtractionPattern
  matchedAccount?: PaymentAccount 
}> => {
  const { data: { text } } = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    }
  })

  console.log("Raw OCR text:", text)

  const { extractedData, matchedPattern, matchedAccount } = await extractDataFromTextWithPatterns(text)
  const errors = await validateExtractedDataWithAccounts(extractedData)

  return { text, extractedData, errors, matchedPattern, matchedAccount }
}