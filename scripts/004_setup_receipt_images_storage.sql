-- Create a storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt_images', 'receipt_images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the storage bucket
-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipt_images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own images
CREATE POLICY "Allow authenticated reads" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipt_images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE USING (
  bucket_id = 'receipt_images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all images (optional, but useful for dashboard)
CREATE POLICY "Allow admin reads" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipt_images' AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Allow admins to delete any image (optional)
CREATE POLICY "Allow admin deletes" ON storage.objects FOR DELETE USING (
  bucket_id = 'receipt_images' AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
