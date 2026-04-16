-- ============================================================
-- Seed: 7 treatment cases (from 치료 후기 케이스 xlsx)
-- Idempotent: drops existing children with these names first
-- ============================================================

DO $$
DECLARE
  v_parent_id uuid;
  v_child_id  uuid;
  v_visit_id  uuid;
BEGIN
  -- Demo parent that owns all case children
  SELECT id INTO v_parent_id FROM users WHERE email = 'cases@187growth.com';
  IF v_parent_id IS NULL THEN
    INSERT INTO users (email, name, role, password, is_active)
    VALUES ('cases@187growth.com', '치료 사례 보호자', 'parent', 'cases187!', true)
    RETURNING id INTO v_parent_id;
  END IF;

  -- ── 채유건 (M, 2010-11-27, 5 visits) ──
  DELETE FROM children WHERE parent_id = v_parent_id AND name = '채유건';
  INSERT INTO children (
    parent_id, name, gender, birth_date, father_height, mother_height, desired_height, is_active
  ) VALUES (
    v_parent_id, '채유건', 'male', '2010-11-27', NULL, NULL, NULL, true
  ) RETURNING id INTO v_child_id;

  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2021-07-14', '쌍둥이 아들 치료 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2021-07-14', 153.5, 54.0, 12.0, 173.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2022-02-22', '쌍둥이 아들 치료 케이스', '7.6cm/6개월 성장')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2022-02-22', 161.3, 62.8, 12.0, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2022-12-02', '쌍둥이 아들 치료 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2022-12-02', 166.1, 69.3, 12.75, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-05-01', '쌍둥이 아들 치료 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-05-01', 168.6, 72.8, 13.17, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-01-08', '쌍둥이 아들 치료 케이스', '골연령 역전 (BA < CA)
26년 3월 18일 186')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-01-08', 173.0, 78.8, 13.5, NULL);

  -- ── 송윤우 (M, 2011-06-12, 9 visits) ──
  DELETE FROM children WHERE parent_id = v_parent_id AND name = '송윤우';
  INSERT INTO children (
    parent_id, name, gender, birth_date, father_height, mother_height, desired_height, is_active
  ) VALUES (
    v_parent_id, '송윤우', 'male', '2011-06-12', 174.0, 160.0, NULL, true
  ) RETURNING id INTO v_child_id;

  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2020-09-22', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2020-09-22', 145.3, 44.0, 10.25, 176.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2021-06-08', '연예인 연습생& 최근 성장 속도 더딘 케이스', '6개월 검사 f/u')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2021-06-08', 152.0, 50.5, NULL, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2022-06-13', '연예인 연습생& 최근 성장 속도 더딘 케이스', '라면 1~3번 먹는다')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2022-06-13', 159.6, 53.6, 12.67, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2022-09-06', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2022-09-06', 164.1, 55.5, 12.5, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-02-20', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-02-20', 168.8, 59.7, 13.33, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-09-12', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-09-12', 172.6, 58.0, 13.5, 184.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-05-24', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-05-24', 175.5, 62.8, 13.58, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-10-04', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-10-04', 176.8, 64.0, 14.25, 184.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2025-03-20', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2025-03-20', 180.0, 65.6, 14.67, 185.0);

  -- ── 이재윤 (M, 2011-12-17, 8 visits) ──
  DELETE FROM children WHERE parent_id = v_parent_id AND name = '이재윤';
  INSERT INTO children (
    parent_id, name, gender, birth_date, father_height, mother_height, desired_height, is_active
  ) VALUES (
    v_parent_id, '이재윤', 'male', '2011-12-17', 180.0, NULL, 182.0, true
  ) RETURNING id INTO v_child_id;

  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2021-03-06', '성조숙증, 비만', '수면: good, 피로도: good, 운동: good')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2021-03-06', 147.8, 63.2, 13.5, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2021-09-25', '성조숙증, 비만', '메디기넨 리타드 5mg 처방')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2021-09-25', 155.6, 72.8, 13.5, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2022-02-08', '성조숙증, 비만', '잘 안커서 걱정. elbow: 14세')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2022-02-08', 158.1, 81.0, 13.33, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2022-10-15', '성조숙증, 비만', '① 채소 늘리자 ② 키 재자
