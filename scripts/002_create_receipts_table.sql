-- Create a table for receipts
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  reference_number text NOT NULL,
  date_time timestamp with time zone NOT NULL,
  sender_name text,
  customer_tip numeric,
  receiver_name text,
  receiver_number text,
  transaction_type text NOT NULL, -- 'receive' or 'send'
  status text NOT NULL, -- 'pending', 'completed', 'failed'
  is_valid_account boolean NOT NULL,
  agent_commission numeric,
  commission_paid boolean DEFAULT false,
  saved_at timestamp with time zone DEFAULT now(),
  agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Foreign key to auth.users
  notes text
);

-- Enable Row Level Security (RLS) for the receipts table
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Policy for agents: can insert their own receipts and view their own receipts
CREATE POLICY "Agents can insert their own receipts."
  ON public.receipts FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can view their own receipts."
  ON public.receipts FOR SELECT
  USING (auth.uid() = agent_id);

-- Policy for admins: can view all receipts
CREATE POLICY "Admins can view all receipts."
  ON public.receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (raw_app_meta_data->>'role')::text = 'admin'
    )
  );

-- Optional: Add an index for agent_id for faster lookups
CREATE INDEX ON public.receipts (agent_id);
