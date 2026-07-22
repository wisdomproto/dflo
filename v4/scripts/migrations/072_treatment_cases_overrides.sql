-- 072_treatment_cases_overrides.sql — 치료사례 환자용 케이스 수동 보정값(admin 소유).
--   overrides jsonb: 관리자가 케이스별로 고친 값. 지금은 부모 키 {father, mother}(MPH 재계산용).
--   children(실제 진료기록)은 안 건드리고 이 override 만 gen 이 스냅샷 계산에 반영 → 안전·되돌리기 쉬움.
--   excluded_dates·published 와 같은 admin 소유 컬럼 → gen 재시드(snapshot 만 write)가 보존.
alter table treatment_cases
  add column if not exists overrides jsonb not null default '{}'::jsonb;
