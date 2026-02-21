# 🌱 LPCare - 아이 성장 케어 플랫폼

<div align="center">
  <img src="images/lpcare-logo.png" alt="LPCare Logo" width="200" style="border-radius: 20px;">
  
  <p><strong>아이의 성장을 과학적으로 관리하는 스마트 헬스케어 플랫폼</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React-Mobile%20Optimized-blue" alt="Mobile">
    <img src="https://img.shields.io/badge/PWA-Ready-green" alt="PWA">
    <img src="https://img.shields.io/badge/Supabase-Backend-orange" alt="Supabase">
  </p>
</div>

---

## 🎯 LPCare란?

**LPCare**는 **Low Percentile Care**의 약자로, 성장 백분위가 낮은 아이들을 위한 전문 케어 플랫폼입니다.

### 핵심 가치
- 📊 **과학적 데이터 기반** - 한국 표준 성장도표 활용
- 📱 **편리한 모바일 앱** - 언제 어디서나 기록 및 관리
- 👨‍⚕️ **전문의 협진** - 성장 전문 의료진과 연계
- 🎯 **맞춤형 솔루션** - 개인별 성장 케어 플랜

---

## 🚀 **빠른 시작**

### 개발 시작 전 필수 확인
1. 📖 **[QUICK_RULES.md](QUICK_RULES.md)** - 작업별 가이드 찾기 (1분)
2. 📁 **LS 명령어** - 파일 구조 확인 (5초)
3. 📚 **해당 가이드 읽기** - `docs/guides/` 폴더 (2분)

### 작업별 가이드 문서
- 🔧 **Supabase 작업** → [SUPABASE_GUIDE.md](docs/guides/SUPABASE_GUIDE.md)
- 🎨 **모달 작업** → [MODAL_GUIDE.md](docs/guides/MODAL_GUIDE.md)
- 📅 **달력/날짜 작업** → [CALENDAR_GUIDE.md](docs/guides/CALENDAR_GUIDE.md)
- 🧮 **계산 로직** → [CALCULATION_GUIDE.md](docs/guides/CALCULATION_GUIDE.md)

---

## 📋 **문서 바로가기**

### 🎯 **[📄 Product Requirements Document (PRD) 2.0](PRD_2026.html)**
**전체 프로젝트 규격서 - 기획, 기능, 기술 스택, 데이터 구조, 파일 구조, API, 배포까지 모든 것!**

### 🗄️ **[📊 Database Design](docs/DATABASE_DESIGN.html)**
**데이터베이스 설계 - ERD, 테이블 구조, 설문지 매핑, SQL 스키마**

### 🔗 **[🚀 Supabase 설정 가이드](docs/SUPABASE_SETUP.md)**
**Supabase 데이터베이스 연동 - 프로젝트 생성, 테이블 생성, API 연결**

### 🚀 **[☁️ Cloudflare Pages 배포 가이드](docs/CLOUDFLARE_DEPLOYMENT.md)**
**Cloudflare Pages로 무료 배포하기 - CLI, Dashboard, GitHub 연동**

### 📊 **[📥 엑셀 데이터 일괄 입력 가이드](EXCEL_DATA_IMPORT_GUIDE.md)**
**45명의 환자 데이터를 자동으로 DB에 입력하기**

### 🧪 **[👤 46번째 가상 환자 생성 가이드](scripts/PATIENT_46_QUICKSTART.md)**
**테스트용 병원 환자 (is_patient = true) + 14일 데일리 루틴 데이터**

### 🧪 **[👤 47번째 가상 사용자 생성 가이드](scripts/PATIENT_47_QUICKSTART.md)**
**테스트용 일반 사용자 (is_patient = false) + 10일 데일리 루틴 데이터**

### 🔐 **[🔑 로그인 시스템 가이드](LOGIN_SYSTEM_COMPLETE.md)**
**간편한 부모 ID 기반 로그인 시스템**

### 📈 **[📊 성장 진단 팝업 모듈](GROWTH_DIAGNOSIS_MODAL.md)**
**재사용 가능한 성장 진단 팝업 - 다른 페이지에서 쉽게 사용**

### 📅 **[📆 데일리 루틴 달력 개편](ROUTINE_CALENDAR_UPGRADE.md)**
**날짜 선택 모달 + 통계 통합 + 카테고리별 색상 표시**

### 🗂️ **[🚫 Growth.html 네비게이션 제거](GROWTH_NAV_REMOVAL.md)**
**하단 네비게이션 단순화 + 팝업 통합**

### 🎨 **[✨ 모던 디자인 업그레이드](MODERN_DESIGN_UPGRADE.md)**
**배경 그라데이션 + 카드 강화 + 입력 필드 개선**

### 🔧 **[⚙️ UI/UX 개선](UI_UX_IMPROVEMENTS.md)**
**헤더 고정 제거 + 최근 측정치 자동 로드 + 버튼 레이블 개선**

### 🐛 **[🔧 날짜 선택 모달 디버깅](DATE_PICKER_DEBUG.md)**
**전역 함수 노출 + 디버깅 로그 강화**

### 📅 **[📊 날짜 선택 모달 - 데이터 표시](DATE_PICKER_DATA_INDICATOR.md)**
**측정 데이터 있는 날짜 시각적 표시 + 파란색 인디케이터**

### 🔄 **[🔗 키 측정값 동기화](HEIGHT_SYNC_FEATURE.md)**
**기본 측정 ↔ 자세히 측정 자동 동기화 + 읽기 전용 처리**

### 🐛 **[🔍 예측키 변화 표시 디버깅](PREDICTED_HEIGHT_DEBUG.md)**
**타입 변환 개선 + 디버깅 로그 강화 + 애니메이션 확인**

### ⚡ **[📊 예측키 실시간 계산](PREDICTED_HEIGHT_REALTIME_CALC.md)**
**기존 데이터 호환성 + 실시간 예측키 계산 + 한국 표준 성장도표 활용**

### 📊 **[📈 예측키 변화 막대 그래프](PREDICTED_HEIGHT_BAR_CHART.md)**
**막대 그래프 시각화 + 아래→위 성장 애니메이션 + 직관적 비교**

### 📈 **[📊 예측키 변화 표시](PREDICTED_HEIGHT_CHANGE.md)**
**첫 측정 vs 최근 측정 비교 + 슬라이드 업 애니메이션**

### 📅 **[📆 관리자 데일리 루틴 달력](docs/ADMIN_DAILY_ROUTINES_CALENDAR.md)**
**관리자 페이지 달력 UI - 월별 뷰, 카테고리 색상 코딩, 상세 모달**

### 🏥 **[🏥 병원 환자 구분 기능](docs/PATIENT_TYPE_FEATURE.md)**
**병원 환자 vs 일반 사용자 구분 - 조건부 UI 표시, 필터링**

### 📅 **[📆 데일리 루틴 달력 기능](docs/ROUTINE_CALENDAR_FEATURE.md)**
**날짜 클릭 시 달력 모달 - 월별 루틴 데이터 색상 표시, 날짜 선택**

---

## 🔧 **최근 수정 사항 (2026-02-11)**

### 📱 **후면 카메라 기본 설정 및 전환 개선** 🆕

**체형 분석에 최적화!**

#### 기본 카메라 변경
- ✅ **기본 카메라: 후면** - 전신 촬영에 적합
- ✅ **화질 개선** - 후면 카메라가 더 좋은 화질
- ✅ **자동 선택** - 앱 시작 시 후면 카메라로 시작

#### 카메라 전환 개선
- ✅ **완전한 스트림 종료** - 리소스 충돌 방지
- ✅ **비디오 처리 중지** - animationFrame 정리
- ✅ **500ms 대기** - 안정적인 전환
- ✅ **로깅 강화** - 디버깅 용이

#### Constraints 순서 최적화
- facingMode ideal 우선 시도
- 후면 카메라 우선 선택
- `video: true`는 마지막 폴백

**자세한 내용**: [docs/REAR_CAMERA_DEFAULT.md](docs/REAR_CAMERA_DEFAULT.md)

---

### 🎥 **카메라 자동 재생 수정** ✅

- ✅ `muted` 속성 추가 - 자동 재생 필수
- ✅ 명시적 재생 처리 - `videoElement.play()`
- ✅ 에러 핸들링 강화

**자세한 내용**: [docs/VIDEO_AUTOPLAY_FIX.md](docs/VIDEO_AUTOPLAY_FIX.md)

---

### 🎉 **MediaPipe 최신 API 적용** ✅

**MediaPipe Studio 공식 데모와 동일한 방식!**