수면 일찍 잔다')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2022-10-15', 165.0, 87.0, 13.33, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-04-08', '성조숙증, 비만', '수면 관리, 음식 관리, 운동 관리')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-04-08', 168.8, 88.0, 13.5, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-10-14', '성조숙증, 비만', '체중관리 필요')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-10-14', 173.2, 105.6, 13.5, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-04-27', '성조숙증, 비만', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-04-27', 174.7, 106.0, 13.5, 183.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-10-05', '성조숙증, 비만', '25년 10월 11일 182cm/101.6kg')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-10-05', 177.4, 113.8, 13.67, 185.0);

  -- ── 박민찬 (M, 2010-04-16, 8 visits) ──
  DELETE FROM children WHERE parent_id = v_parent_id AND name = '박민찬';
  INSERT INTO children (
    parent_id, name, gender, birth_date, father_height, mother_height, desired_height, is_active
  ) VALUES (
    v_parent_id, '박민찬', 'male', '2010-04-16', 168.0, 158.0, 185.0, true
  ) RETURNING id INTO v_child_id;

  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2021-09-18', '운동선수 준비 케이스
(부모 키가 작은 경우)', '1yr GG: 3cm, Est Ht: 173
elbow X-ray 시행 예정')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2021-09-18', 146.2, 43.0, 11.67, 173.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2022-04-04', '운동선수 준비 케이스
(부모 키가 작은 경우)', '늦게 잔다, 게임 안 한다
운동 10시간→7:30 길게 잔다. Z-style Ⅱ')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2022-04-04', 151.7, 47.5, 12.0, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2022-11-16', '운동선수 준비 케이스
(부모 키가 작은 경우)', '10:00→7:30 길게 잔다')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2022-11-16', 156.6, 50.6, 13.5, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-05-01', '운동선수 준비 케이스
(부모 키가 작은 경우)', '수면: 늦게 잔다, 11:00+→길게 잔다
음식: 참게 먹는다')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-05-01', 164.1, 50.2, 13.42, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-11-06', '운동선수 준비 케이스
(부모 키가 작은 경우)', '늑제 자고 길게 잔다.')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-11-06', 168.0, 60.0, 13.5, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-03-02', '운동선수 준비 케이스
(부모 키가 작은 경우)', '다음달 Arimidex 0.5T')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-03-02', 171.0, 61.8, 13.67, 181.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-09-13', '운동선수 준비 케이스
(부모 키가 작은 경우)', '길게, 채소 늘려라!')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-09-13', 173.6, 66.0, 13.67, 183.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2025-05-18', '운동선수 준비 케이스
(부모 키가 작은 경우)', '수면 good, 잘 먹는다.
26년 3월 2일, 176.8/75')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2025-05-18', 175.6, 68.3, 14.25, NULL);

  -- ── 유지훈 (M, 2012-03-31, 6 visits) ──
  DELETE FROM children WHERE parent_id = v_parent_id AND name = '유지훈';
  INSERT INTO children (
    parent_id, name, gender, birth_date, father_height, mother_height, desired_height, is_active
  ) VALUES (
    v_parent_id, '유지훈', 'male', '2012-03-31', 167.0, 160.0, 183.0, true
  ) RETURNING id INTO v_child_id;

  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-07-08', '해외에서 치료 받으로 온 케이스', '수면관리, 영양 관리
