-- ================================================
-- 043: children.treatment_status 에 'completed'(완료) 단계 추가
-- 014의 2단계(consultation/treatment) → 3단계.
--   'consultation' — 초진/상담만 한 환자
--   'treatment'    — 실제 진료 중
--   'completed'    — 치료 완료
-- 환자앱 라우팅은 'completed'를 'treatment'와 동일 취급(진료기록 뷰 유지).
-- consultation 만 별도 분기. 관리자 화면에서만 3단계 구분/설정.
-- ================================================

ALTER TABLE children DROP CONSTRAINT IF EXISTS children_treatment_status_check;

ALTER TABLE children
  ADD CONSTRAINT children_treatment_status_check
  CHECK (treatment_status IN ('consultation', 'treatment', 'completed'));
