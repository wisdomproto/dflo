-- 058_case_candidates_doc.sql — 치료사례 후보 페이지(case-candidates.html) 전체 상세 HTML 저장.
--   PHI(차트번호·생년월일·진료메모·문진·알러지·원장스토리 포함)이므로 RLS 로 anon/authenticated 전면 차단.
--   ai-server 가 service_role 키로만 read/write(그 앞에 admin 인증 게이트). Dashboard(txirmof) 수동 적용.
--   ⚠️ service_role 키 필수 — ai-server/.env 의 SUPABASE_SERVICE_ROLE_KEY 가 진짜 service_role 이어야 함(임시 anon 으로는 RLS 차단 테이블 접근 불가).
create table if not exists case_candidates_doc (
  id          int primary key default 1,
  html        text not null default '',
  updated_at  timestamptz default now(),
  constraint case_candidates_doc_one check (id = 1)
);
alter table case_candidates_doc enable row level security;
-- 정책을 만들지 않음 = anon/authenticated 전면 차단. service_role 키만 RLS 우회 접근(ai-server admin 게이트 뒤).
