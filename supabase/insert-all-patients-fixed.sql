-- ================================================
-- 연세새봄의원 환자 데이터 전체 입력 (45명)
-- ================================================

-- 기존 데이터 삭제
DELETE FROM measurements;
DELETE FROM child_required_info;
DELETE FROM children;
DELETE FROM users WHERE role = 'parent';

-- ================================================
-- 환자 1: 여하원 (부모 ID: 1, 차트번호: 27376)
-- ================================================

INSERT INTO users (name, email, password, phone, role)
VALUES ('여하원_부모', '24-0001@example.com', '1234', '010-0000-0000', 'parent');

DO $$
DECLARE
    parent_id_1 UUID;
    child_id_1 UUID;
BEGIN
    SELECT id INTO parent_id_1 FROM users WHERE email = '24-0001@example.com';
    
    INSERT INTO children (parent_id, name, birth_date, gender)
    VALUES (parent_id_1, '여하원', '2011-01-18', 'male')
    RETURNING id INTO child_id_1;
    
    INSERT INTO child_required_info (child_id, father_height, mother_height, target_height)
    VALUES (child_id_1, 170, 156, 180);
    
    INSERT INTO measurements (child_id, measured_date, height, weight, actual_age, bone_age, pah, notes)
    VALUES 
        (child_id_1, '2023-04-25', 155.7, 58.6, 12.25, 13.17, 172, '-알레르기 비염 있음. 1년전 타병원 PAH 176cm'),
        (child_id_1, '2023-11-07', 161.6, 63.1, 12.75, 13.3, NULL, ''),
        (child_id_1, '2023-12-05', 162.6, 63.8, NULL, NULL, NULL, '아리미덱스 처방 시작'),
        (child_id_1, '2024-04-13', 166.4, 70.1, 13.17, 13.42, 175.6, ''),
        (child_id_1, '2024-10-19', 172, 76.9, 13.75, 13.6, NULL, '채소섭취량 늘리도록 권장'),
        (child_id_1, '2025-01-20', 174.8, 78.5, 14.0, 13.5, 185, ''),
        (child_id_1, '2025-07-25', 177.9, 87.2, 14.5, 13.5, NULL, '체중조절 권유');
END $$;

-- ================================================
-- 환자 2: 이동윤 (부모 ID: 2, 차트번호: 22120)
-- ================================================

INSERT INTO users (name, email, password, phone, role)
VALUES ('이동윤_부모', '24-0002@example.com', '1234', '010-0000-0000', 'parent');

DO $$
DECLARE
    parent_id_2 UUID;
    child_id_2 UUID;
BEGIN
    SELECT id INTO parent_id_2 FROM users WHERE email = '24-0002@example.com';
    
    INSERT INTO children (parent_id, name, birth_date, gender)
    VALUES (parent_id_2, '이동윤', '2007-08-08', 'male')
    RETURNING id INTO child_id_2;
    
    INSERT INTO child_required_info (child_id, father_height, mother_height, target_height)
    VALUES (child_id_2, 181, 161, 184);
    
    INSERT INTO measurements (child_id, measured_date, height, weight, actual_age, bone_age, pah, notes)
    VALUES 
        (child_id_2, '2018-10-22', 145.8, 40, 11.17, 12.17, 170, ''),
        (child_id_2, '2019-07-15', 152.9, 43, 11.92, 12.42, NULL, ''),
        (child_id_2, '2020-01-28', 159.5, 47, 12.5, 12.83, NULL, ''),
        (child_id_2, '2021-01-25', 168.9, 59, 13.42, 13.25, NULL, ''),
        (child_id_2, '2021-12-07', 175.9, 61, 14.25, 13.83, NULL, '아리미덱스 처방 시작'),
        (child_id_2, '2022-03-30', 176.8, 63, 14.58, NULL, NULL, ''),
        (child_id_2, '2022-09-28', 178.5, 65.8, NULL, NULL, NULL, ''),
        (child_id_2, '2023-04-24', NULL, NULL, NULL, NULL, 183, '치료종료');
END $$;

-- ================================================
-- 환자 3: 구본철 (부모 ID: 3, 차트번호: 26007)
-- ================================================

INSERT INTO users (name, email, password, phone, role)
VALUES ('구본철_부모', '24-0003@example.com', '1234', '010-0000-0000', 'parent');

DO $$
DECLARE
    parent_id_3 UUID;
    child_id_3 UUID;
