-- 057_reels_editor.sql — 릴스 라이트 에디터
-- 스펙: docs/superpowers/specs/2026-06-12-reels-lite-editor-design.md
-- 소유권: reel_script = 웹 전용 기록 / reel_runtime = 워커 전용 기록 (동시 기록 race 차단)

alter table public.marketing_articles
  add column if not exists reel_script jsonb,
  add column if not exists reel_runtime jsonb;

-- 잡 큐
create table if not exists public.marketing_reel_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.marketing_articles(id) on delete cascade,
  slug text not null,
  lang text not null check (lang in ('ko','th','vi','en','cn','ch')),
  kind text not null check (kind in ('render','full')),
  status text not null default 'queued'
    check (status in ('queued','claimed','tts','lipsync','upload_preview','render','upload','done','failed')),
  progress_note text,
  error text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),  -- 워커 heartbeat: stale 회수 판정 기준
  claimed_by text
);
create index if not exists idx_reel_jobs_status on public.marketing_reel_jobs(status);
create index if not exists idx_reel_jobs_article on public.marketing_reel_jobs(article_id, requested_at desc);

-- 워커 생존 신호 싱글톤 (웹 "워커 꺼짐" 배너용)
create table if not exists public.marketing_reel_worker (
  id int primary key check (id = 1),
  hostname text,
  last_seen timestamptz
);

-- 스티커 라이브러리 (P4) — 효과(pop/float/pulse/shake)는 코드 프리셋이라 테이블 없음
create table if not exists public.marketing_reel_stickers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('sticker','emoji')),
  url text not null,
  kind text not null check (kind in ('image','gif')),
  meta jsonb,
  created_at timestamptz not null default now()
);

-- RLS: 기존 마케팅 테이블 패턴(anon 전면 허용 — dev 운영). create policy 는 if not exists 미지원 → drop 선행(재실행 안전)
alter table public.marketing_reel_jobs enable row level security;
alter table public.marketing_reel_worker enable row level security;
alter table public.marketing_reel_stickers enable row level security;
drop policy if exists "reel_jobs_all" on public.marketing_reel_jobs;
drop policy if exists "reel_worker_all" on public.marketing_reel_worker;
drop policy if exists "reel_stickers_all" on public.marketing_reel_stickers;
create policy "reel_jobs_all" on public.marketing_reel_jobs for all using (true) with check (true);
create policy "reel_worker_all" on public.marketing_reel_worker for all using (true) with check (true);
create policy "reel_stickers_all" on public.marketing_reel_stickers for all using (true) with check (true);
