-- ================================================
-- 187 성장케어 - Supabase 데이터베이스 스키마
-- ================================================
-- 생성일: 2026-01-31
-- 설명: 아이 성장 관리 플랫폼 데이터베이스 스키마
-- ================================================

-- ================================================
-- 1. 사용자 테이블 (users)
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'doctor', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ================================================
-- 2. 아이 정보 테이블 (children)
-- ================================================
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    birth_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_children_parent_id ON children(parent_id);
CREATE INDEX idx_children_birth_date ON children(birth_date);

-- ================================================
-- 3. 아이 필수 정보 테이블 (child_required_info)
-- ================================================
CREATE TABLE IF NOT EXISTS child_required_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
    
    -- 기본 신체 정보
    current_height DECIMAL(5,2),
    current_weight DECIMAL(5,2),
    
    -- 부모 신체 정보
    father_height DECIMAL(5,2),
    mother_height DECIMAL(5,2),
    
    -- 예상 최종 키
    target_height DECIMAL(5,2),
    
    -- 메모
    special_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_required_info_child_id ON child_required_info(child_id);

-- ================================================
-- 4. 남아 선택 정보 테이블 (child_optional_male)
-- ================================================
CREATE TABLE IF NOT EXISTS child_optional_male (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
    
    -- 건강 상태
    medication_history TEXT,
    chronic_disease TEXT,
    family_disease_history TEXT,
    
    -- 생활 습관
    sleep_time TEXT,
    exercise_frequency TEXT,
    favorite_foods TEXT,
    disliked_foods TEXT,
    
    -- 성장 관련
    puberty_start_age INTEGER,
    voice_change_age INTEGER,
    armpit_hair_age INTEGER,
    facial_hair_age INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_optional_male_child_id ON child_optional_male(child_id);

-- ================================================
-- 5. 여아 선택 정보 테이블 (child_optional_female)
-- ================================================
CREATE TABLE IF NOT EXISTS child_optional_female (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
    
    -- 건강 상태
    medication_history TEXT,
    chronic_disease TEXT,
    family_disease_history TEXT,
    
    -- 생활 습관
    sleep_time TEXT,
    exercise_frequency TEXT,
    favorite_foods TEXT,
    disliked_foods TEXT,
    
    -- 성장 관련
    puberty_start_age INTEGER,
    menarche_age INTEGER,
    breast_development_age INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_optional_female_child_id ON child_optional_female(child_id);

-- ================================================
-- 6. 성장 기록 테이블 (measurements)
-- ================================================
CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- 측정 정보
    measured_date DATE NOT NULL,
    age_at_measurement DECIMAL(4,2) NOT NULL, -- 만 나이
    
    -- 신체 측정
    height DECIMAL(5,2) NOT NULL,
    weight DECIMAL(5,2),
    
    -- 예측 키
    predicted_height DECIMAL(5,2),
    percentile DECIMAL(5,2),
    
    -- 메모
    memo TEXT,
    
    -- 담당 의사
    doctor_id UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_measurements_child_id ON measurements(child_id);
CREATE INDEX idx_measurements_date ON measurements(measured_date DESC);
CREATE INDEX idx_measurements_doctor_id ON measurements(doctor_id);

-- ================================================
-- 7. 레시피 테이블 (recipes)
-- ================================================
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    recipe_number TEXT UNIQUE NOT NULL, -- 레시피 01, 레시피 02 등
    order_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    
    -- 핵심 효능
    key_benefits TEXT NOT NULL,
    main_nutrients TEXT[] NOT NULL,
    
    -- 재료
    ingredients JSONB NOT NULL, -- [{name: "밥", amount: "2공기"}, ...]
    
    -- 조리 순서
    steps JSONB NOT NULL, -- [{step: 1, description: "..."}, ...]
    
    -- 조리 팁
    tips TEXT[],
    
    -- 성장 관련 정보
    growth_info JSONB, -- {calcium: "450mg", protein: "35g", ...}
    
    -- 관리
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_recipes_order ON recipes(order_index);
CREATE INDEX idx_recipes_published ON recipes(is_published);

-- ================================================
-- 8. 성장 관리 사례 테이블 (growth_cases)
-- ================================================
CREATE TABLE IF NOT EXISTS growth_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    patient_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    birth_date DATE NOT NULL,
    
    -- 부모 신체 정보
    father_height DECIMAL(5,2),
    mother_height DECIMAL(5,2),
    target_height DECIMAL(5,2),
    
    -- 특이사항
    special_notes TEXT,
    
    -- 종합 치료 메모
    treatment_memo TEXT,
    
    -- 측정 기록 (JSONB 배열)
    measurements JSONB NOT NULL, -- [{date: "2025-01-15", height: 145, weight: 40, memo: "..."}, ...]
    
    -- 관리
    is_published BOOLEAN DEFAULT true,
    order_index INTEGER,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_cases_gender ON growth_cases(gender);
CREATE INDEX idx_cases_published ON growth_cases(is_published);
CREATE INDEX idx_cases_order ON growth_cases(order_index);

-- ================================================
-- 9. 성장 가이드 테이블 (growth_guides)
-- ================================================
CREATE TABLE IF NOT EXISTS growth_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    title TEXT NOT NULL,
    subtitle TEXT,
    icon TEXT, -- 이모지
    image_url TEXT,
    
    -- 내용
    content TEXT NOT NULL,
    category TEXT, -- 영양, 운동, 수면, 성장호르몬 등
    
    -- 배너 정보
    banner_color TEXT, -- 배경색
    order_index INTEGER NOT NULL,
    
    -- 관리
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_guides_category ON growth_guides(category);
CREATE INDEX idx_guides_published ON growth_guides(is_published);
CREATE INDEX idx_guides_order ON growth_guides(order_index);

-- ================================================
-- 10. 챌린지 테이블 (challenges)
-- ================================================
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- 챌린지 정보
    challenge_date DATE NOT NULL,
    challenge_type TEXT NOT NULL, -- 'exercise', 'nutrition', 'sleep' 등
    
    -- 기록
    completed BOOLEAN DEFAULT false,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_challenges_child_id ON challenges(child_id);
CREATE INDEX idx_challenges_date ON challenges(challenge_date DESC);
CREATE INDEX idx_challenges_type ON challenges(challenge_type);

-- ================================================
-- 11. 공지사항 테이블 (announcements)
-- ================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- 중요도
    is_important BOOLEAN DEFAULT false,
    
    -- 관리
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_announcements_published ON announcements(is_published);
CREATE INDEX idx_announcements_important ON announcements(is_important);

-- ================================================
-- 트리거: updated_at 자동 업데이트
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 모든 테이블에 트리거 적용
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_required_info_updated_at BEFORE UPDATE ON child_required_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_optional_male_updated_at BEFORE UPDATE ON child_optional_male FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_optional_female_updated_at BEFORE UPDATE ON child_optional_female FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON growth_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON growth_guides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Row Level Security (RLS) 설정
-- ================================================

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_required_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_optional_male ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_optional_female ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS 정책: users
-- ================================================
-- 부모는 자기 자신만 조회 가능
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- 의사/관리자는 모든 사용자 조회 가능
CREATE POLICY "Doctors and admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('doctor', 'admin')
        )
    );

