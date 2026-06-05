-- 031_marketing_blog_channel.sql — N블로그/WordPress 채널 콘텐츠.
-- Supabase Dashboard SQL Editor에서 1회 적용 (project: txirmofdvuljkrjkpzdg).
create table if not exists marketing_blog_contents (
  id            uuid primary key default gen_random_uuid(),
  content_id    uuid not null references marketing_articles(id) on delete cascade,
  channel       text not null default 'naver_blog',
  seo_title     text default '',
  seo_score     integer default 0,
  global_style  jsonb default '{}'::jsonb,
  primary_keyword    text default '',
  secondary_keywords text[] default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create table if not exists marketing_blog_cards (
  id              uuid primary key default gen_random_uuid(),
  blog_content_id uuid not null references marketing_blog_contents(id) on delete cascade,
  card_type       text not null default 'text',
  content         jsonb default '{}'::jsonb,
  sort_order      integer default 0
);
create index if not exists idx_blog_contents_content on marketing_blog_contents(content_id);
create index if not exists idx_blog_cards_parent on marketing_blog_cards(blog_content_id);
alter table marketing_blog_contents enable row level security;
alter table marketing_blog_cards enable row level security;
drop policy if exists mbc_all on marketing_blog_contents;
create policy mbc_all on marketing_blog_contents for all to anon, authenticated using (true) with check (true);
drop policy if exists mbcd_all on marketing_blog_cards;
create policy mbcd_all on marketing_blog_cards for all to anon, authenticated using (true) with check (true);
