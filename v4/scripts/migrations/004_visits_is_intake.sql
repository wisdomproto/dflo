-- ============================================================
-- 004: visits.is_intake
-- 기본 정보 탭의 초진 임상 데이터(X-ray, lab, 현재 키)를
-- 기존 visit-centric 테이블들(hospital_measurements, xray_readings,
-- lab_tests) 위에서 재사용하기 위해, 환자당 하나의 "초진 가상 회차"를
-- 구분하는 플래그. 외부 병원에서 치료받다 넘어온 환자도 측정·검사
-- 데이터를 바로 기록할 수 있다.
-- ============================================================

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS is_intake BOOLEAN NOT NULL DEFAULT FALSE;

-- 한 환자당 is_intake=true는 0~1개만 허용.
CREATE UNIQUE INDEX IF NOT EXISTS visits_child_intake_unique
  ON visits(child_id)
  WHERE is_intake = TRUE;

SELECT 'visits.is_intake added + unique partial index' AS status;
