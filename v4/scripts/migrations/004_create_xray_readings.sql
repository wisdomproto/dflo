-- 004: xray_readings
CREATE TABLE IF NOT EXISTS xray_readings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id              uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id              uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  xray_date             date NOT NULL,
  image_path            text,
  bone_age_result       numeric(4,2),
  atlas_match_younger   text,
  atlas_match_older     text,
  doctor_memo           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xray_visit ON xray_readings(visit_id);
CREATE INDEX IF NOT EXISTS idx_xray_child_date ON xray_readings(child_id, xray_date DESC);