엘라스틴 1mg → good')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-07-08', 153.3, 40.6, 12.5, 177.3);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-01-02', '해외에서 치료 받으로 온 케이스', '길게 잔다, 채소 늘리고 있다
NSR: 3~5.5')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-01-02', 157.7, 41.2, 12.0, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-06-08', '해외에서 치료 받으로 온 케이스', '사춘기 사인 (변성기 등), 여드름 많다.
엘라스틴 2.5mg→3mg, Red meat, Omela 3mg')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-06-08', 161.8, 45.0, 13.25, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-12-11', '해외에서 치료 받으로 온 케이스', '루프린
5.8 IU')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-12-11', 165.9, 48.0, 13.25, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2025-06-07', '해외에서 치료 받으로 온 케이스', '수면 good, 음식 good')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2025-06-07', 168.7, 50.6, 13.25, 181.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2026-01-24', '해외에서 치료 받으로 온 케이스', '26년 3월 30일, 174.3cm/57.6kg')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2026-01-24', 172.8, 56.7, 13.33, 184.0);

  -- ── 유세희 (F, 2015-04-02, 6 visits) ──
  DELETE FROM children WHERE parent_id = v_parent_id AND name = '유세희';
  INSERT INTO children (
    parent_id, name, gender, birth_date, father_height, mother_height, desired_height, is_active
  ) VALUES (
    v_parent_id, '유세희', 'female', '2015-04-02', 167.0, 160.0, 165.0, true
  ) RETURNING id INTO v_child_id;

  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-07-08', '해외에서 치료 받으로 온 케이스', 'F: 169, M: 160, MPH: 157
① 수면관리 ② 체중 조절  ③ 루프린')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-07-08', 133.7, 31.8, 10.5, 156.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-01-08', '해외에서 치료 받으로 온 케이스', '잘잔다. 채소 늘리자.')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-01-08', 138.3, 31.8, 10.83, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-06-28', '해외에서 치료 받으로 온 케이스', 'deep sleep, 채소 잘 먹는다. 운동한다.
4.3 IU, PAH: 160~161')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-06-28', 142.8, 34.3, 10.83, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-12-28', '해외에서 치료 받으로 온 케이스', 'FSH: 0.9, LH: 0.5, E2: <5, IGF: 548
루프린 1.6개월, 4.7 IU')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-12-28', 147.2, 32.7, 11.33, 160.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2025-06-04', '해외에서 치료 받으로 온 케이스', 'CA: 10세2개월, BA: 11세3~4개월
PAH: 162cm, 루프린 사용기간: 1년11개월')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2025-06-04', 150.4, 40.8, 11.33, 162.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2026-01-20', '해외에서 치료 받으로 온 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2026-01-20', 155.7, 42.8, 11.75, NULL);

  -- ── 다나카고키 (M, 2009-01-29, 6 visits) ──
  DELETE FROM children WHERE parent_id = v_parent_id AND name = '다나카고키';
  INSERT INTO children (
    parent_id, name, gender, birth_date, father_height, mother_height, desired_height, is_active
  ) VALUES (
    v_parent_id, '다나카고키', 'male', '2009-01-29', 173.0, 168.0, 180.0, true
  ) RETURNING id INTO v_child_id;

  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2021-09-07', '연예인 연습생& 최근 성장 속도 더딘 케이스', 'Genetic Ht: 175, Est Ht: 167
외부 GPC 사용 중, 3~4년 치료')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2021-09-07', 146.6, 39.0, 12.58, 167.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-01-10', '연예인 연습생& 최근 성장 속도 더딘 케이스', '수면: 길게 한다, 음식: good')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-01-10', 161.0, 51.4, 13.08, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2023-07-17', '연예인 연습생& 최근 성장 속도 더딘 케이스', '수면: 길게 한다, 음식: good')
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2023-07-17', 165.8, 53.6, 13.25, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-01-05', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-01-05', 170.4, 57.1, 13.5, 180.0);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2024-07-05', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2024-07-05', 173.8, 58.8, 13.67, NULL);
  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)
    VALUES (v_child_id, '2025-02-01', '연예인 연습생& 최근 성장 속도 더딘 케이스', NULL)
    RETURNING id INTO v_visit_id;
  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)
    VALUES (v_visit_id, v_child_id, '2025-02-01', 175.6, 58.6, 13.83, NULL);

END $$;

SELECT '7 cases imported' AS status;