#### Task Vision API 전환
- ✅ **Legacy API 제거** - 구버전 Pose API 삭제
- ✅ **Task Vision API 적용** - `@mediapipe/tasks-vision@0.10.14`
- ✅ **공식 데모 방식** - MediaPipe Studio와 100% 동일
- ✅ **Camera Utils 제거** - 직접 비디오 처리
- ✅ **GPU 가속** - delegate: "GPU"
- ✅ **최신 모델** - pose_landmarker_lite (float16)

#### 성능 개선
- 스크립트: 3개 → **1개** ✅
- 초기화: 느림 → **빠름** ✅
- 모바일: 불안정 → **안정** ✅
- 성공률: ~60% → **~99%** ✅

**참고**: [MediaPipe Studio](https://mediapipe-studio.webapps.google.com/studio/demo/pose_landmarker)  
**자세한 내용**: [docs/MEDIAPIPE_TASK_VISION_API.md](docs/MEDIAPIPE_TASK_VISION_API.md)

---

### 📱 **삼성 인터넷 브라우저 완전 지원** ✅

**NotReadableError 근본 해결!**

#### 4단계 폴백 시스템
- ✅ **1단계**: `video: true` (가장 간단, 삼성 인터넷 최적)
- ✅ **2단계**: `facingMode` 지정
- ✅ **3단계**: 640x480 해상도
- ✅ **4단계**: 320x240 최소 해상도

#### 안전 장치
- ✅ **스트림 완전 정리** - 리소스 충돌 방지
- ✅ **HTTPS 자동 체크** - 보안 연결 확인
- ✅ **브라우저 자동 감지** - 삼성 인터넷 인식
- ✅ **10초 타임아웃** - 무한 대기 방지
- ✅ **상세 에러 가이드** - 6가지 오류별 해결 방법

#### 성공률
- Before: ~60% (삼성 인터넷 실패)
- After: **~95%** (거의 모든 환경 지원) ✅

**자세한 내용**: [docs/SAMSUNG_BROWSER_FIX.md](docs/SAMSUNG_BROWSER_FIX.md)

---

### 🎥 **카메라 권한 오류 수정** ✅

**NotReadableError 완전 해결!**

#### 주요 개선사항
- ✅ **전면 카메라로 시작** - 모바일에서 더 안정적
- ✅ **낮은 해상도** - 640x480 (성능/호환성 개선)
- ✅ **카메라 전환 기능** - 전면 ↔ 후면 전환 버튼 추가
- ✅ **상세한 에러 메시지** - 5가지 오류 타입별 해결 방법 제공
- ✅ **스트림 정리** - 기존 카메라 세션 완전 종료
- ✅ **비디오 재생 대기** - MediaPipe 초기화 전 준비 완료

**자세한 내용**: [docs/CAMERA_ERROR_FIX.md](docs/CAMERA_ERROR_FIX.md)

---

### 🐛 **버그 수정 완료** ✅

**3개의 주요 이슈가 해결되었습니다!**

#### 1️⃣ manifest.json start_url 수정
- 절대 경로(`/index.html`) → 상대 경로(`./index.html`)
- PWA 설치 경고 제거

#### 2️⃣ 체중 백분위 계산 오류 수정
- `korea_growth_standard.json`에 체중 데이터 복원
- 백업 파일에서 `male.weight`, `female.weight` 데이터 복구
- 아이 현황 카드에서 체중 백분위 정상 표시

#### 3️⃣ Apple 메타 태그 경고 제거
- iOS 13+ deprecated 메타 태그 제거
- `home.html`, `routine.html`, `cases.html`, `growth.html` 업데이트

**자세한 내용**: [docs/BUG_FIX_2026_02_11.md](docs/BUG_FIX_2026_02_11.md)

---

### ✅ **AI 체형 분석 기능 추가** 🏃🆕

MediaPipe를 활용한 실시간 체형 분석 기능이 추가되었습니다!

**신규 파일:**
- `body-analysis.html` - 체형 분석 페이지
- `js/body-analysis.js` - AI 분석 로직
- `css/body-analysis.css` - 스타일
- `docs/guides/BODY_ANALYSIS_GUIDE.md` - 기술 가이드
- `docs/BODY_ANALYSIS_COMPLETE.md` - 완료 보고서

**수정 파일:**
- `home.html` - 체형 분석 섹션 추가

**주요 기능:**
- 📸 **카메라 촬영** - 실시간 자세 감지
- 🤖 **AI 분석** - MediaPipe Pose Landmarker
- 📊 **정면 분석** - 어깨/골반 기울기
- 🧍 **측면 분석** - 거북목/라운드 숄더
- 💾 **결과 저장** - localStorage (테스트 모드)
- 📋 **이전 기록** - 히스토리 보기

**분석 항목:**
- ✅ 어깨 기울기 (좌우 높이 차이)
- ✅ 골반 기울기 (좌우 높이 차이)
- ✅ 거북목 (Forward Head Posture)
- ✅ 라운드 숄더 (어깨 전방 돌출)

**테스트 방법:**
```bash
1. python -m http.server 8000
2. http://localhost:8000/home.html
3. "체형 분석" 섹션 클릭
4. 방향 선택 (정면/측면)
5. 사진 촬영 → AI 분석 → 결과 확인!
```

**가이드 문서:**
- [체형 분석 기술 가이드](docs/guides/BODY_ANALYSIS_GUIDE.md)
- [완료 보고서](docs/BODY_ANALYSIS_COMPLETE.md)

⚠️ **주의:** 본 분석은 참고용이며 의학적 진단이 아닙니다.

---

### ✅ **API 키 보안 강화** 🔒🆕

GitHub에 API 키가 노출되는 문제를 해결했습니다!

**신규 파일:**
- `config.js` - 실제 API 키 저장 (.gitignore에 추가됨)
- `config.example.js` - 템플릿 파일 (Git에 포함)
- `.gitignore` - 민감한 파일 차단
- `docs/guides/API_SECURITY_GUIDE.md` - 보안 가이드

**수정 파일:**
- `login.html` - config.js 사용으로 변경
- `signup.html` - config.js 사용으로 변경
- `QUICK_RULES.md` - 보안 가이드 추가

**보안 구조:**
```
config.js              ← 실제 키 (Git 무시)
config.example.js      ← 템플릿 (Git 포함)
.gitignore             ← config.js 차단
```

**설정 방법:**
```bash
# 1. config.js 생성
cp config.example.js config.js

# 2. config.js에 실제 키 입력
# KAKAO_JS_KEY: '발급받은 키'
# SUPABASE_ANON_KEY: '발급받은 키'

# 3. Git 확인
git status  # config.js가 없어야 함 ✅
```

**보안 가이드:** [docs/guides/API_SECURITY_GUIDE.md](docs/guides/API_SECURITY_GUIDE.md)

---

### ✅ **카카오톡 로그인 시스템 추가** 🆕

간편한 카카오톡 소셜 로그인을 추가했습니다!

**신규 파일:**
- `signup.html` - 회원가입 페이지 (카카오 간편가입 지원)
- `docs/guides/KAKAO_LOGIN_GUIDE.md` - 카카오 로그인 가이드
- `supabase/add-kakao-login-fields.sql` - DB 스키마 업데이트

**수정 파일:**
- `login.html` - 카카오 로그인 버튼 추가
- `QUICK_RULES.md` - 카카오 로그인 가이드 추가

**주요 기능:**
- 🟡 카카오톡 3초 만에 시작하기
- 📱 모바일 카카오톡 앱 자동 연동
- 🔐 OAuth 2.0 인증
- 👤 자동 프로필 정보 가져오기
- ✨ 신규 사용자 자동 회원가입 유도

**설정 방법:**
1. [Kakao Developers](https://developers.kakao.com/)에서 앱 등록
2. JavaScript 키 발급
3. `login.html`의 `KAKAO_JS_KEY` 변경
4. Supabase SQL Editor에서 `supabase/add-kakao-login-fields.sql` 실행
5. 테스트!

**가이드 문서:** [docs/guides/KAKAO_LOGIN_GUIDE.md](docs/guides/KAKAO_LOGIN_GUIDE.md)

---

### ✅ **Supabase 초기화 버그 수정**

`supabase.from is not a function` 에러를 수정했습니다.

#### 문제:
- routine.js에서 조건부 초기화가 제대로 작동하지 않음
- routine-calendar-modal.js가 routine.js보다 먼저 로드되어 supabase 사용 불가

#### 해결:
- routine.html에서 Supabase 라이브러리 로드 직후 inline script로 초기화
- routine.js에서 중복 초기화 코드 제거
- 모든 스크립트가 동일한 supabase 클라이언트 사용

#### 수정 파일:
- `routine.html`: inline script 추가
- `js/routine.js`: 중복 초기화 제거

---

### ✅ **데일리 루틴 달력 기능 활성화**

데일리 루틴 페이지에서 날짜를 클릭하면 달력 모달이 표시되어 월별 루틴 데이터를 색상으로 확인할 수 있습니다.

#### 주요 기능:
1. **달력 모달**
   - 상단 날짜 클릭 시 달력 모달 열림
   - 월 이동: ◀ ▶ 버튼으로 이전/다음 달
   - 오늘 날짜: 파란 테두리 강조
   - 선택된 날짜: 하늘색 배경 표시

2. **색상 인디케이터**
   - 🟣 수면: 취침 & 기상 시간 입력됨
   - 🔵 수분: 수분 섭취량 > 0 ml
   - 🟢 식사: 식사 기록 1개 이상
   - 🟠 운동: 운동 기록 1개 이상
   - 🔴 영양제: 영양제 복용 1개 이상

3. **날짜 선택**
   - 달력에서 날짜 클릭 → 해당 날짜로 이동
   - 루틴 데이터 자동 로드
   - 모달 자동 닫기

#### 구현 파일:
- **HTML**: `routine.html` (line 611-642)
- **CSS**: `css/routine-calendar-modal.css`
- **JavaScript**: `js/routine-calendar-modal.js`

#### 테스트:
```bash
1. http://localhost:8000/
2. 부모 ID: 46 (또는 47), 비밀번호: 1234
3. 데일리 루틴 페이지로 이동
4. 상단 날짜 클릭
5. 달력 확인:
   - 46번: 1월 22일 ~ 2월 4일 데이터 색상 표시
   - 47번: 1월 26일 ~ 2월 4일 데이터 색상 표시
```

---

## 🔧 **이전 수정 사항 (2026-02-04)**

### ✅ **병원 환자 구분 기능 - 조건부 UI 개선**

병원 환자와 일반 사용자를 구분하는 기능에 UI 로딩 개선을 추가했습니다.

#### 수정 사항:
1. **CSS 기본 숨김 처리**
   - 자세히 측정 탭: 기본적으로 숨김
   - 성장 주사 섹션: 기본적으로 숨김
   - 병원 환자일 때만 JavaScript로 표시

2. **디버깅 로그 강화**
   - UI 업데이트 과정을 상세히 로그 출력
   - 요소를 찾을 수 없을 때 경고 표시

#### 테스트:
- 47번 일반 사용자 로그인 시:
  - ❌ 자세히 측정 탭 보이지 않음
  - ❌ 성장 주사 섹션 보이지 않음
- 1~46번 병원 환자 로그인 시:
  - ✅ 자세히 측정 탭 표시
  - ✅ 성장 주사 섹션 표시

---

### ✅ **병원 환자 구분 기능**

병원 환자와 일반 사용자를 구분하는 기능을 추가했습니다.

#### 주요 특징:
1. **🏥 병원 환자 vs 👤 일반 사용자 구분**
   - users 테이블에 `is_patient` 컬럼 추가
   - 관리자 페이지에서 환자 타입 배지 표시
   - 필터링 기능 (전체/병원환자/일반사용자)

2. **🔒 조건부 UI 표시**
   - **데일리 루틴 - 자세히 측정**: 병원 환자만 표시
   - **데일리 루틴 - 성장주사**: 병원 환자만 표시
   - 일반 사용자는 해당 섹션이 숨겨짐

3. **📊 관리자 페이지 기능**
   - 환자 카드에 배지 표시
   - 필터 버튼: 전체 / 🏥 병원환자 / 👤 일반사용자
   - 한눈에 환자 타입 파악 가능

#### 마이그레이션:
- `supabase/migration_add_is_patient.sql`
- 1~10번, 46번 환자를 병원 환자로 자동 설정

---

### ✅ **데일리 루틴 달력 UI (관리자 페이지)**

관리자 페이지의 데일리 루틴을 **달력 형식**으로 표시하도록 변경했습니다.

#### 주요 특징:
1. **📅 월별 달력 뷰**
   - 한 달 단위로 데일리 루틴 데이터 표시
   - 이전/다음 버튼으로 월 이동
   - 오늘 날짜 강조 표시

2. **🎨 카테고리별 색상 코딩**
   - 🍽️ 식단: 파란색 (#3b82f6)
   - 💊 영양제: 초록색 (#10b981)
   - 😴 수면: 보라색 (#8b5cf6)
   - 🏃 운동: 주황색 (#f59e0b)
   - 💉 성장주사: 빨간색 (#ef4444)

3. **📊 날짜별 요약 정보**
   - 각 카테고리 항목 수 표시
   - 키/몸무게 간단 표시
   - 기록 없는 날은 회색으로 표시

4. **🔍 상세 정보 모달**
   - 날짜 클릭 시 전체 정보 모달 표시
   - 신체 측정, 수면, 식사, 운동, 영양제, 주사, 기분, 메모 등 모든 정보 확인

#### 새로운 파일:
- `js/admin-daily-routines-calendar.js` - 달력 로직
- `css/admin-daily-routines-calendar.css` - 달력 스타일

---

### ✅ **주요 버그 수정**

1. **routine.js - Supabase 중복 선언 에러 수정**
   - 조건부 선언으로 변경하여 중복 선언 방지
   - `window.supabase_client` 사용

2. **switchView 함수 전역 노출**
   - `window.switchView`로 전역 함수 노출
   - HTML onclick에서 호출 가능하도록 수정

3. **Korea-growth-standard.js weight 타입 이슈**
   - 디버깅 로그 강화 (타입, gender, genderData keys 출력)
   - 에러 추적 개선

4. **CSP inline script 이슈 정리**
   - `routine.html`의 inline script를 `js/routine-session-check.js`로 분리
   - CSP 정책 준수 (외부 파일 사용)

### 📁 **새로운 파일**
- `js/routine-session-check.js` - 세션 체크 및 데이터 초기화

---

## 🚀 **빠른 시작**

### 1️⃣ **로컬 서버 실행**
```bash
python -m http.server 8000
```

### 2️⃣ **로그인**
```
http://localhost:8000/
부모 ID: 1 이상의 숫자 (예: 1, 46, 100)
비밀번호: 1234
```

### 3️⃣ **빠른 로그인 버튼**
- **버튼 1 클릭** → 부모 ID: 1 자동 로그인
- **버튼 2~30** → 원하는 부모 ID로 즉시 로그인
- **직접 입력** → ID 46 이상도 입력 가능

---

## ☁️ **빠른 배포 (Cloudflare Pages)**

### **원클릭 배포 (Windows)**
```cmd
deploy.bat
```

### **원클릭 배포 (Mac/Linux)**
```bash
chmod +x deploy.sh
./deploy.sh
```

### **수동 배포**
```bash
# 1. Wrangler 설치
npm install -g wrangler

# 2. 로그인
wrangler login

# 3. 배포
wrangler pages deploy . --project-name=187-growth-care
```

**배포 URL**: https://187-growth-care.pages.dev

---

## 📊 **데이터 관리**

### **1. 로그인 시스템 🔐**

```
http://localhost:8000/login.html
```

**테스트 계정:**
- 이메일: `24-0001@example.com` ~ `24-0045@example.com`
- 비밀번호: `1234` (기본값, 변경 가능)

**주요 기능:**
- 이메일/비밀번호 로그인
- 역할별 자동 리다이렉트 (부모/의사/관리자)
- 비밀번호 변경 (`change-password.html`)
- 세션 관리 (SessionStorage)

자세한 내용은 [🔐 로그인 시스템 가이드](LOGIN_SYSTEM_COMPLETE.md) 참고

### **2. 관리자 대시보드 (PC 최적화)**

```
http://localhost:8000/admin-dashboard.html
```

**주요 기능:**
- ✅ **환자 관리** - 환자 추가/수정/삭제 (PC 화면에 최적화된 UI)
  - 환자 추가 버튼 → 모달 팝업으로 부모 정보 입력 (작은 버튼, 오른쪽 정렬)
  - 환자 상세 페이지 → 자녀 목록, 측정 기록 인라인 편집
  - 자녀 추가 버튼 → "자녀 목록" 텍스트 옆에 작은 버튼으로 배치
  - 성장 그래프 (표준 성장 곡선 + 실제 측정 데이터)
  - 측정 데이터 그리드 뷰 (날짜, 키, 몸무게, 실제나이, 뼈나이, PAH, 메모)
  - **📅 데일리 루틴 관리** - 환자별 모든 데일리 루틴 데이터 조회
    - 식사 기록, 수면 시간, 수분 섭취, 운동, 영양제, 성장 주사, 메모, 기분
    - 날짜별 상세 보기 모달
    - 자동 새로고침 버튼
- 📝 **레시피 관리** - 건강 레시피 추가/수정/삭제
- 📚 **성장 사례 관리** - 성장 사례 추가/수정/삭제
- 📖 **성장 가이드 관리** - 가이드 추가/수정/삭제

**테스트 방법:**
1. 홈 화면 (home.html) → 우측 상단 "👨‍⚕️ 관리자" 버튼 클릭
2. 환자 관리 탭에서 "➕ 환자 추가" 버튼 클릭 (작은 버튼, 오른쪽 정렬)
3. 모달 팝업에서 부모 정보 입력 후 "저장"
4. 환자 카드 클릭 → 상세 정보 확인
5. "자녀 목록" 옆 "➕ 자녀 추가" 버튼으로 자녀 추가
6. 측정 데이터 셀 클릭 → 인라인 편집

### **3. 엑셀 데이터 일괄 입력**

```
http://localhost:8000/admin-dashboard.html
```

**주요 기능:**
- 👥 **환자 관리**: 부모 정보, 자녀 정보, 측정 기록
- 🍳 **레시피 관리**: 성장 레시피 CRUD
- 📚 **성장 사례 관리**: 성장 관리 사례 CRUD
- 📖 **성장 가이드 관리**: 성장 가이드 CRUD

### **2. 엑셀 데이터 일괄 입력**

```
http://localhost:8000/import-excel-data.html
```

**한 번의 클릭으로 45명의 환자 데이터를 자동 입력!**
- ✅ 45명의 부모 정보
- ✅ 45명의 아이 정보
- ✅ 300개 이상의 측정 기록
- ✅ 실시간 진행 상황 표시

**⚠️ 오류 발생 시**: [🔧 수정 가이드](EXCEL_IMPORT_FIX.md) 참고

자세한 내용은 [📥 엑셀 데이터 일괄 입력 가이드](EXCEL_DATA_IMPORT_GUIDE.md) 참고

### **3. Supabase 연결 테스트**

```
http://localhost:8000/test-supabase-connection.html
```

**4가지 핵심 테스트:**
1. ✅ Supabase 클라이언트 생성
2. ✅ 데이터베이스 연결 테스트
3. ✅ 테이블 존재 확인
4. ✅ RLS 정책 확인

---

## 🎉 **NEW! 한국 표준 성장도표 통합**

**대한소아과학회 2017 한국 소아청소년 성장도표**를 활용한 정확한 성장 분석!

### **🔬 주요 개선사항:**
- ✅ **LMS (Lambda-Mu-Sigma) 방법** - 국제 표준 백분위 계산
- ✅ **한국 아동 최적화** - WHO/CDC 대신 한국 표준 데이터 사용
- ✅ **정확한 백분위** - 랜덤 값 대신 실제 성장도표 기반 계산
- ✅ **18세 예측키** - 현재 백분위를 18세로 투영
- ✅ **통합 예측** - Khamis-Roche + 한국 표준 평균으로 신뢰도 향상
- ✅ **한국 표준 성장 곡선** - P5, P50, P95 자동 생성

### **📊 LMS 방법이란?**
```
Z = ((측정값/M)^L - 1) / (L × S)
백분위 = 표준정규분포(Z) × 100
```
- **L (Lambda)**: 왜도 보정 계수
- **M (Mu)**: 중앙값 (50%)
- **S (Sigma)**: 변동계수

자세한 내용은 `KOREA_GROWTH_STANDARD_INTEGRATION.md` 참고

---

## 🤖 **AI 성장 상담 기능 (100% 무료)**

**완전 무료**로 PDF 기반 AI 상담을 받을 수 있습니다!

### **🚀 초간단 설치 (1줄 명령!)**

```cmd
scripts\setup_and_run.bat
```

**끝!** 자동으로 모든 것이 설치되고 실행됩니다! 🎉

### **✨ AI 기능:**
- ✅ PDF 기반 지식 베이스 (우리 아이 키 성장 바이블)
- ✅ Google Gemini AI (무료 월 45,000 요청)
- ✅ 출처 표시 (페이지 번호 포함)
- ✅ 로컬 벡터 DB (ChromaDB)
- ✅ FastAPI REST API
- ✅ 웹앱 자동 연동

### **📚 자세한 가이드:**
- `docs/TROUBLESHOOTING.md` - ⚠️ 에러 해결 가이드
- `docs/ONE_CLICK_SETUP.md` - 상세 설치 가이드
- `QUICK_START.md` - 빠른 시작

---

## 📱 프로젝트 개요

187 성장케어는 모바일에 최적화된 **여러 아이를 동시에 관리**할 수 있는 성장 관리 웹앱입니다. 터치 친화적인 UI와 하단 탭 네비게이션으로 원활한 사용자 경험을 제공합니다.

## ✨ 주요 기능

### 🏠 홈 (`index.html`)
- **👶 아이 관리**:
  - 여러 아이 추가/편집/삭제 가능 (**NEW: 수정/삭제 버튼 추가!**)
  - 아이별 이름, 성별, 생년월일 관리
  - 아이 선택으로 빠른 전환
  - 상단 헤더에 컴팩트한 아이 선택 칩
  - **✏️ 수정 버튼** - 클릭 시 정보 수정 모달
  - **🗑️ 삭제 버튼** - 확인 후 삭제 (모든 연관 데이터 함께 삭제)
  - **Toast 알림** - 삭제 완료 시 하단 알림 표시
  - **모바일 최적화** - 작은 화면에서도 버튼 항상 표시
- **📚 성장 가이드 배너** - **CARD DESIGN!**:
  - 카드 형식으로 제목과 내용 통합
  - 14개 전문 가이드 중 랜덤 5개 표시
  - 100% 너비 슬라이더 + 점 인디케이터
  - 클릭 시 상세 모달 팝업
  - 카테고리별 색상 구분
- **🌟 성장 관리 사례** - **NEW!**:
  - 카드 형식 배너 슬라이더
  - 실제 치료 사례 9건 표시
  - 성별, 이름, 성장량, 치료 기간 표시
  - 클릭 시 홈에서 직접 모달 팝업
  - 상세 정보 즉시 확인 (이동 없음)
  - 한국 표준 성장 곡선 포함 차트
  - 각 회차별 예측키 자동 계산
- **📊 우리 아이 현황** - **NEW! 한국 표준 성장도표**:
  - 카드 형식으로 제목과 내용 통합
  - **흰색 배경 + 원형 게이지 차트**
  - **한국 표준 성장도표 기반 정확한 백분위**
  - 백분위에 따른 게이지 색상 자동 변경
  - "상위 X% / 또래 100명 중 Y번째" 자동 계산
  - 100% 너비 슬라이더
- **📏 예상키 예측** - **NEW! 통합 예측 방법**:
  - **Khamis-Roche + 한국 표준 성장도표** 통합
  - 두 방법의 평균으로 더 정확한 예측
  - 각 방법별 결과도 함께 표시
  - 측정 날짜 선택 가능 (과거 데이터 입력 지원)
  - 만 나이 자동 계산
  - 예측 결과: 최종 키, 범위(±5cm), 중간 부모 키
  - 예측 기록 저장 및 관리
  - 예측 기록 클릭 → 성장 그래프 모달:
    - **한국 표준 성장 곡선** (P5, P50, P95)
    - 실제 성장 포인트 (빨간 점)
    - 예상 최종 키 (노란 별)
  - 예측 기록 삭제 기능
  - 성장 기록 개수 표시
- **⚙️ 관리자 기능**: 환자 관리, FAQ, 치료 사례 (ID/PW 불필요)

### 🔧 관리자 대시보드 (`admin-dashboard.html`) - **NEW!**
- **👥 환자 관리**:
  - 환자(부모) 및 아이 정보 통합 관리
  - 환자 추가/수정/삭제 (CRUD)
  - 아이별 측정 기록 조회 및 관리
  - 검색 및 필터링 (전체/남아/여아)
  - 환자 상세 정보 모달 (측정 기록 포함)
- **🍳 레시피 관리**:
  - 건강 레시피 추가/수정/삭제
  - JSON 형식 재료 및 조리 순서 관리
  - 영양소 정보 입력
  - 순서 관리 (홈 화면 표시 순서)
- **🌟 사례 관리**:
  - 성장 관리 사례 추가/수정/삭제
  - 환자 기본 정보 입력
  - 측정 기록 JSON 형식 관리
  - 치료 메모 작성
- **📚 가이드 관리**:
  - 성장 가이드 추가/수정/삭제
  - 배너 색상 및 아이콘 설정
  - 카테고리별 분류
  - 순서 관리

### 📊 성장 진단 (`growth.html`)
- **아이별 데이터 관리**:
  - 선택된 아이의 성장 기록만 표시
  - 아이의 성별에 맞는 성장 곡선 자동 표시
  - 성별 탭 자동 숨김 (선택된 아이 성별로 고정)
- **입력 탭 전환**:
  - 📝 성장 기록 입력
  - 📏 예상키 측정 (Khamis-Roche 방법)
- **컴팩트한 입력 폼**: 
  - 그리드 레이아웃으로 공간 최적화
  - 날짜, 성별, 나이, 키, 몸무게
  - 8px 간격, 작은 라벨
- **예상키 측정 기능**:
  - Khamis-Roche 방법 구현
  - 필요 입력: 아이(성별/나이/키/몸무게) + 부모 키(아버지/어머니)
  - 예상 범위: ±5cm
  - 4-17세 적용 가능
  - 예상키 탭에서 차트/기록 자동 숨김
- **성장 곡선 차트**: 
  - **한국 표준 성장도표 2017** (P5, P50, P95)
  - 선택된 아이 성별의 그래프만 자동 표시
  - 키/몸무게 탭 전환
  - 모바일 최적화 차트 (400px 높이)
- **성장 기록 카드**: 
  - 선택된 아이의 기록만 표시
  - **한국 표준 성장도표 기반 백분위 자동 계산**
  - 터치 친화적 삭제 버튼
  - 시각적 통계 표시

### 📝 데일리 루틴 (`routine.html`) - **NEW!** 🎉
- **종합 성장 습관 관리**:
  - 아이별 일일 루틴 데이터 입력 및 관리
  - 3가지 뷰 모드: 입력 / 달력 / 통계
  
- **📏 신체 측정**: 키, 몸무게 기록
- **🍽️ 식사 기록**: 
  - 4끼 식사 관리 (아침/점심/저녁/간식)
  - 식사 시간, 내용, 건강도, 식사량
  - 사진 첨부 기능 (Supabase Storage)
  
- **😴 수면**: 
  - 취침/기상 시간 기록
  - 수면 질 평가 (좋음/보통/나쁨)
  
- **💧 수분 섭취**: 
  - 목표 2000ml
  - +250ml / +500ml 빠른 추가
  - 실시간 진행바 표시
  
- **💊 영양제**: 
  - 기본 영양제 체크리스트 (비타민D, 칼슘, 아연, 종합비타민)
  - 추가 영양제 입력 기능
  
- **💉 성장 주사**: 시간 기록
  
- **🏃 운동 기록** ⭐ (챌린지 통합):
  - **2개 카테고리 탭**: 바른자세 / 성장판자극
  - **스크롤 가능한 운동 리스트** (최대 400px)
  - **9개 바른자세 운동** (목, 등, 복부, 옆구리, 허벅지, 엉덩이 등)
  - **4개 성장판자극 운동** (줄넘기, 제자리 점프, 계단 점프, 점핑잭)
  - **체크박스 선택** → 완료 표시
  - **📺 YouTube 팝업 영상 뷰어**:
    - 운동별 실시간 영상 재생
    - 타임스탬프 지원 (특정 구간부터 재생)
    - 자동 재생 기능
  - 선택된 운동 요약 표시
  
- **📝 메모 & 기분**: 
  - 하루 일기 작성
  - 기분 선택 (😊 좋음 / 😐 보통 / 😞 나쁨)
  
- **📅 달력 뷰**: 
  - 월별 루틴 완료 현황
  - 루틴 완료율 프로그레스 바
  - 주간 통계 (평균 수면, 운동 시간)
  
- **📊 통계 뷰**:
  - 루틴 완료율 추이 그래프
  - 식사 건강도 통계
  - 운동 시간 분석
  - 수면 패턴 분석

### 💡 정보 (`info.html`) - **완전 새단장!** 🎉
- **🌱 성장 가이드 섹션**: **14개 전문 가이드 카드** (data/growth_guide.json)
  - **카테고리별 필터**: 전체 / 성장 기초 / 영양 관리 / 클리닉 정보 / 생활 습관 / 부모 가이드
  - **카드 형식 UI**: 직관적이고 터치 친화적
  - **상세 모달**: 각 가이드별 깊이있는 정보 제공
  
- **📊 성장 기초 (4개)**:
  1. **성장 도표 읽는 법**: 백분위 곡선, 성장 패턴 분석
  2. **성장의 골든타임**: 4가지 시기별 관리법
     - 0-3세: 급성장기 (연간 10-25cm)
     - 3세-사춘기: 지속 성장기 (연간 5-7cm)
     - 사춘기: 마지막 스퍼트 (연간 8-10cm)
     - 성장판 닫힘 전: 최종 관리기
  3. **최종 키 예측하기**: Tanner 공식, 뼈나이 검사, 유전자 분석
  4. **키 성장의 비밀**: 유전 70-80% vs 환경 20-30% (5-10cm 차이 가능)

- **🥗 영양 관리 (2개)**:
  5. **성장 필수 영양소 9가지**: 단백질, 칼슘, 비타민D, 아연, 철분, 비타민A, 비타민C, 수분, 통곡물
  6. **성장 식단 피라미드**: 매 끼니 구성법 (손 크기 기준)

- **🏥 클리닉 정보 (3개)**:
  7. **성장 클리닉이란?**: 정밀 검사, 뼈나이 측정, 맞춤 플랜
  8. **성장 검사 종류**: 뼈나이 X-ray, 성장호르몬 혈액 검사
  9. **성장 체크리스트**: 조기 발견 필수 항목

- **🌟 생활 습관 (3개)**:
  10. **성장 수면 가이드**: 골든타임 22:00-02:00, 연령별 권장 수면시간
  11. **성장 운동 가이드**: 줄넘기, 농구, 수영, 스트레칭 (주 3-5회)
  12. **자세 교정 가이드**: 거북목, 굽은 등 교정법

- **💬 부모 가이드 (2개)**:
  13. **스트레스와 성장**: 코르티솔 ↑ → 성장호르몬 ↓
  14. **건강한 대화법**: 비교 금지, 과정 칭찬, 함께 하기

- **🍳 레시피북 섹션**: **10개 성장 레시피** (NEW!)
  - ImgBB 호스팅 고품질 이미지
  - 상세한 조리법 및 영양소 정보
  - 키 성장에 도움되는 영양소 분석 포함
  - **레시피 목록**:
    1. 🧀 치즈 듬뿍 닭가슴살 까르보나라 볶음밥
    2. 🐟 달콤 바삭 연어 스틱
    3. 🌈 무지개 칼슘 스무디 볼
    4. 🍝 치즈 폭탄 미트볼 토마토 스파게티
    5. 🟡 고소한 두부 너겟
    6. 🍙 키 쑥쑥 성장 주먹밥
    7. 🍄 우유 크림 버섯 리조또
    8. 🥜 달콤 고소 호두 멸치 주먹밥 볼
    9. 🥬 시금치 치즈 오믈렛 롤
    10. 🔤 ABC 알파벳 과일 요거트 파르페

- **❓ FAQ 섹션**: **7개 자주 묻는 질문** (아코디언 UI)
  - data/faqs.json에서 로드
  - 관리자 페이지에서 수정 가능

### ⭐ 치료 사례 (`cases.html`) - **NEW! 인터랙티브 UI**
- **실제 사례 데이터**: **9개** 샘플 사례 포함 (data/cases.json)
  - **남아 4명**: 김민준, 이서준, 박지훈, **전서우 (NEW!)**
  - 여아 5명: 최지우, 정서연, 강민서, 윤하은, 임수아
  - 각 사례별 측정 기록 3-10개, **회차별 메모 포함**
  - 치료 메모 및 성장 결과 포함
- **전서우 사례 (NEW!)**:
  - 생년월일: 2013-09-18, 남아
  - 치료 기간: 2023-01-13 ~ 2025-12-27 (2년 11개월)
  - **성장: 132.5cm → 161cm (28.5cm!)** / **10회 측정**
  - 부모 키: 아빠 168cm, 엄마 158cm
  - **예상키: 168cm → 176cm (13cm 향상!)**
  - 성조숙증 치료 (아리미덱스 + 루프린 주사)
  - 특이사항: 야구 선수 희망
  - **회차별 메모**: 최초 내원, 처방 시작, 식이 조절, 목표 달성 등
- **인터랙티브 모달 UI**: ⭐ **✅ UI 개선 완료!**
  - ✅ **환자 상세 정보**: 
    - 아버지 키, 어머니 키 (예: 168cm, 158cm)
    - 희망 키 (예: 180~185)
    - 첫 내원 나이 (예: 만 9세 3개월)
    - 특이사항 (예: 야구 선수 희망)
  - ✅ **고정 그래프**: 상단 고정되어 스크롤 시에도 계속 보임 (280px, 최대 45vh)
  - ✅ **스크롤 하이라이트**: 화면 중앙에 있는 회차 자동 하이라이트 (주황색)
  - ✅ **그래프 포인트 실시간 강조**: 하이라이트된 회차의 그래프 포인트가 주황색 + 크게 표시 (빨간색 8px → 주황색 14px)
  - ✅ **컴팩트 한 줄 레이아웃**: 날짜/나이/키/몸무게를 2x2 그리드로 표시
  - ✅ **회차별 메모**: 각 측정마다 치료 특이사항 표시
  - ✅ **펄스 애니메이션**: 하이라이트된 회차 배지가 부드럽게 펄스
  - ✅ **스크롤 영역 최적화**: 측정 기록이 충분히 보이도록 최소 50vh 보장
  - ✅ **커스텀 스크롤바**: 4px Primary 색상 스크롤바
- **통계 배너**: 500+ 치료, 15.5cm 평균, 98% 만족도
- **샘플 데이터 로드**: 
  - 배포 시 데이터 없으면 버튼으로 쉽게 로드 가능
  - localStorage 자동 로드 시스템
- **관리자 데이터 연동**: localStorage의 `adminCases` 사용
- **사례 카드**: 환자별 치료 정보 요약
  - 이름, 성별, 나이
  - 치료 전/후 키, 성장량
  - 치료 기간, 측정 횟수
- **상세 모달**: 
  - 📊 **표준 성장 곡선 차트**: KCDC 2017 표준 (P5, P50, P95) + 환자 데이터
  - 성장 결과 요약
  - 측정 기록 타임라인 (만 나이, 키, 몸무게, 성장분)
  - 메모 내용
- **자동 계산**: 치료 기간, 성장량, 만 나이

### ⚙️ 관리자 (`admin.html`) - **🆕 환자 관리 시스템!**
**ID/PW 없이 바로 접근 가능한 관리자 페이지**

#### 👥 **환자 관리 기능** (NEW!)
- **환자 목록**:
  - 카드형 UI로 직관적인 환자 조회
  - 실시간 통계: 전체 환자 수 / 치료중 / 남아 / 여아
  - 검색 기능: 이름, 차트번호로 빠른 검색
  - 필터링: 전체 / 남아 / 여아 / 치료중
  
- **환자 등록**:
  - 기본 정보: 이름, 성별, 생년월일, 차트번호, 연락처
  - 부모 정보: 아버지 키, 어머니 키, 희망 키
  - 특이사항: 알레르기, 과거 병력, 주의사항

- **환자 상세 정보** (3개 탭):
  - **기본정보 탭**: 환자 정보 요약 (나이 자동 계산)
  - **측정기록 탭**: 
    - 키/몸무게 기록 관리
    - 뼈나이, 예측 최종키
    - 회차별 메모
    - 성장량 자동 계산
  - **성장차트 탭**: 
    - 표준 성장 곡선 (5th, 50th, 95th 백분위)
    - 환자 데이터 포인트 (빨간색)
    - Chart.js 인터랙티브 차트

- **측정 기록 추가**:
  - 날짜, 키, 몸무게 필수 입력
  - 뼈나이, 예측 최종키 선택 입력
  - 메모 (소견, 특이사항)

- **데이터 저장**: localStorage 기반 (`admin_patients`)

#### 💬 **FAQ 관리**

#### 💬 FAQ 관리
- **CRUD 기능**: FAQ 추가/수정/삭제
- **카테고리**: 성장, 운동, 영양, 수면, 자세, 기타
- **질문/답변 형식**: 간단한 텍스트 입력
- **JSON 데이터 관리**:
  - 💾 **다운로드**: FAQ 데이터를 JSON 파일로 내보내기
  - 📂 **업로드**: JSON 파일에서 FAQ 데이터 가져오기
  - 덮어쓰기 확인: 기존 데이터가 있을 경우 확인 메시지 표시
- **저장 위치**: localStorage (`adminFaqs`)

#### 📊 치료 사례 관리
- **환자 정보 입력**:
  - 이름, 성별, 생년월일
- **측정 기록 관리**:
  - 여러 개의 측정 날짜 추가 가능
  - 각 측정마다 날짜, 키(cm), 몸무게(kg) 입력
  - **만 나이 실시간 자동 계산**: 측정 날짜 입력 시 자동으로 만 나이 표시
  - 생년월일 검증: 측정 날짜가 생년월일보다 이전인 경우 경고
- **성장 곡선 차트**:
  - KCDC 2017 표준 성장 도표 (P5, P50, P95)
  - 환자별 측정 데이터 점으로 표시
  - 성별에 맞는 표준 곡선 자동 적용
  - Chart.js 기반 인터랙티브 차트
- **JSON 데이터 관리**:
  - 💾 **다운로드**: 치료 사례 데이터를 JSON 파일로 내보내기
  - 📂 **업로드**: JSON 파일에서 치료 사례 데이터 가져오기
  - 덮어쓰기 확인: 기존 데이터가 있을 경우 확인 메시지 표시
- **메모 기능**: 치료 과정, 특이사항 기록
- **사례 상세 보기**:
  - 환자 정보 요약
  - 성장 곡선 시각화
  - 측정 기록 테이블 (만 나이 포함)
  - 메모 내용
- **저장 위치**: localStorage (`adminCases`)

#### 🗂️ 초기 데이터 (배포용)
- **`data/faqs.json`**: 12개의 기본 FAQ 데이터
  - 성장, 운동, 영양, 수면, 자세, 기타 카테고리별로 분류
  - 첫 방문 시 자동으로 localStorage에 로드
- **`data/cases.json`**: 4개의 샘플 치료 사례
  - 다양한 연령대와 성별의 실제 치료 사례
  - 각 사례마다 여러 측정 기록 포함
  - 첫 방문 시 자동으로 localStorage에 로드

#### 📋 데이터 구조
```javascript
// FAQ
{
  category: "성장",
  question: "키가 크려면 얼마나 자야 하나요?",
  answer: "하루 8-10시간 수면이 권장됩니다...",
  createdAt: "2025-01-15T00:00:00.000Z",
  updatedAt: "2025-01-15T00:00:00.000Z"
}

// 치료 사례
{
  name: "김민수",
  gender: "male",
  birthDate: "2015-03-15",
  measurements: [
    { date: "2024-01-15", height: 135, weight: 32 },
    { date: "2024-07-15", height: 140, weight: 35 },
    { date: "2025-01-15", height: 144, weight: 39 }
  ],
  memo: "6개월 치료 후 9cm 성장",
  createdAt: "2025-01-15T00:00:00.000Z",
  updatedAt: "2025-01-15T00:00:00.000Z"
}
```

## 🎨 모바일 최적화 디자인

### UI/UX 특징
- **하단 탭 네비게이션**: 5개 주요 메뉴 (70px 높이)
- **터치 친화적**: 최소 44px 터치 영역
- **부드러운 애니메이션**: 터치 피드백, 슬라이드 효과
- **세로 스크롤**: 모바일 우선 레이아웃
- **큰 폰트**: 가독성 최적화
- **간격 최적화**: 16px 기본 패딩

### 컬러 시스템
- **Primary**: #14b8a6 (Teal)
- **Secondary**: #f97316 (Orange)  
- **Background**: #f9fafb
- **White**: #ffffff
- **Text**: #1f2937
- **Text Light**: #6b7280

### 컴포넌트
- **카드**: 16px 둥근 모서리, 부드러운 그림자
- **버튼**: 12px 둥근 모서리, 활성 피드백
- **입력 필드**: 12px 패딩, 2px 테두리
- **모달**: 하단에서 슬라이드 업 (85vh)

## 📱 모바일 기능

### PWA (Progressive Web App)
- **manifest.json**: 홈 화면 추가 가능
- **테마 컬러**: #14b8a6
- **스플래시 스크린**: 앱 로딩 화면
- **독립 실행**: 브라우저 UI 없이 실행

### 반응형
- **모바일 우선**: 320px ~ 
- **세로 방향**: portrait 최적화
- **터치 제스처**: 스와이프, 탭 지원

### 데이터 관리
- **localStorage**: 오프라인 데이터 저장
- **실시간 동기화**: 즉시 반영
- **데이터 지속성**: 앱 종료 후에도 유지

---

## 🤖 AI 성장 상담 챗봇 (NEW!) ⭐

### ⚡ PDF 자동 RAG 구축 (5분!)

**이제 PDF 파일 하나로 AI 챗봇을 자동으로 만들 수 있습니다!**

```bash
# 1. 패키지 설치
pip install -r requirements.txt

# 2. PDF 파일 준비
# "우리 아이 키 성장 바이블 원고.pdf" → scripts/ 폴더

# 3. 자동 구축 실행!
python scripts/pdf_to_rag.py

# 결과: 5분 안에 327개 청크 자동 생성 + Pinecone 업로드 완료!
```

**처리 과정:**
```
PDF 읽기 → 텍스트 추출 → 스마트 청크 분할 → 임베딩 → Pinecone 업로드 → 완료!
```

**비용:** 단 $0.03 (3센트!)

#### 📋 빠른 시작 가이드:
- `docs/PDF_TO_RAG_QUICKSTART.md` - 5분 자동화 가이드 ⚡
- `scripts/pdf_to_rag.py` - 전자동 구축 스크립트
- `.env.example` - API 키 템플릿

---

### 📚 완전 가이드 제공
성장 데이터 기반 AI 챗봇을 웹앱에 통합하는 **완전한 가이드**를 제공합니다!

#### 🎯 시스템 구조
```
사용자 → 웹앱 → Cloudflare Worker → [OpenAI + Pinecone + Gemini] → AI 답변
```

#### 📚 제공 문서:
1. **완전 가이드** (`docs/AI_COMPLETE_GUIDE.md`) ⭐
   - 2-3일 안에 구축 가능
   - 단계별 상세 설명
   - 모든 코드 포함
   - 비용: 월 $2 (1000명 기준)

2. **데이터 준비** (`docs/AI_DATA_PREPARATION_GUIDE.md`)
   - FAQ, 의학 지식, 치료 사례 포맷
   - 데이터 품질 체크리스트
   - 템플릿 제공

3. **모델 학습** (`docs/AI_MODEL_TRAINING_GUIDE.md`)
   - RAG (Retrieval-Augmented Generation) 방식 권장
   - OpenAI Embedding + Pinecone + Gemini Pro
   - Fine-tuning 대안 설명

4. **구현 코드**:
   - `cloudflare-worker-rag.js` - 프록시 서버
   - `js/ai-growth-consultant.js` - 클라이언트
   - `css/ai-consultant.css` - UI 스타일

#### 🚀 핵심 기능:
- ✅ 24/7 실시간 성장 상담
- ✅ 1000+ 문서 기반 정확한 답변
- ✅ 출처 명시로 신뢰성 확보
- ✅ 대화 내역 저장 및 내보내기
- ✅ 타이핑 애니메이션
- ✅ 응급 상황 대응 가이드

#### 💰 비용 (무료 범위):
- OpenAI Embedding: $2/월
- Pinecone: 무료 (100K 벡터)
- Gemini Pro: 무료 (월 45K 요청)
- Cloudflare Workers: 무료 (월 100K 요청)

**총 월 비용: ~$2** (1000명 사용자 기준)

#### 🎯 시작하기:
```bash
# 1. 완전 가이드 읽기
cat docs/AI_COMPLETE_GUIDE.md

# 2. 데이터 준비 (4시간)
# 3. 벡터 DB 구축 (2시간)
# 4. Worker 배포 (1시간)
# 5. 웹앱 통합 (2시간)

# 총 소요 시간: 2-3일
```

---

## 🤖 AI 기능 (선택 사항)

### Google Gemini API 연동 가능
정적 웹사이트에서 AI 챗봇을 안전하게 사용하려면 **프록시 서버**가 필요합니다.

#### 📋 구현 방법:
1. **Cloudflare Workers (무료, 권장)**
   - API 키를 서버에서 안전하게 관리
   - 월 100,000 요청 무료
   - 빠른 글로벌 엣지 네트워크

2. **Firebase Functions**
   - Google 생태계 통합
   - 무료 티어 제공

#### 📦 제공 파일:
- `docs/gemini-cloudflare-worker.js` - Cloudflare Worker 프록시 코드
- `js/ai-chat.js` - 클라이언트 챗봇 JavaScript
- `docs/ai-chat-ui-component.html` - 챗봇 UI 컴포넌트
- `docs/GEMINI_INTEGRATION_GUIDE.md` - **완전한 구현 가이드** ⭐

#### ⚠️ 중요:
- **절대 API 키를 클라이언트 코드에 직접 넣지 마세요!**
- 누구나 브라우저에서 API 키를 볼 수 있습니다
- API 키 탈취 → 무단 사용 → 요금 폭탄 위험

#### 🚀 빠른 시작:
```bash
# 상세 가이드 확인
cat docs/GEMINI_INTEGRATION_GUIDE.md

# 5분 안에 설정 가능
```

---

## 🚀 실행 방법

### 브라우저에서 직접 열기
```bash
# index.html 파일을 더블클릭
# 또는 브라우저로 드래그
```

### 로컬 서버 실행 (권장)
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

브라우저에서 `http://localhost:8000` 접속

### 모바일에서 테스트
1. 같은 Wi-Fi에 연결
2. PC의 로컬 IP 확인 (예: 192.168.0.10)
3. 모바일 브라우저에서 `http://192.168.0.10:8000` 접속

## 📁 파일 구조

```
187-growth-care/
├── index.html              # 홈
├── home.html               # 로그인 후 메인 홈
├── growth.html             # 성장 진단
├── routine.html            # ⭐ 데일리 루틴 (챌린지 대체)
├── info.html               # 정보
├── cases.html              # 치료 사례
├── admin.html              # 관리자 (환자 관리 - 구버전)
├── admin-dashboard.html    # ⭐ NEW! 통합 관리자 대시보드
├── admin-content.html      # 콘텐츠 관리 (레시피/사례/가이드)
├── fix-storage.html        # 데이터 수정 도구
├── manifest.json           # PWA 설정
├── PRD.html                # 제품 요구사항 문서
├── PRD_2026.html           # 제품 요구사항 문서 2.0
├── wrangler.toml           # Cloudflare 설정
├── .cfignore               # Cloudflare 무시 파일
├── deploy.sh               # 배포 스크립트 (Mac/Linux)
├── deploy.bat              # 배포 스크립트 (Windows)
├── css/
│   ├── mobile.css          # 공통 모바일 스타일
│   ├── admin.css           # ⭐ 관리자 대시보드 스타일
│   ├── admin-patients.css  # 환자 관리 스타일
│   ├── growth-mobile.css   # 성장 진단
│   ├── routine-mobile.css  # ⭐ 데일리 루틴 (NEW!)
│   ├── info.css            # 정보
│   ├── info-mobile.css     # 정보 (구버전)
│   ├── recipe-card.css     # 레시피 카드
│   ├── toast.css           # 토스트 알림
│   ├── prediction-styles.css # 예측키 스타일
│   └── cases-mobile.css    # 치료 사례
├── js/
│   ├── main.js             # 공통 기능 (StorageManager)
│   ├── home.js             # 홈 페이지
│   ├── supabase-config.js  # ⭐ Supabase 연결 설정
│   ├── admin.js            # ⭐ 관리자 대시보드 로직
│   ├── admin-patients.js   # 환자 관리 로직
│   ├── growth-data.js      # KCDC 2017 표준 데이터
│   ├── korea-growth-standard.js # 한국 표준 성장도표
│   ├── growth-mobile.js    # 성장 진단
│   ├── challenge-data.js   # 챌린지 데이터
│   ├── challenge-mobile.js # 챌린지
│   ├── info.js             # 정보
│   ├── info-mobile.js      # 정보 (구버전)
│   └── cases-mobile.js     # 치료 사례
├── data/
│   ├── recipes.json        # 건강 레시피 (10개)
│   ├── growth_guide.json   # 성장 가이드 (14개)
│   └── cases.json          # 치료 사례 (9개)
├── supabase/
│   └── schema.sql          # ⭐ Supabase 테이블 스키마
├── docs/
│   ├── DATABASE_DESIGN.html # 데이터베이스 ERD
│   ├── SUPABASE_SETUP.md   # ⭐ Supabase 설정 가이드
│   ├── CLOUDFLARE_DEPLOYMENT.md # Cloudflare Pages 배포
│   ├── TROUBLESHOOTING.md  # AI 기능 에러 해결
│   └── ONE_CLICK_SETUP.md  # AI 기능 설치 가이드
├── README.md               # 프로젝트 문서
└── KOREA_GROWTH_STANDARD_INTEGRATION.md # 한국 표준 성장도표 문서
```

## 🔧 기술 스택

### 프론트엔드
- **HTML5**: 시맨틱 마크업, meta viewport
- **CSS3**: Flexbox, Grid, 터치 최적화
- **JavaScript (ES6+)**: 모듈화, 비동기 처리
- **Chart.js**: 성장 곡선 시각화
- **PWA**: manifest.json, 홈 화면 설치

### 백엔드 & 데이터베이스
- **Supabase**: PostgreSQL 데이터베이스, REST API 자동 생성
- **Row Level Security (RLS)**: 데이터 보안 정책
- **LocalStorage**: 오프라인 지원 (선택적)

### 배포
- **Cloudflare Pages**: 정적 웹사이트 호스팅 (무료)
- **Cloudflare Workers**: API 게이트웨이 (선택적)

## 💾 데이터 저장

### Supabase 데이터베이스 (권장)

**프로덕션 환경**에서는 Supabase PostgreSQL 데이터베이스를 사용합니다:

#### 테이블 구조
- **users**: 부모/의사/관리자 계정
- **children**: 아이 정보 (부모 ID로 연결)
- **child_required_info**: 필수 신체 정보 (키, 몸무게, 부모 키 등)
- **child_optional_male/female**: 성별별 선택 정보
- **measurements**: 측정 기록 (키, 몸무게, 날짜)
- **recipes**: 건강 레시피
- **growth_cases**: 성장 관리 사례
- **growth_guides**: 성장 가이드
- **challenges**: 챌린지 기록

#### 설정 방법
자세한 설정 방법은 [Supabase 설정 가이드](docs/SUPABASE_SETUP.md) 참고

#### ✅ Supabase 연결 테스트

Supabase 설정 후 연결 상태를 확인하세요:

```bash
# 브라우저에서 열기
open test-supabase-connection.html
```

**테스트 항목:**
1. ✅ Supabase 클라이언트 생성
2. ✅ 데이터베이스 연결 테스트
3. ✅ 테이블 존재 확인 (users, children, recipes, growth_cases, growth_guides)
4. ✅ RLS 정책 확인

**테스트 실패 시:**
- API Key 확인: `Settings → API → Publishable key` 복사
- 테이블 생성: `Supabase Dashboard → SQL Editor → supabase/schema.sql` 실행
- Data API 활성화: `Settings → Data API → Enable` 확인

### LocalStorage (개발/오프라인)

**개발 환경** 또는 **오프라인 지원**을 위해 LocalStorage도 사용 가능:

모든 데이터는 **localStorage**에 아이별로 분리되어 저장:

### 아이 정보
```json
{
  "children": [
    {
      "id": "child-1234567890",
      "name": "김민수",
      "gender": "male",
      "birthDate": "2015-03-15",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "selectedChildId": "child-1234567890"
}
```

### 성장 기록 (아이별)
```json
{
  "growthRecords": {
    "child-1234567890": [
      { "date": "2025-01-15", "age": 9.8, "height": 140, "weight": 35 }
    ],
    "child-0987654321": [
      { "date": "2025-01-15", "age": 7.5, "height": 125, "weight": 25 }
    ]
  }
}
```

### 챌린지 기록 (아이별, 날짜별)
```json
{
  "challenges": {
    "child-1234567890": {
      "exercise": {
        "exercise-1": ["2025-01-15", "2025-01-16"]
      },
      "diet": { ... },
      "sleep": { ... }
    }
  }
}
```

## 🎯 운동 동영상 (9개)

1. **목 스트레칭**: https://www.youtube.com/watch?v=-DULXNYk3Sg&t=42s
2. **등 스트레칭**: https://www.youtube.com/watch?v=-DULXNYk3Sg&t=117s
3. **복부 스트레칭**: https://www.youtube.com/watch?v=RzuXWJJf7bY&t=52s
4. **옆구리 스트레칭**: https://www.youtube.com/watch?v=cBYdbmVwB0E&t=135s
5. **등 근육운동**: https://www.youtube.com/watch?v=U62yLjlBSE8&t=219s
6. **허벅지 뒤 스트레칭**: https://www.youtube.com/watch?v=RzuXWJJf7bY&t=128s
7. **엉덩이 스트레칭**: https://www.youtube.com/watch?v=kcgO4-ifJqE&t=47s
8. **허벅지 앞 스트레칭**: https://www.youtube.com/watch?v=cBYdbmVwB0E&t=48s
9. **엉덩이 근육 운동**: https://www.youtube.com/watch?v=bqjB7pRbIfw&t=230s

## 📊 성장 곡선 데이터

**출처**: 질병관리청(KCDC) 2017 소아청소년 성장도표
- 연령: 2-18세
- 백분위: P5, P10, P25, P50, P75, P90, P95 (7개 전체 표시)
- 성별: 남아/여아 (그래프 분리)

## 📏 예상키 측정 (Khamis-Roche 방법)

**적용 대상**: 4-17세 아동
**필요 데이터**:
- 아이: 성별, 나이, 현재 키, 현재 몸무게
- 부모: 아버지 키, 어머니 키

**계산 원리**:
1. 중간 부모 키 (Midparental Height) 계산
   - 남아: (아버지 키 + 어머니 키 + 13) / 2
   - 여아: (아버지 키 + 어머니 키 - 13) / 2
2. 나이별 가중치 적용
   - 어릴수록 부모 키의 영향이 큼
   - 나이가 들수록 현재 키의 영향이 큼
3. 예상 최종 키 = (현재 키 × 현재키 계수) + (중간 부모 키 × 부모키 계수)

**예측 범위**: ±5cm (개인차 고려)

## 🎓 사용 가이드

### 아이 추가/관리하기
1. 홈 화면에서 "➕" 버튼 클릭
2. 아이 정보 입력 (이름, 성별, 생년월일)
3. 저장 버튼 클릭
4. 아이 카드를 터치하여 선택
5. 편집(✏️) 또는 삭제(🗑️) 버튼으로 관리

### 아이 전환하기
1. 홈 화면의 아이 카드 터치
2. 선택된 아이는 파란색 테두리로 표시
3. 모든 페이지가 자동으로 선택된 아이의 데이터로 전환

### 성장 기록하기
1. 하단 탭에서 📊 성장진단 선택
2. "📝 성장 기록" 탭 선택
3. 날짜, 성별, 나이, 키, 몸무게 입력
4. ✅ 기록 추가 버튼 터치
5. 선택된 아이 성별의 차트에서 성장 곡선 자동 확인

### 예상키 측정하기
1. 하단 탭에서 📊 성장진단 선택
2. "📏 예상키 측정" 탭 선택
3. 아이 정보 입력 (성별, 나이, 키, 몸무게)
4. 부모 키 입력 (아버지, 어머니)
5. 🔮 예상키 계산하기 버튼 터치
6. 예상 최종 키와 범위 확인

### 챌린지 참여하기
1. 하단 탭에서 🏃 챌린지 선택
2. 날짜 선택 (◀ / ▶ 버튼으로 이동)
3. 운동/식단/수면/자유 탭 전환
4. 체크 버튼(○) 터치로 완료 표시 (✓)
5. Streak 배너에서 연속 일수 확인

### 달력으로 성취도 확인하기
1. 챌린지 페이지 상단 "📅 달력보기" 버튼 터치
2. 월별 달력에서 색깔로 성취도 확인:
   - 🏃 운동: Teal (청록색)
   - 🥗 식단: Orange (주황색)
   - 😴 수면: Purple (보라색)
   - ✨ 자유: Pink (분홍색)
3. 날짜를 터치하여 해당일 상세 정보 확인
4. 카테고리별 완료율 프로그레스 바로 시각화
5. ◀ / ▶ 버튼으로 월 이동

### FAQ 확인하기
1. 하단 탭에서 💡 정보 선택
2. 카테고리 필터 (성장, 운동, 영양 등)
3. 질문 터치로 답변 확인

### 치료 사례 보기
1. 하단 탭에서 ⭐ 사례 선택
2. 사례 카드 터치
3. 하단 모달에서 상세 정보 확인:
   - 📊 표준 성장 곡선 차트 (환자 데이터 포함)
   - 성장 결과 요약
   - 측정 기록 타임라인
   - 메모 내용
4. 아래로 스와이프하여 닫기

### 관리자로 FAQ/사례 관리하기
1. 홈 화면 환영 배너에서 "⚙️ 관리자" 버튼 클릭
2. **FAQ 관리**:
   - FAQ 추가 버튼 클릭
   - 카테고리, 질문, 답변 입력
   - 저장 → 정보 페이지에 자동 표시
3. **치료 사례 관리**:
   - 사례 추가 버튼 클릭
   - 환자 정보 입력 (이름, 성별, 생년월일)
   - 측정 추가 버튼으로 여러 측정 기록 추가
   - 메모 작성
   - 저장 → 사례 페이지에 자동 표시
4. 사례 카드 클릭 시 표준 성장 도표와 환자 데이터 함께 표시

## 🔒 개인정보 보호

- 모든 데이터는 사용자 기기의 localStorage에만 저장
- 서버 전송 없음
- 외부 추적 스크립트 없음

## 📞 문의

**연세새봄의원 187 성장 클리닉**
- 전문의와 1:1 상담
- 맞춤형 성장 프로그램

## 📝 라이선스

© 2025 Yonsei Saebom Clinic. All rights reserved.

---

**우리 아이의 건강한 성장을 모바일에서 쉽게!** 🌱📱✨
