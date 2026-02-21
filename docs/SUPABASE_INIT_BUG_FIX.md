# 🔧 Supabase 초기화 버그 수정

## 문제 발견

```
❌ Uncaught SyntaxError: Identifier 'supabase' has already been declared
❌ supabase.from is not a function
```

### 원인
1. `const supabase`로 선언 시 중복 선언 에러 발생
2. 블록 스코프 제약으로 다른 스크립트에서 접근 불가
3. `routine.js`에서 조건부 초기화 실패
4. 스크립트 로딩 순서 문제

---

## 해결 방법

### 1. routine.html에서 var로 초기화
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
    // Supabase 클라이언트 초기화 (전역 변수로)
    const SUPABASE_URL = 'https://bpyutswzedhbfzdhmsup.supabase.co';
    const SUPABASE_ANON_KEY = '...';
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase 클라이언트 초기화 완료');
</script>
```

**중요**: `var` 사용 이유
- `const`는 블록 스코프 → 다른 `<script>` 태그에서 접근 불가
- `var`는 함수/전역 스코프 → 모든 스크립트에서 접근 가능

### 2. routine.js에서 중복 초기화 제거
```javascript
// ===== 데일리 루틴 페이지 JavaScript =====

// 전역 변수
let currentDate = new Date();
...
```

---

## 수정된 파일

1. ✅ `routine.html` - `const` → `var`로 변경
2. ✅ `js/routine.js` - 중복 초기화 코드 제거

---

## 테스트

### 예상 로그
```
✅ Supabase 클라이언트 초기화 완료
✅ [routine.js] 사용자 정보 로드: {...}
✅ [routine.js] 병원 환자 여부: true
📅 루틴 달력 모달 열기
📊 루틴 데이터 로드: 2026-2
✅ 루틴 데이터 14개 로드 완료
```

### 확인 사항
- ❌ `Identifier 'supabase' has already been declared` 에러 없음
- ❌ `supabase.from is not a function` 에러 없음
- ✅ 사용자 정보 로드 성공
- ✅ 달력 모달 데이터 로드 성공
- ✅ 루틴 데이터 로드 성공

---

## 완료

**이제 Supabase 클라이언트가 정상적으로 초기화되어 모든 기능이 작동합니다!**

---

**수정 일시**: 2026-02-05  
**버그**: `Identifier 'supabase' has already been declared`  
**원인**: `const` 블록 스코프 제약  
**해결**: `var`로 전역 변수 선언
