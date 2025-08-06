"use server"

import { supabaseServer } from "@/lib/supabase-server"

// ReceiptData interface
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
  commission_paid?: boolean
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
    const { data: receiptsData, error: receiptsError } = await supabaseServer
      .from("receipts")
      .select(
        "id, agent_id, agent_commission, amount, customer_tip, saved_at, reference_number, date_time, sender_name, receiver_name, receiver_number, transaction_type, status, is_valid_account, notes, image_url, commission_paid",
      )

    if (receiptsError) {
      console.error("Server Action: Error fetching receipts:", receiptsError.message);
      return { receipts: null, profiles: null, error: "Failed to fetch receipts." };
    }

    // 2. Fetch all profiles
    const { data: profilesData, error: profilesError } = await supabaseServer
      .from("profiles")
      .select("user_id, full_name, role");

    if (profilesError) {
      console.error("Server Action: Error fetching profiles:", profilesError.message);
      return { receipts: null, profiles: null, error: "Failed to fetch profiles." };
    }

    // 3. Fetch all users via admin API (the correct way!)
    const { data: usersResult, error: usersError } = await supabaseServer.auth.admin.listUsers();
    if (usersError) {
      console.error("Server Action: Error fetching auth.users emails:", usersError.message);
      // Proceed without emails
    }

    // 4. Map user id to email
    const authUserEmailsMap = new Map<string, string>();
    usersResult?.users.forEach((user) => {
      if (user.id && user.email) {
        authUserEmailsMap.set(user.id, user.email);
      }
    });

    // 5. Map profiles to include emails
    const mappedProfiles: ProfileData[] = profilesData.map((p) => ({
      id: p.user_id,
      full_name: p.full_name,
      role: p.role,
      email: authUserEmailsMap.get(p.user_id),
    }));

    return { receipts: receiptsData, profiles: mappedProfiles, error: null };
  } catch (e: any) {
    console.error("Server Action: Unexpected error in getAdminDashboardData:", e.message);
    return { receipts: null, profiles: null, error: "An unexpected server error occurred." };
  }
}

// PayoutDetails interface
export interface PayoutDetails {
  payoutAmount: number
  payoutMethod: string
  referenceNumber: string
  notes?: string
  payoutDate: string
}

export async function markAgentCommissionPaid(
  agentId: string, 
  payoutDetails: PayoutDetails, 
  adminId: string
): Promise<{ error: string | null }> {
  try {
    // Start a transaction by first inserting the payout record
    const { data: payoutData, error: payoutError } = await supabaseServer
      .from("payouts")
      .insert({
        agent_id: agentId,
        payout_amount: payoutDetails.payoutAmount,
        payout_method: payoutDetails.payoutMethod,
        reference_number: payoutDetails.referenceNumber,
        payout_date: payoutDetails.payoutDate,
        notes: payoutDetails.notes,
        created_by: adminId
      })
      .select()

    if (payoutError) {
      console.error("Server Action: Error creating payout record:", payoutError.message)
      return { error: payoutError.message }
    }

    // Then mark all unpaid commissions for this agent as paid
    const { error: updateError } = await supabaseServer
      .from("receipts")
      .update({ commission_paid: true })
      .eq("agent_id", agentId)
      .eq("commission_paid", false)

    if (updateError) {
      console.error("Server Action: Error marking commission as paid:", updateError.message)
      // TODO: In a real app, you might want to implement rollback logic here
      return { error: updateError.message }
    }

    return { error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in markAgentCommissionPaid:", e.message)
    return { error: "An unexpected server error occurred." }
  }
}

// Legacy function for backward compatibility (simplified version)
export async function markAgentCommissionPaidSimple(agentId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabaseServer
      .from("receipts")
      .update({ commission_paid: true })
      .eq("agent_id", agentId)
      .eq("commission_paid", false)

    if (error) {
      console.error("Server Action: Error marking commission as paid:", error.message)
      return { error: error.message }
    }

    return { error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in markAgentCommissionPaidSimple:", e.message)
    return { error: "An unexpected server error occurred." }
  }
}

// Get payout history for an agent
export async function getAgentPayoutHistory(agentId?: string): Promise<{
  payouts: any[] | null
  error: string | null
}> {
  try {
    // First, get the payouts
    let query = supabaseServer
      .from("payouts")
      .select(`
        id,
        agent_id,
        payout_amount,
        payout_method,
        reference_number,
        payout_date,
        notes,
        created_at,
        created_by
      `)
      .order("created_at", { ascending: false })

    // If agentId is provided, filter by that agent
    if (agentId) {
      query = query.eq("agent_id", agentId)
    }

    const { data: payouts, error } = await query

    if (error) {
      console.error("Server Action: Error fetching payout history:", error.message)
      return { payouts: null, error: error.message }
    }

    // If we have payouts, fetch the corresponding profiles
    if (payouts && payouts.length > 0) {
      const agentIds = [...new Set(payouts.map(p => p.agent_id))]
      
      const { data: profiles, error: profilesError } = await supabaseServer
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", agentIds)

      if (profilesError) {
        console.error("Server Action: Error fetching profiles for payouts:", profilesError.message)
        // Continue without profile names rather than failing completely
      }

      // Map profiles to payouts
      const profileMap = new Map()
      profiles?.forEach(profile => {
        profileMap.set(profile.user_id, profile)
      })

      // Add profile information to payouts
      const payoutsWithProfiles = payouts.map(payout => ({
        ...payout,
        profiles: profileMap.get(payout.agent_id) || null
      }))

      return { payouts: payoutsWithProfiles, error: null }
    }

    return { payouts: payouts || [], error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in getAgentPayoutHistory:", e.message)
    return { payouts: null, error: "An unexpected server error occurred." }
  }
}
