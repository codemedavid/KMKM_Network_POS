-- Remove existing duplicate receipts from the database
-- This script keeps the most recent receipt for each reference number
-- and removes older duplicates

-- First, let's see what duplicates exist (for information only)
WITH duplicate_info AS (
  SELECT 
    reference_number,
    COUNT(*) as duplicate_count,
    MIN(saved_at) as oldest_saved_at,
    MAX(saved_at) as newest_saved_at
  FROM public.receipts 
  GROUP BY reference_number 
  HAVING COUNT(*) > 1
)
SELECT 
  reference_number,
  duplicate_count,
  oldest_saved_at,
  newest_saved_at
FROM duplicate_info
ORDER BY duplicate_count DESC, reference_number;

-- Now remove the duplicates, keeping only the most recent receipt for each reference number
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

-- Verify the cleanup by checking for any remaining duplicates
SELECT 
  reference_number,
  COUNT(*) as remaining_count
FROM public.receipts 
GROUP BY reference_number 
HAVING COUNT(*) > 1
ORDER BY remaining_count DESC;

-- Show summary of what was cleaned up
SELECT 
  'Cleanup Summary' as info,
  COUNT(*) as total_receipts_after_cleanup
FROM public.receipts;
