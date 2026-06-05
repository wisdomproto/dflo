-- 032_marketing_cardnews_channel.sql — 카드뉴스(인스타그램) 채널 콘텐츠.
-- Supabase Dashboard SQL Editor에서 1회 적용 (project: txirmofdvuljkrjkpzdg).
create table if not exists marketing_cardnews (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references marketing_articles(id) on delete cascade,
  caption     text default '',
  hashtags    text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create table if not exists marketing_cardnews_slides (
  id           uuid primary key default gen_random_uuid(),
  cardnews_id  uuid not null references marketing_cardnews(id) on delete cascade,
  canvas       jsonb default '{}'::jsonb,
  image_prompt text default '',
  sort_order   integer default 0
);
create index if not exists idx_cardnews_content on marketing_cardnews(content_id);
create index if not exists idx_cardnews_slides_parent on marketing_cardnews_slides(cardnews_id);
alter table marketing_cardnews enable row level security;
alter table marketing_cardnews_slides enable row level security;
drop policy if exists mcn_all on marketing_cardnews;
create policy mcn_all on marketing_cardnews for all to anon, authenticated using (true) with check (true);
drop policy if exists mcns_all on marketing_cardnews_slides;
create policy mcns_all on marketing_cardnews_slides for all to anon, authenticated using (true) with check (true);
