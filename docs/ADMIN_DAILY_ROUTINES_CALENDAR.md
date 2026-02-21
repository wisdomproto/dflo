# 📅 관리자 데일리 루틴 달력 가이드

## 📋 개요

관리자 페이지에서 환자의 데일리 루틴을 **달력 형식**으로 한눈에 볼 수 있는 기능입니다.

---

## 🎯 주요 기능

### 1. **📅 월별 달력 뷰**

한 달 단위로 데일리 루틴을 시각화합니다.

```
┌─────────────────────────────┐
│  ◀ 이전   2026년 2월   다음 ▶ │
├─────────────────────────────┤
│  일  월  화  수  목  금  토  │
│                    1   2   3  │
│  4   5   6   7   8   9  10  │
│ 11  12  13  14  15  16  17  │
│ 18  19  20  21  22  23  24  │
│ 25  26  27  28               │
└─────────────────────────────┘
```

**기능:**
- ⏮️ **이전/다음 버튼**: 월 이동
- 🎯 **오늘 날짜**: 파란색 테두리로 강조
- 📊 **데이터 있는 날**: 카테고리 배지 표시
- 📭 **데이터 없는 날**: "기록 없음" 표시

---

### 2. **🎨 카테고리별 색상 코딩**

각 카테고리를 직관적인 색상으로 구분합니다.

