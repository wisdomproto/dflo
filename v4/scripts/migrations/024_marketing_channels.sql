-- 024_marketing_channels.sql
-- 마케팅 채널 분석: 운영 채널(Instagram/YouTube/Threads/네이버블로그 등) 레지스트리.
-- 핸들·URL·팔로워 스냅샷을 수동 관리. Supabase Dashboard SQL Editor에서 1회 적용.
create extension if not exists pgcrypto;
create table if not exists marketing_channels (
  id                   uuid primary key default gen_random_uuid(),
  platform             text not null, -- instagram|youtube|threads|facebook|naver_blog|tiktok|website
  name                 text not null,
  handle               text,
  url                  text,
  followers            int default 0,
  follower_snapshot_at timestamptz,
  locale               text default 'ko',
  note                 text,
  sort_order           int default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
alter table marketing_channels enable row level security;
drop policy if exists marketing_channels_all on marketing_channels;
create policy marketing_channels_all on marketing_channels
  for all to anon, authenticated using (true) with check (true);
