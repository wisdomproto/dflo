-- ================================================
-- 47번 일반 사용자 가상 데이터 생성
-- 병원 환자가 아닌 일반 사용자 (is_patient = false)
-- ================================================

-- ================================================
-- 1. 부모 (일반 사용자) 생성
-- ================================================
INSERT INTO users (
    id,
    email,
    password,
    name,
    phone,
    role,
    is_patient,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '0047@example.com',
    '1234',
    '테스트 일반사용자47',
    '010-9999-0047',
    'parent',
    false,  -- 일반 사용자 (병원 환자 아님)
    NOW(),
    NOW()
);

-- ================================================
-- 2. 자녀 생성
-- ================================================
INSERT INTO children (
    id,
    parent_id,
    name,
    gender,
    birth_date,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = '0047@example.com'),
    '박성장',
    'female',
    '2012-08-20',
    NOW(),
    NOW()
);

-- ================================================
-- 3. 측정 기록 생성 (7개)
-- ================================================

-- 첫 번째 측정 (2023-08-20, 생일)
INSERT INTO measurements (
    id,
    child_id,
    measured_date,
    age_at_measurement,
    height,
    weight,
    actual_age,
    bone_age,
    pah,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2023-08-20',
    11.0,
    145.2,
    38.5,
    11.0,
    10.5,
    160.0,
    '초진 - 성장 관심으로 앱 시작',
    NOW(),
    NOW()
);

-- 두 번째 측정 (2024-02-20, 6개월 후)
INSERT INTO measurements (
    id,
    child_id,
    measured_date,
    age_at_measurement,
    height,
    weight,
    actual_age,
    bone_age,
    pah,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2024-02-20',
    11.5,
    149.8,
    41.2,
    11.5,
    11.0,
    162.5,
    '6개월 성장 - 4.6cm 성장',
    NOW(),
    NOW()
);

-- 세 번째 측정 (2024-08-20, 생일)
INSERT INTO measurements (
    id,
    child_id,
    measured_date,
    age_at_measurement,
    height,
    weight,
    actual_age,
    bone_age,
    pah,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2024-08-20',
    12.0,
    154.3,
    44.8,
    12.0,
    11.5,
    164.2,
    '1년 성장 - 9.1cm 성장',
    NOW(),
    NOW()
);

-- 네 번째 측정 (2025-02-20, 6개월 후)
INSERT INTO measurements (
    id,
    child_id,
    measured_date,
    age_at_measurement,
    height,
    weight,
    actual_age,
    bone_age,
    pah,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2025-02-20',
    12.5,
    158.1,
    47.5,
    12.5,
    12.0,
    165.3,
    '6개월 성장 - 3.8cm 성장',
    NOW(),
    NOW()
);

-- 다섯 번째 측정 (2025-08-20, 생일)
INSERT INTO measurements (
    id,
    child_id,
    measured_date,
    age_at_measurement,
    height,
    weight,
    actual_age,
    bone_age,
    pah,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2025-08-20',
    13.0,
    161.5,
    50.2,
    13.0,
    12.5,
    166.1,
    '1년 성장 - 7.2cm 성장',
    NOW(),
    NOW()
);

-- 여섯 번째 측정 (2025-11-20, 3개월 후)
INSERT INTO measurements (
    id,
    child_id,
    measured_date,
    age_at_measurement,
    height,
    weight,
    actual_age,
    bone_age,
    pah,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2025-11-20',
    13.25,
    163.2,
    51.8,
    13.25,
    12.8,
    166.5,
    '3개월 성장 - 1.7cm 성장',
    NOW(),
    NOW()
);

-- 일곱 번째 측정 (2026-02-04, 최근)
INSERT INTO measurements (
    id,
    child_id,
    measured_date,
    age_at_measurement,
    height,
    weight,
    actual_age,
    bone_age,
    pah,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-02-04',
    13.45,
    164.8,
    53.2,
    13.45,
    13.0,
    166.9,
    '최근 측정 - 1.6cm 성장',
    NOW(),
    NOW()
);

-- ================================================
-- 4. 데일리 루틴 생성 (10개)
-- 일반 사용자이므로 성장주사는 false로 설정
-- ================================================

