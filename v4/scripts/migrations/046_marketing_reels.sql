-- 046: per-language reels (video) on marketing_articles.
-- Mirrors the blog JSONB (045). Non-destructive — base 글(title/body)·translations·blog 안 건드림.
-- Shape: { "<lang>": { "videoUrl": string|null } }
--   캡션·해시태그는 카드뉴스(marketing_cardnews) 공용 — 여기 저장 안 함.
--   lang ∈ ko/th/vi/en/ch (위 언어 셀렉터와 동일 집합)
-- ⚠️ txirmof(MCP 권한 차단)는 Supabase Dashboard SQL editor 에서 수동 적용.
alter table marketing_articles add column if not exists reels jsonb default '{}'::jsonb;
