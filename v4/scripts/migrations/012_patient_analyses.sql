-- Migration 012 — patient_analyses
--
-- Cached AI narrative analysis for each patient, generated from the full
-- clinical picture (intake, visits, measurements, labs, prescriptions).
-- `data` holds the structured output; we regenerate on demand.

CREATE TABLE IF NOT EXISTS patient_analyses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      uuid NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
  data          jsonb NOT NULL,
  model         text,
  generated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_analyses_child ON patient_analyses(child_id);

ALTER TABLE patient_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perm_read_patient_analyses"  ON patient_analyses FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_write_patient_analyses" ON patient_analyses FOR ALL    TO authenticated, anon USING (true) WITH CHECK (true);

SELECT 'patient_analyses created' AS status;
