-- ============================================================
-- 019: intake_submissions.current_height / current_weight
-- 환자 셀프 설문에 "현재 키·몸무게" 추가. 승인 시 초진(is_intake) visit
-- 측정값으로 들어가 첫 상담 성장그래프·예측키·BMI 를 채운다.
-- (018 적용 후 실행. 018 미적용이면 018 먼저.)
-- ============================================================

ALTER TABLE intake_submissions
  ADD COLUMN IF NOT EXISTS current_height numeric,
  ADD COLUMN IF NOT EXISTS current_weight numeric;

SELECT 'intake_submissions.current_height + current_weight added' AS status;
