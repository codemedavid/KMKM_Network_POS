-- Create payouts table to track commission payouts to agents
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  receipt_ids UUID[] NOT NULL,
  payout_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Agents can view their own payouts
CREATE POLICY "Agents can view their own payouts."
  ON public.payouts FOR SELECT
  USING (auth.uid() = agent_id);

-- Admins can view all payouts
CREATE POLICY "Admins can view all payouts."
  ON public.payouts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can insert payouts
CREATE POLICY "Admins can insert payouts."
  ON public.payouts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
