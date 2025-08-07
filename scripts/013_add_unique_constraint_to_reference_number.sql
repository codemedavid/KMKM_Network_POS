-- Add unique constraint to reference_number to prevent duplicate receipts
-- This ensures that each reference number can only be used once

-- First, let's check if there are any existing duplicates and handle them
-- We'll keep the most recent receipt for each reference number
WITH duplicates AS (
  SELECT reference_number, 
         COUNT(*) as count,
         MAX(saved_at) as latest_saved_at
  FROM public.receipts 
  GROUP BY reference_number 
  HAVING COUNT(*) > 1
),
duplicates_to_delete AS (
  SELECT r.id
  FROM public.receipts r
  INNER JOIN duplicates d ON r.reference_number = d.reference_number
  WHERE r.saved_at < d.latest_saved_at
)
DELETE FROM public.receipts 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Now add the unique constraint
ALTER TABLE public.receipts 
ADD CONSTRAINT receipts_reference_number_unique 
UNIQUE (reference_number);

-- Add an index for faster lookups by reference number
CREATE INDEX IF NOT EXISTS idx_receipts_reference_number 
ON public.receipts (reference_number);

-- Add a comment to document the constraint
COMMENT ON CONSTRAINT receipts_reference_number_unique ON public.receipts 
IS 'Ensures each reference number is unique to prevent duplicate receipts';