| 카테고리 | 색상 | 아이콘 | 설명 |
|---------|------|--------|------|
| **식단** | 🔵 파란색 (#3b82f6) | 🍽️ | 식사 횟수 표시 |
| **영양제** | 🟢 초록색 (#10b981) | 💊 | 영양제 개수 표시 |
| **수면** | 🟣 보라색 (#8b5cf6) | 😴 | 수면 기록 표시 |
| **운동** | 🟠 주황색 (#f59e0b) | 🏃 | 운동 개수 표시 |
| **성장주사** | 🔴 빨간색 (#ef4444) | 💉 | 투여 여부 표시 |

**범례:**
```
🔵 식단  🟢 영양제  🟣 수면  🟠 운동  🔴 성장주사
```

---

### 3. **📊 날짜별 요약 정보**

각 날짜 칸에 다음 정보가 표시됩니다:

```
┌─────────────────┐
│      22         │  ← 날짜
├─────────────────┤
│ 🍽️ 식사 3끼    │  ← 식단
│ 💊 영양제 3개   │  ← 영양제
│ 😴 수면         │  ← 수면
│ 🏃 운동 2개     │  ← 운동
│ 💉 주사         │  ← 성장주사
├─────────────────┤
│ 📏 172.3 cm    │  ← 키
│ ⚖️ 61.2 kg     │  ← 몸무게
└─────────────────┘
```

---

### 4. **🔍 상세 정보 모달**

날짜를 클릭하면 전체 정보를 확인할 수 있는 모달이 표시됩니다.

#### 모달 구조:

```
┌──────────────────────────────────┐
│  📅 데일리 루틴 상세          × │
├──────────────────────────────────┤
│                                  │
│  📆 날짜                         │
│  2026-01-22                      │
│                                  │
│  📏 신체 측정                    │
│  키: 172.3 cm                    │
│  몸무게: 61.2 kg                 │
│  예측키: 179.5 cm                │
│  뼈나이: 12.3세                  │
│                                  │
│  😴 수면                         │
│  취침: 22:30                     │
│  기상: 07:00                     │
│  수면 품질: 😊 좋음              │
│                                  │
│  💧 수분 섭취                    │
│  1800 ml                         │
│                                  │
│  🍽️ 식사 (3끼)                  │
│  07:30 - 아침                    │
│  계란 2개, 우유 1잔, 샐러드      │
│  품질: 좋음                      │
│  ...                             │
│                                  │
│  🏃 운동 (2개)                   │
│  축구 - 60분                     │
│  스트레칭 - 15분                 │
│                                  │
│  💊 영양제 (3개)                 │
│  칼슘 비타민D 아연              │
│                                  │
│  💉 성장 주사                    │
│  ✅ 투여됨 (21:00)              │
│                                  │
│  😊 기분                         │
│  😊 좋음                         │
│                                  │
│  📝 메모                         │
│  오늘 축구 연습 열심히 했음      │
│                                  │
├──────────────────────────────────┤
│           [닫기]                 │
└──────────────────────────────────┘
```

---

## 🚀 사용 방법

### 1. **관리자 페이지 접속**

```
http://localhost:8000/admin-dashboard.html
```

비밀번호: `1234`

### 2. **환자 검색**

검색창에 환자 이름 또는 부모 이름 입력:
```
예: "테스트 부모46" 또는 "김성장"
```

### 3. **상세 보기 클릭**

환자 카드의 "👁️ 상세보기" 버튼 클릭

### 4. **달력 확인**

- 자녀 카드 아래에 "📅 데일리 루틴" 섹션 자동 표시
- 현재 월의 달력과 데이터 자동 로드

### 5. **월 이동**

- **◀ 이전** 버튼: 이전 달로 이동
- **다음 ▶** 버튼: 다음 달로 이동

### 6. **상세 정보 보기**

- 데이터가 있는 날짜 클릭
- 모달에서 전체 정보 확인
- "닫기" 버튼 또는 모달 외부 클릭으로 닫기

### 7. **새로고침**

- "🔄 새로고침" 버튼: 현재 달 데이터 재로드

---

## 💻 기술 구조

### 파일 구조:

```
js/
  ├── admin.js (메인 관리자 로직)
  ├── admin-daily-routines-calendar.js (달력 로직)
  
css/
  ├── admin-daily-routines-calendar.css (달력 스타일)
  
admin-dashboard.html (관리자 페이지)
```

### 주요 함수:

#### 1. `loadDailyRoutinesCalendar(childId)`
```javascript
// 특정 아이의 현재 달 데일리 루틴 달력 로드
await loadDailyRoutinesCalendar('child-id-here');
```

#### 2. `changeMonth(childId, year, month)`
```javascript
// 월 변경
await changeMonth('child-id-here', 2026, 1); // 2026년 2월
```

#### 3. `showRoutineDetailModal(routineId)`
```javascript
// 루틴 상세 모달 표시
await showRoutineDetailModal('routine-id-here');
```

#### 4. `closeRoutineDetailModal()`
```javascript
// 모달 닫기
closeRoutineDetailModal();
```

---

## 🎨 커스터마이징

### 색상 변경:

`css/admin-daily-routines-calendar.css` 파일에서 색상 수정:

```css
/* 식단 색상 변경 */
.category-badge[style*="3b82f6"] {
    background: #your-color;
    border-left-color: #your-color;
}
```

### 달력 크기 조정:

```css
.calendar-day {
    min-height: 140px; /* 기본값: 140px */
    /* 더 크게: 180px */
    /* 더 작게: 100px */
}
```

### 카테고리 아이콘 변경:

`js/admin-daily-routines-calendar.js` 파일의 `renderCalendarDay()` 함수:

```javascript
// 식단 아이콘 변경
icon: '🍽️', // → '🍴', '🥗', '🍱' 등으로 변경
```

---

## 📊 데이터 구조

### Supabase `daily_routines` 테이블:

```sql
SELECT 
    id,
    child_id,
    routine_date,
    height,
    weight,
    sleep_time,
    wake_time,
    sleep_quality,
    water_amount,
    meals,         -- JSONB array
    exercises,     -- JSONB array
    supplements,   -- JSONB array
    growth_injection,
    injection_time,
    mood,
    notes
FROM daily_routines
WHERE child_id = 'child-id'
  AND routine_date >= '2026-02-01'
  AND routine_date <= '2026-02-29'
ORDER BY routine_date ASC;
```

---

## ✅ 테스트 체크리스트

### 기본 기능:
- [ ] 관리자 페이지 접속
- [ ] 환자 검색 및 상세보기
- [ ] 달력 자동 로드
- [ ] 현재 달 데이터 표시

### 달력 네비게이션:
- [ ] "이전" 버튼 클릭 → 이전 달 로드
- [ ] "다음" 버튼 클릭 → 다음 달 로드
- [ ] 오늘 날짜 강조 표시
- [ ] 데이터 없는 날 "기록 없음" 표시

### 카테고리 표시:
- [ ] 🔵 식단 배지 표시
- [ ] 🟢 영양제 배지 표시
- [ ] 🟣 수면 배지 표시
- [ ] 🟠 운동 배지 표시
- [ ] 🔴 성장주사 배지 표시
- [ ] 📏 키/몸무게 표시

### 상세 모달:
- [ ] 날짜 클릭 시 모달 열림
- [ ] 모든 정보 정확히 표시
- [ ] "닫기" 버튼 동작
- [ ] 모달 외부 클릭 시 닫힘

### 반응형:
- [ ] 데스크톱 (1920px)
- [ ] 노트북 (1366px)
- [ ] 타블렛 (768px)
- [ ] 모바일 (375px)

---

## 🐛 트러블슈팅

### 1. **달력이 표시되지 않음**

**확인 사항:**
- [ ] `js/admin-daily-routines-calendar.js` 로드 확인
- [ ] `css/admin-daily-routines-calendar.css` 로드 확인
- [ ] 콘솔에서 에러 확인

**해결 방법:**
```javascript
// 콘솔에서 확인
console.log(typeof loadDailyRoutinesCalendar); // "function"이어야 함
```

### 2. **데이터가 로드되지 않음**

**확인 사항:**
- [ ] Supabase 연결 확인
- [ ] `daily_routines` 테이블에 데이터 존재 확인
- [ ] `child_id` 일치 확인

**해결 방법:**
```javascript
// 콘솔에서 데이터 확인
const { data } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('child_id', 'child-id-here');
console.log(data);
```

### 3. **모달이 열리지 않음**

**확인 사항:**
- [ ] `showRoutineDetailModal` 함수 전역 노출 확인
- [ ] `routine.id` 값 확인

**해결 방법:**
```javascript
// 콘솔에서 확인
console.log(typeof showRoutineDetailModal); // "function"이어야 함
```

---

## 📈 성능 최적화

### 1. **데이터 캐싱**

```javascript
// 캐시 구조
const routineCache = {
    'child-id': {
        '2026-02': [...routines],
        '2026-01': [...routines]
    }
};

// 캐시 확인 후 로드
if (routineCache[childId]?.[monthKey]) {
    renderCalendar(container, childId, year, month, routineCache[childId][monthKey]);
} else {
    // Supabase에서 로드
}
```

### 2. **지연 로딩**

```javascript
// 자녀별로 달력을 순차적으로 로드
children.forEach((child, index) => {
    setTimeout(() => {
        loadDailyRoutinesCalendar(child.id);
    }, index * 200); // 200ms 간격
});
```

---

## 🚀 다음 단계

### 단기 개선:
1. ✅ 달력 UI 완성
2. ⏳ 데이터 캐싱 구현
3. ⏳ 인쇄 기능 추가
4. ⏳ 엑셀 내보내기 기능

### 장기 개선:
1. ⏳ 통계 차트 추가
2. ⏳ 비교 기능 (월별 비교, 자녀 간 비교)
3. ⏳ 필터링 기능 (카테고리별 필터)
4. ⏳ 알림 기능 (누락된 기록 알림)

---

## 📝 참고 문서

- **46번째 환자 가이드**: [scripts/PATIENT_46_QUICKSTART.md](../scripts/PATIENT_46_QUICKSTART.md)
- **데일리 루틴 달력 개편**: [ROUTINE_CALENDAR_UPGRADE.md](../ROUTINE_CALENDAR_UPGRADE.md)
- **버그 수정 보고서**: [BUG_FIX_2026_02_04.md](BUG_FIX_2026_02_04.md)
- **README**: [README.md](../README.md)

---

**작성 일시**: 2026-02-04  
**작성자**: AI Assistant  
**상태**: ✅ 완료
