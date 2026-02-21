# 🚀 빠른 실행 가이드 (순서대로)

## ⚠️ 중요: 실행 순서

47번 사용자를 생성하기 전에 **먼저 `is_patient` 컬럼을 추가**해야 합니다!

---

## 📋 실행 순서

### 1단계: is_patient 컬럼 추가 (필수!)

#### Supabase SQL Editor 접속:
```
1. https://supabase.com
2. 프로젝트 선택
3. SQL Editor 클릭
```

#### 마이그레이션 실행:
```sql
-- supabase/migration_add_is_patient.sql 내용

-- 1. is_patient 컬럼 추가 (기본값: false)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_patient BOOLEAN DEFAULT false;

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN users.is_patient IS '병원 환자 여부 (true: 병원 환자, false: 일반 사용자)';

-- 3. 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_is_patient ON users(is_patient);
```

#### 성공 메시지:
```
✅ is_patient 컬럼 추가 완료!
```

---

### 2단계: 1~46번 환자를 모두 병원 환자로 설정

#### SQL 실행:
```sql
-- scripts/update_all_patients_hospital.sql 실행

-- 1~46번 모든 환자를 병원 환자로 설정
UPDATE users
SET is_patient = true
WHERE email IN (
    '0001@example.com',
    '0002@example.com',
    '0003@example.com',
    '0004@example.com',
    '0005@example.com',
    '0006@example.com',
    '0007@example.com',
    '0008@example.com',
    '0009@example.com',
    '0010@example.com',
    '0011@example.com',
    '0012@example.com',
    '0013@example.com',
    '0014@example.com',
    '0015@example.com',
    '0016@example.com',
    '0017@example.com',
    '0018@example.com',
    '0019@example.com',
    '0020@example.com',
    '0021@example.com',
    '0022@example.com',
    '0023@example.com',
    '0024@example.com',
    '0025@example.com',
    '0026@example.com',
    '0027@example.com',
    '0028@example.com',
    '0029@example.com',
    '0030@example.com',
    '0031@example.com',
    '0032@example.com',
    '0033@example.com',
    '0034@example.com',
    '0035@example.com',
    '0036@example.com',
    '0037@example.com',
    '0038@example.com',
    '0039@example.com',
    '0040@example.com',
    '0041@example.com',
    '0042@example.com',
    '0043@example.com',
    '0044@example.com',
    '0045@example.com',
    '0046@example.com'
);

-- 확인
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_patient = true) as hospital_patients,
    COUNT(*) FILTER (WHERE is_patient = false) as general_users
FROM users
WHERE role = 'parent';
```

#### 성공 메시지:
```
✅ 1~46번 환자를 모두 병원 환자로 설정 완료!

total_users | hospital_patients | general_users
    46      |        46         |       0
```

---

### 3단계: 47번 일반 사용자 생성

#### SQL 실행:
```
1. 같은 SQL Editor에서
2. scripts/create_patient_47.sql 내용 복사
3. 붙여넣기
4. Run 클릭
```

#### 성공 메시지:
```
✅ 47번 일반 사용자 및 데일리 루틴 데이터 생성 완료!
```

---

## ✅ 확인 방법

### 1. 전체 통계 확인

```sql
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_patient = true) as hospital_patients,
    COUNT(*) FILTER (WHERE is_patient = false) as general_users
FROM users
WHERE role = 'parent';
```

**예상 결과:**
```
total_users | hospital_patients | general_users
    47      |        46         |       1
```

---

### 2. 환자 타입별 목록 확인

```sql
-- 병원 환자 (46명)
SELECT email, name, '🏥 병원환자' as 타입
FROM users
WHERE role = 'parent' AND is_patient = true
ORDER BY email;

-- 결과: 0001@example.com ~ 0046@example.com (46명)

-- 일반 사용자 (1명)
SELECT email, name, '👤 일반사용자' as 타입
FROM users
WHERE role = 'parent' AND is_patient = false
ORDER BY email;

-- 결과: 0047@example.com (1명)
```

---

### 2. 47번 사용자 확인

