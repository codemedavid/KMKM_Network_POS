"use server"

import { supabaseServer } from "@/lib/supabase-server"

// Data structures for receipts (must match what's saved in Supabase)
interface ReceiptData {
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
}

// Data structure for profiles (as returned by the server action)
interface ProfileData {
  id: string // This is the user_id from the profiles table
  full_name: string | null
  role: string
  email?: string // Add email for better fallback
}

/**
 * Fetches all receipts and profiles for administrative purposes.
 * This function runs on the server and uses the service role key to bypass RLS.
 * It should only be called by authenticated admin users.
 */
export async function getAdminDashboardData(): Promise<{
  receipts: ReceiptData[] | null
  profiles: ProfileData[] | null
  error: string | null
}> {
  try {
    // Fetch all receipts
    const { data: receiptsData, error: receiptsError } = await supabaseServer
      .from("receipts")
      .select("agent_id, agent_commission, amount, customer_tip, saved_at") // Select necessary fields for analytics

    if (receiptsError) {
      console.error("Server Action: Error fetching receipts:", receiptsError.message)
      return { receipts: null, profiles: null, error: "Failed to fetch receipts." }
    }

    // Fetch all profiles
    const { data: profilesData, error: profilesError } = await supabaseServer
      .from("profiles")
      .select("user_id, full_name, role")

    if (profilesError) {
      console.error("Server Action: Error fetching profiles:", profilesError.message)
      return { receipts: null, profiles: null, error: "Failed to fetch profiles." }
    }

    // Fetch emails from auth.users for better name fallback
    const userIds = profilesData.map((p) => p.user_id)
    // FIX: Explicitly specify the 'auth' schema when querying the 'users' table
   const { data: authUsersData, error: authUsersError } = await supabaseServer
  .from("profiles", { schema: "auth" })
  .select("id, email")
  .in("id", userIds);


    if (authUsersError) {
      console.error("Server Action: Error fetching auth.users emails:", authUsersError.message)
      // Continue without emails if there's an error, but log it.
    }

    const authUserEmailsMap = new Map<string, string>()
    authUsersData?.forEach((user) => {
      if (user.id && user.email) {
        authUserEmailsMap.set(user.id, user.email)
      }
    })

    // Map profiles to match expected structure (id, full_name, role, email)
    const mappedProfiles: ProfileData[] = profilesData.map((p) => ({
      id: p.user_id,
      full_name: p.full_name,
      role: p.role,
      email: authUserEmailsMap.get(p.user_id), // Add email from auth.users
    }))

    return { receipts: receiptsData, profiles: mappedProfiles, error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in getAdminDashboardData:", e.message)
    return { receipts: null, profiles: null, error: "An unexpected server error occurred." }
  }
}
