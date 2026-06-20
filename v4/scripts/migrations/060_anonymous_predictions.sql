-- 060_anonymous_predictions.sql
-- 홈페이지 익명 예측키 계산 결과를 익명 리드/사용 데이터로 적재.
-- 실환자 테이블(children / intake_submissions)과 분리한다. 이름은 가짜(랜덤 현지 이름),
-- 연락처 등 실 PII 수집 없음 → 익명 사용/시장 인텔리전스 용도.

create table if not exists public.anonymous_predictions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  display_name text,             -- 랜덤 현지 이름(가짜, 식별 아님)
  locale text,                   -- ko/th/vi/en (사용한 사이트 언어)
  country text,                  -- KR/TH/VN/EN (locale 기반 국적)
  gender text,                   -- male/female
  birth_date date,
  age_years numeric(4,2),        -- 측정 시점 만나이(소수)
  current_height numeric(5,2),   -- cm
  predicted_height numeric(5,2), -- cm (성인 예측키)
  percentile numeric(5,2),       -- 현재 키 백분위
  growth_standard text,          -- KR/TH (적용된 성장표준)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  session_id text                -- 페이지 로드당(재계산 묶기용)
);

create index if not exists idx_anonymous_predictions_created_at
  on public.anonymous_predictions (created_at desc);

alter table public.anonymous_predictions enable row level security;

-- 방문자(anon)는 INSERT 만 가능, SELECT 불가(타인 데이터 열람 차단).
-- 조회는 추후 service_role(ai-server / 어드민)로 한다.
drop policy if exists "anon insert anonymous_predictions" on public.anonymous_predictions;
create policy "anon insert anonymous_predictions"
  on public.anonymous_predictions
  for insert to anon, authenticated
  with check (true);
