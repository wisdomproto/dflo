-- 062_anonymous_predictions_delete.sql — admin 측정 로그 정리(테스트·스팸 행 삭제)용 anon DELETE 정책.
--   060 INSERT만 · 061 SELECT 추가 · 여기서 DELETE 추가. anon 키는 공개라 이론상 악의적 삭제 가능하나
--   익명 분석 데이터(PII 0, 가짜 이름)라 수용 — case-candidates 와 동일 앱 모델(anon 접근 + AdminRoute 가드).
--   Dashboard(txirmof) 수동 적용.
drop policy if exists "anon delete anonymous_predictions" on anonymous_predictions;
create policy "anon delete anonymous_predictions"
  on anonymous_predictions for delete
  to anon, authenticated
  using (true);
