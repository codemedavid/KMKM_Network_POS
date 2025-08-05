-- Update the profiles table to ensure 'full_name' is nullable and 'role' has a default.
-- This script assumes the table already exists from 001_create_profiles_table.sql.

-- Make full_name nullable
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;

-- Ensure role has a default value (already set in 001, but good to re-confirm)
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'cashier';

-- Revise RLS policies for profiles table to ensure 'admin' role can manage all profiles.
-- These policies are already defined in 001_create_profiles_table.sql,
-- but this script serves as a re-affirmation or a place for further refinements.

-- Policy to allow admins to insert new profiles
-- (e.g., for new agents created via admin panel)
DROP POLICY IF EXISTS "Admins can insert profiles." ON public.profiles;
CREATE POLICY "Admins can insert profiles."
  ON public.profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy to allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile."
  ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy to allow admins to delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles." ON public.profiles;
CREATE POLICY "Admins can delete profiles."
  ON public.profiles FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy to allow admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
CREATE POLICY "Admins can view all profiles."
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Ensure existing policies for users to manage their own profiles are still active
-- (These should be from 001_create_profiles_table.sql)
-- create policy "Users can view their own profile." on public.profiles for select using (auth.uid() = user_id);
-- create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = user_id);
