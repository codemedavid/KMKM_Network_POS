"use server"

import { supabaseServer } from "@/lib/supabase-server"

interface Receipt {
  id: string
  agent_commission: number | null
}

export async function createPayoutForAgent(agentId: string): Promise<{ error: string | null }> {
  try {
    // 1. Get all unpaid receipts for the agent
    const { data: receipts, error: receiptsError } = await supabaseServer
      .from("receipts")
      .select("id, agent_commission")
      .eq("agent_id", agentId)
      .eq("is_commission_paid", false)

    if (receiptsError) {
      console.error("Server Action: Error fetching receipts for payout:", receiptsError.message)
      return { error: receiptsError.message }
    }

    if (!receipts || receipts.length === 0) {
      return { error: "No unpaid receipts found." }
    }

    const receiptIds = receipts.map((r) => r.id)
    const totalAmount = receipts.reduce((sum, r) => sum + (r.agent_commission || 0), 0)

    // 2. Insert payout record
    const { error: insertError } = await supabaseServer.from("payouts").insert({
      agent_id: agentId,
      total_amount: totalAmount,
      receipt_ids: receiptIds,
      payout_date: new Date().toISOString(),
    })

    if (insertError) {
      console.error("Server Action: Error inserting payout:", insertError.message)
      return { error: insertError.message }
    }

    // 3. Mark receipts as paid
    const { error: updateError } = await supabaseServer
      .from("receipts")
      .update({ is_commission_paid: true })
      .in("id", receiptIds)

    if (updateError) {
      console.error("Server Action: Error updating receipts to paid:", updateError.message)
      return { error: updateError.message }
    }

    return { error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in createPayoutForAgent:", e.message)
    return { error: "An unexpected server error occurred." }
  }
}
