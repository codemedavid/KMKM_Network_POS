-- Create a table for tracking commission payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payout_amount numeric NOT NULL,
  payout_method text NOT NULL,
  reference_number text NOT NULL,
  payout_date timestamp with time zone NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL -- Admin who processed the payout
);

-- Enable Row Level Security (RLS) for the payouts table
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Policy for agents: can view their own payouts
CREATE POLICY "Agents can view their own payouts."
  ON public.payouts FOR SELECT
  USING (auth.uid() = agent_id);

-- Policy for admins: can view all payouts and create new ones
CREATE POLICY "Admins can view all payouts."
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (raw_app_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Admins can create payouts."
  ON public.payouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (raw_app_meta_data->>'role')::text = 'admin'
    )
  );

-- Add indexes for better performance
CREATE INDEX ON public.payouts (agent_id);
CREATE INDEX ON public.payouts (payout_date);
CREATE INDEX ON public.payouts (created_at);