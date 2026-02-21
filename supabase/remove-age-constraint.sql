-- ================================================
-- measurements 테이블 age_at_measurement NOT NULL 제약 제거
-- ================================================

-- age_at_measurement 컬럼의 NOT NULL 제약 제거
ALTER TABLE measurements ALTER COLUMN age_at_measurement DROP NOT NULL;

-- 확인
SELECT '✅ age_at_measurement NOT NULL 제약 제거 완료!' AS result;
