-- ============================================================
-- Seed random meals for every daily_routine row.
-- Rating mapping into is_healthy (boolean):
--   good     → true
--   moderate → null
--   bad      → false
-- Per day: 3–5 meals. Safe to re-run (wipes meals first).
-- ============================================================

TRUNCATE meals CASCADE;

DO $$
DECLARE
  r          RECORD;
  meal_count INT;
  i          INT;
  mtype      TEXT;
  rating     INT;
  is_h       BOOLEAN;
  desc_pool  TEXT[] := ARRAY[
    '잡곡밥, 김치, 계란말이',
    '된장찌개, 밥, 나물',
    '김치찌개, 밥',
    '비빔밥',
    '불고기덮밥',
    '삼계탕',
    '제육볶음, 밥',
    '연어구이, 감자',
    '고등어구이, 밥',
    '갈치조림, 밥',
    '돈까스, 샐러드',
    '김밥, 떡볶이',
    '짜장면, 탕수육',
    '라면, 김밥',
    '피자, 콜라',
    '치킨, 우유',
    '햄버거, 감자튀김',
    '스파게티, 샐러드',
    '오므라이스',
    '닭가슴살 샐러드',
    '고구마, 바나나',
    '빵, 우유',
    '시리얼, 우유',
    '요거트, 과일',
    '과일 (바나나/사과)',
    '간식: 초콜릿, 과자',
    '간식: 견과류',
    '간식: 아이스크림'
  ];
  type_pool  TEXT[] := ARRAY['breakfast','lunch','dinner','snack'];
BEGIN
  FOR r IN SELECT id FROM daily_routines LOOP
    meal_count := 3 + floor(random() * 3)::int;
    FOR i IN 1..meal_count LOOP
      IF i <= 3 THEN
        mtype := type_pool[i];
      ELSE
        mtype := 'snack';
      END IF;

      rating := CASE
        WHEN random() < 0.4 THEN 2
        WHEN random() < 0.67 THEN 1
        ELSE 0
      END;
      is_h := CASE rating
        WHEN 2 THEN TRUE
        WHEN 0 THEN FALSE
        ELSE NULL
      END;

      INSERT INTO meals (
        daily_routine_id, meal_type, meal_time, description, is_healthy
      ) VALUES (
        r.id,
        mtype,
        make_time(7 + i*3, (floor(random()*4)::int)*15, 0),
        desc_pool[floor(random() * array_length(desc_pool, 1))::int + 1],
        is_h
      );
    END LOOP;
  END LOOP;
END $$;

SELECT
  (SELECT COUNT(*) FROM meals)                             AS meals_total,
  (SELECT COUNT(*) FROM meals WHERE is_healthy IS TRUE)    AS good_count,
  (SELECT COUNT(*) FROM meals WHERE is_healthy IS NULL)    AS moderate_count,
  (SELECT COUNT(*) FROM meals WHERE is_healthy IS FALSE)   AS bad_count;