-- 사용자는 자기 정보만 수정 가능
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- ================================================
-- RLS 정책: children
-- ================================================
-- 부모는 자기 아이만 조회 가능
CREATE POLICY "Parents can view own children"
    ON children FOR SELECT
    USING (parent_id = auth.uid());

-- 의사/관리자는 모든 아이 조회 가능
CREATE POLICY "Doctors and admins can view all children"
    ON children FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('doctor', 'admin')
        )
    );

-- 부모는 자기 아이만 추가/수정/삭제 가능
CREATE POLICY "Parents can manage own children"
    ON children FOR ALL
    USING (parent_id = auth.uid());

-- ================================================
-- RLS 정책: measurements
-- ================================================
-- 부모는 자기 아이의 측정 기록만 조회 가능
CREATE POLICY "Parents can view own children measurements"
    ON measurements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = measurements.child_id
            AND children.parent_id = auth.uid()
        )
    );

-- 의사/관리자는 모든 측정 기록 조회 가능
CREATE POLICY "Doctors and admins can view all measurements"
    ON measurements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('doctor', 'admin')
        )
    );

-- 의사/관리자만 측정 기록 추가 가능
CREATE POLICY "Doctors and admins can insert measurements"
    ON measurements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('doctor', 'admin')
        )
    );

-- ================================================
-- RLS 정책: recipes, growth_cases, growth_guides
-- ================================================
-- 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view published recipes"
    ON recipes FOR SELECT
    USING (is_published = true);

CREATE POLICY "Anyone can view published cases"
    ON growth_cases FOR SELECT
    USING (is_published = true);

CREATE POLICY "Anyone can view published guides"
    ON growth_guides FOR SELECT
    USING (is_published = true);

-- 관리자만 추가/수정/삭제 가능
CREATE POLICY "Admins can manage recipes"
    ON recipes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage cases"
    ON growth_cases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage guides"
    ON growth_guides FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ================================================
-- RLS 정책: challenges
-- ================================================
-- 부모는 자기 아이의 챌린지만 조회/관리 가능
CREATE POLICY "Parents can manage own children challenges"
    ON challenges FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = challenges.child_id
            AND children.parent_id = auth.uid()
        )
    );

-- ================================================
-- 샘플 데이터 삽입 (테스트용)
-- ================================================

-- 관리자 계정 (UUID는 Supabase Auth에서 생성됨)
-- INSERT INTO users (id, email, name, role) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'admin@187growth.com', '관리자', 'admin');

-- 성장 가이드 샘플 데이터는 별도 파일에서 삽입 예정
