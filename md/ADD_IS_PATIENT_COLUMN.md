# is_patient 컬럼 추가 가이드

## 📋 개요

children 테이블에 **병원 환자 여부**를 구분하는 `is_patient` 컬럼을 추가합니다.

---

## 🎯 목적

- ✅ 병원 환자와 일반 사용자 구분
- ✅ 환자 전용 기능 제공 (예: 진료 기록, 처방 등)
- ✅ 통계 분석 시 환자/일반 사용자 필터링

---

## 📊 스키마 변경

### Before
```sql
CREATE TABLE children (
    id UUID PRIMARY KEY,
    parent_id UUID REFERENCES users(id),
    name VARCHAR(100),
    gender VARCHAR(10),
    birth_date DATE,
    ...
);
```

### After
```sql
CREATE TABLE children (
    id UUID PRIMARY KEY,
    parent_id UUID REFERENCES users(id),
    name VARCHAR(100),
    gender VARCHAR(10),
    birth_date DATE,
    ...
    is_patient BOOLEAN DEFAULT false  -- ✨ 신규
);
```

---

## 🚀 적용 방법

### Step 1: Supabase 대시보드 접속
1. https://supabase.com 로그인
2. 프로젝트 선택
3. **SQL Editor** 메뉴 클릭

### Step 2: Migration SQL 실행
```sql
-- is_patient 컬럼 추가
ALTER TABLE children 
ADD COLUMN is_patient BOOLEAN DEFAULT false;

-- 컬럼 설명 추가
COMMENT ON COLUMN children.is_patient IS '병원 환자 여부 (true: 환자, false: 일반 사용자)';

-- 인덱스 추가 (성능 향상)
CREATE INDEX idx_children_is_patient ON children(is_patient);
```

### Step 3: 기존 환자 데이터 업데이트 (선택)
```sql
-- 기존 45명의 환자를 모두 is_patient = true로 설정
UPDATE children SET is_patient = true;
```

### Step 4: 확인
```sql
SELECT 
    COUNT(*) as total_children,
    SUM(CASE WHEN is_patient = true THEN 1 ELSE 0 END) as patient_count,
    SUM(CASE WHEN is_patient = false THEN 1 ELSE 0 END) as non_patient_count
FROM children;
```

**예상 결과:**
```
total_children | patient_count | non_patient_count
---------------|---------------|------------------
45             | 45            | 0
```

---

## 💻 프론트엔드 수정

### 1. 아이 등록 시 is_patient 포함

**파일:** `js/main.js` (또는 아이 등록 로직)

```javascript
// 아이 데이터 생성 시
const childData = {
    parent_id: userId,
    name: name,
    gender: gender,
    birth_date: birthDate,
    is_patient: true,  // ✨ 추가
    // ...
};

// Supabase 저장
const { data, error } = await supabase
    .from('children')
    .insert([childData]);
```

### 2. 환자만 필터링

```javascript
// 환자만 조회
const { data: patients } = await supabase
    .from('children')
    .select('*')
    .eq('is_patient', true);

// 일반 사용자만 조회
const { data: nonPatients } = await supabase
    .from('children')
    .select('*')
    .eq('is_patient', false);
```

### 3. UI에서 환자 표시

```javascript
// 아이 목록 렌더링
children.forEach(child => {
    const badge = child.is_patient 
        ? '<span class="badge-patient">환자</span>' 
        : '<span class="badge-user">일반</span>';
    
    html += `
        <div class="child-card">
            <h3>${child.name} ${badge}</h3>
            ...
        </div>
    `;
});
```

---

## 📝 사용 예시

### 1. 환자 전용 기능 제한
```javascript
if (child.is_patient) {
    // 환자 전용 기능
    showMedicalRecords();
    showPrescriptions();
} else {
    // 일반 사용자 기능
    showBasicGrowthTracking();
}
```

### 2. 통계 분리
```javascript
// 환자 통계
const patientStats = await getStats({ is_patient: true });

// 일반 사용자 통계
const userStats = await getStats({ is_patient: false });
```

### 3. 관리자 페이지 필터링
```html
<select id="userTypeFilter">
    <option value="all">전체</option>
    <option value="true">환자만</option>
    <option value="false">일반 사용자만</option>
</select>
```

```javascript
const filter = document.getElementById('userTypeFilter').value;
let query = supabase.from('children').select('*');

if (filter !== 'all') {
    query = query.eq('is_patient', filter === 'true');
}

const { data } = await query;
```

---

## 🔍 확인 쿼리

### 환자/일반 사용자 수
```sql
SELECT 
    COUNT(*) FILTER (WHERE is_patient = true) as patients,
    COUNT(*) FILTER (WHERE is_patient = false) as non_patients
FROM children;
```

### 부모별 환자/일반 사용자
```sql
SELECT 
    u.email,
    u.name as parent_name,
    COUNT(c.id) as total_children,
    COUNT(c.id) FILTER (WHERE c.is_patient = true) as patients,
    COUNT(c.id) FILTER (WHERE c.is_patient = false) as non_patients
FROM users u
LEFT JOIN children c ON u.id = c.parent_id
GROUP BY u.id, u.email, u.name
ORDER BY total_children DESC;
```

### 환자 목록
```sql
SELECT 
    c.name as child_name,
    c.birth_date,
    u.email as parent_email,
    u.name as parent_name
FROM children c
JOIN users u ON c.parent_id = u.id
WHERE c.is_patient = true
ORDER BY c.created_at DESC;
```

---

## ✅ 완료 체크리스트

- [ ] Supabase SQL Editor에서 migration 실행
- [ ] 기존 환자 데이터 `is_patient = true` 업데이트
- [ ] 인덱스 생성 확인
- [ ] 확인 쿼리 실행해서 결과 확인
- [ ] 프론트엔드 코드에 is_patient 추가
- [ ] 테스트: 새 아이 등록 시 is_patient 저장 확인
- [ ] 테스트: 환자 필터링 동작 확인

---

## 🎉 완료!

이제 병원 환자와 일반 사용자를 구분할 수 있습니다!

**다음 단계:**
- 환자 전용 기능 개발
- 진료 기록 관리
- 처방전 관리
- 환자별 맞춤 통계
