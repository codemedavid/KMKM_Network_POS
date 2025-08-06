-- Create a table for storing multiple payment accounts (GCash, banks, etc.)
CREATE TABLE public.payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type text NOT NULL, -- 'gcash', 'bank', 'paymaya', 'grabpay', etc.
  account_name text NOT NULL, -- Display name (e.g., "Business GCash", "BPI Main Account")
  account_number text NOT NULL, -- Phone number for GCash/mobile wallets, account number for banks
  account_holder_name text NOT NULL, -- Name on the account
  is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false, -- One primary account per type
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security (RLS) for the payment_accounts table
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

-- Policy for admins: can manage all payment accounts
CREATE POLICY "Admins can manage all payment accounts."
  ON public.payment_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for cashiers: can view payment accounts
CREATE POLICY "Cashiers can view payment accounts."
  ON public.payment_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'cashier')
    )
  );

-- Add indexes for faster lookups
CREATE INDEX ON public.payment_accounts (account_type);
CREATE INDEX ON public.payment_accounts (is_active);
CREATE INDEX ON public.payment_accounts (is_primary);

-- Insert default GCash account from current config
INSERT INTO public.payment_accounts (
  account_type, 
  account_name, 
  account_number, 
  account_holder_name, 
  is_active, 
  is_primary
) VALUES (
  'gcash',
  'Primary GCash Account',
  '+63 915 642 9591',
  'Your Business Name',
  true,
  true
);