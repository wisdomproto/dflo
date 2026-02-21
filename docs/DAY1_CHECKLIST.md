# 🗓️ Day 1 작업 체크리스트 - 프로젝트 구조 & 공통 모듈

> 이 문서는 Day 1 작업을 위한 상세 체크리스트입니다.
> 새 채팅창에서 AI에게 이 문서를 제공하고 순차적으로 진행하세요.

---

## 📋 Day 1 목표

**프로젝트 뼈대 구축**

- ✅ Supabase 데이터베이스 생성
- ✅ 프로젝트 폴더 구조
- ✅ 공통 모듈 (utils, constants, api)
- ✅ CSS 변수 & 기본 스타일

**예상 시간**: 6-8시간

---

## 🗄️ Task 1: Supabase 데이터베이스 생성

### 1.1 Supabase 프로젝트 생성

- [ ] Supabase Dashboard 접속: https://supabase.com/dashboard
- [ ] 새 프로젝트 생성: `187-growth-care-v3`
- [ ] Region: `Northeast Asia (Seoul)`
- [ ] Database Password 설정 및 기록

### 1.2 SQL 스크립트 실행

- [ ] SQL Editor 열기
- [ ] `supabase/schema_v3.sql` 파일 복사
- [ ] SQL 실행 (Run)
- [ ] 12개 테이블 생성 확인:
  - users
  - children
  - questionnaire
  - measurements
  - daily_routines
  - meals
  - meal_photos
  - exercises
  - exercise_logs
  - recipes
  - growth_cases
  - growth_guides

### 1.3 API 키 확인

- [ ] Settings → API 메뉴
- [ ] Project URL 복사: `https://[project-id].supabase.co`
- [ ] anon/public key 복사
- [ ] 나중을 위해 안전한 곳에 저장

### 1.4 Storage 버킷 생성

- [ ] Storage 메뉴
- [ ] 새 버킷 생성: `meal-photos`
- [ ] Public: ✅ (체크)
- [ ] File size limit: 5MB
- [ ] Allowed MIME types: `image/jpeg, image/png, image/webp`

---

## 📁 Task 2: 프로젝트 폴더 구조 생성

### 2.1 루트 디렉토리

```bash
mkdir -p 187-growth-care-v3
cd 187-growth-care-v3
```

### 2.2 전체 폴더 구조

```bash
mkdir -p public
mkdir -p src/core
mkdir -p src/models
mkdir -p src/services
mkdir -p src/components
mkdir -p src/controllers
mkdir -p src/pages
mkdir -p src/styles/pages
mkdir -p docs
mkdir -p tools
mkdir -p supabase
```

### 2.3 체크리스트

- [ ] `public/` 폴더 생성
- [ ] `src/core/` 폴더 생성
- [ ] `src/models/` 폴더 생성
- [ ] `src/services/` 폴더 생성
- [ ] `src/components/` 폴더 생성
- [ ] `src/controllers/` 폴더 생성
- [ ] `src/pages/` 폴더 생성
- [ ] `src/styles/` 폴더 생성
- [ ] `src/styles/pages/` 폴더 생성
- [ ] `docs/` 폴더 생성
- [ ] `tools/` 폴더 생성
- [ ] `supabase/` 폴더 생성

---

## 📝 Task 3: 공통 모듈 작성

### 3.1 `src/core/utils.js`

**작성할 함수들:**

```javascript
// 날짜 관련
export function calculateAge(birthDate, targetDate = new Date())
export function calculateAgeAtDate(birthDate, targetDate)
export function formatDate(date, format = 'YYYY-MM-DD')
export function getKoreanAge(birthDate)
export function parseDate(dateString)

// 숫자 관련
export function parseFloatSafe(value, defaultValue = 0)
export function roundTo(value, decimals = 1)
export function formatNumber(value, decimals = 1)

// 검증
export function isValidEmail(email)
export function isValidDate(dateString)
export function isValidPhoneNumber(phone)

// 문자열
export function truncate(text, maxLength = 50)
export function sanitizeHTML(html)
export function capitalize(text)

// 배열
export function groupBy(array, key)
export function sortBy(array, key, order = 'asc')

// 로컬 스토리지
export function setStorage(key, value)
export function getStorage(key, defaultValue = null)
export function removeStorage(key)
```

**체크리스트:**
- [ ] 파일 생성: `src/core/utils.js`
- [ ] 20개 이상 공통 함수 작성
- [ ] JSDoc 주석 추가
- [ ] 테스트 코드 작성 (선택)

---

### 3.2 `src/core/constants.js`

**작성할 상수들:**

