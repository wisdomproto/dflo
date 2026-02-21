-- ================================================
-- meal-photos Storage Bucket 생성
-- Supabase Dashboard → SQL Editor 에서 실행
-- ================================================

-- 1. 버킷 생성 (public, 10MB 제한, 이미지만 허용)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meal-photos',
  'meal-photos',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 누구나 읽기 가능 (public bucket)
CREATE POLICY "Public read meal-photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'meal-photos');

-- 3. 누구나 업로드 가능 (custom auth 사용, Supabase Auth 없음)
CREATE POLICY "Public upload meal-photos" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'meal-photos');

-- 4. 누구나 삭제 가능
CREATE POLICY "Public delete meal-photos" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'meal-photos');
