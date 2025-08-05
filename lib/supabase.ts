import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wwasrxffcmoewpfsumix.supabase.co", // Fallback for Vercel preview
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YXNyeGZmY21vZXdwZnN1bWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODgzMTIsImV4cCI6MjA2OTk2NDMxMn0.iSnEO74VHgXocQIjGtrWKCjzSfdzXV0JZVc2C_j58e4", // Fallback for Vercel preview
)
