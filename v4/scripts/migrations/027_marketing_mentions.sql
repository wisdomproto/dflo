-- 027_marketing_mentions.sql
-- 마케팅 모니터링: 마케터가 외부에서 발견한 브랜드 멘션(지식인/블로그/인스타/유튜브/카페 등)을
-- 출처·URL·본문·감성으로 수동 기록 + AI 답글 초안 보관. Supabase Dashboard SQL Editor에서 1회 적용.
create extension if not exists pgcrypto;

create table if not exists marketing_mentions (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null,
  url          text,
  author       text,
  title        text,
  body         text,
  sentiment    text not null default 'neutral', -- positive | neutral | negative
  language     text default 'ko',
  status       text not null default 'new',     -- new | replied | ignored
  reply_draft  text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- dflo 관례(018과 동일): RLS on + anon/authenticated 전체 허용 정책.
alter table marketing_mentions enable row level security;
drop policy if exists marketing_mentions_all on marketing_mentions;
create policy marketing_mentions_all on marketing_mentions
  for all to anon, authenticated using (true) with check (true);

create index if not exists marketing_mentions_created_idx
  on marketing_mentions (created_at desc);
