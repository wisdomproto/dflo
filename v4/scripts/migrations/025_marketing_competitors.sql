-- 025_marketing_competitors.sql
-- 마케팅 경쟁사: 경쟁사 레지스트리(이름·URL·구분·메모) + 마지막 AI 갭/강점 분석 스냅샷(analysis jsonb).
-- Supabase Dashboard SQL Editor에서 1회 수동 적용.
create extension if not exists pgcrypto;
create table if not exists marketing_competitors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  url         text,
  kind        text default 'direct',
  memo        text,
  analysis    jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table marketing_competitors enable row level security;
drop policy if exists marketing_competitors_all on marketing_competitors;
create policy marketing_competitors_all on marketing_competitors
  for all to anon, authenticated using (true) with check (true);
