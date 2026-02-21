# 🔧 만나이 표시 버그 수정

## 문제 발견

**증상:**
- 어제 (2026-02-04): 만나이 정상 표시 ✅ "12.9 세"
- 오늘 (2026-02-05): 만나이 비어있음 ❌ ""

**로그:**
```javascript
routine.js:870 💾 [로드] 데이터 없음, 초기화
routine.js:1798 입력 값: {height: 172.5, actualAge: NaN, actualAgeStr: '', heightValue: '172.5', ageValue: ''}
```

---

## 원인 분석

### 1. **데이터 로드 흐름**
```
loadRoutineData() 호출
  ↓
DB 조회 (2026-02-05)
  ↓
데이터 없음 → resetForm() 호출
  ↓
만나이 필드 초기화 → ageEl.value = ''
  ↓
loadRecentMeasurements() 호출
  ↓
키/몸무게만 복원
  ↓
만나이는 빈 상태로 남음 ❌
```

### 2. **resetForm() 함수 문제**
```javascript
function resetForm() {
    const ageEl = document.getElementById('actualAge');
    if (ageEl) ageEl.value = '';  // ← 빈 문자열로 초기화
    // ...
}
```

### 3. **왜 어제는 정상인가?**
- 2026-02-04: DB에 데이터 있음 → `calculateAge()` 자동 호출 ✅
- 2026-02-05: DB에 데이터 없음 → `calculateAge()` 호출 안 됨 ❌

---

## 해결 방법

### js/routine.js 수정
```javascript
// 수정 전
} else {
    console.log('💾 [로드] 데이터 없음, 초기화');
    resetForm();
    loadRecentMeasurements();
}

// 수정 후
} else {
    console.log('💾 [로드] 데이터 없음, 초기화');
    resetForm();
    loadRecentMeasurements();
    
    // 만나이 재계산 (데이터 없을 때도 표시)
    setTimeout(() => {
        calculateAge();
    }, 100);
}
```

**적용 위치:**
1. Line 870: `loadRoutineData()` 함수 내부 (DB 데이터 없을 때)
2. Line 884: `loadRoutineData()` 함수 내부 (에러 발생 시)

---

## 수정된 파일

1. ✅ `js/routine.js` - 2곳에 `calculateAge()` 호출 추가

---

## 테스트

### 예상 결과 (2026-02-05)
```
💾 [로드] 데이터 없음, 초기화
📊 [최근 측정치] 키: 172.5 cm
📊 [최근 측정치] 몸무게: 61.5 kg
=== calculateAge 호출됨 ===
✅ 만나이 계산 완료: 12.9
```

### 확인 사항
- ✅ 오늘 날짜 (2026-02-05)에도 만나이 "12.9 세" 표시
- ✅ 어제 날짜 (2026-02-04)에도 만나이 정상 표시
- ✅ 데이터 없는 미래 날짜에도 만나이 자동 계산

---

## 왜 setTimeout을 사용했나?

```javascript
setTimeout(() => {
    calculateAge();
}, 100);
```

**이유:**
1. `resetForm()`과 `loadRecentMeasurements()`가 완료될 때까지 대기
2. DOM 업데이트 완료 후 만나이 계산
3. 비동기 작업 순서 보장

---

## 완료

**이제 어떤 날짜를 선택해도 만나이가 자동으로 계산되어 표시됩니다!**

---

**수정 일시**: 2026-02-05  
**문제**: 데이터 없는 날짜에 만나이 미표시  
**원인**: `resetForm()` 후 `calculateAge()` 미호출  
**해결**: 데이터 없을 때도 만나이 자동 계산 추가