```javascript
// 한국 표준 성장곡선 데이터 (KCDC 2017)
export const GROWTH_STANDARDS = {
  male: {
    height: {
      // 나이별 5th, 50th, 95th 백분위 데이터
      2: { p5: 80.0, p50: 88.0, p95: 96.0 },
      3: { p5: 87.0, p50: 96.0, p95: 105.0 },
      // ... 18세까지
    },
    weight: {
      // 나이별 체중 백분위
    }
  },
  female: {
    // 여아 데이터
  }
}

// 차트 색상
export const CHART_COLORS = {
  male: '#3b82f6',
  female: '#ec4899',
  percentile_5: '#d1d5db',
  percentile_50: '#6b7280',
  percentile_95: '#d1d5db',
  current: '#ef4444'
}

// 식사 타입
export const MEAL_TYPES = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식'
}

// 운동 카테고리
export const EXERCISE_CATEGORIES = [
  '바른자세',
  '성장판자극',
  '유산소',
  '근력운동'
]

// 수면 질
export const SLEEP_QUALITY = {
  excellent: '매우 좋음',
  good: '좋음',
  fair: '보통',
  poor: '나쁨'
}

// 기분
export const MOODS = {
  happy: '좋음',
  neutral: '보통',
  sad: '나쁨'
}

// 건강도
export const HEALTH_RATINGS = {
  5: '매우 건강함',
  4: '건강함',
  3: '보통',
  2: '개선 필요',
  1: '매우 개선 필요'
}

// 기본 영양제
export const BASIC_SUPPLEMENTS = [
  '비타민D',
  '칼슘',
  '아연',
  '오메가3'
]
```

**체크리스트:**
- [ ] 파일 생성: `src/core/constants.js`
- [ ] 성장 표준 데이터 입력 (KCDC 2017)
- [ ] 모든 enum 값 정의
- [ ] JSDoc 주석 추가

---

### 3.3 `src/core/api.js`

**작성할 클래스:**

```javascript
/**
 * Supabase API Wrapper
 */
export class ApiClient {
  constructor(supabaseClient) {
    this.client = supabaseClient
  }

  /**
   * SELECT
   */
  async get(table, filters = {}, options = {}) {
    // select, eq, order, limit 등
  }

  async getOne(table, id) {
    // select single record
  }

  /**
   * INSERT
   */
  async create(table, data) {
    // insert
  }

  async createMany(table, dataArray) {
    // bulk insert
  }

  /**
   * UPDATE
   */
  async update(table, id, data) {
    // update
  }

  async updateMany(table, ids, data) {
    // bulk update
  }

  /**
   * DELETE
   */
  async delete(table, id) {
    // soft delete (is_active = false)
  }

  async hardDelete(table, id) {
    // hard delete
  }

  /**
   * Custom Query
   */
  async query(builder) {
    // 커스텀 쿼리 빌더
  }

  /**
   * Count
   */
  async count(table, filters = {}) {
    // count records
  }
}
```

**체크리스트:**
- [ ] 파일 생성: `src/core/api.js`
- [ ] ApiClient 클래스 작성
- [ ] CRUD 메서드 완성
- [ ] 에러 핸들링 추가
- [ ] JSDoc 주석 추가

---

### 3.4 `src/core/validator.js`

**작성할 함수들:**

```javascript
/**
 * 데이터 검증
 */

// 필수 필드 체크
export function validateRequired(data, requiredFields)

// 이메일 검증
export function validateEmail(email)

// 전화번호 검증
export function validatePhoneNumber(phone)

// 날짜 검증
export function validateDate(dateString)

// 숫자 범위 검증
export function validateRange(value, min, max)

// 문자열 길이 검증
export function validateLength(text, minLength, maxLength)

// 측정 데이터 검증
export function validateMeasurement(data)

// 루틴 데이터 검증
export function validateRoutine(data)

// 설문지 데이터 검증
export function validateQuestionnaire(data)
```

**체크리스트:**
- [ ] 파일 생성: `src/core/validator.js`
- [ ] 검증 함수 10개 이상 작성
- [ ] 에러 메시지 반환
- [ ] JSDoc 주석 추가

---

## 🎨 Task 4: CSS 변수 & 기본 스타일

### 4.1 `src/styles/reset.css`

**CSS Reset**

```css
/* Modern CSS Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  text-rendering: optimizeSpeed;
  line-height: 1.5;
}

img,
picture,
svg {
  max-width: 100%;
  display: block;
}

input,
button,
textarea,
select {
  font: inherit;
}
```

**체크리스트:**
- [ ] 파일 생성: `src/styles/reset.css`
- [ ] CSS Reset 작성

---

### 4.2 `src/styles/variables.css`

**CSS 변수 정의**

```css
:root {
  /* Colors - Primary */
  --primary-blue: #3b82f6;
  --primary-pink: #ec4899;
  --primary-green: #10b981;
  
  /* Colors - Semantic */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  
  /* Colors - Neutral */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  /* Background */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  
  /* Text */
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
  
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Spacing (8px 기준) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}
```

**체크리스트:**
- [ ] 파일 생성: `src/styles/variables.css`
- [ ] 모든 CSS 변수 정의

---

### 4.3 `src/styles/base.css`

**기본 스타일**

