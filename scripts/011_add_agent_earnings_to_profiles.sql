-- Add total_commission_earned and total_tips_collected columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN total_commission_earned NUMERIC(10, 2) DEFAULT 0 NOT NULL,
ADD COLUMN total_tips_collected NUMERIC(10, 2) DEFAULT 0 NOT NULL;

-- Optional: Add indexes for these new columns if they will be frequently queried
CREATE INDEX IF NOT EXISTS idx_profiles_total_commission_earned ON public.profiles (total_commission_earned);
CREATE INDEX IF NOT EXISTS idx_profiles_total_tips_collected ON public.profiles (total_tips_collected);
