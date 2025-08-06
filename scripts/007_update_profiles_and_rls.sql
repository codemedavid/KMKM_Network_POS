-- Revise the handle_new_user function to correctly populate full_name and role from user_metadata
-- This ensures the 'profiles' table is the source of truth for user roles and names.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'role');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a security definer function to get the current user's role from the profiles table.
-- This function bypasses RLS on the profiles table for its own query,
-- allowing RLS policies to safely check the current user's role without recursion.
CREATE OR REPLACE FUNCTION public.get_my_profile_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop existing policies to avoid conflicts and ensure a clean state for re-creation
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create their own profile" ON public.profiles; -- Drop if it exists

-- Policy 1: Allow users to view and update only their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow users with 'admin' role (from their profile) to view all profiles
-- This policy uses the new get_my_profile_role() function to safely check the admin role.
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_profile_role() = 'admin');

-- Policy for INSERT: Allow authenticated users to create their own profile.
-- While the trigger handles initial creation, this policy allows direct inserts if needed.
CREATE POLICY "Allow authenticated users to create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
