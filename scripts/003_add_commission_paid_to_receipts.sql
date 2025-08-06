-- Add commission_paid column to track payout status of agent commissions
ALTER TABLE public.receipts
ADD COLUMN commission_paid boolean DEFAULT false;

-- Index to optimize queries filtering by agent and payout status
CREATE INDEX IF NOT EXISTS receipts_agent_paid_idx ON public.receipts (agent_id, commission_paid);
