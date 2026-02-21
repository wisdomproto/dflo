-- ================================================
-- 로그인 시스템 구축: password 컬럼 추가 및 기본 비밀번호 설정
-- ================================================

-- 1. password 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '1234';

-- 2. 기존 사용자들의 비밀번호를 '1234'로 설정
UPDATE users SET password = '1234' WHERE password IS NULL OR password = '';

-- 3. 확인
SELECT 
    id, 
    email, 
    name, 
    role,
    CASE 
        WHEN password = '1234' THEN '✅ 기본 비밀번호 설정됨'
        ELSE '✅ 커스텀 비밀번호'
    END as password_status
FROM users 
WHERE role = 'parent'
LIMIT 10;

-- 완료 메시지
SELECT '✅ password 컬럼 추가 및 기본 비밀번호(1234) 설정 완료!' AS result;
