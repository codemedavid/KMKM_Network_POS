"use server"

import { supabaseServer } from "@/lib/supabase-server"

// ReceiptData interface
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
  is_commission_paid?: boolean // Corrected column name
}

// ProfileData interface
interface ProfileData {
  id: string // user_id from the profiles table
  full_name: string | null
  role: string
  email?: string
}

export async function getAdminDashboardData(): Promise<{
  receipts: ReceiptData[] | null
  profiles: ProfileData[] | null
  error: string | null
}> {
  try {
    // 1. Fetch all receipts
    const { data: receiptsData, error: receiptsError } = await supabaseServer.from("receipts").select(
      "id, agent_id, agent_commission, amount, customer_tip, saved_at, reference_number, date_time, sender_name, receiver_name, receiver_number, transaction_type, status, is_valid_account, notes, image_url, is_commission_paid", // Corrected column name
    )

    if (receiptsError) {
      console.error("Server Action: Error fetching receipts:", receiptsError.message)
      return { receipts: null, profiles: null, error: "Failed to fetch receipts." }
    }

    // 2. Fetch all profiles
    const { data: profilesData, error: profilesError } = await supabaseServer
      .from("profiles")
      .select("user_id, full_name, role")

    if (profilesError) {
      console.error("Server Action: Error fetching profiles:", profilesError.message)
      return { receipts: null, profiles: null, error: "Failed to fetch profiles." }
    }

    // 3. Fetch all users via admin API (the correct way!)
    const { data: usersResult, error: usersError } = await supabaseServer.auth.admin.listUsers()
    if (usersError) {
      console.error("Server Action: Error fetching auth.users emails:", usersError.message)
      // Proceed without emails
    }

    // 4. Map user id to email
    const authUserEmailsMap = new Map<string, string>()
    usersResult?.users.forEach((user) => {
      if (user.id && user.email) {
        authUserEmailsMap.set(user.id, user.email)
      }
    })

    // 5. Map profiles to include emails
    const mappedProfiles: ProfileData[] = profilesData.map((p) => ({
      id: p.user_id,
      full_name: p.full_name,
      role: p.role,
      email: authUserEmailsMap.get(p.user_id),
    }))

    return { receipts: receiptsData, profiles: mappedProfiles, error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in getAdminDashboardData:", e.message)
    return { receipts: null, profiles: null, error: "An unexpected server error occurred." }
  }
}

export async function markAgentCommissionPaid(agentId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabaseServer
      .from("receipts")
      .update({ is_commission_paid: true }) // Corrected column name
      .eq("agent_id", agentId)
      .eq("is_commission_paid", false) // Corrected column name

    if (error) {
      console.error("Server Action: Error marking commission as paid:", error.message)
      return { error: error.message }
    }

    return { error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in markAgentCommissionPaid:", e.message)
    return { error: "An unexpected server error occurred." }
  }
}
