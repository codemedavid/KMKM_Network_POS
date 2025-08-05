import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Provided fallback values for client-side (public) keys
  const FALLBACK_SUPABASE_URL = "https://wwasrxffcmoewpfsumix.supabase.co"
  const FALLBACK_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YXNyeGZmY21vZXdwZnN1bWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODgzMTIsImV4cCI6MjA2OTk2NDMxMn0.iSnEO74VHgXocQIjGtrWKCjzSfdzXV0JZVc2C_j58e4"

  // Use environment variables first, fall back to hardcoded values if not set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY

  // If even the fallback values are missing (which shouldn't happen with hardcoded values), throw an error.
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase client URL or Anon Key is missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set, or provide valid fallback values.",
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createClient()
