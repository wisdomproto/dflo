-- ================================================
-- 46번째 가상 환자 생성 스크립트 (수정본)
-- ================================================

-- 1. 부모(사용자) 추가
INSERT INTO users (id, email, password, name, phone, role, created_at, updated_at)
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '0046@example.com',
    '1234',
    '테스트 부모46',
    '010-9999-0046',
    'parent',
    NOW(),
    NOW()
);

-- 2. 자녀 추가 (남아)
INSERT INTO children (id, parent_id, name, gender, birth_date, created_at, updated_at)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '김성장',
    'male',
    '2013-03-15',
    NOW(),
    NOW()
);

-- 3. 측정 기록 추가 (6개월 간격, 7개 기록)
INSERT INTO measurements (child_id, measured_date, height, weight, age_at_measurement, actual_age, bone_age, pah, notes, created_at, updated_at)
VALUES
    ('c47ac10b-58cc-4372-a567-0e02b2c3d479', '2023-03-15', 148.5, 42.0, 10.0, 10.0, 9.5, 168.0, '초진 - 성장호르몬 검사 예정', NOW(), NOW()),
    ('c47ac10b-58cc-4372-a567-0e02b2c3d479', '2023-09-15', 152.3, 45.5, 10.5, 10.5, 10.0, 170.5, '6개월차 - 성장 3.8cm', NOW(), NOW()),
    ('c47ac10b-58cc-4372-a567-0e02b2c3d479', '2024-03-15', 157.8, 49.2, 11.0, 11.0, 10.5, 173.2, '1년차 - 누적 9.3cm 성장', NOW(), NOW()),
    ('c47ac10b-58cc-4372-a567-0e02b2c3d479', '2024-09-15', 162.4, 52.8, 11.5, 11.5, 11.0, 175.8, '1.5년차 - 성장 4.6cm', NOW(), NOW()),
    ('c47ac10b-58cc-4372-a567-0e02b2c3d479', '2025-03-15', 166.9, 56.3, 12.0, 12.0, 11.5, 177.5, '2년차 - 성장 4.5cm', NOW(), NOW()),
    ('c47ac10b-58cc-4372-a567-0e02b2c3d479', '2025-09-15', 170.2, 59.1, 12.5, 12.5, 12.0, 178.9, '2.5년차 - 성장 3.3cm', NOW(), NOW()),
    ('c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-02-04', 172.5, 61.5, 12.9, 12.9, 12.3, 179.5, '최근 측정 - 꾸준한 성장 중', NOW(), NOW());

-- 4. 데일리 루틴 추가 (최근 14일)
-- sleep_quality: 'Excellent', 'Good', 'Fair', 'Poor'

-- 2026-01-22 (월)
INSERT INTO daily_routines (
    child_id, routine_date, 
    height, weight, predicted_height_basic, bone_age, predicted_height_bone_age,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-22',
    172.3, 61.2, 179.2, 12.3, 179.5,
    '22:30', '07:00', 'Good', 1800,
    '[{"type":"아침","time":"07:30","description":"계란 2개, 우유 대신 두유, 빵"},{"type":"점심","time":"12:30","description":"학교급식 - 김치찌개, 밥, 닭고기"},{"type":"저녁","time":"19:00","description":"삼겹살, 야채, 밥"}]'::jsonb,
    '[{"type":"축구","duration":60},{"type":"스트레칭","duration":15}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"},{"name":"오메가3"}]'::jsonb,
    true, '21:00', '학교에서 축구 연습. 컨디션 좋음.', '😊 좋음',
    NOW(), NOW()
);

-- 2026-01-23 (화)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-23',
    172.3, 61.3, 179.2,
    '23:00', '07:30', 'Fair', 1600,
    '[{"type":"아침","time":"08:00","description":"시리얼, 두유"},{"type":"점심","time":"12:30","description":"학교급식"},{"type":"저녁","time":"19:30","description":"된장찌개, 생선구이, 밥"}]'::jsonb,
    '[{"type":"줄넘기","duration":30},{"type":"농구","duration":45}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"}]'::jsonb,
    true, '21:00', '숙제가 많아서 늦게 잠. 피곤함.', '😐 보통',
    NOW(), NOW()
);