```css
body {
  font-family: var(--font-family);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-secondary);
}

h1, h2, h3, h4, h5, h6 {
  font-weight: var(--font-bold);
  line-height: 1.2;
  margin-bottom: var(--space-4);
}

h1 { font-size: var(--text-3xl); }
h2 { font-size: var(--text-2xl); }
h3 { font-size: var(--text-xl); }
h4 { font-size: var(--text-lg); }
h5 { font-size: var(--text-base); }
h6 { font-size: var(--text-sm); }

a {
  color: var(--primary-blue);
  text-decoration: none;
  transition: color var(--transition-fast);
}

a:hover {
  color: var(--primary-green);
}

/* Layout */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

/* 반응형 */
@media (min-width: 768px) {
  .container {
    padding: 0 var(--space-6);
  }
}
```

**체크리스트:**
- [ ] 파일 생성: `src/styles/base.css`
- [ ] 기본 타이포그래피
- [ ] 링크 스타일
- [ ] 레이아웃 클래스

---

### 4.4 `src/styles/components.css`

**UI 컴포넌트 공통 스타일**

```css
/* Buttons */
.btn {
  display: inline-block;
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  text-align: center;
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--gray-700);
}

.btn-secondary:hover {
  background: var(--gray-200);
}

/* Cards */
.card {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
  transition: box-shadow var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

/* Form Groups */
.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  transition: border-color var(--transition-fast);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary-blue);
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
}

.modal.active {
  display: flex;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: var(--radius-xl);
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
  z-index: 1001;
  padding: var(--space-6);
}

/* Loading */
.loading {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid var(--gray-200);
  border-top-color: var(--primary-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**체크리스트:**
- [ ] 파일 생성: `src/styles/components.css`
- [ ] 버튼 스타일
- [ ] 카드 스타일
- [ ] 폼 스타일
- [ ] 모달 스타일
- [ ] 로딩 스피너

---

## 📦 Task 5: package.json 생성

```json
{
  "name": "187-growth-care-v3",
  "version": "3.0.0",
  "description": "187 성장케어 플랫폼 v3.0",
  "scripts": {
    "dev": "python -m http.server 8000",
    "deploy": "wrangler pages deploy . --project-name=187-growth-care-v3"
  },
  "dependencies": {
    "chart.js": "^4.4.0",
    "dayjs": "^1.11.10"
  },
  "devDependencies": {},
  "keywords": [
    "growth-care",
    "health",
    "mobile-first"
  ],
  "author": "연세새봄의원",
  "license": "UNLICENSED"
}
```

**체크리스트:**
- [ ] 파일 생성: `package.json`
- [ ] 의존성 정의

---

## 📄 Task 6: 기본 HTML 템플릿

### 6.1 `public/index.html` (로그인 페이지 템플릿)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>187 성장케어 - 로그인</title>
    
    <!-- Favicon -->
    <link rel="icon" href="/favicon.ico">
    
    <!-- CSS -->
    <link rel="stylesheet" href="/src/styles/reset.css">
    <link rel="stylesheet" href="/src/styles/variables.css">
    <link rel="stylesheet" href="/src/styles/base.css">
    <link rel="stylesheet" href="/src/styles/components.css">
    
    <!-- Supabase -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <div id="app"></div>
    
    <!-- Core Modules -->
    <script type="module" src="/src/core/utils.js"></script>
    <script type="module" src="/src/core/constants.js"></script>
    <script type="module" src="/src/core/api.js"></script>
    
    <!-- Page Controller -->
    <script type="module" src="/src/controllers/AuthController.js"></script>
</body>
</html>
```

**체크리스트:**
- [ ] 파일 생성: `public/index.html`
- [ ] 기본 템플릿 작성

---

## ✅ Day 1 완료 체크

### 최종 확인

- [ ] Supabase 데이터베이스 12개 테이블 생성
- [ ] Supabase Storage 버킷 생성
- [ ] 프로젝트 폴더 구조 완성
- [ ] `src/core/utils.js` (20개 함수)
- [ ] `src/core/constants.js` (모든 상수)
- [ ] `src/core/api.js` (ApiClient 클래스)
- [ ] `src/core/validator.js` (검증 함수)
- [ ] CSS 파일 4개 (reset, variables, base, components)
- [ ] `package.json`
- [ ] `public/index.html` 템플릿

### 테스트

```bash
# 로컬 서버 실행
python -m http.server 8000

# 브라우저에서 확인
http://localhost:8000/

# 콘솔에서 확인
- CSS 로드 확인
- JavaScript 모듈 로드 확인
```

---

## 🎉 Day 1 완료!

**다음 단계**: Day 2 - 로그인 페이지 개발

**예상 시간**: 4-6시간

**작업 내용**:
- AuthService.js
- AuthController.js
- index.html 완성 (로그인 폼)
- 세션 관리

---

**질문이나 문제가 있으면 `docs/PRD_V3_COMPLETE.md`를 참조하세요!** 📚
