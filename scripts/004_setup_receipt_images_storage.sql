-- Create the storage bucket if it doesn't exist
-- Set 'public' to true if you want images to be directly accessible via their public URL.
-- If 'public' is false, you would need to generate signed URLs to access them.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-images', 'receipt-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on the storage objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for INSERT: Allow authenticated users to upload to their own folder
-- This policy ensures that a user can only upload files into a path that starts with their user ID,
-- AND that the owner of the object is the authenticated user.
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipt-images' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    owner = auth.uid()
  );

-- Policy for SELECT: Allow authenticated users to view all images in the 'receipt-images' bucket.
-- You might want to restrict this further (e.g., only admins can view all, cashiers only their own)
-- but for simplicity in this demo, all authenticated users can view all images.
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
CREATE POLICY "Allow authenticated reads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipt-images');
