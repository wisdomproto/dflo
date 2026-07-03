-- 066: growth_reports 토큰 조회 RPC (영구 리포트 링크 /report/r/{id} 용).
-- 065 는 anon INSERT-only(전체 SELECT 차단). 링크 소유자만 자기 리포트를 보게 하려고
-- security definer 함수로 id 일치 1건만 반환 — anon 이 테이블 전체를 스캔하지 못함(열거 불가).
create or replace function public.get_growth_report(p_id uuid)
returns table (
  id          uuid,
  created_at  timestamptz,
  lang        text,
  measurement jsonb,
  survey      jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select id, created_at, lang, measurement, survey
  from public.growth_reports
  where id = p_id;
$$;

grant execute on function public.get_growth_report(uuid) to anon;
