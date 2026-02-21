-- ================================================
-- 비밀번호 긴급 설정 (데이터 입력 후)
-- ================================================

-- 1. 현재 비밀번호 상태 확인
SELECT 
    email,
    name,
    password,
    CASE 
        WHEN password IS NULL THEN '❌ NULL'
        WHEN password = '' THEN '❌ 빈 문자열'
        WHEN password = '1234' THEN '✅ OK'
        ELSE '⚠️ 다른 값: ' || password
    END as status
FROM users 
WHERE role = 'parent'
ORDER BY email
LIMIT 10;

-- 2. 모든 부모 계정의 비밀번호를 '1234'로 설정
UPDATE users 
SET password = '1234' 
WHERE role = 'parent';

-- 3. 설정 후 확인
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN password = '1234' THEN 1 END) as with_password,
    COUNT(CASE WHEN password IS NULL THEN 1 END) as null_password
FROM users 
WHERE role = 'parent';

-- 4. 최종 확인
SELECT 
    email,
    name,
    password
FROM users 
WHERE role = 'parent'
ORDER BY email
LIMIT 10;

-- 완료 메시지
SELECT '✅ 모든 부모 계정의 비밀번호가 1234로 설정되었습니다!' AS result;
