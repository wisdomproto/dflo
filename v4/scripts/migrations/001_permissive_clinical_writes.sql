-- ============================================================
-- 001: Permissive write policies for clinical tables
-- Reason: v4 admin pages currently call Supabase with the anon key (no
-- service_role proxy). Until admin moves to Supabase Auth (follow-up),
-- we mirror the lifestyle-tables policy: permissive ALL for anon/auth.
-- Tighten back to admin-only once auth migration lands.
-- ============================================================

CREATE POLICY "perm_write_visits"                ON visits                FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_hospital_measurements" ON hospital_measurements FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_xray_readings"         ON xray_readings         FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_lab_tests"             ON lab_tests             FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_prescriptions"         ON prescriptions         FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_medications"           ON medications           FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Also allow anon/auth reads for medications (previously admin-only)
CREATE POLICY "perm_read_medications" ON medications FOR SELECT TO authenticated, anon USING (true);

SELECT 'clinical-write policies applied' AS status;
