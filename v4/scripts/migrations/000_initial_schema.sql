-- ============================================================
-- 000: Initial schema for fresh Supabase project
-- 187 성장케어 v4 — patient DB unified with BoneAgeAI integration
-- Run this ONCE on a brand-new Supabase project.
-- After this, run seed_admin.sql to create the admin account.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. users (legacy plaintext auth — role-based)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id        uuid,
  email          text UNIQUE NOT NULL,
  name           text NOT NULL,
  phone          text,
  role           text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent','doctor','admin')),
  password       text NOT NULL,            -- legacy plaintext (TODO: move to Supabase auth)
  memo           text,
  is_active      boolean NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- 2. children (patients — every child is a patient)
-- ============================================================
CREATE TABLE IF NOT EXISTS children (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  name_en         text,
  gender          text NOT NULL CHECK (gender IN ('male','female')),
  birth_date      date NOT NULL,
  birth_week      integer,
  birth_weight    numeric(4,2),
  birth_notes     text,
  father_height   numeric(5,1),
  mother_height   numeric(5,1),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

-- ============================================================
-- 3. medications (drug master) — referenced by prescriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          text NOT NULL,
  default_dose  text,
  unit          text,
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medications_code ON medications(code);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(is_active) WHERE is_active = true;

-- ============================================================
-- 4. visits (hospital-data hub)
-- ============================================================
CREATE TABLE IF NOT EXISTS visits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id         uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  visit_date       date NOT NULL,
  doctor_id        uuid REFERENCES users(id),
  chief_complaint  text,
  plan             text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visits_child ON visits(child_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);

-- ============================================================
-- 5. hospital_measurements
-- ============================================================
CREATE TABLE IF NOT EXISTS hospital_measurements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id            uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id            uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  measured_date       date NOT NULL,
  height              numeric(5,1) NOT NULL,
  weight              numeric(5,2),
  actual_age          numeric(5,2),
  bone_age            numeric(4,2),
  pah                 numeric(5,1),
  height_percentile   numeric(5,2),
  weight_percentile   numeric(5,2),
  bmi                 numeric(5,2),
  notes               text,
  doctor_notes        text,
  created_by          uuid REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hm_visit ON hospital_measurements(visit_id);
CREATE INDEX IF NOT EXISTS idx_hm_child_date ON hospital_measurements(child_id, measured_date DESC);

-- ============================================================
-- 6. xray_readings (BoneAgeAI output)
-- ============================================================
CREATE TABLE IF NOT EXISTS xray_readings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id              uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id              uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  xray_date             date NOT NULL,
  image_path            text,
  bone_age_result       numeric(4,2),
  atlas_match_younger   text,
  atlas_match_older     text,
  doctor_memo           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xray_visit ON xray_readings(visit_id);
CREATE INDEX IF NOT EXISTS idx_xray_child_date ON xray_readings(child_id, xray_date DESC);

-- ============================================================
-- 7. lab_tests (polymorphic via test_type + JSONB result_data)
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_tests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id        uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  test_type       text NOT NULL CHECK (test_type IN ('allergy','organic_acid','blood')),
  collected_date  date,
  result_date     date,
  result_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  doctor_memo     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lab_visit ON lab_tests(visit_id);
CREATE INDEX IF NOT EXISTS idx_lab_child_type ON lab_tests(child_id, test_type, collected_date DESC);

-- ============================================================
-- 8. prescriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  child_id        uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  medication_id   uuid NOT NULL REFERENCES medications(id),
  dose            text,
  frequency       text,
  duration_days   integer,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rx_visit ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_rx_child ON prescriptions(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rx_medication ON prescriptions(medication_id);

-- ============================================================
-- 9. daily_routines (lifestyle — self-entered)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_routines (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id             uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  routine_date         date NOT NULL,
  daily_height         numeric(5,1),
  daily_weight         numeric(5,2),
  sleep_time           time,
  wake_time            time,
  sleep_quality        text CHECK (sleep_quality IN ('good','normal','bad')),
  sleep_notes          text,
  water_intake_ml      integer,
  basic_supplements    text[] DEFAULT '{}',
  extra_supplements    text[] DEFAULT '{}',
  growth_injection     boolean NOT NULL DEFAULT false,
  injection_time       time,
  injection_notes      text,
  daily_notes          text,
  mood                 text CHECK (mood IN ('happy','normal','sad','tired','sick')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, routine_date)
);
CREATE INDEX IF NOT EXISTS idx_routines_child_date ON daily_routines(child_id, routine_date DESC);

-- ============================================================
-- 10. meals + meal_photos + meal_analyses
-- ============================================================
CREATE TABLE IF NOT EXISTS meals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_routine_id  uuid NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
  meal_type         text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  meal_time         time,
  description       text,
  is_healthy        boolean,
  portion_size      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meals_routine ON meals(daily_routine_id);

CREATE TABLE IF NOT EXISTS meal_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id      uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  photo_url    text NOT NULL,
  file_name    text,
  file_size    integer,
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meal_photos_meal ON meal_photos(meal_id);

CREATE TABLE IF NOT EXISTS meal_analyses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id       uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  menu_name     text NOT NULL,
  ingredients   text[] DEFAULT '{}',
  calories      integer,
  carbs         numeric(6,2),
  protein       numeric(6,2),
  fat           numeric(6,2),
  growth_score  numeric(4,1),
  advice        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meal_analyses_meal ON meal_analyses(meal_id);

-- ============================================================
-- 11. exercise_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS exercise_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_routine_id  uuid NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
  exercise_name     text NOT NULL,
  duration_minutes  integer,
  completed         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exlogs_routine ON exercise_logs(daily_routine_id);

-- ============================================================
-- 12. exercises (reference library)
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category          text NOT NULL,
  name              text NOT NULL,
  description       text,
  youtube_url       text,
  thumbnail_url     text,
  duration_minutes  integer,
  difficulty        text,
  target_age_min    integer,
  target_age_max    integer,
  order_index       integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. recipes / growth_guides / growth_cases (content)
-- ============================================================
CREATE TABLE IF NOT EXISTS recipes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_number         text,
  title                 text NOT NULL,
  image_url             text,
  key_benefits          text,
  main_nutrients        text[] DEFAULT '{}',
  ingredients           text[] DEFAULT '{}',
  steps                 text[] DEFAULT '{}',
  tips                  jsonb DEFAULT '[]'::jsonb,
  growth_info           jsonb DEFAULT '{}'::jsonb,
  cooking_time_minutes  integer,
  difficulty            text,
  order_index           integer NOT NULL DEFAULT 0,
  is_featured           boolean NOT NULL DEFAULT false,
  is_published          boolean NOT NULL DEFAULT false,
  created_by            uuid REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipes_published ON recipes(is_published, order_index) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS growth_guides (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  subtitle       text,
  icon           text,
  category       text,
  image_url      text,
  content        text NOT NULL,
  banner_color   text,
  order_index    integer NOT NULL DEFAULT 0,
  is_featured    boolean NOT NULL DEFAULT false,
  is_published   boolean NOT NULL DEFAULT false,
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guides_published ON growth_guides(is_published, order_index) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS growth_cases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_number     text,
  patient_name     text NOT NULL,
  gender           text NOT NULL CHECK (gender IN ('male','female')),
  birth_date       date,
  father_height    numeric(5,1),
  mother_height    numeric(5,1),
  target_height    numeric(5,1),
  special_notes    text,
  treatment_memo   text,
  image_url        text,
  measurements     jsonb DEFAULT '[]'::jsonb,
  order_index      integer NOT NULL DEFAULT 0,
  is_featured      boolean NOT NULL DEFAULT false,
  is_published     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cases_published ON growth_cases(is_published, order_index) WHERE is_published = true;

-- ============================================================
-- 14. Row Level Security
-- NOTE: v4 uses legacy auth (users.password plaintext, no Supabase auth).
-- Policies are PERMISSIVE for anon/authenticated reads and service_role full.
-- Tighten to parent_id = auth.uid() after Supabase auth migration.
-- ============================================================
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE children              ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xray_readings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_routines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_photos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_analyses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_guides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_cases          ENABLE ROW LEVEL SECURITY;

-- service_role bypass (admin pages use service_role key via ai-server or direct)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users','children','visits','hospital_measurements','xray_readings','lab_tests',
    'medications','prescriptions','daily_routines','meals','meal_photos','meal_analyses',
    'exercise_logs','exercises','recipes','growth_guides','growth_cases'
  ]) LOOP
    EXECUTE format('CREATE POLICY "svc_all_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Public/anon read for published content (recipes, guides, cases, exercises)
CREATE POLICY "pub_read_recipes"       ON recipes        FOR SELECT TO authenticated, anon USING (is_published = true);
CREATE POLICY "pub_read_guides"        ON growth_guides  FOR SELECT TO authenticated, anon USING (is_published = true);
CREATE POLICY "pub_read_cases"         ON growth_cases   FOR SELECT TO authenticated, anon USING (is_published = true);
CREATE POLICY "pub_read_exercises"     ON exercises      FOR SELECT TO authenticated, anon USING (is_active = true);

-- Permissive read on patient-owned tables (app uses anon key; tighten later)
CREATE POLICY "perm_read_users"                 ON users                 FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_children"              ON children              FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_visits"                ON visits                FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_hospital_measurements" ON hospital_measurements FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_xray_readings"         ON xray_readings         FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_lab_tests"             ON lab_tests             FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_prescriptions"         ON prescriptions         FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_daily_routines"        ON daily_routines        FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_meals"                 ON meals                 FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_meal_photos"           ON meal_photos           FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_meal_analyses"         ON meal_analyses         FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "perm_read_exercise_logs"         ON exercise_logs         FOR SELECT TO authenticated, anon USING (true);

-- Permissive writes for patient-owned tables (app uses anon key; tighten later)
CREATE POLICY "perm_write_users"          ON users          FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_children"       ON children       FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_daily_routines" ON daily_routines FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_meals"          ON meals          FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_meal_photos"    ON meal_photos    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_meal_analyses"  ON meal_analyses  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "perm_write_exercise_logs"  ON exercise_logs  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Admin-only writes for clinical tables (must go through service_role)
-- Hospital tables: SELECT only for anon/auth (parent reads own child's data once tightened).
-- No INSERT/UPDATE/DELETE policy for anon/auth → service_role is required for writes.
-- This enforces that clinical edits only happen via admin tooling with the service key.

-- ============================================================
-- 15. Storage buckets + policies
-- ============================================================

-- content-images (public, 5MB) — guides/recipes/cases images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('content-images', 'content-images', true, 5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- meal-photos (public, 5MB) — patient meal uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meal-photos', 'meal-photos', true, 5242880,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- xray-images (PRIVATE, 10MB) — PHI, signed URL only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('xray-images', 'xray-images', false, 10485760,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
-- Public read for public buckets
CREATE POLICY "pub_read_content_images" ON storage.objects FOR SELECT USING (bucket_id = 'content-images');
CREATE POLICY "pub_read_meal_photos"    ON storage.objects FOR SELECT USING (bucket_id = 'meal-photos');

-- Authenticated + anon can write to public buckets (app uses anon key)
CREATE POLICY "auth_write_content_images" ON storage.objects FOR INSERT TO authenticated, anon WITH CHECK (bucket_id = 'content-images');
CREATE POLICY "auth_update_content_images" ON storage.objects FOR UPDATE TO authenticated, anon USING (bucket_id = 'content-images');
CREATE POLICY "auth_delete_content_images" ON storage.objects FOR DELETE TO authenticated, anon USING (bucket_id = 'content-images');

CREATE POLICY "auth_write_meal_photos" ON storage.objects FOR INSERT TO authenticated, anon WITH CHECK (bucket_id = 'meal-photos');
CREATE POLICY "auth_update_meal_photos" ON storage.objects FOR UPDATE TO authenticated, anon USING (bucket_id = 'meal-photos');
CREATE POLICY "auth_delete_meal_photos" ON storage.objects FOR DELETE TO authenticated, anon USING (bucket_id = 'meal-photos');

-- xray-images: authenticated read + write (signed URL for clients), service_role full
CREATE POLICY "auth_read_xray"    ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'xray-images');
CREATE POLICY "auth_write_xray"   ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'xray-images');
CREATE POLICY "auth_update_xray"  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'xray-images');
CREATE POLICY "service_all_xray"  ON storage.objects FOR ALL TO service_role USING (bucket_id = 'xray-images') WITH CHECK (bucket_id = 'xray-images');

-- ============================================================
-- Done.
-- Next: run seed_admin.sql (or `node v4/scripts/create_admin.mjs`)
-- to create the admin@187growth.com account.
-- ============================================================
