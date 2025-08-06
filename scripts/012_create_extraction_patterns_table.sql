-- Create a table for storing custom OCR extraction patterns
CREATE TABLE public.extraction_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name text NOT NULL, -- Human-readable name (e.g., "GCash Standard", "BPI Receipt Format")
  account_type text NOT NULL, -- 'gcash', 'bank', 'paymaya', etc.
  provider_name text, -- Optional: specific provider (e.g., "BPI", "BDO", "Metrobank")
  
  -- Extraction patterns (regex)
  amount_pattern text NOT NULL,
  reference_pattern text NOT NULL,
  date_pattern text NOT NULL,
  sender_pattern text,
  receiver_pattern text,
  phone_pattern text,
  
  -- Additional patterns for different account types
  account_number_pattern text, -- For bank transfers
  bank_name_pattern text, -- For identifying bank name
  
  -- Pattern metadata
  description text, -- Description of when to use this pattern
  is_active boolean DEFAULT true,
  priority integer DEFAULT 100, -- Lower number = higher priority when multiple patterns match
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security (RLS) for the extraction_patterns table
ALTER TABLE public.extraction_patterns ENABLE ROW LEVEL SECURITY;

-- Policy for admins: can manage all extraction patterns
CREATE POLICY "Admins can manage all extraction patterns."
  ON public.extraction_patterns FOR ALL
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

-- Policy for cashiers: can view extraction patterns
CREATE POLICY "Cashiers can view extraction patterns."
  ON public.extraction_patterns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'cashier')
    )
  );

-- Add indexes for faster lookups
CREATE INDEX ON public.extraction_patterns (account_type);
CREATE INDEX ON public.extraction_patterns (is_active);
CREATE INDEX ON public.extraction_patterns (priority);

-- Insert default patterns from current config
INSERT INTO public.extraction_patterns (
  pattern_name,
  account_type,
  provider_name,
  amount_pattern,
  reference_pattern,
  date_pattern,
  sender_pattern,
  receiver_pattern,
  phone_pattern,
  description,
  priority
) VALUES 
(
  'GCash Standard Format',
  'gcash',
  'GCash',
  '(?:Amount|Total Amount Sent)\\s*[£₱]?\\s*([0-9,]+\\.?[0-9]*)',
  '(?:Ref No\\.|Reference|Transaction)\\s*([0-9]+)',
  '([A-Za-z]{3}\\s+[0-9]{1,2},\\s+[0-9]{4}\\s+[0-9]{1,2}:[0-9]{2}\\s*[AP]M)',
  '(?:From|Sender|Sent by)[:\\s]*([A-Za-z\\s]+)',
  '(?:To|Receiver|Received by)[:\\s]*([A-Za-z\\s]+)',
  '(\\+63\\s*[0-9]{3}\\s*[0-9]{3}\\s*[0-9]{4}|09[0-9]{9})',
  'Standard GCash receipt format for mobile money transfers',
  10
),
(
  'Bank Transfer Format',
  'bank',
  null,
  '(?:Amount|Transfer Amount)\\s*[£₱]?\\s*([0-9,]+\\.?[0-9]*)',
  '(?:Reference|Transaction ID|Transfer ID)\\s*[#:]?\\s*([A-Z0-9]+)',
  '([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}\\s*[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\\s*[AP]M)?)',
  '(?:From Account|Sender)[:\\s]*([A-Za-z\\s]+)',
  '(?:To Account|Beneficiary)[:\\s]*([A-Za-z\\s]+)',
  null,
  'Generic bank transfer receipt format',
  20
),
(
  'PayMaya Format',
  'paymaya',
  'PayMaya',
  '(?:Amount|Total)\\s*[£₱]?\\s*([0-9,]+\\.?[0-9]*)',
  '(?:Reference|Transaction)\\s*([0-9A-Z]+)',
  '([A-Za-z]{3}\\s+[0-9]{1,2},\\s+[0-9]{4}\\s+[0-9]{1,2}:[0-9]{2}\\s*[AP]M)',
  '(?:From|Sender)[:\\s]*([A-Za-z\\s]+)',
  '(?:To|Receiver)[:\\s]*([A-Za-z\\s]+)',
  '(\\+63\\s*[0-9]{3}\\s*[0-9]{3}\\s*[0-9]{4}|09[0-9]{9})',
  'PayMaya digital wallet receipt format',
  15
);