# 🌱 187 성장케어 플랫폼 - 완전 재설계 기획서 (v3.0)

## 📋 **목차**

1. [프로젝트 개요](#1-프로젝트-개요)
2. [데이터베이스 설계](#2-데이터베이스-설계)
3. [아키텍처 & 파일 구조](#3-아키텍처--파일-구조)
4. [화면 설계 (IA & Screen Flow)](#4-화면-설계-ia--screen-flow)
5. [사용자 플로우 (User Journey)](#5-사용자-플로우-user-journey)
6. [기능 명세](#6-기능-명세)
7. [UI/UX 가이드라인](#7-uiux-가이드라인)
8. [기술 스택](#8-기술-스택)
9. [개발 일정](#9-개발-일정)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목표
연세새봄의원 187 성장 클리닉의 **아이 성장 관리 전문 플랫폼**

### 1.2 핵심 가치
- 📊 **정확한 성장 추적**: 한국 표준 성장곡선 기반 백분위 분석
- 📝 **데일리 루틴 관리**: 매일의 성장 습관 기록 (식사, 운동, 수면, 영양제)
- 👨‍⚕️ **전문 의료진 모니터링**: 관리자 페이지에서 환자 성장 데이터 통합 관리
- 📱 **모바일 최적화**: 부모가 언제 어디서나 쉽게 기록

### 1.3 주요 사용자
- **부모 (Primary User)**: 아이 성장 기록, 데일리 루틴 입력
- **의료진 (Admin)**: 환자 관리, 성장 분석, 처방 기록

### 1.4 새로운 기능 (v3.0)
✅ **설문지 기반 초진 데이터** (남아/여아 별도)
✅ **데일리 루틴 (Daily Diary)** - 챌린지 대체
✅ **스프레드시트 형식 대량 데이터 입력**
✅ **운동 영상 연동** (유튜브)
✅ **사진 업로드** (식사 기록)

---

## 2. 데이터베이스 설계

### 2.1 ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│     users       │
│  (부모 계정)     │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐
│    children     │
│   (아이 정보)    │
└────────┬────────┘
         │ 1
         │
         ├─────────────────────────────────────────────┐
         │ N                        N                  │ N
┌────────▼────────┐    ┌──────────▼─────────┐  ┌─────▼──────────┐
│  measurements   │    │ daily_routines     │  │ questionnaire  │
│   (측정 기록)    │    │  (데일리 루틴)     │  │   (설문지)      │
└─────────────────┘    └────────────────────┘  └────────────────┘
         │ N                        │ 1
         │                          │ N
┌────────▼────────┐    ┌──────────▼─────────┐
│ exercise_logs   │    │     meals          │
│   (운동 기록)    │    │   (식사 기록)       │
└─────────────────┘    └────────────────────┘
                                │ 1
                                │ N
                       ┌────────▼────────┐
                       │  meal_photos    │
                       │  (식사 사진)     │
                       └─────────────────┘
```

---

### 2.2 테이블 상세 설계

#### **2.2.1 users (부모 계정)**

```sql
CREATE TABLE users (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'parent' CHECK (role IN ('parent', 'doctor', 'admin')),
    
    -- 메타 정보
    memo TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- 인덱스
    INDEX idx_email (email),
    INDEX idx_role (role)
);
```

---

#### **2.2.2 children (아이 정보)**

```sql
CREATE TABLE children (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    birth_date DATE NOT NULL,
    
    -- 출산 정보
    birth_week INTEGER,              -- 출생 당시 임신 주수
    birth_weight DECIMAL(4,2),       -- 출생 당시 몸무게 (kg)
    birth_notes TEXT,                -- 출생 시 특이사항
    
    -- 부모 신체 정보
    father_height DECIMAL(5,2),      -- 아버지 키 (cm)
    mother_height DECIMAL(5,2),      -- 어머니 키 (cm)
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- 인덱스
    INDEX idx_parent_id (parent_id),
    INDEX idx_birth_date (birth_date)
);
```

---

#### **2.2.3 questionnaire (설문지 데이터)**

성장클리닉 초진 시 작성하는 설문지 데이터

```sql
CREATE TABLE questionnaire (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    filled_date DATE DEFAULT CURRENT_DATE,
    
    -- 1. 기본 정보 (이미 children 테이블에 있음 - 참조용)
    
    -- 2. 성장 기록 (과거 키 데이터 - JSON)
    past_heights JSONB,
    -- 예: {"8세": {"height": 120, "change": 6}, "9세": {"height": 126, "change": 6}}
    
    -- 3. 성장 패턴
    recent_growth_speed VARCHAR(50),  -- 최근 성장 속도: "매우_빠름", "빠름", "느림", "매우_느림"
    
    -- 4. 건강 상태 (JSON 배열)
    health_conditions JSONB,
    -- 예: ["비염", "아토피", "천식"]
    
    current_medications TEXT,         -- 현재 복용 중인 약
    
    -- 5. 2차 성징 (남아)
    voice_change BOOLEAN,             -- 목소리 변화
    facial_hair BOOLEAN,              -- 수염
    armpit_hair BOOLEAN,              -- 겨드랑이 털
    pubic_hair BOOLEAN,               -- 음모
    
    -- 6. 2차 성징 (여아)
    breast_development BOOLEAN,       -- 가슴 발달
    menarche_date DATE,               -- 초경 날짜
    menarche_age DECIMAL(4,2),        -- 초경 나이
    
    -- 7. 생활 습관
    sleep_time TIME,                  -- 취침 시간
    wake_time TIME,                   -- 기상 시간
    sleep_quality VARCHAR(20),        -- 수면 질: "매우_좋음", "좋음", "나쁨"
    screen_time_hours DECIMAL(3,1),   -- 하루 평균 스크린 타임 (시간)
    
    -- 8. 식습관
    meal_regularity VARCHAR(20),      -- 식사 규칙성: "규칙적", "불규칙적"
    snack_frequency VARCHAR(20),      -- 간식 빈도: "많음", "보통", "적음"
    picky_eater BOOLEAN,              -- 편식 여부
    favorite_foods TEXT,              -- 좋아하는 음식
    disliked_foods TEXT,              -- 싫어하는 음식
    
    -- 9. 운동 습관
    exercise_frequency VARCHAR(20),   -- 운동 빈도: "매일", "주3-4회", "주1-2회", "거의_안함"
    exercise_types JSONB,             -- 운동 종목 (배열)
    -- 예: ["수영", "농구", "줄넘기"]
    
    -- 10. 스트레스 & 심리
    stress_level VARCHAR(20),         -- 스트레스: "높음", "보통", "낮음"
    academic_pressure BOOLEAN,        -- 학업 부담
    
    -- 11. 가족력
    family_short_stature BOOLEAN,     -- 가족 중 저신장
    family_notes TEXT,                -- 가족력 특이사항
    
    -- 12. 부모 의견
    target_height DECIMAL(5,2),       -- 목표 키
    main_concerns TEXT,               -- 주요 고민사항
    doctor_notes TEXT,                -- 의사 소견
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_child_id (child_id),
    INDEX idx_filled_date (filled_date)
);
```

---

#### **2.2.4 measurements (키/몸무게 측정 기록)**

```sql
CREATE TABLE measurements (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    measured_date DATE NOT NULL,
    
    -- 측정 데이터
    height DECIMAL(5,2) NOT NULL,             -- 키 (cm)
    weight DECIMAL(5,2),                      -- 몸무게 (kg)
    actual_age DECIMAL(4,2),                  -- 실제 나이 (만)
    bone_age DECIMAL(4,2),                    -- 뼈나이
    pah DECIMAL(5,2),                         -- 예상 성인 키 (PAH)
    
    -- 백분위 (자동 계산)
    height_percentile DECIMAL(5,2),           -- 키 백분위
    weight_percentile DECIMAL(5,2),           -- 몸무게 백분위
    bmi DECIMAL(5,2),                         -- BMI
    
    -- 메모
    notes TEXT,
    doctor_notes TEXT,                        -- 의사 소견
    
    -- 메타 정보
    created_by UUID REFERENCES users(id),     -- 기록자 (부모 or 의사)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_child_id (child_id),
    INDEX idx_measured_date (measured_date),
    
    -- 제약 조건
    UNIQUE(child_id, measured_date)
);
```

---

#### **2.2.5 daily_routines (데일리 루틴 - 메인 기록)**

챌린지를 대체하는 **데일리 다이어리**

```sql
CREATE TABLE daily_routines (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    routine_date DATE NOT NULL,
    
    -- 신체 측정
    daily_height DECIMAL(5,2),        -- 오늘 키 (선택)
    daily_weight DECIMAL(5,2),        -- 오늘 몸무게 (필수)
    
    -- 수면
    sleep_time TIME,                  -- 취침 시간
    wake_time TIME,                   -- 기상 시간
    sleep_quality VARCHAR(20),        -- 수면 질: "좋음", "보통", "나쁨"
    sleep_notes TEXT,                 -- 수면 메모
    
    -- 수분 섭취
    water_intake_ml INTEGER,          -- 물 섭취량 (ml)
    
    -- 영양제
    basic_supplements JSONB,          -- 기본 영양제 (배열)
    -- 예: ["비타민D", "칼슘", "아연"]
    extra_supplements JSONB,          -- 추가 영양제 (배열)
    
    -- 성장 주사
    growth_injection BOOLEAN DEFAULT false,  -- 성장 주사 맞았는지
    injection_time TIME,                     -- 주사 시간
    injection_notes TEXT,                    -- 주사 메모
    
    -- 메모
    daily_notes TEXT,                 -- 오늘 하루 메모
    mood VARCHAR(20),                 -- 기분: "좋음", "보통", "나쁨"
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_child_id (child_id),
    INDEX idx_routine_date (routine_date),
    
    -- 제약 조건
    UNIQUE(child_id, routine_date)
);
```

---

#### **2.2.6 meals (식사 기록)**

```sql
CREATE TABLE meals (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    meal_time TIME,
    
    -- 식사 내용
    description TEXT,                 -- 식사 내용 (텍스트)
    is_healthy BOOLEAN,               -- 건강한 식사였는지
    portion_size VARCHAR(20),         -- 식사량: "많음", "보통", "적음"
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_daily_routine_id (daily_routine_id),
    INDEX idx_meal_type (meal_type)
);
```

---

#### **2.2.7 meal_photos (식사 사진)**

```sql
CREATE TABLE meal_photos (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    
    -- 사진 정보
    photo_url TEXT NOT NULL,          -- Supabase Storage URL
    file_name VARCHAR(255),
    file_size INTEGER,                -- bytes
    
    -- 메타 정보
    uploaded_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_meal_id (meal_id)
);
```

---

#### **2.2.8 exercise_logs (운동 기록)**

```sql
CREATE TABLE exercise_logs (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    
    -- 운동 정보
    exercise_id UUID REFERENCES exercises(id),  -- 운동 템플릿 참조
    exercise_name VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,         -- 운동 시간 (분)
    completed BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_daily_routine_id (daily_routine_id),
    INDEX idx_exercise_id (exercise_id)
);
```

---

#### **2.2.9 exercises (운동 템플릿 - 마스터 데이터)**

기존 챌린지의 운동 리스트를 재활용

```sql
CREATE TABLE exercises (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,    -- "바른자세", "성장판자극", "유산소" 등
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- 영상 정보
    youtube_url TEXT,                 -- 유튜브 영상 URL
    thumbnail_url TEXT,               -- 썸네일 이미지
    
    -- 운동 정보
    duration_minutes INTEGER,         -- 권장 시간
    difficulty VARCHAR(20),           -- 난이도: "쉬움", "보통", "어려움"
    target_age_min INTEGER,           -- 최소 권장 나이
    target_age_max INTEGER,           -- 최대 권장 나이
    
    -- 정렬
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_category (category),
    INDEX idx_order_index (order_index)
);
```

---

#### **2.2.10 recipes (건강 레시피)**

```sql
CREATE TABLE recipes (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_number VARCHAR(20),        -- "레시피 01"
    title VARCHAR(200) NOT NULL,
    image_url TEXT,
    
    -- 레시피 정보
    key_benefits TEXT,                -- 핵심 효능
    main_nutrients JSONB,             -- 주요 영양소 (배열)
    ingredients JSONB,                -- 재료 [{name, amount}]
    cooking_steps JSONB,              -- 조리법 (배열)
    cooking_time_minutes INTEGER,
    difficulty VARCHAR(20),
    
    -- 영양 정보
    calories INTEGER,
    protein DECIMAL(5,2),
    carbs DECIMAL(5,2),
    fat DECIMAL(5,2),
    
    -- 정렬 & 표시
    order_index INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_order_index (order_index),
    INDEX idx_is_featured (is_featured)
);
```

---

#### **2.2.11 growth_cases (성장 사례)**

```sql
CREATE TABLE growth_cases (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    birth_date DATE,
    
    -- 부모 신체 정보
    father_height DECIMAL(5,2),
    mother_height DECIMAL(5,2),
    target_height DECIMAL(5,2),
    
    -- 치료 정보
    special_notes TEXT,               -- 특이사항
    treatment_memo TEXT,              -- 치료 메모
    
    -- 측정 데이터 (JSON)
    measurements JSONB,
    -- 예: [{"date": "2022-01-15", "height": 150, "weight": 45, "age": 12.5}]
    
    -- 정렬 & 표시
    order_index INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_order_index (order_index)
);
```

---

#### **2.2.12 growth_guides (성장 가이드)**

```sql
CREATE TABLE growth_guides (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(200),
    icon VARCHAR(10),                 -- 이모지
    category VARCHAR(50),             -- "검사", "영양", "운동", "수면"
    
    -- 콘텐츠
    image_url TEXT,
    content TEXT NOT NULL,
    banner_color VARCHAR(100),        -- CSS gradient
    
    -- 정렬 & 표시
    order_index INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 인덱스
    INDEX idx_category (category),
    INDEX idx_order_index (order_index)
);
```

---

### 2.3 데이터베이스 관계 요약

```
users (1) ──────── (N) children
                      │
                      ├─── (1) questionnaire
                      │
                      ├─── (N) measurements
                      │
                      └─── (N) daily_routines
                              │
                              ├─── (N) meals
                              │       └─── (N) meal_photos
                              │
                              └─── (N) exercise_logs
                                      └─── (N) exercises (참조)

독립 테이블:
- recipes
- growth_cases
- growth_guides
- exercises (마스터 데이터)
```

---

### 2.4 Supabase Storage 구조

```
📦 storage/
├── 📁 meal-photos/          # 식사 사진
│   └── {user_id}/{child_id}/{date}/{meal_type}/
│       └── photo_123.jpg
│
├── 📁 profile-photos/       # 프로필 사진 (추후)
│   └── {user_id}/
│       └── avatar.jpg
│
└── 📁 documents/            # 문서 (추후)
    └── {user_id}/{child_id}/
        └── medical_report.pdf
```

---

## 3. 아키텍처 & 파일 구조

### 3.1 기술 아키텍처

```
┌─────────────────────────────────────────────────────┐
│              Client (Mobile Web App)                │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │         Presentation Layer (View)             │ │
│  │  - HTML/CSS (Mobile-First Responsive)        │ │
│  │  - Vanilla JavaScript (ES6+)                 │ │
│  └───────────────────────────────────────────────┘ │
│                        │                            │
│  ┌───────────────────────────────────────────────┐ │
│  │       Controller Layer (MVC Pattern)          │ │
│  │  - HomeController.js                          │ │
│  │  - GrowthController.js                        │ │
│  │  - RoutineController.js                       │ │
│  │  - AdminController.js                         │ │
│  └───────────────────────────────────────────────┘ │
│                        │                            │
│  ┌───────────────────────────────────────────────┐ │
│  │         Service Layer (Business Logic)        │ │
│  │  - AuthService.js                             │ │
│  │  - ChildService.js                            │ │
│  │  - RoutineService.js                          │ │
│  │  - MeasurementService.js                      │ │
│  └───────────────────────────────────────────────┘ │
│                        │                            │
│  ┌───────────────────────────────────────────────┐ │
│  │       Component Layer (Reusable UI)           │ │
│  │  - GrowthChart.js                             │ │
│  │  - RoutineCard.js                             │ │
│  │  - Modal.js                                   │ │
│  └───────────────────────────────────────────────┘ │
│                        │                            │
│  ┌───────────────────────────────────────────────┐ │
│  │          Core/Utils Layer                     │ │
│  │  - utils.js (날짜, 나이 계산)                 │ │
│  │  - constants.js (성장 기준치)                 │ │
│  │  - api.js (Supabase wrapper)                  │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         │ HTTPS/REST API
                         │
┌────────────────────────▼─────────────────────────────┐
│              Supabase Backend (BaaS)                 │
│                                                      │
│  ┌────────────────┐  ┌────────────────┐            │
│  │   PostgreSQL   │  │    Storage     │            │
│  │   (Database)   │  │  (File Upload) │            │
│  └────────────────┘  └────────────────┘            │
│                                                      │
│  ┌────────────────┐  ┌────────────────┐            │
│  │      Auth      │  │   Real-time    │            │
│  │ (인증/세션관리)  │  │ (WebSocket)    │            │
│  └────────────────┘  └────────────────┘            │
└──────────────────────────────────────────────────────┘
```

---

### 3.2 프로젝트 파일 구조 (MVC + Service Pattern)

```
📁 187-growth-care-v3/
│
├── 📁 public/                      # 정적 파일
│   ├── index.html                  # 로그인 페이지
│   ├── favicon.ico
│   └── manifest.json               # PWA 설정
│
├── 📁 src/                         # 소스 코드
│   │
│   ├── 📁 core/                    # 핵심 유틸리티
│   │   ├── utils.js                # 공통 함수 (날짜, 나이, 포맷)
│   │   ├── constants.js            # 상수 (성장 기준치, 색상)
│   │   ├── api.js                  # Supabase API wrapper
│   │   └── validator.js            # 데이터 검증
│   │
│   ├── 📁 models/                  # 데이터 모델 (Plain Object)
│   │   ├── User.js
│   │   ├── Child.js
│   │   ├── Measurement.js
│   │   ├── DailyRoutine.js
│   │   └── Questionnaire.js
│   │
│   ├── 📁 services/                # 비즈니스 로직 (Service Layer)
│   │   ├── AuthService.js          # 로그인/로그아웃/세션
│   │   ├── UserService.js          # 사용자 CRUD
│   │   ├── ChildService.js         # 아이 CRUD
│   │   ├── MeasurementService.js   # 측정 기록 CRUD
│   │   ├── RoutineService.js       # 데일리 루틴 CRUD
│   │   ├── QuestionnaireService.js # 설문지 CRUD
│   │   ├── ExerciseService.js      # 운동 관리
│   │   ├── RecipeService.js        # 레시피 관리
│   │   ├── GrowthService.js        # 성장 계산 로직
│   │   └── StorageService.js       # 파일 업로드 (Supabase Storage)
│   │
│   ├── 📁 components/              # 재사용 가능한 UI 컴포넌트
│   │   ├── GrowthChart.js          # 성장 그래프 (Chart.js)
│   │   ├── ChildCard.js            # 아이 카드
│   │   ├── RoutineCard.js          # 루틴 카드
│   │   ├── MealCard.js             # 식사 카드
│   │   ├── ExerciseCard.js         # 운동 카드
│   │   ├── Modal.js                # 공통 모달
│   │   ├── PhotoUploader.js        # 사진 업로더
│   │   ├── DatePicker.js           # 날짜 선택기
│   │   └── Loading.js              # 로딩 스피너
│   │
│   ├── 📁 controllers/             # 페이지별 컨트롤러 (MVC Controller)
│   │   ├── AuthController.js       # 로그인/로그아웃
│   │   ├── HomeController.js       # 홈 페이지
│   │   ├── GrowthController.js     # 성장 진단 페이지
│   │   ├── RoutineController.js    # 데일리 루틴 페이지
│   │   ├── InfoController.js       # 정보 페이지
│   │   ├── CasesController.js      # 치료 사례 페이지
│   │   └── AdminController.js      # 관리자 페이지
│   │
│   ├── 📁 pages/                   # HTML 페이지
│   │   ├── home.html               # 홈 (대시보드)
│   │   ├── growth.html             # 성장 진단
│   │   ├── routine.html            # 데일리 루틴 (★ 새로운 기능)
│   │   ├── info.html               # 성장 가이드
│   │   ├── cases.html              # 치료 사례
│   │   ├── admin.html              # 관리자 대시보드
│   │   └── questionnaire.html      # 설문지 입력 (★ 새로운 기능)
│   │
│   └── 📁 styles/                  # CSS (Mobile-First)
│       ├── reset.css               # CSS Reset
│       ├── variables.css           # CSS 변수
│       ├── base.css                # 기본 스타일
│       ├── mobile.css              # 모바일 스타일 (기본)
│       ├── tablet.css              # 태블릿 (768px+)
│       ├── desktop.css             # 데스크톱 (1024px+) - Admin만
│       ├── components.css          # 컴포넌트 스타일
│       └── pages/                  # 페이지별 스타일
│           ├── home.css
│           ├── growth.css
│           ├── routine.css
│           ├── info.css
│           ├── cases.css
│           └── admin.css
│
├── 📁 docs/                        # 문서
│   ├── PRD_V3_COMPLETE.md          # 이 문서
│   ├── DATABASE_DESIGN.md          # DB 설계서
│   ├── API_DOCUMENTATION.md        # API 문서
│   └── DEPLOYMENT.md               # 배포 가이드
│
├── 📁 tools/                       # 관리 도구
│   ├── bulk-import.html            # 스프레드시트 대량 입력 (★ 새로운 기능)
│   └── seed-data.js                # 초기 데이터 생성
│
├── .gitignore
├── README.md
└── package.json                    # 의존성 (Chart.js, dayjs 등)
```

---

### 3.3 각 파일의 역할

#### **3.3.1 Core Layer**

##### **`core/utils.js`**
```javascript
/**
 * 공통 유틸리티 함수
 */

// 날짜 관련
export function calculateAge(birthDate, targetDate = new Date())
export function formatDate(date, format = 'YYYY-MM-DD')
export function getKoreanAge(birthDate)

// 숫자 관련
export function parseFloatSafe(value, defaultValue = 0)
export function roundTo(value, decimals = 1)

// 검증
export function isValidEmail(email)
export function isValidDate(dateString)

// 문자열
export function truncate(text, maxLength = 50)
export function sanitizeHTML(html)
```

##### **`core/constants.js`**
```javascript
/**
 * 애플리케이션 상수
 */

// 성장 표준 데이터 (KCDC 2017)
export const GROWTH_STANDARDS = { ... }

// 차트 색상
export const CHART_COLORS = {
    male: '#3b82f6',
    female: '#ec4899',
    percentile_5: '#ddd',
    percentile_50: '#666',
    percentile_95: '#ddd'
}

// 운동 카테고리
export const EXERCISE_CATEGORIES = [...]

// 식사 타입
export const MEAL_TYPES = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snack: '간식'
}
```

##### **`core/api.js`**
```javascript
/**
 * Supabase API Wrapper
 */
export class ApiClient {
    constructor(supabaseClient) { ... }
    
    async get(table, filters = {}) { ... }
    async getOne(table, id) { ... }
    async create(table, data) { ... }
    async update(table, id, data) { ... }
    async delete(table, id) { ... }
    async query(builder) { ... }
}
```

---

#### **3.3.2 Services Layer**

##### **`services/AuthService.js`**
```javascript
/**
 * 인증 관련 비즈니스 로직
 */
export class AuthService {
    async login(email, password)
    async logout()
    getCurrentUser()
    isLoggedIn()
    async changePassword(oldPassword, newPassword)
}
```

##### **`services/ChildService.js`**
```javascript
/**
 * 아이 관련 비즈니스 로직
 */
export class ChildService {
    async getChildren(parentId)
    async getChildById(id)
    async createChild(childData)
    async updateChild(id, data)
    async deleteChild(id)
    async getChildWithAllData(id) // 측정+루틴+설문지 포함
}
```

##### **`services/RoutineService.js`**
```javascript
/**
 * 데일리 루틴 관련 비즈니스 로직
 */
export class RoutineService {
    async getRoutine(childId, date)
    async createRoutine(routineData)
    async updateRoutine(id, data)
    async getRoutinesByMonth(childId, year, month)
    
    // 식사 관련
    async addMeal(routineId, mealData)
    async updateMeal(mealId, data)
    async uploadMealPhoto(mealId, file)
    
    // 운동 관련
    async logExercise(routineId, exerciseData)
    async getExerciseTemplates()
}
```

---

#### **3.3.3 Components Layer**

##### **`components/GrowthChart.js`**
```javascript
/**
 * 성장 그래프 컴포넌트
 * - 한국 표준 성장곡선 (5th, 50th, 95th)
 * - 실제 측정 데이터 오버레이
 */
export class GrowthChart {
    constructor(canvasId, options = {})
    render(child, measurements)
    update(measurements)
    destroy()
    highlight(index)
}
```

##### **`components/RoutineCard.js`**
```javascript
/**
 * 데일리 루틴 카드 컴포넌트
 */
export class RoutineCard {
    constructor(container, routine, date)
    render()
    attachEvents()
    update(routine)
}
```

##### **`components/PhotoUploader.js`**
```javascript
/**
 * 사진 업로더 컴포넌트
 * - 드래그 앤 드롭
 * - 파일 선택
 * - 미리보기
 * - 업로드 진행 상태
 */
export class PhotoUploader {
    constructor(containerId, options = {})
    render()
    onUpload(callback)
    async upload(file)
}
```

---

#### **3.3.4 Controllers Layer**

##### **`controllers/RoutineController.js`** (★ 새로운 페이지)
```javascript
/**
 * 데일리 루틴 페이지 컨트롤러
 */
export class RoutineController {
    constructor() {
        this.routineService = new RoutineService()
        this.storageService = new StorageService()
        this.currentChild = null
        this.currentDate = new Date()
        this.routine = null
    }
    
    async init() {
        this.loadCurrentChild()
        await this.loadRoutine()
        this.renderUI()
        this.attachEvents()
    }
    
    async loadRoutine() { ... }
    async saveRoutine() { ... }
    async addMeal(mealType) { ... }
    async uploadMealPhoto(mealId, file) { ... }
    async logExercise(exerciseId) { ... }
    renderCalendar() { ... }
    showStats() { ... }
}
```

##### **`controllers/AdminController.js`**
```javascript
/**
 * 관리자 페이지 컨트롤러 (PC 최적화)
 */
export class AdminController {
    constructor() {
        this.userService = new UserService()
        this.childService = new ChildService()
        this.currentTab = 'patients'
    }
    
    async init() { ... }
    async loadPatients() { ... }
    showPatientDetail(userId) { ... }
    async bulkImport(spreadsheetData) { ... } // ★ 스프레드시트 대량 입력
}
```

---

## 4. 화면 설계 (IA & Screen Flow)

### 4.1 정보 구조 (IA - Information Architecture)

```
📱 187 성장케어 앱
│
├── 🏠 홈 (Dashboard)
│   ├── 아이 선택 드롭다운
│   ├── 오늘의 루틴 요약
│   ├── 최근 성장 기록
│   ├── 빠른 액션 버튼
│   │   ├── 루틴 기록하기
│   │   ├── 성장 측정
│   │   └── 운동 기록
│   ├── 레시피 슬라이더
│   └── 치료 사례 슬라이더
│
├── 📊 성장 진단
│   ├── 아이 정보 카드
│   ├── 성장 기록 입력 폼
│   │   ├── 날짜
│   │   ├── 키
│   │   ├── 몸무게
│   │   ├── 뼈나이 (선택)
│   │   └── 메모
│   ├── 성장 그래프
│   │   ├── 표준 곡선 (5/50/95)
│   │   └── 실제 데이터
│   ├── 백분위 분석
│   ├── 예상 성인 키
│   └── 측정 기록 목록
│
├── 📝 데일리 루틴 (★ 새로운 페이지)
│   ├── 날짜 선택기
│   ├── 오늘의 루틴 입력
│   │   ├── 📏 신체 측정
│   │   │   ├── 키 (선택)
│   │   │   └── 몸무게 (필수)
│   │   │
│   │   ├── 🍽️ 식사 기록
│   │   │   ├── 아침
│   │   │   │   ├── 사진 업로드
│   │   │   │   ├── 텍스트 입력
│   │   │   │   └── 건강도 평가
│   │   │   ├── 점심
│   │   │   ├── 저녁
│   │   │   └── 간식
│   │   │
│   │   ├── 😴 수면
│   │   │   ├── 취침 시간
│   │   │   ├── 기상 시간
│   │   │   └── 수면 질
│   │   │
│   │   ├── 💧 수분 섭취
│   │   │   └── 물 마신 양 (ml)
│   │   │
│   │   ├── 💊 영양제
│   │   │   ├── 기본 영양제 체크리스트
│   │   │   └── 추가 영양제
│   │   │
│   │   ├── 💉 성장 주사
│   │   │   ├── 맞았는지 체크
│   │   │   └── 시간 기록
│   │   │
│   │   └── 🏃 운동
│   │       ├── 운동 선택 (유튜브 연동)
│   │       │   ├── 바른자세 운동
│   │       │   ├── 성장판 자극 운동
│   │       │   └── 유산소 운동
│   │       └── 운동 시간 기록
│   │
│   ├── 월간 캘린더 뷰
│   │   └── 완료도 시각화
│   │
│   └── 통계 & 분석
│       ├── 주간 완료율
│       ├── 식사 평균 점수
│       └── 운동 누적 시간
│
├── 📚 성장 가이드
│   ├── 카테고리 필터
│   ├── 가이드 카드 목록
│   └── 상세 보기 모달
│
├── 🏥 치료 사례
│   ├── 사례 카드 목록
│   ├── 성장 그래프
│   └── 치료 과정 타임라인
│
└── 👨‍⚕️ 관리자 페이지 (PC 최적화)
    ├── 환자 관리
    │   ├── 환자 목록 (검색/필터)
    │   ├── 환자 상세
    │   │   ├── 기본 정보
    │   │   ├── 설문지 데이터
    │   │   ├── 자녀 목록
    │   │   ├── 측정 기록 (그래프 + 테이블)
    │   │   └── 데일리 루틴 요약
    │   ├── 환자 추가 모달
    │   └── 스프레드시트 대량 입력 (★ 새로운 기능)
    │
    ├── 설문지 관리
    │   └── 설문지 템플릿 수정
    │
    ├── 레시피 관리
    │   ├── 레시피 목록
    │   └── CRUD
    │
    ├── 성장 사례 관리
    │   └── CRUD
    │
    └── 성장 가이드 관리
        └── CRUD
```

---

### 4.2 화면 흐름도 (Screen Flow Chart)

```
┌─────────────────┐
│   로그인 페이지   │ index.html
│  (부모 ID 입력) │
└────────┬────────┘
         │
         │ 로그인 성공
         │
┌────────▼────────┐
│    홈 (대시보드)  │ home.html
│                 │
│  ┌─────────────┐│
│  │아이 선택     ││ (상단 고정)
│  └─────────────┘│
│                 │
│  ┌─────────────┐│
│  │오늘의 루틴   ││ → 데일리 루틴 페이지로
│  │요약 카드     ││
│  └─────────────┘│
│                 │
│  ┌─────────────┐│
│  │최근 성장     ││ → 성장 진단 페이지로
│  │기록 차트     ││
│  └─────────────┘│
│                 │
│  ┌─────────────┐│
│  │빠른 액션     ││
│  │버튼 3개      ││
│  └─────────────┘│
│                 │
│  ┌─────────────┐│
│  │레시피        ││
│  │슬라이더      ││
│  └─────────────┘│
└─────────────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
┌────────▼────────┐              ┌────────▼────────┐
│   성장 진단      │              │  데일리 루틴     │ ★ 새로운 페이지
│   growth.html   │              │  routine.html   │
│                 │              │                 │
│ ┌─────────────┐ │              │ ┌─────────────┐ │
│ │기록 입력 폼  │ │              │ │날짜 선택기   │ │
│ └─────────────┘ │              │ └─────────────┘ │
│        │        │              │                 │
│        ▼        │              │ ┌─────────────┐ │
│ ┌─────────────┐ │              │ │신체 측정     │ │
│ │성장 그래프   │ │              │ │(키/몸무게)   │ │
│ │(Chart.js)   │ │              │ └─────────────┘ │
│ └─────────────┘ │              │        │        │
│        │        │              │        ▼        │
│        ▼        │              │ ┌─────────────┐ │
│ ┌─────────────┐ │              │ │식사 기록     │ │
│ │백분위 분석   │ │              │ │(사진+텍스트) │ │
│ └─────────────┘ │              │ └─────────────┘ │
│        │        │              │        │        │
│        ▼        │              │        ▼        │
│ ┌─────────────┐ │              │ ┌─────────────┐ │
│ │측정 기록     │ │              │ │수면 기록     │ │
│ │목록 (테이블) │ │              │ └─────────────┘ │
│ └─────────────┘ │              │        │        │
└─────────────────┘              │        ▼        │
                                 │ ┌─────────────┐ │
                                 │ │물/영양제     │ │
                                 │ └─────────────┘ │
                                 │        │        │
                                 │        ▼        │
                                 │ ┌─────────────┐ │
                                 │ │성장 주사     │ │
                                 │ └─────────────┘ │
                                 │        │        │
                                 │        ▼        │
                                 │ ┌─────────────┐ │
                                 │ │운동 기록     │ │
                                 │ │(유튜브 연동) │ │
                                 │ └─────────────┘ │
                                 │        │        │
                                 │        ▼        │
                                 │ ┌─────────────┐ │
                                 │ │저장 버튼     │ │
                                 │ └─────────────┘ │
                                 │        │        │
                                 │        ▼        │
                                 │ ┌─────────────┐ │
                                 │ │월간 캘린더   │ │
                                 │ │뷰로 전환     │ │
                                 │ └─────────────┘ │
                                 └─────────────────┘

┌─────────────────┐
│  하단 네비게이션  │ (모든 페이지 공통)
│                 │
│  🏠 홈           │
│  📊 성장 진단     │
│  📝 데일리 루틴   │ ★ 새로운 탭
│  📚 가이드       │
│  🏥 사례         │
└─────────────────┘

관리자 전용 (PC):
┌─────────────────┐
│  관리자 대시보드  │ admin.html
│                 │
│  Tab: 환자 관리  │
│  ┌─────────────┐│
│  │환자 목록 Grid││
│  │(검색/필터)   ││
│  └─────────────┘│
│        │        │
│        ▼        │
│  ┌─────────────┐│
│  │환자 상세 모달││
│  │             ││
│  │ - 기본정보  ││
│  │ - 설문지    ││
│  │ - 자녀목록  ││
│  │ - 측정기록  ││
│  │ - 루틴요약  ││
│  └─────────────┘│
│                 │
│  ┌─────────────┐│
│  │스프레드시트  ││ ★ 새로운 기능
│  │대량 입력     ││
│  └─────────────┘│
└─────────────────┘
```

---

### 4.3 데일리 루틴 페이지 상세 화면 (★ 핵심 신규 페이지)

#### **4.3.1 메인 뷰 (입력 모드)**

```
┌─────────────────────────────────┐
│ ◀  2026년 2월 4일 화요일    📅   │
├─────────────────────────────────┤
│                                 │
│  👶 선택된 아이: 박은율           │
│                                 │
├─────────────────────────────────┤
│  📏 오늘의 신체 측정              │
│  ┌───────────────────────────┐  │
│  │ 키: [______] cm (선택)    │  │
│  │ 몸무게: [______] kg (필수)│  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  🍽️ 식사 기록                    │
│  ┌───────────────────────────┐  │
│  │ 🌅 아침  [추가하기 +]      │  │
│  │                           │  │
│  │ ┌─────────────────────┐   │  │
│  │ │ 🍳 [사진]            │   │  │
│  │ │ 계란프라이, 밥, 김치  │   │  │
│  │ │ 😊 건강도: ●●●○○    │   │  │
│  │ │ [편집] [삭제]        │   │  │
│  │ └─────────────────────┘   │  │
│  │                           │  │
│  │ 🌞 점심  [추가하기 +]      │  │
│  │ 🌙 저녁  [추가하기 +]      │  │
│  │ 🍪 간식  [추가하기 +]      │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  😴 수면                         │
│  ┌───────────────────────────┐  │
│  │ 취침: [22:00]             │  │
│  │ 기상: [07:00]             │  │
│  │ 수면 질: ●●●○○ (좋음)    │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  💧 수분 섭취                    │
│  ┌───────────────────────────┐  │
│  │ 🥤 [___800___] ml         │  │
│  │ (목표: 1500ml)            │  │
│  │ ████░░░░░░ 53%           │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  💊 영양제                       │
│  ┌───────────────────────────┐  │
│  │ 기본 영양제:               │  │
│  │ ☑ 비타민D                 │  │
│  │ ☑ 칼슘                    │  │
│  │ ☐ 아연                    │  │
│  │                           │  │
│  │ 추가 영양제:               │  │
│  │ [+ 추가하기]              │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  💉 성장 주사                    │
│  ┌───────────────────────────┐  │
│  │ ☑ 오늘 맞음  시간: [19:00]│  │
│  │ 메모: [특이사항 없음]     │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  🏃 운동 기록                    │
│  ┌───────────────────────────┐  │
│  │ [+ 운동 추가하기]         │  │
│  │                           │  │
│  │ ✅ 거북목 스트레칭        │  │
│  │    ⏱️ 10분  📺 영상보기   │  │
│  │                           │  │
│  │ ✅ 줄넘기                 │  │
│  │    ⏱️ 15분  📺 영상보기   │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  📝 오늘의 메모                  │
│  ┌───────────────────────────┐  │
│  │ [오늘 하루를 기록하세요...│  │
│  │                           │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  😊 오늘의 기분                  │
│  ┌───────────────────────────┐  │
│  │ 😊 좋음  😐 보통  😞 나쁨 │  │
│  │   ●              ○      ○ │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  [💾 저장하기]                   │
└─────────────────────────────────┘
```

---

#### **4.3.2 캘린더 뷰 (월간 보기)**

```
┌─────────────────────────────────┐
│  📅 2026년 2월                   │
│  ◀ 이전달   오늘   다음달 ▶     │
├─────────────────────────────────┤
│                                 │
│  일  월  화  수  목  금  토      │
│                          1   2  │
│  ○   ○   ●   ●   ●   ●   ○   │
│                                 │
│  3   4   5   6   7   8   9     │
│  ●   🔥  ○   ○   ○   ○   ○   │
│                                 │
│  10  11  12  13  14  15  16    │
│  ○   ○   ○   ○   ○   ○   ○   │
│                                 │
│  ...                            │
│                                 │
│  범례:                           │
│  ● 완료  🔥 오늘  ○ 미입력     │
│                                 │
├─────────────────────────────────┤
│  이번 주 통계                    │
│  ┌───────────────────────────┐  │
│  │ 루틴 완료율: 85%          │  │
│  │ ████████░░               │  │
│  │                           │  │
│  │ 식사 평균 건강도: 4.2/5   │  │
│  │ 운동 누적 시간: 2.5시간   │  │
│  │ 평균 수면 시간: 9시간     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

#### **4.3.3 식사 추가 모달**

```
┌─────────────────────────────────┐
│  🍽️ 아침 식사 추가          [✕] │
├─────────────────────────────────┤
│                                 │
│  📷 사진 업로드                  │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    [카메라로 촬영하기]     │  │
│  │    [갤러리에서 선택]       │  │
│  │                           │  │
│  │  또는 드래그 앤 드롭       │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  미리보기:                       │
│  ┌─────────┐                    │
│  │ [사진]  │ [삭제]             │
│  └─────────┘                    │
│                                 │
│  📝 식사 내용                    │
│  ┌───────────────────────────┐  │
│  │ [밥, 김치찌개, 계란후라이,│  │
│  │  시금치나물, 김 ...]      │  │
│  └───────────────────────────┘  │
│                                 │
│  ⏰ 식사 시간                    │
│  ┌───────────────────────────┐  │
│  │ [08:00]                   │  │
│  └───────────────────────────┘  │
│                                 │
│  😊 건강도 평가                  │
│  ┌───────────────────────────┐  │
│  │ ●●●●○ (매우 건강함)      │  │
│  │ ●●●○○ (건강함)           │  │
│  │ ●●○○○ (보통)             │  │
│  │ ●○○○○ (개선 필요)        │  │
│  └───────────────────────────┘  │
│                                 │
│  🍽️ 식사량                      │
│  ┌───────────────────────────┐  │
│  │ ○ 많음  ● 보통  ○ 적음    │  │
│  └───────────────────────────┘  │
│                                 │
│  [저장] [취소]                  │
└─────────────────────────────────┘
```

---

#### **4.3.4 운동 선택 모달**

```
┌─────────────────────────────────┐
│  🏃 운동 추가하기            [✕] │
├─────────────────────────────────┤
│                                 │
│  🔍 검색: [____________]         │
│                                 │
│  카테고리:                       │
│  [전체] [바른자세] [성장판] [유산소] │
│                                 │
├─────────────────────────────────┤
│  바른자세 운동                   │
│  ┌───────────────────────────┐  │
│  │ ┌─────┐                   │  │
│  │ │[썸네일]│ 거북목 스트레칭   │  │
│  │ └─────┘ ⏱️ 10분 | 😊 쉬움 │  │
│  │         📺 영상보기  [선택]│  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ ┌─────┐                   │  │
│  │ │[썸네일]│ 척추 교정 스트레칭│  │
│  │ └─────┘ ⏱️ 15분 | 😊 쉬움 │  │
│  │         📺 영상보기  [선택]│  │
│  └───────────────────────────┘  │
│                                 │
│  성장판 자극 운동                │
│  ┌───────────────────────────┐  │
│  │ ┌─────┐                   │  │
│  │ │[썸네일]│ 줄넘기           │  │
│  │ └─────┘ ⏱️ 15분 | 😐 보통 │  │
│  │         📺 영상보기  [선택]│  │
│  └───────────────────────────┘  │
│                                 │
│  [취소]                         │
└─────────────────────────────────┘

선택 후 입력:
┌─────────────────────────────────┐
│  📊 운동 기록 입력               │
├─────────────────────────────────┤
│  운동: 줄넘기                    │
│                                 │
│  ⏱️ 운동 시간 (분)              │
│  ┌───────────────────────────┐  │
│  │ [____15____] 분           │  │
│  └───────────────────────────┘  │
│                                 │
│  📝 메모 (선택)                  │
│  ┌───────────────────────────┐  │
│  │ [처음엔 힘들었지만...     │  │
│  └───────────────────────────┘  │
│                                 │
│  [저장] [취소]                  │
└─────────────────────────────────┘
```

---

### 4.4 설문지 페이지 (questionnaire.html)

#### **4.4.1 초진 설문지 입력 화면**

```
┌─────────────────────────────────┐
│  📋 성장클리닉 초진 설문지       │
│  (남아용 / 여아용)               │
├─────────────────────────────────┤
│  진행률: ████████░░ 80%         │
├─────────────────────────────────┤
│                                 │
│  섹션 1: 기본 정보 ✅            │
│  섹션 2: 과거 성장 기록 ✅       │
│  섹션 3: 건강 상태 ✅            │
│  섹션 4: 2차 성징 ✅             │
│  섹션 5: 생활 습관 (현재)        │
│  섹션 6: 식습관                  │
│  섹션 7: 운동 습관               │
│  섹션 8: 가족력                  │
│                                 │
├─────────────────────────────────┤
│  📝 섹션 5: 생활 습관            │
│                                 │
│  😴 수면                         │
│  평소 취침 시간:                 │
│  ┌───────────────────────────┐  │
│  │ [22:00]                   │  │
│  └───────────────────────────┘  │
│                                 │
│  평소 기상 시간:                 │
│  ┌───────────────────────────┐  │
│  │ [07:00]                   │  │
│  └───────────────────────────┘  │
│                                 │
│  수면의 질:                      │
│  ○ 매우 좋음                    │
│  ● 좋음                         │
│  ○ 나쁨                         │
│  ○ 매우 나쁨                    │
│                                 │
│  📱 스크린 타임                  │
│  하루 평균 스크린 타임:          │
│  ┌───────────────────────────┐  │
│  │ [___3___] 시간            │  │
│  └───────────────────────────┘  │
│                                 │
│  [이전] [다음: 식습관]           │
└─────────────────────────────────┘
```

---

### 4.5 스프레드시트 대량 입력 페이지

#### **4.5.1 대량 입력 화면 (tools/bulk-import.html)**

```
┌─────────────────────────────────────────────────┐
│  📊 환자 데이터 대량 입력                        │
│  (관리자 전용)                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  📋 1단계: 스프레드시트 데이터 붙여넣기          │
│                                                 │
│  ⚠️ 엑셀 또는 구글 스프레드시트에서 복사해서    │
│     아래에 붙여넣으세요 (Ctrl+V)                │
│                                                 │
│  필수 열 (순서대로):                             │
│  부모ID | 부모이름 | 이메일 | 아이이름 |        │
│  성별 | 생년월일 | 키 | 몸무게 | ...           │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │  [여기에 붙여넣기]                         │  │
│  │                                           │  │
│  │  1	홍길동	hong@example.com	홍아들    │  │
│  │  male	2015-03-15	130	35            │  │
│  │                                           │  │
│  │  2	김영희	kim@example.com	김딸      │  │
│  │  female	2016-05-20	120	30        │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [데이터 파싱하기]                               │
│                                                 │
├─────────────────────────────────────────────────┤
│  📊 2단계: 데이터 미리보기 & 검증                │
│                                                 │
│  파싱된 데이터: 45명                             │
│  ✅ 유효: 43명                                   │
│  ⚠️ 오류: 2명                                    │
│                                                 │
│  <table>                                        │
│  ┌────────────────────────────────────────┐    │
│  │ 부모ID | 부모 | 아이 | 성별 | 상태    │    │
│  ├────────────────────────────────────────┤    │
│  │ 1   홍길동  홍아들  남   ✅           │    │
│  │ 2   김영희  김딸    여   ✅           │    │
│  │ 3   이철수  -      -    ⚠️ 아이 없음 │    │
│  └────────────────────────────────────────┘    │
│  </table>                                       │
│                                                 │
│  [오류 행 수정하기] [무시하고 진행]              │
│                                                 │
├─────────────────────────────────────────────────┤
│  📤 3단계: 데이터베이스 업로드                   │
│                                                 │
│  ⚠️ 기존 데이터 처리 방식:                       │
│  ○ 중복 시 건너뛰기 (추천)                      │
│  ○ 중복 시 덮어쓰기                             │
│                                                 │
│  [🚀 업로드 시작]                               │
│                                                 │
│  진행 상황:                                      │
│  ████████████████████░░ 90% (40/45)            │
│                                                 │
│  로그:                                           │
│  ┌───────────────────────────────────────────┐  │
│  │ ✅ 부모 1 추가 (홍길동)                    │  │
│  │ ✅ 아이 추가 (홍아들)                      │  │
│  │ ✅ 부모 2 추가 (김영희)                    │  │
│  │ ⚠️ 부모 3 - 아이 데이터 없음 (건너뜀)     │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [완료]                                          │
└─────────────────────────────────────────────────┘
```

---

## 5. 사용자 플로우 (User Journey)

### 5.1 부모 사용자 플로우

#### **5.1.1 첫 로그인 & 초진 설문지**

```
시작: 병원에서 계정 생성 받음 (부모ID: 1, 비밀번호: 1234)
  │
  ├─ 1. 로그인 (index.html)
  │   └─ 부모 ID: 1 입력 → 자동으로 0001@example.com 변환
  │
  ├─ 2. 홈 화면 첫 방문
  │   └─ "설문지를 작성해주세요" 배너 표시
  │
  ├─ 3. 설문지 작성 (questionnaire.html)
  │   ├─ 기본 정보 입력
  │   ├─ 과거 성장 기록 (8세~현재)
  │   ├─ 건강 상태
  │   ├─ 2차 성징 체크
  │   ├─ 생활 습관
  │   ├─ 식습관
  │   ├─ 운동 습관
  │   └─ 가족력
  │
  └─ 4. 설문지 완료
      └─ 홈 화면으로 리다이렉트
```

---

#### **5.1.2 일상 사용 플로우 (데일리 루틴 중심)**

```
오전:
  ├─ 1. 아침에 앱 열기
  │   └─ 홈 화면에서 "오늘의 루틴 입력" 배너 확인
  │
  ├─ 2. 데일리 루틴 페이지 이동
  │   └─ 오늘 날짜 자동 선택
  │
  ├─ 3. 아침 식사 기록
  │   ├─ 사진 촬영 (또는 갤러리 선택)
  │   ├─ 식사 내용 텍스트 입력
  │   └─ 건강도 평가 (별점)
  │
  └─ 4. 영양제 체크
      └─ 비타민D, 칼슘 체크

점심:
  └─ 5. 점심 식사 기록
      └─ (아침과 동일)

저녁:
  ├─ 6. 저녁 식사 기록
  │
  ├─ 7. 성장 주사 기록
  │   ├─ "오늘 맞음" 체크
  │   └─ 시간 입력 (19:00)
  │
  ├─ 8. 운동 기록
  │   ├─ 운동 선택: "줄넘기"
  │   ├─ 유튜브 영상 보기 (앱 내 재생)
  │   └─ 운동 시간 입력: 15분
  │
  ├─ 9. 수면 기록
  │   ├─ 취침 시간: 22:00
  │   └─ 수면 질: "좋음"
  │
  ├─ 10. 물 섭취량 입력
  │   └─ 1200ml
  │
  ├─ 11. 몸무게 입력
  │   └─ 35.2kg
  │
  └─ 12. 저장
      └─ 완료 메시지 + 캘린더 뷰로 전환
```

---

#### **5.1.3 주간 리뷰**

```
주말:
  ├─ 1. 데일리 루틴 - 캘린더 뷰
  │   └─ 이번 주 완료 현황 확인
  │
  ├─ 2. 통계 확인
  │   ├─ 루틴 완료율: 85%
  │   ├─ 식사 평균 건강도: 4.2/5
  │   ├─ 운동 누적 시간: 2.5시간
  │   └─ 평균 수면 시간: 9시간
  │
  └─ 3. 성장 진단 페이지
      ├─ 이번 주 키/몸무게 기록
      └─ 성장 그래프 확인
```

---

### 5.2 의료진(관리자) 사용자 플로우

#### **5.2.1 환자 초진**

```
병원 내:
  ├─ 1. 관리자 로그인 (admin.html)
  │
  ├─ 2. 환자 추가 모달
  │   ├─ 부모 이름
  │   ├─ 이메일 (자동 생성: 0046@example.com)
  │   ├─ 전화번호
  │   └─ 저장
  │
  ├─ 3. 환자에게 로그인 정보 전달
  │   └─ "부모 ID: 46, 비밀번호: 1234"
  │
  └─ 4. 설문지 작성 안내
      └─ 환자가 집에서 모바일로 작성
```

---

#### **5.2.2 환자 모니터링**

```
진료실 (PC):
  ├─ 1. 관리자 대시보드
  │
  ├─ 2. 환자 검색
  │   └─ 이름 또는 부모 ID로 검색
  │
  ├─ 3. 환자 상세 보기 (모달)
  │   ├─ 기본 정보
  │   ├─ 설문지 데이터
  │   ├─ 자녀 목록
  │   ├─ 측정 기록 (그래프)
  │   └─ 데일리 루틴 요약
  │       ├─ 최근 7일 완료율
  │       ├─ 식사 평균 건강도
  │       └─ 운동 누적 시간
  │
  ├─ 4. 새 측정 기록 추가
  │   ├─ 날짜: 오늘
  │   ├─ 키: 135.5cm
  │   ├─ 몸무게: 36.2kg
  │   ├─ 뼈나이: 11.5세
  │   ├─ PAH: 175cm
  │   └─ 의사 소견 입력
  │
  └─ 5. 성장 분석
      ├─ 성장 그래프 확인
      ├─ 백분위 변화 추적
      └─ 처방 조정
```

---

#### **5.2.3 대량 데이터 입력**

```
초기 데이터 마이그레이션:
  ├─ 1. 기존 환자 데이터 준비
  │   └─ 엑셀 파일 정리
  │
  ├─ 2. bulk-import.html 열기
  │
  ├─ 3. 엑셀 데이터 복사
  │   └─ Ctrl+C
  │
  ├─ 4. 붙여넣기
  │   └─ 입력 영역에 Ctrl+V
  │
  ├─ 5. 데이터 파싱
  │   └─ 자동으로 열 매핑
  │
  ├─ 6. 미리보기 & 검증
  │   ├─ 유효 데이터 확인
  │   └─ 오류 행 수정
  │
  └─ 7. 업로드
      ├─ 진행 상황 실시간 표시
      └─ 완료: "45명 업로드 완료"
```

---

## 6. 기능 명세

### 6.1 부모 사용자 기능

#### **6.1.1 홈 (Dashboard)**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 아이 선택 | 드롭다운으로 여러 자녀 중 선택 | High |
| 오늘의 루틴 요약 | 오늘 완료한 루틴 항목 표시 | High |
| 최근 성장 기록 | 최근 3개월 성장 그래프 (미니) | High |
| 빠른 액션 버튼 | 루틴 입력/성장 측정/운동 기록 | Medium |
| 레시피 슬라이더 | 추천 건강 레시피 | Medium |
| 치료 사례 슬라이더 | 성공 사례 | Low |

---

#### **6.1.2 성장 진단**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 측정 기록 입력 | 날짜/키/몸무게/뼈나이/메모 | High |
| 성장 그래프 | Chart.js, 표준곡선 + 실제 데이터 | High |
| 백분위 계산 | 자동 계산 (한국 표준) | High |
| 예상 성인 키 | Khamis-Roche 방법 | Medium |
| 측정 기록 목록 | 테이블, 편집/삭제 | High |
| 성장 속도 분석 | 최근 6개월/1년 성장률 | Medium |

---

#### **6.1.3 데일리 루틴 (★ 신규)**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **신체 측정** |  |  |
| - 키 입력 | 선택 사항 | Low |
| - 몸무게 입력 | 필수 | High |
|  |  |  |
| **식사 기록** |  |  |
| - 사진 업로드 | 카메라/갤러리, 최대 5장/식사 | High |
| - 텍스트 입력 | 식사 내용 설명 | High |
| - 건강도 평가 | 5단계 별점 | Medium |
| - 식사량 | 많음/보통/적음 | Medium |
| - 식사 시간 | 시간 선택기 | Low |
|  |  |  |
| **수면 기록** |  |  |
| - 취침 시간 | 시간 선택기 | High |
| - 기상 시간 | 시간 선택기 | High |
| - 수면 질 | 좋음/보통/나쁨 | Medium |
|  |  |  |
| **수분 섭취** |  |  |
| - 물 섭취량 | ml 단위, 진행바 | High |
| - 목표 설정 | 나이별 권장량 자동 계산 | Medium |
|  |  |  |
| **영양제** |  |  |
| - 기본 영양제 | 체크리스트 (비타민D, 칼슘, 아연) | High |
| - 추가 영양제 | 자유 입력 | Medium |
|  |  |  |
| **성장 주사** |  |  |
| - 맞았는지 체크 | Boolean | High |
| - 주사 시간 | 시간 선택기 | Medium |
| - 메모 | 특이사항 | Low |
|  |  |  |
| **운동 기록** |  |  |
| - 운동 선택 | 운동 템플릿 목록 | High |
| - 유튜브 영상 | 앱 내 재생 또는 새 탭 | High |
| - 운동 시간 | 분 단위 | High |
| - 여러 운동 기록 | 하루에 여러 운동 가능 | High |
|  |  |  |
| **메모 & 기분** |  |  |
| - 오늘의 메모 | 자유 텍스트 | Medium |
| - 오늘의 기분 | 좋음/보통/나쁨 | Low |
|  |  |  |
| **뷰 전환** |  |  |
| - 입력 모드 | 오늘 루틴 입력 | High |
| - 캘린더 뷰 | 월간 완료 현황 | High |
| - 통계 뷰 | 주간/월간 통계 | Medium |

---

#### **6.1.4 설문지 (★ 신규)**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 성별 선택 | 남아/여아 설문지 분기 | High |
| 섹션별 입력 | 8개 섹션, 진행률 표시 | High |
| 과거 성장 기록 | 8세~현재 키 입력 (테이블) | High |
| 2차 성징 체크 | 남아/여아 별도 항목 | High |
| 생활 습관 | 수면, 스크린 타임 등 | Medium |
| 저장 & 수정 | 임시 저장, 나중에 수정 가능 | High |

---

### 6.2 관리자 기능

#### **6.2.1 환자 관리**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 환자 목록 | 그리드 뷰, 검색/필터 | High |
| 환자 상세 | 모달, 모든 데이터 통합 표시 | High |
| 환자 추가 | 모달 폼 | High |
| 환자 수정 | 기본 정보 수정 | Medium |
| 환자 삭제 | Soft delete (is_active=false) | Low |
| 스프레드시트 대량 입력 | 엑셀 데이터 붙여넣기 | High |

---

#### **6.2.2 설문지 관리**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 설문지 조회 | 환자별 설문지 데이터 확인 | High |
| 설문지 수정 | 관리자가 수정 가능 | Medium |
| 설문지 템플릿 수정 | 질문 항목 추가/삭제 | Low |

---

#### **6.2.3 측정 기록 관리**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 측정 기록 입력 | 진료 시 직접 입력 | High |
| 인라인 편집 | 테이블에서 셀 클릭 편집 | High |
| 성장 그래프 | 환자별 그래프 (PC 최적화) | High |
| 백분위 분석 | 자동 계산 표시 | High |
| 의사 소견 | 각 측정마다 소견 입력 | Medium |
| 엑셀 내보내기 | 측정 기록 엑셀 다운로드 | Medium |

---

#### **6.2.4 데일리 루틴 모니터링**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 루틴 요약 | 환자별 최근 7일 루틴 요약 | High |
| 완료율 확인 | 주간/월간 완료율 | High |
| 식사 기록 확인 | 사진 + 텍스트 | Medium |
| 운동 기록 확인 | 운동 종류 + 시간 | Medium |
| 영양제 복약 확인 | 체크리스트 | Medium |

---

#### **6.2.5 콘텐츠 관리**

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 레시피 CRUD | 추가/수정/삭제 | Medium |
| 성장 사례 CRUD | 추가/수정/삭제 | Medium |
| 성장 가이드 CRUD | 추가/수정/삭제 | Medium |
| 운동 템플릿 CRUD | 운동 추가/수정/삭제, 유튜브 URL | High |

---

## 7. UI/UX 가이드라인

### 7.1 디자인 원칙

#### **7.1.1 Mobile-First**
- ✅ 모든 화면 모바일 우선 설계
- ✅ 터치 친화적 UI (버튼 최소 44x44px)
- ✅ 스크롤 최소화 (한 화면에 핵심 정보)
- ✅ 빠른 입력 (드롭다운, 날짜 선택기, 시간 선택기)

#### **7.1.2 직관성**
- ✅ 아이콘 + 텍스트 병행
- ✅ 명확한 CTA (Call-to-Action)
- ✅ 진행 상황 즉시 피드백
- ✅ 오류 메시지 친절하게

#### **7.1.3 일관성**
- ✅ 컬러 시스템 통일
- ✅ 타이포그래피 규칙
- ✅ 아이콘 스타일 통일 (Font Awesome 또는 이모지)
- ✅ 버튼 스타일 일관성

---

### 7.2 컬러 시스템

```css
/* Primary */
--primary-blue: #3b82f6;     /* 남아 */
--primary-pink: #ec4899;     /* 여아 */
--primary-green: #10b981;    /* 성공 */

/* Semantic */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Neutral */
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
```

---

### 7.3 타이포그래피

```css
/* 폰트 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;

/* 크기 */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */

/* 가중치 */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

### 7.4 간격 시스템 (Spacing)

```css
/* 8px 기준 */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

---

### 7.5 반응형 브레이크포인트

```css
/* Mobile First */
@media (min-width: 640px)  { /* sm - 작은 태블릿 */ }
@media (min-width: 768px)  { /* md - 태블릿 */ }
@media (min-width: 1024px) { /* lg - 데스크톱 (Admin만) */ }
@media (min-width: 1280px) { /* xl - 큰 데스크톱 */ }
```

---

### 7.6 UI 컴포넌트 가이드

#### **7.6.1 버튼**

```html
<!-- Primary Button -->
<button class="btn btn-primary">
    저장하기
</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">
    취소
</button>

<!-- Icon Button -->
<button class="btn btn-icon">
    <i class="icon-plus"></i>
</button>

<!-- Loading State -->
<button class="btn btn-primary btn-loading">
    <span class="spinner"></span>
    저장 중...
</button>
```

**CSS:**
```css
.btn {
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
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
```

---

#### **7.6.2 입력 필드**

```html
<!-- Text Input -->
<div class="form-group">
    <label for="name">이름</label>
    <input type="text" id="name" placeholder="홍길동">
</div>

<!-- Number Input -->
<div class="form-group">
    <label for="height">키 (cm)</label>
    <input type="number" id="height" step="0.1" placeholder="130.5">
</div>

<!-- Textarea -->
<div class="form-group">
    <label for="memo">메모</label>
    <textarea id="memo" rows="3" placeholder="특이사항을 입력하세요"></textarea>
</div>
```

**CSS:**
```css
.form-group {
    margin-bottom: var(--space-4);
}

.form-group label {
    display: block;
    margin-bottom: var(--space-2);
    font-weight: 600;
    color: var(--text-primary);
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid var(--gray-200);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary-blue);
}
```

---

#### **7.6.3 카드**

```html
<div class="card">
    <div class="card-header">
        <h3>제목</h3>
    </div>
    <div class="card-body">
        <p>내용</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-primary">액션</button>
    </div>
</div>
```

**CSS:**
```css
.card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.card-header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--gray-200);
}

.card-body {
    padding: var(--space-4);
}

.card-footer {
    padding: var(--space-4);
    background: var(--gray-50);
    border-top: 1px solid var(--gray-200);
}
```

---

#### **7.6.4 모달**

```html
<div class="modal" id="exampleModal">
    <div class="modal-overlay"></div>
    <div class="modal-content">
        <div class="modal-header">
            <h3>모달 제목</h3>
            <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
            <p>모달 내용</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary">취소</button>
            <button class="btn btn-primary">확인</button>
        </div>
    </div>
</div>
```

**CSS:**
```css
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
    border-radius: 16px;
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    z-index: 1001;
}
```

---

## 8. 기술 스택

### 8.1 프론트엔드

```
📱 Client
├── HTML5
├── CSS3 (CSS Variables, Flexbox, Grid)
├── JavaScript (ES6+, Vanilla JS)
│   └── Modules (ESM)
│
└── Libraries
    ├── Chart.js (성장 그래프)
    ├── Day.js (날짜 처리)
    └── Font Awesome (아이콘)
```

---

### 8.2 백엔드 (BaaS)

```
☁️ Supabase
├── PostgreSQL (데이터베이스)
├── Supabase Auth (인증)
├── Supabase Storage (파일 저장)
├── Real-time (WebSocket)
└── RESTful API
```

---

### 8.3 배포

```
🚀 Cloudflare Pages
├── Static Hosting
├── Global CDN
├── HTTPS (자동)
└── Custom Domain
```

---

### 8.4 개발 도구

```
🛠️ Development
├── VS Code
├── Chrome DevTools
├── Git & GitHub
└── npm (패키지 관리)
```

---

## 9. 개발 일정

### 9.1 전체 일정 (2주, 10일)

```
Week 1: 핵심 기능 구현 (7일)
├── Day 1: 프로젝트 구조 & 공통 모듈
├── Day 2-3: 로그인 & 홈 페이지
├── Day 4-5: 성장 진단 & 데일리 루틴
├── Day 6: 설문지 페이지
└── Day 7: 관리자 페이지 (환자 관리)

Week 2: 폴리싱 & 배포 (3일)
├── Day 8: 관리자 페이지 (콘텐츠 관리, 대량 입력)
├── Day 9: 테스트 & 버그 수정
└── Day 10: 배포 & 문서화
```

---

### 9.2 상세 일정

#### **Day 1: 프로젝트 구조 & 공통 모듈**

**목표**: 프로젝트 뼈대 구축

**작업**:
- [ ] 프로젝트 폴더 구조 생성
- [ ] Supabase 프로젝트 생성 & 설정
- [ ] 데이터베이스 테이블 생성 (SQL)
- [ ] `core/utils.js` 작성
  - calculateAge()
  - formatDate()
  - parseFloatSafe()
- [ ] `core/constants.js` 작성
  - GROWTH_STANDARDS
  - CHART_COLORS
- [ ] `core/api.js` 작성
  - ApiClient 클래스
- [ ] CSS 변수 & 기본 스타일
- [ ] 반응형 레이아웃 기본 템플릿

**산출물**:
- ✅ 프로젝트 구조 완성
- ✅ 공통 모듈 20개 함수
- ✅ 데이터베이스 12개 테이블

---

#### **Day 2-3: 로그인 & 홈 페이지**

**목표**: 사용자 인증 & 대시보드

**Day 2 작업**:
- [ ] `services/AuthService.js`
  - login()
  - logout()
  - getCurrentUser()
- [ ] `controllers/AuthController.js`
- [ ] `index.html` (로그인 페이지)
  - 부모 ID 입력 → 이메일 자동 변환
  - 비밀번호 입력
  - 빠른 로그인 버튼
- [ ] 세션 관리 (SessionStorage)

**Day 3 작업**:
- [ ] `services/ChildService.js`
  - getChildren()
  - getChildById()
- [ ] `controllers/HomeController.js`
- [ ] `pages/home.html`
  - 아이 선택 드롭다운
  - 오늘의 루틴 요약 카드
  - 최근 성장 기록 미니 그래프
  - 빠른 액션 버튼 3개
  - 레시피 슬라이더
  - 치료 사례 슬라이더
- [ ] 하단 네비게이션

**산출물**:
- ✅ 로그인 시스템 완성
- ✅ 홈 대시보드 완성

---

#### **Day 4-5: 성장 진단 & 데일리 루틴**

**목표**: 핵심 기능 2개

**Day 4 작업** (성장 진단):
- [ ] `services/MeasurementService.js`
  - getMeasurements()
  - createMeasurement()
  - updateMeasurement()
  - deleteMeasurement()
- [ ] `services/GrowthService.js`
  - calculatePercentile()
  - calculatePredictedHeight()
- [ ] `components/GrowthChart.js`
  - Chart.js 래퍼
  - 표준 곡선 + 실제 데이터
- [ ] `pages/growth.html`
  - 측정 기록 입력 폼
  - 성장 그래프
  - 백분위 분석
  - 측정 기록 목록 (테이블)

**Day 5 작업** (데일리 루틴):
- [ ] `services/RoutineService.js`
  - getRoutine()
  - createRoutine()
  - updateRoutine()
  - addMeal()
  - logExercise()
- [ ] `services/StorageService.js`
  - uploadFile()
  - deleteFile()
- [ ] `components/RoutineCard.js`
- [ ] `components/PhotoUploader.js`
- [ ] `pages/routine.html`
  - 날짜 선택기
  - 신체 측정 입력
  - 식사 기록 (사진 + 텍스트)
  - 수면 기록
  - 물/영양제/성장 주사
  - 운동 선택 & 기록
  - 메모 & 기분
  - 저장 버튼

**산출물**:
- ✅ 성장 진단 페이지 완성
- ✅ 데일리 루틴 페이지 완성 (입력 모드)

---

#### **Day 6: 설문지 페이지**

**목표**: 초진 설문지

**작업**:
- [ ] `services/QuestionnaireService.js`
  - getQuestionnaire()
  - saveQuestionnaire()
  - updateQuestionnaire()
- [ ] `pages/questionnaire.html`
  - 남아/여아 템플릿 분기
  - 8개 섹션
  - 진행률 표시
  - 섹션별 검증
  - 임시 저장 기능

**산출물**:
- ✅ 설문지 페이지 완성

---

#### **Day 7: 관리자 페이지 (환자 관리)**

**목표**: PC 최적화 관리자 대시보드

**작업**:
- [ ] `services/UserService.js`
  - getUsers()
  - getUserById()
  - createUser()
  - updateUser()
- [ ] `controllers/AdminController.js`
- [ ] `pages/admin.html`
  - 환자 목록 (그리드)
  - 검색/필터
  - 환자 추가 모달
  - 환자 상세 모달
    - 기본 정보
    - 설문지 데이터
    - 자녀 목록
    - 측정 기록 (그래프 + 테이블)
    - 데일리 루틴 요약
  - 측정 기록 인라인 편집
- [ ] PC용 CSS (데스크톱 최적화)

**산출물**:
- ✅ 관리자 환자 관리 완성

---

#### **Day 8: 관리자 페이지 (콘텐츠 관리 & 대량 입력)**

**목표**: 관리자 기능 완성

**작업**:
- [ ] 레시피 관리 탭 (CRUD)
- [ ] 성장 사례 관리 탭 (CRUD)
- [ ] 성장 가이드 관리 탭 (CRUD)
- [ ] 운동 템플릿 관리 (CRUD)
- [ ] `tools/bulk-import.html`
  - 스프레드시트 붙여넣기
  - 데이터 파싱 & 검증
  - 미리보기
  - 대량 업로드

**산출물**:
- ✅ 관리자 전체 기능 완성
- ✅ 대량 입력 도구 완성

---

#### **Day 9: 테스트 & 버그 수정**

**목표**: 품질 보증

**작업**:
- [ ] E2E 테스트 (로그인 → 홈 → 루틴 → 성장 → 관리자)
- [ ] 모바일 기기 테스트 (iOS, Android)
- [ ] 브라우저 호환성 (Chrome, Safari, Firefox)
- [ ] 성능 최적화
  - 이미지 최적화
  - Lazy loading
  - Code splitting
- [ ] 버그 수정
- [ ] 사용성 개선

**산출물**:
- ✅ 테스트 완료
- ✅ 버그 제로

---

#### **Day 10: 배포 & 문서화**

**목표**: 프로덕션 출시

**작업**:
- [ ] Cloudflare Pages 배포
- [ ] 도메인 연결
- [ ] HTTPS 설정
- [ ] README.md 작성
- [ ] API 문서 작성
- [ ] 사용자 가이드 작성
- [ ] 관리자 매뉴얼 작성
- [ ] 최종 QA

**산출물**:
- ✅ 프로덕션 배포 완료
- ✅ 문서 완성
- ✅ **프로젝트 완료** 🎉

---

## 10. 마무리

### 10.1 프로젝트 목표 달성

✅ **모바일 최적화 앱**
- 모든 페이지 Mobile-First
- 터치 친화적 UI
- 빠른 입력

✅ **데일리 루틴 (신규 기능)**
- 식사, 수면, 운동, 영양제 통합 관리
- 사진 업로드
- 유튜브 영상 연동
- 캘린더 뷰 & 통계

✅ **설문지 시스템 (신규 기능)**
- 초진 데이터 체계적 수집
- 남아/여아 별도 템플릿

✅ **스프레드시트 대량 입력 (신규 기능)**
- 엑셀 데이터 복사 & 붙여넣기
- 자동 파싱 & 검증
- 대량 업로드

✅ **관리자 페이지 (PC 최적화)**
- 환자 통합 관리
- 측정 기록 인라인 편집
- 성장 분석 도구

---

### 10.2 다음 단계 (v3.1 이후)

#### **Phase 1: PWA 지원**
- Service Worker
- 오프라인 모드
- 푸시 알림

#### **Phase 2: AI 기능**
- 식사 사진 자동 분석
- 성장 예측 AI
- 맞춤형 운동 추천

#### **Phase 3: 소셜 기능**
- 부모 커뮤니티
- 성공 사례 공유
- 챌린지 랭킹

---

### 10.3 연락처

**프로젝트**: 187 성장케어 플랫폼 v3.0
**병원**: 연세새봄의원 187 성장 클리닉
**개발 기간**: 2주 (10일)
**문서 버전**: 3.0
**최종 수정**: 2026-02-05

---

**이 기획서를 바탕으로 새로운 채팅창에서 처음부터 개발을 시작하시면 됩니다! 🚀**
