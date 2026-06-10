-- 050_marketing_reel_assets.sql
-- 릴스 인포그래픽 이미지(언어공용) 저장용 JSONB 컬럼.
-- shape: { "infographics": { "ig1": "<r2-url>", "ig2": "...", ... } }
--  - 인포그래픽 이미지는 텍스트 없음(NO text) + 전 언어 공용 1장.
--  - 텍스트는 렌더(PresenterShort)가 insertLabels 로 언어별 오버레이.
-- txirmof Supabase 대시보드 SQL 에디터에서 수동 적용. 읽기는 graceful(?? {}).

ALTER TABLE marketing_articles
  ADD COLUMN IF NOT EXISTS reel_assets jsonb NOT NULL DEFAULT '{}'::jsonb;
