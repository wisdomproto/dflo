-- 005: lab_tests (single-table polymorphic via test_type + result_data JSONB)
CREATE TABLE IF NOT EXISTS lab_tests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id        uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  test_type       text NOT NULL CHECK (test_type IN ('allergy','organic_acid','blood')),
  collected_date  date,
  result_date     date,
  result_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  doctor_memo     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lab_visit ON lab_tests(visit_id);
CREATE INDEX IF NOT EXISTS idx_lab_child_type ON lab_tests(child_id, test_type, collected_date DESC);
