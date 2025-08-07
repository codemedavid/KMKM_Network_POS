-- Fix RLS policies for payouts table
-- Drop existing policies
DROP POLICY IF EXISTS "Agents can view their own payouts." ON public.payouts;
DROP POLICY IF EXISTS "Admins can view all payouts." ON public.payouts;
DROP POLICY IF EXISTS "Admins can create payouts." ON public.payouts;

-- Create simpler policies that work with the current auth setup
-- Policy for agents: can view their own payouts
CREATE POLICY "Agents can view their own payouts."
  ON public.payouts FOR SELECT
  USING (auth.uid()::text = agent_id::text);

-- Policy for admins: can view all payouts
CREATE POLICY "Admins can view all payouts."
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for admins: can create payouts
CREATE POLICY "Admins can create payouts."
  ON public.payouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for admins: can update payouts
CREATE POLICY "Admins can update payouts."
  ON public.payouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for admins: can delete payouts
CREATE POLICY "Admins can delete payouts."
  ON public.payouts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ); 