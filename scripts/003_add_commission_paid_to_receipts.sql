
-- Add is_commission_paid column to receipts table
ALTER TABLE public.receipts
ADD COLUMN is_commission_paid BOOLEAN DEFAULT FALSE;

-- Optional: Add an index for faster queries on agent_id and is_commission_paid