-- 2026-01-26 (월요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    bone_age,
    predicted_height_bone_age,
    measurement_notes,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    injection_time,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-01-26',
    13.45,
    164.8,
    53.2,
    166.9,
    13.0,
    166.9,
    '홈에서 측정',
    '22:30:00',
    '07:00:00',
    'Good',
    1600,
    '[
        {"time": "07:30", "type": "아침", "menu": "밥, 계란후라이, 김치", "quality": "좋음"},
        {"time": "12:30", "type": "점심", "menu": "김밥, 우유", "quality": "보통"},
        {"time": "19:00", "type": "저녁", "menu": "된장찌개, 밥, 나물", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "배드민턴", "duration": 40},
        {"name": "스트레칭", "duration": 10}
    ]'::jsonb,
    '["칼슘", "비타민D"]'::jsonb,
    false,
    NULL,
    '학교 체육 시간에 배드민턴',
    'good',
    NOW(),
    NOW()
);

-- 2026-01-27 (화요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-01-27',
    13.45,
    164.8,
    53.2,
    166.9,
    '22:45:00',
    '06:50:00',
    'Fair',
    1500,
    '[
        {"time": "07:20", "type": "아침", "menu": "토스트, 우유", "quality": "보통"},
        {"time": "12:30", "type": "점심", "menu": "급식", "quality": "좋음"},
        {"time": "19:30", "type": "저녁", "menu": "불고기, 밥, 샐러드", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "줄넘기", "duration": 20},
        {"name": "걷기", "duration": 30}
    ]'::jsonb,
    '["칼슘", "비타민D"]'::jsonb,
    false,
    '늦게 잠',
    'normal',
    NOW(),
    NOW()
);

-- 2026-01-28 (수요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-01-28',
    13.45,
    164.8,
    53.3,
    166.9,
    '22:00:00',
    '07:00:00',
    'Good',
    1800,
    '[
        {"time": "07:30", "type": "아침", "menu": "시리얼, 우유", "quality": "보통"},
        {"time": "12:30", "type": "점심", "menu": "급식", "quality": "좋음"},
        {"time": "19:00", "type": "저녁", "menu": "생선구이, 밥, 시금치나물", "quality": "좋음"},
        {"time": "21:00", "type": "간식", "menu": "과일", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "배드민턴", "duration": 50},
        {"name": "스트레칭", "duration": 15}
    ]'::jsonb,
    '["칼슘", "비타민D", "오메가3"]'::jsonb,
    false,
    '배드민턴 동아리 활동',
    'excellent',
    NOW(),
    NOW()
);

-- 2026-01-29 (목요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-01-29',
    13.45,
    164.8,
    53.3,
    166.9,
    '22:30:00',
    '07:00:00',
    'Good',
    1700,
    '[
        {"time": "07:30", "type": "아침", "menu": "밥, 김, 계란", "quality": "좋음"},
        {"time": "12:30", "type": "점심", "menu": "급식", "quality": "보통"},
        {"time": "19:00", "type": "저녁", "menu": "카레, 밥, 샐러드", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "줄넘기", "duration": 25},
        {"name": "요가", "duration": 20}
    ]'::jsonb,
    '["칼슘", "비타민D"]'::jsonb,
    false,
    '학원 다녀옴',
    'good',
    NOW(),
    NOW()
);

-- 2026-01-30 (금요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-01-30',
    13.45,
    164.9,
    53.4,
    166.9,
    '23:00:00',
    '07:30:00',
    'Fair',
    1400,
    '[
        {"time": "07:40", "type": "아침", "menu": "빵, 우유", "quality": "보통"},
        {"time": "12:30", "type": "점심", "menu": "급식", "quality": "좋음"},
        {"time": "19:30", "type": "저녁", "menu": "치킨, 피자", "quality": "보통"}
    ]'::jsonb,
    '[
        {"name": "걷기", "duration": 30}
    ]'::jsonb,
    '["칼슘"]'::jsonb,
    false,
    '친구들과 외식',
    'excellent',
    NOW(),
    NOW()
);

-- 2026-01-31 (토요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-01-31',
    13.45,
    164.9,
    53.4,
    166.9,
    '00:30:00',
    '09:00:00',
    'Good',
    1500,
    '[
        {"time": "09:30", "type": "아침", "menu": "브런치 - 샌드위치, 주스", "quality": "좋음"},
        {"time": "18:00", "type": "저녁", "menu": "스테이크, 파스타", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "배드민턴", "duration": 60},
        {"name": "자전거", "duration": 40}
    ]'::jsonb,
    '["칼슘", "비타민D"]'::jsonb,
    false,
    '주말 - 가족과 외출',
    'excellent',
    NOW(),
    NOW()
);