BEGIN
    SELECT id INTO parent_id_3 FROM users WHERE email = '24-0003@example.com';
    
    INSERT INTO children (parent_id, name, birth_date, gender)
    VALUES (parent_id_3, '구본철', '2006-12-08', 'male')
    RETURNING id INTO child_id_3;
    
    INSERT INTO child_required_info (child_id, father_height, mother_height, target_height)
    VALUES (child_id_3, 183, 156, 180);
    
    INSERT INTO measurements (child_id, measured_date, height, weight, actual_age, bone_age, pah, notes)
    VALUES 
        (child_id_3, '2021-08-10', 167.5, 65, 14.67, 14.17, 176, ''),
        (child_id_3, '2021-12-06', 169.6, 66, NULL, NULL, NULL, '아리미덱스 처방 시작'),
        (child_id_3, '2022-03-05', 171.7, 69, 15.25, NULL, NULL, ''),
        (child_id_3, '2022-09-17', 174.7, 74.5, 15.75, NULL, NULL, ''),
        (child_id_3, '2023-02-28', 175.5, 74.2, NULL, NULL, NULL, ''),
        (child_id_3, '2023-05-23', 177.5, 80.4, NULL, NULL, NULL, '');
END $$;

-- ================================================
-- 환자 4: 권시현 (부모 ID: 4, 차트번호: 25465)
-- ================================================

INSERT INTO users (name, email, password, phone, role)
VALUES ('권시현_부모', '24-0004@example.com', '1234', '010-0000-0000', 'parent');

DO $$
DECLARE
    parent_id_4 UUID;
    child_id_4 UUID;
BEGIN
    SELECT id INTO parent_id_4 FROM users WHERE email = '24-0004@example.com';
    
    INSERT INTO children (parent_id, name, birth_date, gender)
    VALUES (parent_id_4, '권시현', '2008-10-17', 'female')
    RETURNING id INTO child_id_4;
    
    INSERT INTO child_required_info (child_id, father_height, mother_height, target_height)
    VALUES (child_id_4, 169, 159, 165);
    
    INSERT INTO measurements (child_id, measured_date, height, weight, actual_age, bone_age, pah, notes)
    VALUES 
        (child_id_4, '2020-11-27', 157.1, 45, 12.08, 13.08, 162, '초경 아직 시작안함'),
        (child_id_4, '2021-04-03', 159.6, 43, 12.42, NULL, NULL, ''),
        (child_id_4, '2021-06-05', 160.9, 44, NULL, NULL, NULL, ''),
        (child_id_4, '2021-10-04', 162.4, 45, 13.08, NULL, NULL, ''),
        (child_id_4, '2022-06-11', 164, 45, NULL, NULL, NULL, '갑상선기능항진이 있었다.');
END $$;

-- ================================================
-- 환자 5: 강제인 (부모 ID: 5, 차트번호: 27803)
-- ================================================

INSERT INTO users (name, email, password, phone, role)
VALUES ('강제인_부모', '24-0005@example.com', '1234', '010-0000-0000', 'parent');

DO $$
DECLARE
    parent_id_5 UUID;
    child_id_5 UUID;
BEGIN
    SELECT id INTO parent_id_5 FROM users WHERE email = '24-0005@example.com';
    
    INSERT INTO children (parent_id, name, birth_date, gender)
    VALUES (parent_id_5, '강제인', '2012-06-17', 'female')
    RETURNING id INTO child_id_5;
    
    INSERT INTO child_required_info (child_id, father_height, mother_height, target_height)
    VALUES (child_id_5, 176, 162, 163);
    
    INSERT INTO measurements (child_id, measured_date, height, weight, actual_age, bone_age, pah, notes)
    VALUES 
        (child_id_5, '2024-01-30', 148, 36.4, 11.0, 12.25, 157, '지난 주 초경시작. 루프린 병행 바로 시작. 2년전 타병원서 뼈나이 +8개월 진단. 수면이 좋지 못한 편'),
        (child_id_5, '2024-07-30', 151.3, 38.5, 12.08, 12.5, 158, ''),
        (child_id_5, '2025-01-17', 153.4, 40.9, NULL, 12.67, 159, ''),
        (child_id_5, '2025-06-21', 155.4, 39.5, NULL, NULL, NULL, ''),
        (child_id_5, '2025-07-16', 154.4, 39.3, 13.0, 13.33, 160, '오후 측정 키'),
        (child_id_5, '2025-08-05', 155.8, 39, NULL, NULL, NULL, '해외 체류 중 감기몸살로 주사 못맞음. 생리 아직 없어요');
END $$;

-- 완료 메시지
SELECT '✅ 5명의 환자 데이터 입력 완료!' AS result;
