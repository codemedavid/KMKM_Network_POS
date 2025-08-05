-- Revise RLS for profiles table to ensure service_role can bypass it for admin actions
-- This is often handled by the service_role key itself, but explicit policies can be added.

-- First, ensure RLS is enabled (already done in 001_create_profiles_table.sql)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow service_role to bypass RLS for all operations on profiles
-- This is typically not needed if using the service_role key directly in server actions,
-- as the service_role key bypasses RLS by default.
-- However, if you were using a custom function or trigger that needed this, it would be here.
-- For direct server actions using supabaseServer (with service_role key), RLS is bypassed.

-- No changes needed here for the current setup, as supabaseServer already uses the service_role key.