-- 2026-01-24 (수)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-24',
    172.4, 61.4, 179.3,
    '22:00', '06:30', 'Good', 2000,
    '[{"type":"아침","time":"07:00","description":"토스트, 계란후라이, 과일"},{"type":"점심","time":"12:30","description":"학교급식 - 불고기, 밥"},{"type":"저녁","time":"18:30","description":"치킨, 샐러드"}]'::jsonb,
    '[{"type":"축구","duration":90},{"type":"턱걸이","duration":10}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"},{"name":"오메가3"}]'::jsonb,
    true, '21:00', '축구 시합 준비. 많이 움직임.', '😊 좋음',
    NOW(), NOW()
);

-- 2026-01-25 (목)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-25',
    172.4, 61.5, 179.3,
    '22:30', '07:00', 'Good', 1900,
    '[{"type":"아침","time":"07:30","description":"밥, 김, 된장국"},{"type":"점심","time":"12:30","description":"학교급식"},{"type":"저녁","time":"19:00","description":"삼계탕"}]'::jsonb,
    '[{"type":"수영","duration":60}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"}]'::jsonb,
    true, '21:00', '수영 시작. 몸이 가벼워짐.', '😊 좋음',
    NOW(), NOW()
);

-- 2026-01-26 (금)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-26',
    172.5, 61.5, 179.4,
    '23:30', '08:00', 'Poor', 1500,
    '[{"type":"아침","time":"08:30","description":"시리얼"},{"type":"점심","time":"12:30","description":"학교급식"},{"type":"저녁","time":"20:00","description":"피자, 콜라"}]'::jsonb,
    '[{"type":"농구","duration":30}]'::jsonb,
    '[{"name":"종합비타민"}]'::jsonb,
    false, '친구들이랑 늦게까지 놀았음. 피곤함.', '😴 피곤',
    NOW(), NOW()
);

-- 2026-01-27 (토)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-27',
    172.5, 61.6, 179.4,
    '01:00', '10:00', 'Good', 2200,
    '[{"type":"아침","time":"10:30","description":"브런치 - 팬케이크, 과일"},{"type":"점심","time":"14:00","description":"돈까스, 샐러드"},{"type":"저녁","time":"19:00","description":"김치찌개, 밥"}]'::jsonb,
    '[{"type":"축구","duration":120}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"},{"name":"오메가3"}]'::jsonb,
    false, '주말 축구 시합. 2골 넣음! 기분 최고.', '😄 매우 좋음',
    NOW(), NOW()
);

-- 2026-01-28 (일)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-28',
    172.5, 61.7, 179.4,
    '23:00', '09:00', 'Good', 2000,
    '[{"type":"아침","time":"09:30","description":"계란말이, 토스트, 과일주스"},{"type":"점심","time":"13:00","description":"외식 - 갈비탕"},{"type":"저녁","time":"18:30","description":"파스타, 샐러드"}]'::jsonb,
    '[{"type":"자전거","duration":90},{"type":"스트레칭","duration":20}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"}]'::jsonb,
    false, '가족과 자전거 타러 감. 날씨 좋음.', '😊 좋음',
    NOW(), NOW()
);

-- 2026-01-29 (월)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-29',
    172.5, 61.7, 179.4,
    '22:00', '06:30', 'Good', 1850,
    '[{"type":"아침","time":"07:00","description":"밥, 김치, 계란후라이"},{"type":"점심","time":"12:30","description":"학교급식"},{"type":"저녁","time":"19:00","description":"불고기, 야채, 밥"}]'::jsonb,
    '[{"type":"축구","duration":60},{"type":"팔굽혀펴기","duration":10}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"},{"name":"오메가3"}]'::jsonb,
    true, '21:00', '새 학기 시작. 의욕 충만.', '😊 좋음',
    NOW(), NOW()
);

