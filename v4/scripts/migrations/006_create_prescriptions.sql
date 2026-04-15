-- 006: prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id        uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  medication_id   uuid NOT NULL REFERENCES medications(id),
  dose            text,
  frequency       text,
  duration_days   integer,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rx_visit ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_rx_child ON prescriptions(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rx_medication ON prescriptions(medication_id);
