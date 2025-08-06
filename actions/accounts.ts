"use server"

import { supabaseServer } from "@/lib/supabase-server"

// Interfaces
export interface PaymentAccount {
  id: string
  account_type: string
  account_name: string
  account_number: string
  account_holder_name: string
  is_active: boolean
  is_primary: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ExtractionPattern {
  id: string
  pattern_name: string
  account_type: string
  provider_name?: string
  amount_pattern: string
  reference_pattern: string
  date_pattern: string
  sender_pattern?: string
  receiver_pattern?: string
  phone_pattern?: string
  account_number_pattern?: string
  bank_name_pattern?: string
  description?: string
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
  created_by?: string
}

// Get all payment accounts
export async function getPaymentAccounts(): Promise<{
  accounts: PaymentAccount[] | null
  error: string | null
}> {
  try {
    const { data: accounts, error } = await supabaseServer
      .from("payment_accounts")
      .select("*")
      .order("account_type", { ascending: true })
      .order("is_primary", { ascending: false })

    if (error) {
      console.error("Server Action: Error fetching payment accounts:", error.message)
      return { accounts: null, error: error.message }
    }

    return { accounts: accounts || [], error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in getPaymentAccounts:", e.message)
    return { accounts: null, error: "An unexpected server error occurred." }
  }
}

// Create or update payment account
export async function savePaymentAccount(
  accountData: Omit<PaymentAccount, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
  accountId?: string,
  userId?: string
): Promise<{ error: string | null; data?: PaymentAccount }> {
  try {
    // Get the current user from the server context if userId not provided
    let currentUserId = userId
    
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabaseServer.auth.getUser()
      
      if (authError || !user) {
        console.error("Server Action: Authentication error:", authError?.message || "No user found")
        return { error: "User not authenticated. Please log in again." }
      }
      
      currentUserId = user.id
    }

    // If setting as primary, unset other primary accounts of the same type
    if (accountData.is_primary) {
      await supabaseServer
        .from("payment_accounts")
        .update({ is_primary: false })
        .eq("account_type", accountData.account_type)
        .neq("id", accountId || "")
    }

    if (accountId) {
      // Update existing account
      const { data, error } = await supabaseServer
        .from("payment_accounts")
        .update({
          ...accountData,
          updated_at: new Date().toISOString()
        })
        .eq("id", accountId)
        .select()
        .single()

      if (error) {
        console.error("Server Action: Error updating payment account:", error.message)
        return { error: error.message }
      }

      return { error: null, data }
    } else {
      // Create new account
      const { data, error } = await supabaseServer
        .from("payment_accounts")
        .insert([{
          ...accountData,
          created_by: currentUserId
        }])
        .select()
        .single()

      if (error) {
        console.error("Server Action: Error creating payment account:", error.message)
        return { error: error.message }
      }

      return { error: null, data }
    }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in savePaymentAccount:", e.message)
    return { error: "An unexpected server error occurred." }
  }
}

// Delete payment account
export async function deletePaymentAccount(accountId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabaseServer
      .from("payment_accounts")
      .delete()
      .eq("id", accountId)

    if (error) {
      console.error("Server Action: Error deleting payment account:", error.message)
      return { error: error.message }
    }

    return { error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in deletePaymentAccount:", e.message)
    return { error: "An unexpected server error occurred." }
  }
}

// Get all extraction patterns
export async function getExtractionPatterns(): Promise<{
  patterns: ExtractionPattern[] | null
  error: string | null
}> {
  try {
    const { data: patterns, error } = await supabaseServer
      .from("extraction_patterns")
      .select("*")
      .order("priority", { ascending: true })
      .order("account_type", { ascending: true })

    if (error) {
      console.error("Server Action: Error fetching extraction patterns:", error.message)
      return { patterns: null, error: error.message }
    }

    return { patterns: patterns || [], error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in getExtractionPatterns:", e.message)
    return { patterns: null, error: "An unexpected server error occurred." }
  }
}

// Create or update extraction pattern
export async function saveExtractionPattern(
  patternData: Omit<ExtractionPattern, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
  patternId?: string,
  userId?: string
): Promise<{ error: string | null; data?: ExtractionPattern }> {
  try {
    // Get the current user from the server context if userId not provided
    let currentUserId = userId
    
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabaseServer.auth.getUser()
      
      if (authError || !user) {
        console.error("Server Action: Authentication error:", authError?.message || "No user found")
        return { error: "User not authenticated. Please log in again." }
      }

      currentUserId = user.id
    }

    if (patternId) {
      // Update existing pattern
      const { data, error } = await supabaseServer
        .from("extraction_patterns")
        .update({
          ...patternData,
          updated_at: new Date().toISOString()
        })
        .eq("id", patternId)
        .select()
        .single()

      if (error) {
        console.error("Server Action: Error updating extraction pattern:", error.message)
        return { error: error.message }
      }

      return { error: null, data }
    } else {
      // Create new pattern
      const { data, error } = await supabaseServer
        .from("extraction_patterns")
        .insert([{
          ...patternData,
          created_by: currentUserId
        }])
        .select()
        .single()

      if (error) {
        console.error("Server Action: Error creating extraction pattern:", error.message)
        return { error: error.message }
      }

      return { error: null, data }
    }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in saveExtractionPattern:", e.message)
    return { error: "An unexpected server error occurred." }
  }
}

// Delete extraction pattern
export async function deleteExtractionPattern(patternId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabaseServer
      .from("extraction_patterns")
      .delete()
      .eq("id", patternId)

    if (error) {
      console.error("Server Action: Error deleting extraction pattern:", error.message)
      return { error: error.message }
    }

    return { error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in deleteExtractionPattern:", e.message)
    return { error: "An unexpected server error occurred." }
  }
}