-- 049_blog_references.sql — 블로그 근거 논문 인용 (아티클 단위 스냅샷). Dashboard(txirmof) 수동 적용.
-- marketing_articles RLS 는 기존 정책(anon/authenticated all)으로 충분 — 신규 정책 불필요.
alter table marketing_articles
  add column if not exists blog_references jsonb not null default '[]'::jsonb;
