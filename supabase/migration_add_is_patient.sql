-- ================================================
-- users 테이블에 is_patient 컬럼 추가
-- 병원 환자 여부를 구분하기 위한 컬럼
-- ================================================

-- 1. is_patient 컬럼 추가 (기본값: false)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_patient BOOLEAN DEFAULT false;

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN users.is_patient IS '병원 환자 여부 (true: 병원 환자, false: 일반 사용자)';

-- 3. 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_is_patient ON users(is_patient);

-- 4. 기존 데이터 업데이트 (예시: 46번 환자를 병원 환자로 설정)
UPDATE users
SET is_patient = true
WHERE email = '0046@example.com';

-- 5. 추가 예시: 1~10번 환자를 병원 환자로 설정
UPDATE users
SET is_patient = true
WHERE email IN (
    '0001@example.com',
    '0002@example.com',
    '0003@example.com',
    '0004@example.com',
    '0005@example.com',
    '0006@example.com',
    '0007@example.com',
    '0008@example.com',
    '0009@example.com',
    '0010@example.com'
);

-- 6. 확인 쿼리
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_patient = true) as hospital_patients,
    COUNT(*) FILTER (WHERE is_patient = false) as general_users
FROM users;

-- 7. 병원 환자 목록 확인
SELECT id, email, name, role, is_patient
FROM users
WHERE is_patient = true
ORDER BY email;

-- ================================================
-- 마이그레이션 완료 메시지
-- ================================================
SELECT '✅ is_patient 컬럼 추가 및 데이터 업데이트 완료!' as message;
