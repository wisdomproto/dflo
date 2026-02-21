-- ================================================
-- 비밀번호 확인 및 재설정
-- ================================================

-- 1. 부모 계정의 비밀번호 확인
SELECT 
    id,
    email,
    name,
    password,
    LENGTH(password) as password_length,
    role
FROM users 
WHERE role = 'parent'
ORDER BY email
LIMIT 10;

-- 2. password 컬럼이 NULL인 사용자 확인
SELECT COUNT(*) as null_password_count
FROM users 
WHERE password IS NULL;

-- 3. 모든 부모 계정의 비밀번호를 '1234'로 강제 재설정
UPDATE users 
SET password = '1234' 
WHERE role = 'parent';

-- 4. 재설정 후 확인
SELECT 
    email,
    name,
    password,
    CASE 
        WHEN password = '1234' THEN '✅ OK'
        ELSE '❌ 문제 있음'
    END as status
FROM users 
WHERE role = 'parent'
ORDER BY email
LIMIT 10;

-- 완료 메시지
SELECT '✅ 모든 부모 계정의 비밀번호가 1234로 재설정되었습니다!' AS result;
