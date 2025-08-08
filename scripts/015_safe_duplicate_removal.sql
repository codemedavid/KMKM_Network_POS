-- SAFE DUPLICATE REMOVAL SCRIPT
-- Run this step by step in your Supabase SQL Editor

-- STEP 1: First, let's see what duplicates exist
-- Run this first to see what duplicates you have
WITH duplicate_info AS (
  SELECT 
    reference_number,
    COUNT(*) as duplicate_count,
    MIN(saved_at) as oldest_saved_at,
    MAX(saved_at) as newest_saved_at,
    STRING_AGG(id::text, ', ' ORDER BY saved_at) as receipt_ids
  FROM public.receipts 
  GROUP BY reference_number 
  HAVING COUNT(*) > 1
)
SELECT 
  reference_number,
  duplicate_count,
  oldest_saved_at,
  newest_saved_at,
  receipt_ids
FROM duplicate_info
ORDER BY duplicate_count DESC, reference_number;

-- STEP 2: Create a backup table (optional but recommended)
-- Uncomment the next line if you want to create a backup
-- CREATE TABLE receipts_backup AS SELECT * FROM receipts;

-- STEP 3: Remove duplicates (keeping the most recent)
-- Only run this after reviewing the duplicates from STEP 1
WITH duplicates AS (
  SELECT reference_number, 
         COUNT(*) as count,
         MAX(saved_at) as latest_saved_at
  FROM public.receipts 
  GROUP BY reference_number 
  HAVING COUNT(*) > 1
),
duplicates_to_delete AS (
  SELECT r.id, r.reference_number, r.saved_at
  FROM public.receipts r
  INNER JOIN duplicates d ON r.reference_number = d.reference_number
  WHERE r.saved_at < d.latest_saved_at
)
DELETE FROM public.receipts 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- STEP 4: Verify no duplicates remain
SELECT 
  reference_number,
  COUNT(*) as remaining_count
FROM public.receipts 
GROUP BY reference_number 
HAVING COUNT(*) > 1
ORDER BY remaining_count DESC;

-- STEP 5: Show final summary
SELECT 
  'Final Summary' as info,
  COUNT(*) as total_receipts,
  COUNT(DISTINCT reference_number) as unique_reference_numbers
FROM public.receipts;
