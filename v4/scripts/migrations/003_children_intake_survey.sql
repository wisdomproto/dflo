-- ============================================================
-- 003: children intake survey columns
-- Admin 기본 정보 탭에서 입력하는 초진 설문 데이터.
-- - grade, class_height_rank: 자주 조회되는 설문 항목을 1급 컬럼으로
-- - intake_survey: 나머지 16문항을 JSONB로 저장 (Q1~Q3/Q7/Q8/Q11은
--   기존 children 컬럼 재사용, Q17은 lab_tests로 분리되어 미저장)
-- ============================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS class_height_rank TEXT,
  ADD COLUMN IF NOT EXISTS intake_survey JSONB;

SELECT 'children.grade / class_height_rank / intake_survey added' AS status;
