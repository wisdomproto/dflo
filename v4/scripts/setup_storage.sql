-- ================================================
-- Supabase Storage 버킷 설정
-- Supabase Dashboard → SQL Editor 에서 실행
-- ================================================

-- 1. content-images 버킷 생성 (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-images',
  'content-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 누구나 읽기 가능 (public bucket)
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'content-images');

-- 3. 인증된 사용자만 업로드/수정/삭제 가능
CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'content-images');

CREATE POLICY "Authenticated update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'content-images');

CREATE POLICY "Authenticated delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'content-images');
