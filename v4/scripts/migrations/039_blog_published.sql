-- 039_blog_published.sql
-- 자체 사이트 블로그 발행본: (article, language)당 1행. 정적 빌드(build-i18n)와
-- 동적 미리보기 공용 소스. 본문 html_body는 기본글 번역 본문(TipTap HTML).
-- Supabase Dashboard에서 1회 적용.
create extension if not exists pgcrypto;
create table if not exists blog_published (
  id               uuid primary key default gen_random_uuid(),
  article_id       uuid references marketing_articles(id) on delete cascade,
  language         text not null,
  slug             text not null,
  seo_title        text not null default '',
  meta_description text not null default '',
  html_body        text not null default '',
  status           text not null default 'draft',  -- draft|published
  published_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (article_id, language)
);
create index if not exists blog_published_lang_status_idx on blog_published (language, status);
alter table blog_published enable row level security;
drop policy if exists blog_published_all on blog_published;
create policy blog_published_all on blog_published
  for all to anon, authenticated using (true) with check (true);
