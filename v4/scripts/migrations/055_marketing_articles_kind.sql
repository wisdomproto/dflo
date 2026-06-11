-- 055: 콘텐츠 스튜디오 정규/커스텀 구분.
-- 커스텀 콘텐츠 = 62개 토픽 체계 밖의 ad-hoc 릴스(영상+썸네일+캡션, reels JSONB 재사용).
-- 발행 큐·실행기·현황이 전부 marketing_articles 기준이라 별도 테이블 대신 kind 컬럼.
ALTER TABLE marketing_articles
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'regular'
  CHECK (kind IN ('regular', 'custom'));

COMMENT ON COLUMN marketing_articles.kind IS
  'regular = 62개 토픽 정규 콘텐츠 / custom = ad-hoc 릴스(커스텀 콘텐츠 섹션)';
