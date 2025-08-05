import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function supabaseServer() {
  const cookieStore = cookies()

  const FALLBACK_SUPABASE_URL = "https://wwasrxffcmoewpfsumix.supabase.co"
  const FALLBACK_SUPABASE_SERVICE_ROLE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YXNyeGZmY21vZXdwZnN1bWl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MjA2OTk2NDMxMn0.hspflaQoZlL8yb-O1XebeeOBkan2vSTpVUvYzsPtD3I"

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are set in your Vercel project.",
    )
  }

  return createServerClient(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}