-- 2026-02-01 (일요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-02-01',
    13.45,
    164.9,
    53.5,
    166.9,
    '23:30:00',
    '08:30:00',
    'Good',
    1600,
    '[
        {"time": "09:00", "type": "아침", "menu": "밥, 김치찌개", "quality": "좋음"},
        {"time": "13:00", "type": "점심", "menu": "짜장면", "quality": "보통"},
        {"time": "19:00", "type": "저녁", "menu": "고등어구이, 밥, 된장국", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "걷기", "duration": 40},
        {"name": "스트레칭", "duration": 15}
    ]'::jsonb,
    '["칼슘", "비타민D"]'::jsonb,
    false,
    '집에서 휴식',
    'good',
    NOW(),
    NOW()
);

-- 2026-02-02 (월요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-02-02',
    13.45,
    164.9,
    53.5,
    166.9,
    '22:30:00',
    '07:00:00',
    'Good',
    1700,
    '[
        {"time": "07:30", "type": "아침", "menu": "밥, 계란말이, 김치", "quality": "좋음"},
        {"time": "12:30", "type": "점심", "menu": "급식", "quality": "좋음"},
        {"time": "19:00", "type": "저녁", "menu": "삼겹살, 쌈, 된장찌개", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "배드민턴", "duration": 45},
        {"name": "스트레칭", "duration": 10}
    ]'::jsonb,
    '["칼슘", "비타민D", "오메가3"]'::jsonb,
    false,
    '학교 정상',
    'good',
    NOW(),
    NOW()
);

-- 2026-02-03 (화요일)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-02-03',
    13.45,
    165.0,
    53.6,
    166.9,
    '22:00:00',
    '07:00:00',
    'Excellent',
    1900,
    '[
        {"time": "07:30", "type": "아침", "menu": "시리얼, 우유, 바나나", "quality": "좋음"},
        {"time": "12:30", "type": "점심", "menu": "급식", "quality": "좋음"},
        {"time": "19:00", "type": "저녁", "menu": "닭볶음탕, 밥", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "배드민턴", "duration": 55},
        {"name": "요가", "duration": 20}
    ]'::jsonb,
    '["칼슘", "비타민D", "오메가3"]'::jsonb,
    false,
    '배드민턴 대회 준비',
    'excellent',
    NOW(),
    NOW()
);

-- 2026-02-04 (수요일 - 오늘)
INSERT INTO daily_routines (
    id,
    child_id,
    routine_date,
    age_at_routine,
    height,
    weight,
    predicted_height_basic,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,
    exercises,
    supplements,
    growth_injection,
    notes,
    mood,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM children WHERE name = '박성장'),
    '2026-02-04',
    13.45,
    165.0,
    53.6,
    166.9,
    '22:30:00',
    '07:00:00',
    'Good',
    1800,
    '[
        {"time": "07:30", "type": "아침", "menu": "토스트, 우유, 딸기", "quality": "좋음"},
        {"time": "12:30", "type": "점심", "menu": "급식", "quality": "보통"},
        {"time": "19:00", "type": "저녁", "menu": "제육볶음, 밥, 김치", "quality": "좋음"}
    ]'::jsonb,
    '[
        {"name": "배드민턴", "duration": 40},
        {"name": "스트레칭", "duration": 15}
    ]'::jsonb,
    '["칼슘", "비타민D"]'::jsonb,
    false,
    '오늘도 열심히!',
    'good',
    NOW(),
    NOW()
);

-- ================================================
-- 확인 쿼리
-- ================================================

-- 1. 부모 확인
SELECT * FROM users WHERE email = '0047@example.com';

-- 2. 자녀 확인
SELECT * FROM children WHERE name = '박성장';

-- 3. 측정 기록 개수 (7개)
SELECT COUNT(*) FROM measurements 
WHERE child_id = (SELECT id FROM children WHERE name = '박성장');

-- 4. 데일리 루틴 개수 (10개)
SELECT COUNT(*) FROM daily_routines 
WHERE child_id = (SELECT id FROM children WHERE name = '박성장');

-- 5. 전체 통계
SELECT 
    u.name as 부모이름,
    u.is_patient as 병원환자여부,
    c.name as 자녀이름,
    c.gender as 성별,
    c.birth_date as 생년월일,
    (SELECT COUNT(*) FROM measurements WHERE child_id = c.id) as 측정기록수,
    (SELECT COUNT(*) FROM daily_routines WHERE child_id = c.id) as 루틴기록수
FROM users u
JOIN children c ON u.id = c.parent_id
WHERE u.email = '0047@example.com';

-- ================================================
-- 완료 메시지
-- ================================================
SELECT '✅ 47번 일반 사용자 및 데일리 루틴 데이터 생성 완료!' as message;
