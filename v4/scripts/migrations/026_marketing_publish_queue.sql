-- 026_marketing_publish_queue.sql
-- 마케팅 발행: marketing_articles 글을 채널별 발행 큐에 올려 상태/예약을 관리.
-- 한 글이 채널당 1행. status: draft|scheduled|publishing|published|failed (CHECK 없이 text, dflo 컨벤션).
-- Supabase Dashboard SQL Editor에서 1회 수동 적용.
create extension if not exists pgcrypto;
create table if not exists marketing_publish_queue (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid references marketing_articles(id) on delete cascade,
  channel       text not null,
  language      text default 'ko',
  scheduled_at  timestamptz,
  status        text not null default 'draft',
  published_url text,
  published_at  timestamptz,
  note          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists marketing_publish_queue_status_idx on marketing_publish_queue (status);
create index if not exists marketing_publish_queue_scheduled_at_idx on marketing_publish_queue (scheduled_at);
alter table marketing_publish_queue enable row level security;
drop policy if exists marketing_publish_queue_all on marketing_publish_queue;
create policy marketing_publish_queue_all on marketing_publish_queue
  for all to anon, authenticated using (true) with check (true);
