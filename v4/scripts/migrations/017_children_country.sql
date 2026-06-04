-- ============================================================
-- 017: children.country
-- 환자 국적(범용). 005 의 nationality(KR/CN — 성장곡선 표준 전용)와는 별개.
-- 환자 분류·필터·통계용 일반 국적 속성. ISO 3166-1 alpha-2 코드 + 'OTHER'.
-- 미입력(NULL) 허용 — 기존 환자는 어드민이 직접 채운다(기본값 강제 안 함).
-- 기본 정보 탭의 환자 정보 섹션에서 선택.
-- ============================================================

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS country TEXT;

SELECT 'children.country added' AS status;
