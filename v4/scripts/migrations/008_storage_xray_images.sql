-- 008: xray-images bucket (PRIVATE — not public like content-images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'xray-images',
  'xray-images',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Admin/authenticated users can upload
CREATE POLICY "xray_upload_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'xray-images');

-- Admin/authenticated users can read their signed URLs
CREATE POLICY "xray_read_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'xray-images');

-- Service role full access
CREATE POLICY "xray_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'xray-images') WITH CHECK (bucket_id = 'xray-images');
