-- 071_treatment_cases_published.sql — 치료사례 환자용 공개 게이트.
--   published: 원장이 승인한 케이스만 환자용 페이지에 노출(의료광고법·재식별 방지 — 기본 false).
--   gen 재시드는 snapshot 만 write 하므로 이 플래그도 admin 소유로 보존된다(excluded_dates 와 동일).
--   noindex + PIN(8054) 게이트 뒤 de-id 데이터라도, 미승인 케이스는 절대 반환하지 않는다.
alter table treatment_cases
  add column if not exists published boolean not null default false;

-- 승인된 케이스만 조회하는 인덱스(공개 목록 쿼리용)
create index if not exists treatment_cases_published_idx on treatment_cases (published) where published;
