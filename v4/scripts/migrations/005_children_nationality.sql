-- ============================================================
-- 005: children.nationality
-- KR(기본) 또는 CN — 국적별 성장 표준 곡선 전환에 사용.
-- 기본 정보 탭의 환자 정보 섹션에서 선택.
-- ============================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS nationality TEXT NOT NULL DEFAULT 'KR';

SELECT 'children.nationality added' AS status;
