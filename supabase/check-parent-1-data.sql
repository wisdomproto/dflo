-- ================================================
-- 현재 Supabase 데이터 확인 (부모 ID 1번)
-- ================================================

-- 1. 부모 ID 1번 (24-0001@example.com) 정보
SELECT 
    'users' as table_name,
    email,
    name,
    password,
    role
FROM users 
WHERE email = '24-0001@example.com';

-- 2. 부모 ID 1번의 아이 정보
SELECT 
    'children' as table_name,
    c.id as child_id,
    c.name as child_name,
    c.birth_date,
    c.gender,
    u.email as parent_email,
    u.name as parent_name
FROM children c
JOIN users u ON c.parent_id = u.id
WHERE u.email = '24-0001@example.com';

-- 3. 부모 ID 1번 아이의 필수 정보
SELECT 
    'child_required_info' as table_name,
    ci.father_height,
    ci.mother_height,
    ci.target_height,
    c.name as child_name
FROM child_required_info ci
JOIN children c ON ci.child_id = c.id
JOIN users u ON c.parent_id = u.id
WHERE u.email = '24-0001@example.com';

-- 4. 부모 ID 1번 아이의 측정 기록
SELECT 
    'measurements' as table_name,
    m.measured_date,
    m.height,
    m.weight,
    m.actual_age,
    m.bone_age,
    m.pah,
    m.notes,
    c.name as child_name
FROM measurements m
JOIN children c ON m.child_id = c.id
JOIN users u ON c.parent_id = u.id
WHERE u.email = '24-0001@example.com'
ORDER BY m.measured_date;

-- 5. 전체 통계
SELECT 
    '전체 부모 수' as category,
    COUNT(*) as count
FROM users 
WHERE role = 'parent'
UNION ALL
SELECT 
    '전체 아이 수' as category,
    COUNT(*) as count
FROM children
UNION ALL
SELECT 
    '전체 측정 기록 수' as category,
    COUNT(*) as count
FROM measurements;
