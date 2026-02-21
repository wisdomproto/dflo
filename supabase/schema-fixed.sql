-- ================================================
-- 187 성장케어 - Supabase 데이터베이스 스키마 (수정 버전)
-- ================================================
-- 생성일: 2026-01-31
-- 설명: 개발 환경용 - RLS 없이 테이블만 생성
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

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
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_birth_date ON children(birth_date);

-- ================================================
-- 3. 측정 기록 테이블 (measurements)
-- ================================================
CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    measured_date DATE NOT NULL,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    bmi DECIMAL(5,2),
    bone_age DECIMAL(4,1),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_measurements_child_id ON measurements(child_id);
CREATE INDEX IF NOT EXISTS idx_measurements_date ON measurements(measured_date);

-- ================================================
-- 4. 건강 레시피 테이블 (recipes)
-- ================================================
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    ingredients JSONB,
    cooking_steps JSONB,
    nutrition_info JSONB,
    cooking_time INTEGER,
    difficulty TEXT,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (category 제외)
CREATE INDEX IF NOT EXISTS idx_recipes_published ON recipes(is_published);
CREATE INDEX IF NOT EXISTS idx_recipes_order ON recipes(order_index);

-- ================================================
-- 5. 성장 관리 사례 테이블 (growth_cases)
-- ================================================
CREATE TABLE IF NOT EXISTS growth_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    start_age DECIMAL(4,1),
    end_age DECIMAL(4,1),
    start_height DECIMAL(5,2),
    end_height DECIMAL(5,2),
    height_increase DECIMAL(5,2),
    treatment_period TEXT,
    treatment_method TEXT,
    before_percentile DECIMAL(5,2),
    after_percentile DECIMAL(5,2),
    case_summary TEXT,
    measurements_data JSONB,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cases_gender ON growth_cases(gender);
CREATE INDEX IF NOT EXISTS idx_cases_published ON growth_cases(is_published);
CREATE INDEX IF NOT EXISTS idx_cases_order ON growth_cases(order_index);

-- ================================================
-- 6. 성장 가이드 테이블 (growth_guides)
-- ================================================
CREATE TABLE IF NOT EXISTS growth_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    subtitle TEXT,
    content TEXT,
    image_url TEXT,
    reading_time TEXT,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_guides_category ON growth_guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_published ON growth_guides(is_published);
CREATE INDEX IF NOT EXISTS idx_guides_order ON growth_guides(order_index);

-- ================================================
-- 완료 메시지
-- ================================================
DO $$ 
BEGIN 
    RAISE NOTICE '✅ 테이블 생성 완료!';
    RAISE NOTICE '📋 생성된 테이블:';
    RAISE NOTICE '  - users (사용자)';
    RAISE NOTICE '  - children (아이 정보)';
    RAISE NOTICE '  - measurements (측정 기록)';
    RAISE NOTICE '  - recipes (건강 레시피)';
    RAISE NOTICE '  - growth_cases (성장 관리 사례)';
    RAISE NOTICE '  - growth_guides (성장 가이드)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ RLS(Row Level Security)는 비활성화 상태입니다.';
    RAISE NOTICE '🔒 프로덕션 배포 시 RLS를 활성화하세요.';
END $$;
