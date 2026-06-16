-- 059_case_candidates_doc_read.sql — case_candidates_doc 를 v4 클라이언트(anon)가 직접 읽도록 SELECT 정책 추가.
--   058 은 RLS enable + 정책 0개(전면 차단)였음. 그런데 admin 환자 페이지가 이미 환자 PHI 테이블
--   (children/visits/hospital_measurements)을 anon 키로 직접 읽는 앱 모델 → 그 요약본도 동일 수준으로 개방.
--   읽기만 개방(SELECT). 쓰기 정책 없음 = service_role 만(로컬 gen_case_profiles.mjs). 페이지 노출은 AdminRoute(클라 가드)가 통제.
--   Dashboard(txirmof) 수동 적용.
drop policy if exists "anon read case_candidates_doc" on case_candidates_doc;
create policy "anon read case_candidates_doc"
  on case_candidates_doc for select
  to anon, authenticated
  using (true);
