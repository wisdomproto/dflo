-- 017_marketing_articles.sql
-- 마케팅 SP3a: 생성·편집된 블로그 글 저장. Supabase Dashboard SQL Editor에서 1회 적용.
create table if not exists marketing_articles (
  id          uuid primary key default gen_random_uuid(),
  topic_id    text,
  title       text not null default '',
  body        text not null default '',
  category    text,
  keywords    text[] default '{}',
  language    text default 'ko',
  status      text default 'draft',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table marketing_articles enable row level security;
drop policy if exists marketing_articles_all on marketing_articles;
create policy marketing_articles_all on marketing_articles
  for all to anon, authenticated using (true) with check (true);
