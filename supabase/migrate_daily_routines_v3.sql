-- ================================================
-- Migration: DB를 v3 스키마에 맞게 변환
-- 기존 migration_create_daily_routines.sql (old) → schema_v3.sql (new)
-- Supabase SQL Editor에서 실행하세요
-- ================================================

-- ================================================
-- Part 1: daily_routines 테이블 수정
-- ================================================

-- 1. 기존 컬럼명 변경 (이미 존재하는 컬럼)
ALTER TABLE daily_routines RENAME COLUMN water_amount TO water_intake_ml;
ALTER TABLE daily_routines RENAME COLUMN supplements TO basic_supplements;
ALTER TABLE daily_routines RENAME COLUMN notes TO daily_notes;

-- 2. 새 컬럼 추가
ALTER TABLE daily_routines ADD COLUMN IF NOT EXISTS daily_height DECIMAL(5,2);
ALTER TABLE daily_routines ADD COLUMN IF NOT EXISTS daily_weight DECIMAL(5,2);
ALTER TABLE daily_routines ADD COLUMN IF NOT EXISTS sleep_notes TEXT;
ALTER TABLE daily_routines ADD COLUMN IF NOT EXISTS extra_supplements JSONB;
ALTER TABLE daily_routines ADD COLUMN IF NOT EXISTS injection_notes TEXT;

-- 3. sleep_quality 제약 조건 제거 (old: CHECK IN Excellent/Good/Fair/Poor → new: 자유 문자열)
ALTER TABLE daily_routines DROP CONSTRAINT IF EXISTS daily_routines_sleep_quality_check;

-- 4. 불필요한 old 컬럼 삭제
ALTER TABLE daily_routines DROP COLUMN IF EXISTS age_at_routine;
ALTER TABLE daily_routines DROP COLUMN IF EXISTS predicted_height_basic;
ALTER TABLE daily_routines DROP COLUMN IF EXISTS bone_age;
ALTER TABLE daily_routines DROP COLUMN IF EXISTS predicted_height_bone_age;
ALTER TABLE daily_routines DROP COLUMN IF EXISTS measurement_notes;
ALTER TABLE daily_routines DROP COLUMN IF EXISTS height;
ALTER TABLE daily_routines DROP COLUMN IF EXISTS weight;
ALTER TABLE daily_routines DROP COLUMN IF EXISTS meals;
ALTER TABLE daily_routines DROP COLUMN IF EXISTS exercises;

-- ================================================
-- Part 2: meals 테이블 (없으면 생성)
-- ================================================
CREATE TABLE IF NOT EXISTS meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    meal_time TIME,
    description TEXT,
    is_healthy BOOLEAN,
    portion_size VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meals_daily_routine_id ON meals(daily_routine_id);
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals(meal_type);

-- ================================================
-- Part 3: meal_photos 테이블 (없으면 생성)
-- ================================================
CREATE TABLE IF NOT EXISTS meal_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meal_photos_meal_id ON meal_photos(meal_id);

-- ================================================
-- Part 4: exercises 마스터 테이블 (없으면 생성)
-- ================================================
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    youtube_url TEXT,
    thumbnail_url TEXT,
    duration_minutes INTEGER,
    difficulty VARCHAR(20),
    target_age_min INTEGER,
    target_age_max INTEGER,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);

-- ================================================
-- Part 5: exercise_logs 테이블 (없으면 생성)
-- ================================================
CREATE TABLE IF NOT EXISTS exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id),
    exercise_name VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,
    completed BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_daily_routine_id ON exercise_logs(daily_routine_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON exercise_logs(exercise_id);

-- ================================================
-- Part 6: 확인
-- ================================================
SELECT 'daily_routines columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'daily_routines'
ORDER BY ordinal_position;

SELECT 'Tables check:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('daily_routines', 'meals', 'meal_photos', 'exercises', 'exercise_logs')
ORDER BY table_name;
