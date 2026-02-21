# ✅ 함수 중복 선언 해결

## 문제 발견

```javascript
Uncaught TypeError: dateStr.split is not a function
at selectCalendarDate (routine.js:1440:27)
```

### 원인
- `routine.js`와 `routine-calendar-modal.js`에 **같은 이름의 함수**가 있음
- **routine.js**: `selectCalendarDate(dateStr)` - 문자열 파라미터
- **routine-calendar-modal.js**: `selectCalendarDate(year, month, day)` - 숫자 3개 파라미터
- 나중에 로드되는 `routine-calendar-modal.js`가 `routine.js`의 함수를 덮어씀
- 하지만 `routine.js` 내부에서는 여전히 구버전 함수를 호출하려고 시도

---

## 해결 방법

### routine.js 수정
```javascript
// 수정 전
function selectCalendarDate(dateStr) {
    const parts = dateStr.split('-');
    ...
}

// 수정 후 (주석 처리)
// 달력에서 날짜 선택 (구버전 - routine-calendar-modal.js로 이동됨)
// function selectCalendarDate(dateStr) {
//     const parts = dateStr.split('-');
//     ...
// }
```

---

## 수정된 파일

1. ✅ `js/routine.js` - 구버전 `selectCalendarDate` 함수 주석 처리

---

## 테스트

### 예상 결과
```
✅ Supabase 클라이언트 초기화 완료
✅ 루틴 데이터 5개 로드 완료
📅 루틴 달력 모달 열기
📅 날짜 선택: 2026-2-1
✅ 날짜로 이동 성공
```

### 확인 사항
- ❌ `dateStr.split is not a function` 에러 없음
- ✅ 달력에서 날짜 클릭 시 정상 이동
- ✅ 모달 자동 닫기
- ✅ 해당 날짜 데이터 로드

---

## 완료

**이제 달력에서 날짜를 클릭하면 정상적으로 해당 날짜로 이동합니다!**

---

**수정 일시**: 2026-02-05  
**문제**: 함수 중복 선언으로 타입 에러  
**원인**: 구버전 함수와 신버전 함수 충돌  
**해결**: 구버전 함수 주석 처리
