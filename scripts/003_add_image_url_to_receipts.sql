-- Add a column for the image URL to the receipts table
ALTER TABLE public.receipts
ADD COLUMN image_url text;

-- Optional: Add a policy to allow agents to update their own receipts to add an image URL
-- This might be useful if you want to allow adding images after initial data entry.
-- For this specific request, the image is added during initial insert, so this is less critical.
CREATE POLICY "Agents can update their own receipt image URLs."
  ON public.receipts FOR UPDATE
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);
