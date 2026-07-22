-- 070_treatment_cases.sql — 치료사례 환자용 케이스 DB (라이브 임상 데이터와 분리).
--   snapshot(비식별 케이스, gen 소유) + excluded_dates(관리자 편집: 제외한 뼈나이 회차 측정일, admin 소유).
--   두 컬럼 소유 분리 → gen 재시드가 관리자 편집을 덮지 않는다(gen 은 snapshot 만, 편집은 excluded_dates 만 write).
--   PHI(chart_number·측정일)라 RLS 로 anon/authenticated 전면 차단 — gen 시드·관리자 편집 전부 service_role.
--   환자용 페이지는 추후 비식별 RPC 로 snapshot 만 읽는다. Dashboard(txirmof) 수동 적용.
create table if not exists treatment_cases (
  chart_number    text primary key,
  snapshot        jsonb,
  excluded_dates  jsonb not null default '[]'::jsonb,
  updated_at      timestamptz default now()
);
alter table treatment_cases enable row level security;
-- 정책을 만들지 않음 = anon/authenticated 전면 차단. service_role 키만 RLS 우회 접근.
