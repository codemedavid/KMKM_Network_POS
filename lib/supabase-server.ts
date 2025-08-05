import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for interacting with your database on the server.
// This client uses the service role key and bypasses Row Level Security (RLS).
// ONLY use this client in server-side contexts (Server Components, Server Actions, Route Handlers).

// Use NEXT_PUBLIC_SUPABASE_URL for consistency if it's the same URL as client,
// otherwise use SUPABASE_URL.

const FALLBACK_SUPABASE_URL = "https://wwasrxffcmoewpfsumix.supabase.co"
const FALLBACK_SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YXNyeGZmY21vZXdwZnN1bWl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM4ODMxMiwiZXhwIjoyMDY5OTY0MzEyfQ.hspflaQoZlL8yb-O1XebeeOBkan2vSTpVUvYzsPtD3I"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SUPABASE_SERVICE_ROLE_KEY// This MUST be set. No fallback to anon key.

// Log the values for debugging purposes
console.log("Server Supabase URL:", supabaseUrl ? "Set" : "Not Set")
console.log("Server Supabase Service Role Key:", supabaseServiceRoleKey ? "Set" : "Not Set")

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase server environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are set in your Vercel project.",
  )
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey)
