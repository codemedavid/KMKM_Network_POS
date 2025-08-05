-- Create a table for receipts
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL, -- Link to agent who processed it
  amount NUMERIC(10, 2) NOT NULL,
  reference_number TEXT NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sender_name TEXT,
  customer_tip NUMERIC(10, 2) DEFAULT 0,
  receiver_name TEXT,
  receiver_number TEXT,
  transaction_type TEXT NOT NULL, -- 'receive' or 'send'
  status TEXT DEFAULT 'completed' NOT NULL, -- 'pending', 'completed', 'failed'
  is_valid_account BOOLEAN DEFAULT TRUE,
  agent_commission NUMERIC(10, 2) DEFAULT 0,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When the receipt was saved in the system
  notes TEXT
);

-- Enable Row Level Security (RLS) for receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Policy for agents to view their own receipts
CREATE POLICY "Agents can view their own receipts."
  ON public.receipts FOR SELECT
  USING (auth.uid() = agent_id);

-- Policy for agents to insert receipts
CREATE POLICY "Agents can insert receipts."
  ON public.receipts FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Policy for admins to view all receipts
CREATE POLICY "Admins can view all receipts."
  ON public.receipts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy for admins to insert receipts (if needed, e.g., for manual entry)
CREATE POLICY "Admins can insert receipts."
  ON public.receipts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy for admins to update any receipt
CREATE POLICY "Admins can update any receipt."
  ON public.receipts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy for admins to delete any receipt
CREATE POLICY "Admins can delete any receipt."
  ON public.receipts FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Function to calculate agent commission (example: 1% of amount + 100% of tip)
CREATE OR REPLACE FUNCTION calculate_agent_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'receive' THEN
    NEW.agent_commission := (NEW.amount * 0.01) + COALESCE(NEW.customer_tip, 0);
  ELSE
    NEW.agent_commission := (NEW.amount * 0.005); -- Example: 0.5% for send money
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to apply commission calculation before insert or update
CREATE TRIGGER set_agent_commission
BEFORE INSERT OR UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION calculate_agent_commission();
