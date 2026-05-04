-- ================================================
-- 014: children.treatment_status
-- 환자를 두 단계로 분류 (의사 수동 토글)
--   'consultation' (default) — 초진/상담만 한 환자, 진료 시작 유도 대상
--   'treatment'              — 실제 진료 중인 환자
-- 향후 'completed' 같은 단계 추가 가능하므로 enum 대신 text 사용.
-- ================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS treatment_status text
    NOT NULL DEFAULT 'consultation'
    CHECK (treatment_status IN ('consultation', 'treatment'));

-- 이미 진료 기록(is_intake=false)이 1건 이상 있는 환자는 자동 'treatment' 로 백필.
UPDATE children c
SET treatment_status = 'treatment'
WHERE EXISTS (
  SELECT 1 FROM visits v
  WHERE v.child_id = c.id
    AND (v.is_intake IS NULL OR v.is_intake = FALSE)
);

-- 인덱스 (필터링 성능)
CREATE INDEX IF NOT EXISTS idx_children_treatment_status
  ON children (treatment_status);
