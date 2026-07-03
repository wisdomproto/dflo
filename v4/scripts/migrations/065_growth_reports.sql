-- 065: growth_reports — 설문까지 진행한 고관심 방문자 1행(측정+설문).
-- anonymous_predictions(측정=전원)와 상보. Phase 2 계정 연결 앵커 + 마케팅 인사이트.
-- 실명·연락처 없음(PHI 아님). anon INSERT만 — 조회는 어드민(anon SELECT 정책 추가 시).
create table if not exists public.growth_reports (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  lang         text not null default 'ko',
  measurement  jsonb not null,   -- { age, gender, currentHeight, predicted, percentile, standard, fatherHeight?, motherHeight? }
  survey       jsonb not null,   -- IntakeForm 전체
  utm          jsonb,            -- { utm_source, utm_medium, utm_campaign, utm_content, referrer }
  account_id   uuid              -- Phase 2 (nullable)
);
alter table public.growth_reports enable row level security;

drop policy if exists growth_reports_anon_insert on public.growth_reports;
create policy growth_reports_anon_insert
  on public.growth_reports for insert to anon with check (true);

create index if not exists growth_reports_created_at_idx on public.growth_reports (created_at desc);
