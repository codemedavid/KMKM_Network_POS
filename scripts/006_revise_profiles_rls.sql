-- Drop existing policies to avoid conflicts and ensure a clean state for re-creation
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles; -- Drop if it was previously attempted

-- Policy 1: Allow users to view and update only their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow users with 'admin' role to view all profiles
-- This policy directly checks the user's role from their JWT claims,
-- which is generally more efficient and less prone to recursion issues
-- than subqueries to auth.users within RLS policies.
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.jwt() ->> 'app_metadata' IS NOT NULL AND
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin'
  );
