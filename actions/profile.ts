"use server"

import { createClient } from "@/lib/supabase-server"

interface ProfileUpdateData {
  full_name?: string
  role?: string
}

export async function updateProfile(
  userId: string,
  data: ProfileUpdateData,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabaseServer = createClient()
    const { error } = await supabaseServer.from("profiles").update(data).eq("user_id", userId)

    if (error) {
      console.error("Server Action: Error updating profile:", error.message)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in updateProfile:", e.message)
    return { success: false, error: "An unexpected server error occurred." }
  }
}

export async function deleteProfile(userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabaseServer = createClient()
    // First, delete the user from auth.users
    const { error: authError } = await supabaseServer.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Server Action: Error deleting user from auth.users:", authError.message)
      return { success: false, error: authError.message }
    }

    // The profile in public.profiles should be automatically deleted by the trigger
    // 'on_auth_user_deleted' if it's set up correctly.
    // If not, you might need to explicitly delete it here, but it's generally
    // better to rely on database triggers for consistency.

    return { success: true, error: null }
  } catch (e: any) {
    console.error("Server Action: Unexpected error in deleteProfile:", e.message)
    return { success: false, error: "An unexpected server error occurred." }
  }
}