-- 2026-01-30 (화)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-30',
    172.5, 61.8, 179.5,
    '22:30', '07:00', 'Good', 1950,
    '[{"type":"아침","time":"07:30","description":"시리얼, 두유, 바나나"},{"type":"점심","time":"12:30","description":"학교급식 - 카레라이스"},{"type":"저녁","time":"19:00","description":"생선구이, 야채볶음, 밥"}]'::jsonb,
    '[{"type":"농구","duration":50},{"type":"줄넘기","duration":20}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"}]'::jsonb,
    true, '21:00', '농구 동아리 가입. 재미있음.', '😊 좋음',
    NOW(), NOW()
);

-- 2026-01-31 (수)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-01-31',
    172.5, 61.8, 179.5,
    '22:00', '06:30', 'Excellent', 2100,
    '[{"type":"아침","time":"07:00","description":"토스트, 계란, 과일, 우유 대신 두유"},{"type":"점심","time":"12:30","description":"학교급식"},{"type":"저녁","time":"18:30","description":"닭가슴살 스테이크, 샐러드"}]'::jsonb,
    '[{"type":"축구","duration":90},{"type":"웨이트","duration":30}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"},{"name":"오메가3"},{"name":"단백질"}]'::jsonb,
    true, '21:00', '체력 훈련 시작. 몸 상태 좋음.', '💪 활기참',
    NOW(), NOW()
);

-- 2026-02-01 (목)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-02-01',
    172.5, 61.9, 179.5,
    '22:30', '07:00', 'Good', 1900,
    '[{"type":"아침","time":"07:30","description":"밥, 김치찌개"},{"type":"점심","time":"12:30","description":"학교급식"},{"type":"저녁","time":"19:00","description":"삼겹살, 쌈채소"}]'::jsonb,
    '[{"type":"수영","duration":60},{"type":"스트레칭","duration":15}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"}]'::jsonb,
    true, '21:00', '수영 실력 많이 늘음.', '😊 좋음',
    NOW(), NOW()
);

-- 2026-02-02 (금)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-02-02',
    172.5, 62.0, 179.5,
    '23:00', '07:30', 'Fair', 1750,
    '[{"type":"아침","time":"08:00","description":"시리얼, 요거트"},{"type":"점심","time":"12:30","description":"학교급식"},{"type":"저녁","time":"19:30","description":"피자"}]'::jsonb,
    '[{"type":"축구","duration":45}]'::jsonb,
    '[{"name":"종합비타민"}]'::jsonb,
    true, '21:00', '시험 공부로 조금 피곤.', '😐 보통',
    NOW(), NOW()
);

-- 2026-02-03 (토)
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-02-03',
    172.5, 62.1, 179.5,
    '00:30', '09:30', 'Good', 2300,
    '[{"type":"아침","time":"10:00","description":"브런치 - 샌드위치, 과일"},{"type":"점심","time":"14:00","description":"치킨"},{"type":"저녁","time":"19:00","description":"된장찌개, 밥"}]'::jsonb,
    '[{"type":"축구","duration":150},{"type":"근력운동","duration":30}]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"},{"name":"오메가3"}]'::jsonb,
    false, '축구 토너먼트. 우승! 최고의 날.', '🎉 최고',
    NOW(), NOW()
);

-- 2026-02-04 (일) - 오늘
INSERT INTO daily_routines (
    child_id, routine_date,
    height, weight, predicted_height_basic,
    sleep_time, wake_time, sleep_quality, water_amount,
    meals, exercises, supplements,
    growth_injection, injection_time, notes, mood,
    created_at, updated_at
)
VALUES (
    'c47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-02-04',
    172.5, 61.5, 179.5,
    '23:30', '08:30', 'Good', 1800,
    '[{"type":"아침","time":"09:00","description":"계란후라이, 토스트, 과일주스"}]'::jsonb,
    '[]'::jsonb,
    '[{"name":"종합비타민"},{"name":"칼슘"}]'::jsonb,
    true, '21:00', '병원 방문 예정. 성장 체크.', '😊 좋음',
    NOW(), NOW()
);

-- 완료 메시지
SELECT '✅ 46번째 환자 및 데일리 루틴 데이터 생성 완료!' as status;
