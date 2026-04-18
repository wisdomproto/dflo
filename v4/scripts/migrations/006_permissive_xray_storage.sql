-- ============================================================
-- 006: Permissive write policies for xray-images storage bucket
-- Reason: v4 admin pages call Supabase with the anon key. The default
-- `auth_write_xray` policy only allows `authenticated` role, so anon
-- uploads trigger `new row violates row-level security policy`.
-- Mirror 001's approach for the table layer: allow anon + authenticated
-- full CRUD on this bucket. Tighten once admin auth migration lands.
-- ============================================================

CREATE POLICY "perm_read_xray_storage"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'xray-images');

CREATE POLICY "perm_write_xray_storage"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'xray-images');

CREATE POLICY "perm_update_xray_storage"
  ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (bucket_id = 'xray-images')
  WITH CHECK (bucket_id = 'xray-images');

CREATE POLICY "perm_delete_xray_storage"
  ON storage.objects FOR DELETE
  TO authenticated, anon
  USING (bucket_id = 'xray-images');

SELECT 'xray-images storage policies opened' AS status;
