-- ============================================================
-- Seed random lifestyle data (daily_routines + exercise_logs) for every
-- child. Roughly 70% of days between first and last visit get a record.
-- Meals are intentionally skipped — will be handled later.
-- Safe to re-run (ON CONFLICT DO NOTHING on daily_routines).
-- ============================================================

DO $$
DECLARE
  r            RECORD;
  first_visit  DATE;
  last_visit   DATE;
  span_end     DATE;
  cur_date     DATE;
  new_routine  UUID;
  sleep_h      INT;
  wake_h       INT;
  quality      TEXT;
  mood         TEXT;
  water_ml     INT;
  basic_sup    TEXT[];
  extra_sup    TEXT[];
  inject       BOOLEAN;
  inject_at    TIME;
  note_text    TEXT;
  ex_count     INT;
  ex_name      TEXT;
  ex_library   TEXT[] := ARRAY[
    '성장 스트레칭 · 목/어깨',
    '성장 스트레칭 · 다리 뒤',
    '성장 스트레칭 · 전신',
    '점프 · 줄넘기',
    '점프 · 제자리 뛰기',
    '점프 · 박스 점프',
    '유산소 · 자전거',
    '유산소 · 수영',
    '유산소 · 달리기',
    '근력 · 팔굽혀펴기',
    '근력 · 플랭크',
    '근력 · 스쿼트',
    '구기 · 농구',
    '구기 · 축구',
    '구기 · 배드민턴'
  ];
BEGIN
  FOR r IN SELECT id FROM children WHERE is_active = TRUE LOOP
    SELECT MIN(visit_date), MAX(visit_date)
      INTO first_visit, last_visit
      FROM visits
     WHERE child_id = r.id;

    IF first_visit IS NULL THEN CONTINUE; END IF;

    span_end := LEAST(last_visit, CURRENT_DATE);
    IF span_end < first_visit THEN span_end := first_visit; END IF;

    cur_date := first_visit;
    WHILE cur_date <= span_end LOOP
      IF random() < 0.7 THEN
        sleep_h   := 21 + floor(random() * 3)::int;
        wake_h    := 6  + floor(random() * 3)::int;
        quality   := (ARRAY['good','good','normal','normal','bad'])[floor(random()*5)::int + 1];
        mood      := (ARRAY['happy','happy','normal','normal','tired','sad','sick'])[floor(random()*7)::int + 1];
        water_ml  := 800 + floor(random() * 1400)::int;
        inject    := random() < 0.25;
        inject_at := CASE WHEN inject THEN make_time(20 + floor(random()*3)::int, 0, 0) ELSE NULL END;

        basic_sup := CASE floor(random() * 5)::int
          WHEN 0 THEN ARRAY['비타민D']::text[]
          WHEN 1 THEN ARRAY['비타민D','아연']::text[]
          WHEN 2 THEN ARRAY['비타민D','아연','오메가3']::text[]
          WHEN 3 THEN ARRAY['칼슘','비타민D']::text[]
          ELSE        ARRAY['프로바이오틱스','비타민D']::text[]
        END;

        IF random() < 0.35 THEN
          extra_sup := CASE floor(random() * 4)::int
            WHEN 0 THEN ARRAY['밀크씨슬']::text[]
            WHEN 1 THEN ARRAY['철분']::text[]
            WHEN 2 THEN ARRAY['마그네슘']::text[]
            ELSE        ARRAY['루테인']::text[]
          END;
        ELSE
          extra_sup := ARRAY[]::text[];
        END IF;

        note_text := CASE
          WHEN random() < 0.15 THEN '컨디션 좋음'
          WHEN random() < 0.15 THEN '저녁 늦게 잠듦'
          WHEN random() < 0.15 THEN '학원 숙제 많음'
          WHEN random() < 0.15 THEN '운동 후 피곤'
          ELSE NULL
        END;

        INSERT INTO daily_routines (
          child_id, routine_date,
          sleep_time, wake_time, sleep_quality,
          water_intake_ml,
          basic_supplements, extra_supplements,
          growth_injection, injection_time,
          daily_notes, mood
        ) VALUES (
          r.id, cur_date,
          make_time(sleep_h, 0, 0),
          make_time(wake_h, (floor(random()*4)::int)*10, 0),
          quality,
          water_ml,
          basic_sup, extra_sup,
          inject, inject_at,
          note_text, mood
        )
        ON CONFLICT (child_id, routine_date) DO NOTHING
        RETURNING id INTO new_routine;

        IF new_routine IS NOT NULL THEN
          IF random() < 0.65 THEN
            ex_count := 1 + floor(random() * 3)::int;
            FOR i IN 1..ex_count LOOP
              ex_name := ex_library[floor(random() * array_length(ex_library, 1))::int + 1];
              INSERT INTO exercise_logs (
                daily_routine_id, exercise_name, duration_minutes, completed
              ) VALUES (
                new_routine,
                ex_name,
                10 + floor(random() * 50)::int,
                random() < 0.8
              );
            END LOOP;
          END IF;
        END IF;
      END IF;

      cur_date := cur_date + 1;
    END LOOP;
  END LOOP;
END $$;

SELECT
  (SELECT COUNT(*) FROM daily_routines) AS routines_total,
  (SELECT COUNT(*) FROM exercise_logs)  AS exercises_total;
