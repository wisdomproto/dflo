-- 007: RLS for new hospital tables + medications
-- Assumes users.role ∈ ('parent','admin'), and auth.uid() returns users.id
-- IMPORTANT: v4 uses legacy auth (users table, not Supabase auth). RLS here
-- assumes service_role bypasses for admin pages, and parent-side reads use
-- Supabase auth once wired. For now, policies are permissive for authenticated
-- role; tighten in a follow-up.

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xray_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Service role (admin pages) full access
CREATE POLICY "service_role_all_visits" ON visits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_hm" ON hospital_measurements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_xray" ON xray_readings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_lab" ON lab_tests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_med" ON medications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_rx" ON prescriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated anon reads (temporary permissive; follow-up will tighten to
-- parent-of-child via a users lookup)
CREATE POLICY "auth_read_visits" ON visits FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth_read_hm" ON hospital_measurements FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth_read_xray" ON xray_readings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth_read_lab" ON lab_tests FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth_read_rx" ON prescriptions FOR SELECT TO authenticated, anon USING (true);
-- medications: admin-only (no public read)