```sql
-- 부모 정보
SELECT id, email, name, is_patient
FROM users
WHERE email = '0047@example.com';

-- 자녀 정보
SELECT c.name, c.gender, c.birth_date
FROM children c
JOIN users u ON c.parent_id = u.id
WHERE u.email = '0047@example.com';

-- 데이터 개수
SELECT 
    (SELECT COUNT(*) FROM measurements WHERE child_id = (SELECT id FROM children WHERE name = '박성장')) as 측정기록,
    (SELECT COUNT(*) FROM daily_routines WHERE child_id = (SELECT id FROM children WHERE name = '박성장')) as 루틴기록;
```

**예상 결과:**
```
email: 0047@example.com
name: 테스트 일반사용자47
is_patient: false

자녀: 박성장 (female, 2012-08-20)
측정기록: 7
루틴기록: 10
```

---

### 3. 관리자 페이지 테스트

```bash
python -m http.server 8000
```

```
http://localhost:8000/admin-dashboard.html
비밀번호: 1234
```

#### 체크리스트:
- [ ] 필터 테스트:
  - "전체" → 47개
  - "🏥 병원환자" → 46개 (1~46번)
  - "👤 일반사용자" → 1개 (47번만)
- [ ] 47번 검색: "테스트 일반사용자47"
- [ ] 배지 확인: **👤 일반사용자** (회색)
- [ ] 1~46번 검색: 모두 **🏥 병원환자** (파란색)

---

### 4. 로그인 테스트

#### 병원 환자 로그인 (1~46번):
```
http://localhost:8000/
부모 ID: 1 (또는 2~46)
비밀번호: 1234
→ 루틴 페이지 이동
```

**예상 결과:**
- ✅ "기본 측정" 탭 표시
- ✅ "자세히 측정" 탭 표시
- ✅ "성장 주사" 섹션 표시

#### 일반 사용자 로그인 (47번):
```
http://localhost:8000/
부모 ID: 47
비밀번호: 1234
→ 루틴 페이지 이동
```

**예상 결과:**
- ✅ "기본 측정" 탭만 표시
- ❌ "자세히 측정" 탭 숨김
- ❌ "성장 주사" 섹션 숨김

---

## 🐛 문제 해결

### 에러 1: "column is_patient does not exist"

**원인**: 1단계를 실행하지 않았음

**해결**: 
```sql
-- 1단계 마이그레이션을 먼저 실행
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_patient BOOLEAN DEFAULT false;
```

---

### 에러 2: "duplicate key value"

**원인**: 47번 사용자가 이미 존재

**해결**:
```sql
-- 기존 데이터 삭제
DELETE FROM daily_routines 
WHERE child_id IN (SELECT id FROM children WHERE parent_id IN (SELECT id FROM users WHERE email = '0047@example.com'));

DELETE FROM measurements 
WHERE child_id IN (SELECT id FROM children WHERE parent_id IN (SELECT id FROM users WHERE email = '0047@example.com'));

DELETE FROM children 
WHERE parent_id IN (SELECT id FROM users WHERE email = '0047@example.com');

DELETE FROM users WHERE email = '0047@example.com';

-- 다시 실행
```

---

## 📊 최종 확인

### 병원 환자 vs 일반 사용자

```sql
-- 병원 환자 (11명)
SELECT email, name, '🏥 병원환자' as 타입
FROM users
WHERE is_patient = true
ORDER BY email;

-- 결과:
-- 0001@example.com ~ 0010@example.com (10명)
-- 0046@example.com (1명)

-- 일반 사용자 (36명)
SELECT email, name, '👤 일반사용자' as 타입
FROM users
WHERE is_patient = false OR is_patient IS NULL
ORDER BY email;

-- 결과:
-- 0011@example.com ~ 0045@example.com (35명)
-- 0047@example.com (1명)
```

---

## 🎉 완료!

```
✅ 1단계: is_patient 컬럼 추가 완료
✅ 2단계: 47번 일반 사용자 생성 완료
✅ 테스트: 관리자 페이지 확인 완료
✅ 테스트: 로그인 및 루틴 페이지 확인 완료
```

**다음 단계:**
- Ctrl + Shift + R (강력 새로고침)
- 관리자 페이지에서 필터 테스트
- 47번으로 로그인하여 조건부 UI 확인

---

**작성 일시**: 2026-02-04  
**상태**: ✅ 준비 완료
