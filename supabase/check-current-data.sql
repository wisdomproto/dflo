-- ================================================
-- 현재 Supabase에 있는 데이터 확인
-- ================================================

-- 1. 부모 계정 확인 (부모 ID 순서대로)
SELECT 
    email,
    name as parent_name,
    password,
    role,
    created_at
FROM users 
WHERE role = 'parent'
ORDER BY email
LIMIT 10;

-- 2. 각 부모의 아이 정보 확인
SELECT 
    u.email as parent_email,
    u.name as parent_name,
    c.name as child_name,
    c.birth_date,
    c.gender,
    ci.father_height,
    ci.mother_height,
    ci.target_height,
    (SELECT COUNT(*) FROM measurements WHERE child_id = c.id) as measurement_count
FROM users u
LEFT JOIN children c ON u.id = c.parent_id
LEFT JOIN child_required_info ci ON c.id = ci.child_id
WHERE u.role = 'parent'
ORDER BY u.email
LIMIT 10;

-- 3. 부모 ID 1번 (24-0001@example.com)의 상세 정보
SELECT 
    u.email,
    u.name as parent_name,
    c.name as child_name,
    c.birth_date,
    c.gender,
    ci.father_height,
    ci.mother_height,
    ci.target_height,
    m.measured_date,
    m.height,
    m.weight,
    m.actual_age,
    m.bone_age,
    m.pah,
    m.notes
FROM users u
LEFT JOIN children c ON u.id = c.parent_id
LEFT JOIN child_required_info ci ON c.id = ci.child_id
LEFT JOIN measurements m ON c.id = m.child_id
WHERE u.email = '24-0001@example.com'
ORDER BY m.measured_date;

-- 4. 전체 통계
SELECT 
    '부모 수' as category,
    COUNT(*) as count
FROM users 
WHERE role = 'parent'
UNION ALL
SELECT 
    '아이 수' as category,
    COUNT(*) as count
FROM children
UNION ALL
SELECT 
    '측정 기록 수' as category,
    COUNT(*) as count
FROM measurements;
