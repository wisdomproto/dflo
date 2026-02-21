-- ================================================
-- 1~46번 환자를 모두 병원 환자로 설정
-- ================================================

-- 1~46번 모든 환자를 병원 환자로 설정
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
    '0010@example.com',
    '0011@example.com',
    '0012@example.com',
    '0013@example.com',
    '0014@example.com',
    '0015@example.com',
    '0016@example.com',
    '0017@example.com',
    '0018@example.com',
    '0019@example.com',
    '0020@example.com',
    '0021@example.com',
    '0022@example.com',
    '0023@example.com',
    '0024@example.com',
    '0025@example.com',
    '0026@example.com',
    '0027@example.com',
    '0028@example.com',
    '0029@example.com',
    '0030@example.com',
    '0031@example.com',
    '0032@example.com',
    '0033@example.com',
    '0034@example.com',
    '0035@example.com',
    '0036@example.com',
    '0037@example.com',
    '0038@example.com',
    '0039@example.com',
    '0040@example.com',
    '0041@example.com',
    '0042@example.com',
    '0043@example.com',
    '0044@example.com',
    '0045@example.com',
    '0046@example.com'
);

-- ================================================
-- 확인 쿼리
-- ================================================

-- 1. 전체 통계
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_patient = true) as hospital_patients,
    COUNT(*) FILTER (WHERE is_patient = false) as general_users,
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_patient = true) / COUNT(*), 1) as hospital_percentage
FROM users
WHERE role = 'parent';

-- 예상 결과:
-- total_users | hospital_patients | general_users | hospital_percentage
--     46      |        46         |       0       |       100.0

-- 2. 병원 환자 목록 확인 (1~46번)
SELECT email, name, is_patient
FROM users
WHERE role = 'parent'
ORDER BY email;

-- 3. 일반 사용자 확인 (없어야 함)
SELECT email, name, is_patient
FROM users
WHERE role = 'parent' AND (is_patient = false OR is_patient IS NULL);

-- ================================================
-- 완료 메시지
-- ================================================
SELECT '✅ 1~46번 환자를 모두 병원 환자로 설정 완료!' as message;
