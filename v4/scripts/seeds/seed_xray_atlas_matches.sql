-- ============================================================
-- Seed: synthesize xray_readings for every visit with bone_age
-- (no actual X-ray image — atlas-matched references only)
-- Idempotent: deletes prior auto-seeded readings first.
-- ============================================================

DO $$
DECLARE
  v_parent_id uuid;
  v_child_id  uuid;
  v_visit_id  uuid;
BEGIN
  SELECT id INTO v_parent_id FROM users WHERE email = 'cases@187growth.com';
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'demo parent missing — run seed_treatment_cases.sql first';
  END IF;

  -- 채유건 (5 readings)
  SELECT id INTO v_child_id FROM children WHERE parent_id = v_parent_id AND name = '채유건';
  DELETE FROM xray_readings WHERE child_id = v_child_id AND image_path IS NULL;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2021-07-14' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2021-07-14', 12.0, 'male/M_11-9.webp', 'male/M_12-3.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2022-02-22' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2022-02-22', 12.0, 'male/M_11-9.webp', 'male/M_12-3.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2022-12-02' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2022-12-02', 12.75, 'male/M_12-3.webp', 'male/M_13-2.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-05-01' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-05-01', 13.17, 'male/M_12-3.webp', 'male/M_13-2.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-01-08' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-01-08', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;

  -- 송윤우 (8 readings)
  SELECT id INTO v_child_id FROM children WHERE parent_id = v_parent_id AND name = '송윤우';
  DELETE FROM xray_readings WHERE child_id = v_child_id AND image_path IS NULL;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2020-09-22' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2020-09-22', 10.25, 'male/M_09-9.webp', 'male/M_10-3.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2022-06-13' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2022-06-13', 12.67, 'male/M_12-3.webp', 'male/M_13-2.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2022-09-06' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2022-09-06', 12.5, 'male/M_12-3.webp', 'male/M_13-2.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-02-20' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-02-20', 13.33, 'male/M_13-2.webp', 'male/M_13-4.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-09-12' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-09-12', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-05-24' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-05-24', 13.58, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-10-04' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-10-04', 14.25, 'male/M_13-8.webp', 'male/M_14-5.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2025-03-20' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2025-03-20', 14.67, 'male/M_14-5.webp', 'male/M_15-1.webp');
  END IF;

  -- 이재윤 (8 readings)
  SELECT id INTO v_child_id FROM children WHERE parent_id = v_parent_id AND name = '이재윤';
  DELETE FROM xray_readings WHERE child_id = v_child_id AND image_path IS NULL;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2021-03-06' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2021-03-06', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2021-09-25' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2021-09-25', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2022-02-08' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2022-02-08', 13.33, 'male/M_13-2.webp', 'male/M_13-4.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2022-10-15' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2022-10-15', 13.33, 'male/M_13-2.webp', 'male/M_13-4.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-04-08' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-04-08', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-10-14' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-10-14', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-04-27' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-04-27', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-10-05' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-10-05', 13.67, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;

  -- 박민찬 (8 readings)
  SELECT id INTO v_child_id FROM children WHERE parent_id = v_parent_id AND name = '박민찬';
  DELETE FROM xray_readings WHERE child_id = v_child_id AND image_path IS NULL;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2021-09-18' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2021-09-18', 11.67, 'male/M_11-6.webp', 'male/M_11-9.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2022-04-04' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2022-04-04', 12.0, 'male/M_11-9.webp', 'male/M_12-3.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2022-11-16' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2022-11-16', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-05-01' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-05-01', 13.42, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-11-06' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-11-06', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-03-02' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-03-02', 13.67, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-09-13' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-09-13', 13.67, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2025-05-18' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2025-05-18', 14.25, 'male/M_13-8.webp', 'male/M_14-5.webp');
  END IF;

  -- 유지훈 (6 readings)
  SELECT id INTO v_child_id FROM children WHERE parent_id = v_parent_id AND name = '유지훈';
  DELETE FROM xray_readings WHERE child_id = v_child_id AND image_path IS NULL;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-07-08' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-07-08', 12.5, 'male/M_12-3.webp', 'male/M_13-2.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-01-02' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-01-02', 12.0, 'male/M_11-9.webp', 'male/M_12-3.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-06-08' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-06-08', 13.25, 'male/M_13-2.webp', 'male/M_13-4.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-12-11' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-12-11', 13.25, 'male/M_13-2.webp', 'male/M_13-4.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2025-06-07' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2025-06-07', 13.25, 'male/M_13-2.webp', 'male/M_13-4.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2026-01-24' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2026-01-24', 13.33, 'male/M_13-2.webp', 'male/M_13-4.webp');
  END IF;

  -- 유세희 (6 readings)
  SELECT id INTO v_child_id FROM children WHERE parent_id = v_parent_id AND name = '유세희';
  DELETE FROM xray_readings WHERE child_id = v_child_id AND image_path IS NULL;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-07-08' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-07-08', 10.5, 'female/F_10-5.webp', 'female/F_10-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-01-08' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-01-08', 10.83, 'female/F_10-8.webp', 'female/F_11-1.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-06-28' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-06-28', 10.83, 'female/F_10-8.webp', 'female/F_11-1.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-12-28' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-12-28', 11.33, 'female/F_11-1.webp', 'female/F_11-7.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2025-06-04' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2025-06-04', 11.33, 'female/F_11-1.webp', 'female/F_11-7.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2026-01-20' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2026-01-20', 11.75, 'female/F_11-7.webp', 'female/F_12-1.webp');
  END IF;

  -- 다나카고키 (6 readings)
  SELECT id INTO v_child_id FROM children WHERE parent_id = v_parent_id AND name = '다나카고키';
  DELETE FROM xray_readings WHERE child_id = v_child_id AND image_path IS NULL;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2021-09-07' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2021-09-07', 12.58, 'male/M_12-3.webp', 'male/M_13-2.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-01-10' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-01-10', 13.08, 'male/M_12-3.webp', 'male/M_13-2.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2023-07-17' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2023-07-17', 13.25, 'male/M_13-2.webp', 'male/M_13-4.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-01-05' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-01-05', 13.5, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2024-07-05' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2024-07-05', 13.67, 'male/M_13-4.webp', 'male/M_13-8.webp');
  END IF;
  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = '2025-02-01' LIMIT 1;
  IF v_visit_id IS NOT NULL THEN
    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)
      VALUES (v_visit_id, v_child_id, '2025-02-01', 13.83, 'male/M_13-8.webp', 'male/M_14-5.webp');
  END IF;

END $$;

SELECT '47 xray_readings seeded' AS status;