-- 003: rename measurements → hospital_measurements, add visit_id
BEGIN;

-- Step A: add visit_id column (nullable first)
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES visits(id) ON DELETE CASCADE;

-- Step B: create one dummy visit per (child_id, measured_date), backfill visit_id
WITH grouped AS (
  SELECT DISTINCT child_id, measured_date FROM measurements WHERE visit_id IS NULL
),
inserted AS (
  INSERT INTO visits (child_id, visit_date, chief_complaint)
  SELECT child_id, measured_date, '(legacy migration)'
  FROM grouped
  RETURNING id, child_id, visit_date
)
UPDATE measurements m
   SET visit_id = i.id
  FROM inserted i
 WHERE m.child_id = i.child_id AND m.measured_date = i.visit_date AND m.visit_id IS NULL;

-- Step C: enforce NOT NULL
ALTER TABLE measurements ALTER COLUMN visit_id SET NOT NULL;

-- Step D: rename table
ALTER TABLE measurements RENAME TO hospital_measurements;

-- Step E: rename indexes to match new table
ALTER INDEX IF EXISTS measurements_pkey RENAME TO hospital_measurements_pkey;
-- (other indexes: leave unchanged; they auto-follow the table)

COMMIT;
