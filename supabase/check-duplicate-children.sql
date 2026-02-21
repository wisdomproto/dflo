-- ================================================
-- 데이터 중복 확인 및 정리
-- ================================================

-- 1. 부모별 아이 수 확인
SELECT 
    u.email,
    u.name as parent_name,
    COUNT(c.id) as child_count,
    STRING_AGG(c.name, ', ') as children_names
FROM users u
LEFT JOIN children c ON u.id = c.parent_id
WHERE u.role = 'parent'
GROUP BY u.id, u.email, u.name
ORDER BY child_count DESC;

-- 2. 중복된 아이 확인 (같은 부모, 같은 이름, 같은 생년월일)
SELECT 
    c.parent_id,
    u.name as parent_name,
    c.name as child_name,
    c.birth_date,
    c.gender,
    COUNT(*) as duplicate_count,
    STRING_AGG(c.id::text, ', ') as child_ids
FROM children c
JOIN users u ON c.parent_id = u.id
GROUP BY c.parent_id, u.name, c.name, c.birth_date, c.gender
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 3. 측정 기록이 있는 아이 확인
SELECT 
    c.id,
    c.name as child_name,
    u.name as parent_name,
    u.email,
    COUNT(m.id) as measurement_count
FROM children c
JOIN users u ON c.parent_id = u.id
LEFT JOIN measurements m ON c.id = m.child_id
GROUP BY c.id, c.name, u.name, u.email
HAVING COUNT(m.id) > 0
ORDER BY measurement_count DESC;

-- 4. 특정 부모(24-0001)의 아이 상세 확인
SELECT 
    c.id,
    c.name,
    c.birth_date,
    c.gender,
    c.created_at,
    (SELECT COUNT(*) FROM measurements WHERE child_id = c.id) as measurement_count
FROM children c
JOIN users u ON c.parent_id = u.id
WHERE u.email = '24-0001@example.com'
ORDER BY c.created_at;
