-- 073_treatment_cases_order_hidden.sql — 치료사례 후보 목록 정렬/숨김(admin 소유).
--   sort_order: 사이드바 드래그앤드롭 순서(작을수록 위). null 이면 기존 점수순 뒤로.
--   hidden: 목록에서 제외("삭제") — 진료기록은 그대로 두고 이 큐레이션 DB 에서만 감춘다(비파괴).
--   excluded_dates·overrides·published 와 같은 admin 소유 컬럼 → gen 재시드(snapshot 만 write)가 보존.
alter table treatment_cases
  add column if not exists sort_order int,
  add column if not exists hidden     boolean not null default false;

create index if not exists treatment_cases_order_idx on treatment_cases (sort_order) where not hidden;
