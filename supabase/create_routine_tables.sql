-- ================================================
-- 루틴 관련 테이블 생성 (meals, meal_photos, exercise_logs)
-- daily_routines는 이미 존재함 → 건너뜀
-- Supabase SQL Editor에서 실행하세요
-- ================================================

-- 1. meals (식사 기록)
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

-- 2. meal_photos (식사 사진)
CREATE TABLE IF NOT EXISTS meal_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meal_photos_meal_id ON meal_photos(meal_id);

-- 3. exercise_logs (운동 기록)
CREATE TABLE IF NOT EXISTS exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    exercise_name VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,
    completed BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_daily_routine_id ON exercise_logs(daily_routine_id);

-- 4. 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('meals', 'meal_photos', 'exercise_logs')
ORDER BY table_name;
