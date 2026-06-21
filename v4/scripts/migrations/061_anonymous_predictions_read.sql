-- 061_anonymous_predictions_read.sql — anonymous_predictions 를 v4 클라(anon)가 직접 읽도록 SELECT 정책 추가.
--   060 은 anon INSERT 만 + SELECT 차단이었음. 측정 로그를 admin 페이지(/admin/predictions)에서 보려면 읽기 필요.
--   PII 없음(가짜 랜덤 이름·연락처 미수집)이라 anon read 안전 — 059(case_candidates_doc)와 동일 모델.
--   페이지 노출은 AdminRoute(클라 가드)가 통제. 쓰기는 060 의 anon insert 유지(여기선 SELECT 만 추가).
--   Dashboard(txirmof) 수동 적용.
drop policy if exists "anon read anonymous_predictions" on anonymous_predictions;
create policy "anon read anonymous_predictions"
  on anonymous_predictions for select
  to anon, authenticated
  using (true);
