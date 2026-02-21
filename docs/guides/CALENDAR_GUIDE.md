# 📅 달력/날짜 작업 가이드

## ✅ 날짜 형식 (절대 규칙)

```javascript
// ✅ 표준 형식
const dateStr = "2026-02-05";  // YYYY-MM-DD

// ❌ 사용 금지
const dateStr = "2026/02/05";  // 슬래시
const dateStr = "02-05-2026";  // MM-DD-YYYY
```

---

## 📆 Date 객체 다루기

### 현재 날짜
```javascript
const today = new Date();
```

### 특정 날짜 생성
```javascript
const date = new Date(2026, 1, 5);  // 2026-02-05 (월은 0부터 시작!)
```

### 날짜 → 문자열
```javascript
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;  // "2026-02-05"
}
```

### 문자열 → Date
```javascript
const dateStr = "2026-02-05";
const parts = dateStr.split('-');
const date = new Date(
    parseInt(parts[0]),      // year
    parseInt(parts[1]) - 1,  // month (0-based!)
    parseInt(parts[2])       // day
);
```

---

## 🎨 색상 코딩 (고정)

| 카테고리 | 색상 | HEX | CSS 클래스 |
|----------|------|-----|------------|
| 수면 | 🟣 | `#8b5cf6` | `.indicator-sleep` |
| 수분 | 🔵 | `#3b82f6` | `.indicator-water` |
| 식사 | 🟢 | `#10b981` | `.indicator-meals` |
| 운동 | 🟠 | `#f59e0b` | `.indicator-exercise` |
| 영양제 | 🔴 | `#ef4444` | `.indicator-supplements` |

### CSS 예시
```css
.indicator-sleep { background: #8b5cf6; }
.indicator-water { background: #3b82f6; }
.indicator-meals { background: #10b981; }
.indicator-exercise { background: #f59e0b; }
.indicator-supplements { background: #ef4444; }
```

---

## 📊 달력 렌더링 패턴

### 월별 달력 생성
```javascript
function renderCalendar(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();  // 0=일요일
    
    // 빈 칸 추가
    for (let i = 0; i < firstDayOfWeek; i++) {
        // 빈 셀
    }
    
    // 날짜 칸 추가
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = createDayCell(year, month, day);
        grid.appendChild(cell);
    }
}
```

---

## 📌 날짜 계산

### 날짜 비교
```javascript
const date1 = new Date('2026-02-05');
const date2 = new Date('2026-02-10');

if (date1 < date2) {
    console.log('date1이 더 이전');
}

// 같은 날짜 확인
if (date1.toDateString() === date2.toDateString()) {
    console.log('같은 날');
}
```

### 날짜 더하기/빼기
```javascript
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
```

---

## ⚠️ 주의사항

1. **월은 0부터 시작**: `new Date(2026, 0, 1)` = 2026년 1월 1일
2. **시간대 주의**: 문자열로 저장할 때 시간 제거
3. **날짜 형식 통일**: 항상 YYYY-MM-DD
4. **색상 변경 금지**: 위 표의 색상 코드 고정

---

## 📌 체크리스트

- [ ] 날짜 형식 YYYY-MM-DD 사용
- [ ] 월 인덱스 확인 (0-based)
- [ ] 색상 코드 표대로 사용
- [ ] formatDate 함수 사용
- [ ] 날짜 비교 시 toDateString() 사용

---

**참조:** `QUICK_RULES.md` > 달력/날짜 작업
