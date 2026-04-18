-- ============================================================
-- 002: children.desired_height
-- Used by admin patient detail chart as a target reference line.
-- Filled via the child-edit form (parent or admin).
-- ============================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS desired_height NUMERIC(5,2);

SELECT 'children.desired_height added' AS status;
