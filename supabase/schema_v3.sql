-- ================================================
-- 187 성장케어 v3.0 - Supabase 데이터베이스 스키마
-- ================================================
-- 작성일: 2026-02-05
-- 설명: 처음부터 다시 만드는 성장케어 플랫폼 DB 스키마
-- ================================================

-- ================================================
-- 1. users (부모 계정)
-- ================================================
CREATE TABLE users (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'parent' CHECK (role IN ('parent', 'doctor', 'admin')),
    
    -- 메타 정보
    memo TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ================================================
-- 2. children (아이 정보)
-- ================================================
CREATE TABLE children (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    birth_date DATE NOT NULL,
    
    -- 출산 정보
    birth_week INTEGER,
    birth_weight DECIMAL(4,2),
    birth_notes TEXT,
    
    -- 부모 신체 정보
    father_height DECIMAL(5,2),
    mother_height DECIMAL(5,2),
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 인덱스
CREATE INDEX idx_children_parent_id ON children(parent_id);
CREATE INDEX idx_children_birth_date ON children(birth_date);

-- ================================================
-- 3. questionnaire (설문지 데이터)
-- ================================================
CREATE TABLE questionnaire (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    filled_date DATE DEFAULT CURRENT_DATE,
    
    -- 성장 기록 (과거 키 데이터 - JSON)
    past_heights JSONB,
    
    -- 성장 패턴
    recent_growth_speed VARCHAR(50),
    
    -- 건강 상태 (JSON 배열)
    health_conditions JSONB,
    current_medications TEXT,
    
    -- 2차 성징 (남아)
    voice_change BOOLEAN,
    facial_hair BOOLEAN,
    armpit_hair BOOLEAN,
    pubic_hair BOOLEAN,
    
    -- 2차 성징 (여아)
    breast_development BOOLEAN,
    menarche_date DATE,
    menarche_age DECIMAL(4,2),
    
    -- 생활 습관
    sleep_time TIME,
    wake_time TIME,
    sleep_quality VARCHAR(20),
    screen_time_hours DECIMAL(3,1),
    
    -- 식습관
    meal_regularity VARCHAR(20),
    snack_frequency VARCHAR(20),
    picky_eater BOOLEAN,
    favorite_foods TEXT,
    disliked_foods TEXT,
    
    -- 운동 습관
    exercise_frequency VARCHAR(20),
    exercise_types JSONB,
    
    -- 스트레스 & 심리
    stress_level VARCHAR(20),
    academic_pressure BOOLEAN,
    
    -- 가족력
    family_short_stature BOOLEAN,
    family_notes TEXT,
    
    -- 부모 의견
    target_height DECIMAL(5,2),
    main_concerns TEXT,
    doctor_notes TEXT,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_questionnaire_child_id ON questionnaire(child_id);
CREATE INDEX idx_questionnaire_filled_date ON questionnaire(filled_date);

-- ================================================
-- 4. measurements (키/몸무게 측정 기록)
-- ================================================
CREATE TABLE measurements (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    measured_date DATE NOT NULL,
    
    -- 측정 데이터
    height DECIMAL(5,2) NOT NULL,
    weight DECIMAL(5,2),
    actual_age DECIMAL(4,2),
    bone_age DECIMAL(4,2),
    pah DECIMAL(5,2),
    
    -- 백분위 (자동 계산)
    height_percentile DECIMAL(5,2),
    weight_percentile DECIMAL(5,2),
    bmi DECIMAL(5,2),
    
    -- 메모
    notes TEXT,
    doctor_notes TEXT,
    
    -- 메타 정보
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 제약 조건
    UNIQUE(child_id, measured_date)
);

-- 인덱스
CREATE INDEX idx_measurements_child_id ON measurements(child_id);
CREATE INDEX idx_measurements_measured_date ON measurements(measured_date);

-- ================================================
-- 5. daily_routines (데일리 루틴 - 메인 기록)
-- ================================================
CREATE TABLE daily_routines (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    routine_date DATE NOT NULL,
    
    -- 신체 측정
    daily_height DECIMAL(5,2),
    daily_weight DECIMAL(5,2),
    
    -- 수면
    sleep_time TIME,
    wake_time TIME,
    sleep_quality VARCHAR(20),
    sleep_notes TEXT,
    
    -- 수분 섭취
    water_intake_ml INTEGER,
    
    -- 영양제
    basic_supplements JSONB,
    extra_supplements JSONB,
    
    -- 성장 주사
    growth_injection BOOLEAN DEFAULT false,
    injection_time TIME,
    injection_notes TEXT,
    
    -- 메모
    daily_notes TEXT,
    mood VARCHAR(20),
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 제약 조건
    UNIQUE(child_id, routine_date)
);

-- 인덱스
CREATE INDEX idx_daily_routines_child_id ON daily_routines(child_id);
CREATE INDEX idx_daily_routines_routine_date ON daily_routines(routine_date);

-- ================================================
-- 6. meals (식사 기록)
-- ================================================
CREATE TABLE meals (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    meal_time TIME,
    
    -- 식사 내용
    description TEXT,
    is_healthy BOOLEAN,
    portion_size VARCHAR(20),
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_meals_daily_routine_id ON meals(daily_routine_id);
CREATE INDEX idx_meals_meal_type ON meals(meal_type);

-- ================================================
-- 7. meal_photos (식사 사진)
-- ================================================
CREATE TABLE meal_photos (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    
    -- 사진 정보
    photo_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    
    -- 메타 정보
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_meal_photos_meal_id ON meal_photos(meal_id);

-- ================================================
-- 8. exercises (운동 템플릿 - 마스터 데이터)
-- ================================================
CREATE TABLE exercises (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- 영상 정보
    youtube_url TEXT,
    thumbnail_url TEXT,
    
    -- 운동 정보
    duration_minutes INTEGER,
    difficulty VARCHAR(20),
    target_age_min INTEGER,
    target_age_max INTEGER,
    
    -- 정렬
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_order_index ON exercises(order_index);

-- ================================================
-- 9. exercise_logs (운동 기록)
-- ================================================
CREATE TABLE exercise_logs (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    
    -- 운동 정보
    exercise_id UUID REFERENCES exercises(id),
    exercise_name VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,
    completed BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_exercise_logs_daily_routine_id ON exercise_logs(daily_routine_id);
CREATE INDEX idx_exercise_logs_exercise_id ON exercise_logs(exercise_id);

-- ================================================
-- 10. recipes (건강 레시피)
-- ================================================
CREATE TABLE recipes (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_number VARCHAR(20),
    title VARCHAR(200) NOT NULL,
    image_url TEXT,
    
    -- 레시피 정보
    key_benefits TEXT,
    main_nutrients JSONB,
    ingredients JSONB,
    cooking_steps JSONB,
    cooking_time_minutes INTEGER,
    difficulty VARCHAR(20),
    
    -- 영양 정보
    calories INTEGER,
    protein DECIMAL(5,2),
    carbs DECIMAL(5,2),
    fat DECIMAL(5,2),
    
    -- 정렬 & 표시
    order_index INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_recipes_order_index ON recipes(order_index);
CREATE INDEX idx_recipes_is_featured ON recipes(is_featured);

-- ================================================
-- 11. growth_cases (성장 사례)
-- ================================================
CREATE TABLE growth_cases (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    birth_date DATE,
    
    -- 부모 신체 정보
    father_height DECIMAL(5,2),
    mother_height DECIMAL(5,2),
    target_height DECIMAL(5,2),
    
    -- 치료 정보
    special_notes TEXT,
    treatment_memo TEXT,
    
    -- 측정 데이터 (JSON)
    measurements JSONB,
    
    -- 정렬 & 표시
    order_index INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_growth_cases_order_index ON growth_cases(order_index);

-- ================================================
-- 12. growth_guides (성장 가이드)
-- ================================================
CREATE TABLE growth_guides (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(200),
    icon VARCHAR(10),
    category VARCHAR(50),
    
    -- 콘텐츠
    image_url TEXT,
    content TEXT NOT NULL,
    banner_color VARCHAR(100),
    
    -- 정렬 & 표시
    order_index INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_growth_guides_category ON growth_guides(category);
CREATE INDEX idx_growth_guides_order_index ON growth_guides(order_index);

-- ================================================
-- Row Level Security (RLS) 설정
-- ================================================
-- 개발 중에는 비활성화, 프로덕션에서는 활성화

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE children ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_routines ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 초기 데이터 삽입 (운동 템플릿 예시)
-- ================================================
INSERT INTO exercises (category, name, description, youtube_url, duration_minutes, difficulty, target_age_min, target_age_max, order_index) VALUES
-- 바른자세 운동
('바른자세', '거북목 스트레칭', '거북목을 교정하는 스트레칭', 'https://www.youtube.com/watch?v=example1', 10, '쉬움', 6, 18, 1),
('바른자세', '척추 교정 스트레칭', '척추를 바르게 하는 스트레칭', 'https://www.youtube.com/watch?v=example2', 15, '쉬움', 6, 18, 2),

-- 성장판 자극 운동
('성장판자극', '줄넘기', '성장판을 자극하는 줄넘기', 'https://www.youtube.com/watch?v=example3', 15, '보통', 6, 18, 3),
('성장판자극', '농구', '키 크기에 좋은 농구', 'https://www.youtube.com/watch?v=example4', 30, '보통', 8, 18, 4),

-- 유산소 운동
('유산소', '조깅', '기본 유산소 운동', 'https://www.youtube.com/watch?v=example5', 20, '쉬움', 6, 18, 5),
('유산소', '수영', '전신 운동 수영', 'https://www.youtube.com/watch?v=example6', 30, '보통', 6, 18, 6);

-- ================================================
-- 완료
-- ================================================
-- 스키마 생성 완료!
-- 다음 단계: Supabase Dashboard에서 이 SQL을 실행하세요.
