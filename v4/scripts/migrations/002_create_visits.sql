-- 002: visits (hospital-data hub)
CREATE TABLE IF NOT EXISTS visits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id         uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  visit_date       date NOT NULL,
  doctor_id        uuid REFERENCES users(id),
  chief_complaint  text,
  plan             text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visits_child ON visits(child_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);
