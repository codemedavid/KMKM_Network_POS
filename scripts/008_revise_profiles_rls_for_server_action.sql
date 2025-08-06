-- Revise the handle_new_user function to correctly populate full_name and role from user_metadata
-- This ensures the 'profiles' table is the source of truth for user roles and names.
-- (This function remains the same as in 007, included for completeness if running migrations out of order)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'role');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The get_my_profile_role() function is still useful for client-side RLS policies
-- on *other* tables that need to check the user's role without directly querying profiles.
-- However, we will remove its usage from the profiles table's own RLS policies.
-- (This function remains the same as in 007, included for completeness)
CREATE OR REPLACE FUNCTION public.get_my_profile_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop existing policies to avoid conflicts and ensure a clean state for re-creation
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles; -- THIS IS THE POLICY WE ARE REMOVING/REVISING
DROP POLICY IF EXISTS "Allow authenticated users to create their own profile" ON public.profiles;

-- Policy 1: Allow users to view and update only their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for INSERT: Allow authenticated users to create their own profile.
-- While the trigger handles initial creation, this policy allows direct inserts if needed.
CREATE POLICY "Allow authenticated users to create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- IMPORTANT: The "Admins can view all profiles" policy that caused recursion
-- when using get_my_profile_role() on the profiles table itself is now REMOVED.
-- Server-side access (via supabaseServer in actions/profile.ts) will bypass RLS entirely.
-- Client-side admin checks will rely on the role fetched by the server action and stored in AuthContext.
