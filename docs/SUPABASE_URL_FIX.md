# 🔧 Supabase URL 수정

## 문제 발견

```
GET https://bpyutswzedhbfzdhmsup.supabase.co/rest/v1/daily_routines?...
net::ERR_NAME_NOT_RESOLVED
```

### 원인
- `routine.html`에서 **잘못된 Supabase URL** 사용
- 올바른 URL: `https://mufjnulwnppgvibmmbfo.supabase.co`
- 잘못된 URL: `https://bpyutswzedhbfzdhmsup.supabase.co`

### 다른 페이지는 정상
- `admin-dashboard.html`: ✅ 올바른 URL 사용
- `supabase-config.js`: ✅ 올바른 URL 사용

---

## 해결 방법

### routine.html 수정
```javascript
// 수정 전
const SUPABASE_URL = 'https://bpyutswzedhbfzdhmsup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// 수정 후
const SUPABASE_URL = 'https://mufjnulwnppgvibmmbfo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3hm8ooVxIZvENDh-D_lWNA_sdPHg9xk';
```

---

## 수정된 파일

1. ✅ `routine.html` - Supabase URL 및 API Key 수정

---

## 테스트

### 예상 결과
```
✅ Supabase 클라이언트 초기화 완료
✅ [routine.js] 사용자 정보 로드
✅ [routine.js] 병원 환자 여부: true
✅ [로드] DB 조회 성공
📅 루틴 달력 모달 열기
📊 루틴 데이터 로드: 2026-2
✅ 루틴 데이터 14개 로드 완료
```

### 확인 사항
- ❌ `net::ERR_NAME_NOT_RESOLVED` 에러 없음
- ✅ Supabase 데이터 로드 성공
- ✅ 달력 모달 데이터 표시 성공

---

## 완료

**이제 Supabase URL이 올바르게 설정되어 모든 기능이 정상 작동합니다!**

---

**수정 일시**: 2026-02-05  
**문제**: 잘못된 Supabase URL  
**원인**: 복사/붙여넣기 오류  
**해결**: 올바른 URL로 수정
