# 🚨 빠른 참조 가이드 (QUICK_RULES)

## 📌 작업 시작 전 3초 체크

```
✅ 1. LS (파일 구조 확인)
✅ 2. 해당 작업 가이드 읽기 (아래 목록)
✅ 3. 관련 파일만 Read
```

---

## 🎯 작업별 참조 문서

### 🔧 Supabase 관련 작업
**읽을 문서:** `docs/guides/SUPABASE_GUIDE.md`
- DB 연결 설정
- URL/Key 통일 규칙
- 초기화 방법 (var vs const)

### 🎨 UI/모달 작업
**읽을 문서:** `docs/guides/MODAL_GUIDE.md`
- 모달 HTML 구조
- CSS 클래스 규칙
- 열기/닫기 함수 패턴

### 📅 달력/날짜 작업
**읽을 문서:** `docs/guides/CALENDAR_GUIDE.md`
- 날짜 형식 (YYYY-MM-DD)
- 달력 렌더링 패턴
- 색상 코딩 규칙

### 📊 데이터 로드/저장 작업
**읽을 문서:** `docs/guides/DATA_GUIDE.md`
- Supabase 쿼리 패턴
- localStorage 사용법
- 에러 처리 방법

### 🧮 계산 로직 작업
**읽을 문서:** `docs/guides/CALCULATION_GUIDE.md`
- 만나이 계산
- 예측키 계산
- 백분위 계산

### 🏥 병원 환자 구분 작업
**읽을 문서:** `docs/guides/PATIENT_TYPE_GUIDE.md`
- is_patient 필드 사용법
- 조건부 UI 표시
- 필터링 로직

### 🐛 버그 수정 작업
**읽을 문서:** `docs/guides/DEBUG_GUIDE.md`
- 콘솔 로그 형식
- 일반적인 에러 패턴
- 해결 방법

### 🟡 카카오 로그인 작업
**읽을 문서:** `docs/guides/KAKAO_LOGIN_GUIDE.md`
- 카카오 Developers 설정
- OAuth 연동 방법
- 회원가입 처리

### 🔒 API 키 보안 작업
**읽을 문서:** `docs/guides/API_SECURITY_GUIDE.md`
- config.js + .gitignore 사용법
- GitHub에 키 노출 방지
- 긴급 대응 방법

---

## 🚨 절대 규칙 (항상 지킴)

### 1️⃣ Supabase 초기화
```javascript
// ✅ 올바름 (var 사용)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ❌ 틀림 (const는 블록 스코프)
const supabase = window.supabase.createClient(...);
```

### 2️⃣ Supabase URL/Key (절대 변경 금지)
```javascript
const SUPABASE_URL = 'https://mufjnulwnppgvibmmbfo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3hm8ooVxIZvENDh-D_lWNA_sdPHg9xk';
```

### 3️⃣ 함수 중복 체크
```
작업 전: Grep "함수명" 검색
발견 시: 구버전 주석 처리
```

### 4️⃣ 날짜 형식 통일
```javascript
const dateStr = "2026-02-05"; // YYYY-MM-DD 고정
```

### 5️⃣ 색상 코드 고정
| 카테고리 | 색상 | HEX |
|----------|------|-----|
| 수면 | 🟣 | `#8b5cf6` |
| 수분 | 🔵 | `#3b82f6` |
| 식사 | 🟢 | `#10b981` |
| 운동 | 🟠 | `#f59e0b` |
| 영양제 | 🔴 | `#ef4444` |

---

## 📁 파일 구조 (기억하기)

```
187-growth-care/
├── routine.html              # 데일리 루틴 (메인)
├── admin-dashboard.html      # 관리자
├── home.html                 # 홈 대시보드
├── css/                      # 스타일
│   ├── mobile.css           # 공통
│   └── routine-mobile.css   # 루틴 전용
├── js/                       # 로직
│   ├── routine.js           # 루틴 로직
│   └── *-modal.js           # 모달별
└── docs/
    └── guides/              # 작업별 가이드
```

---

## 🔄 작업 플로우

```
1. 작업 종류 파악
   ↓
2. 위 목록에서 해당 가이드 찾기
   ↓
3. 가이드 문서 읽기 (1분)
   ↓
4. LS로 파일 확인
   ↓
5. 필요한 파일만 Read
   ↓
6. 작업 시작!
```

---

## 💾 가이드 문서 위치

모든 가이드: `docs/guides/` 폴더

```
docs/guides/
├── SUPABASE_GUIDE.md       # Supabase 작업
├── MODAL_GUIDE.md          # 모달 작업
├── CALENDAR_GUIDE.md       # 달력 작업
├── DATA_GUIDE.md           # 데이터 작업
├── CALCULATION_GUIDE.md    # 계산 로직
├── PATIENT_TYPE_GUIDE.md   # 병원 환자 구분
└── DEBUG_GUIDE.md          # 디버깅
```

---

## ⚡ 빠른 명령어

```bash
# 파일 구조 확인
LS
LS css/
LS js/

# 함수 검색
Grep "함수명"

# 특정 패턴 검색
Grep "supabase" --include="*.js"
```

---

**마지막 업데이트**: 2026-02-05  
**버전**: 2.0.0  
**이 파일**: 100줄 이하 유지 (빠른 참조용)
