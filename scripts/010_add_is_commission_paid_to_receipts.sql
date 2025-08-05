-- Add is_commission_paid column to receipts table
ALTER TABLE public.receipts
ADD COLUMN is_commission_paid BOOLEAN DEFAULT FALSE;

-- Optional: Add an index for faster queries on agent_id and is_commission_paid
CREATE INDEX IF NOT EXISTS idx_receipts_agent_commission_paid ON public.receipts (agent_id, is_commission_paid);
