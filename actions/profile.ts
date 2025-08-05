"use server"

import { supabaseServer } from "@/lib/supabase-server"

interface ProfileData {
  full_name: string | null
  role: string | null
}

/**
 * Fetches a single user's profile data by their user_id.
 * This function runs on the server and uses the service role key to bypass RLS,
 * making it safe to call from client components (via AuthContext) without RLS recursion issues.
 */
export async function getUserProfile(userId: string): Promise<{
  profile: ProfileData | null
  error: string | null
}> {
  try {
    const { data, error } = await supabaseServer
      .from("profiles")
      .select("full_name, role")
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("Server Action: Error fetching user profile:", error.message)
      return { profile: null, error: "Failed to fetch user profile." }
    }

    return { profile: data, error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in getUserProfile:", e.message)
    return { profile: null, error: "An unexpected server error occurred." }
  }
}
