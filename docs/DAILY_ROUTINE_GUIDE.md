# 📝 데일리 루틴 완전 가이드 (Daily Routine Complete Guide)

> 이 문서는 **챌린지 기능을 완전히 대체**하는 데일리 루틴 페이지의 상세 가이드입니다.

---

## 🎯 **개요**

### **챌린지 → 데일리 루틴 전환**

| 항목 | 챌린지 (v2.0) | 데일리 루틴 (v3.0) |
|------|--------------|-------------------|
| **기능** | 운동 체크리스트 | 종합 성장 기록 시스템 |
| **범위** | 운동만 | 신체/식사/수면/영양제/운동 전체 |
| **데이터** | Boolean (완료/미완료) | 상세 데이터 (사진, 시간, 메모) |
| **분석** | 완료 횟수 | 캘린더 뷰, 통계, 트렌드 분석 |
| **목표** | 운동 동기 부여 | 전반적 성장 습관 관리 |

---

## 🗄️ **데이터베이스 구조**

### **4개 테이블**

```sql
daily_routines        -- 메인 루틴 기록
├── meals            -- 식사 기록 (1:N)
│   └── meal_photos  -- 식사 사진 (1:N)
└── exercise_logs    -- 운동 기록 (1:N)

exercises            -- 운동 템플릿 (마스터 데이터)
```

---

### **1. daily_routines (메인 루틴)**

```sql
CREATE TABLE daily_routines (
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
    basic_supplements JSONB,          -- 기본 영양제 배열
    -- 예: ["비타민D", "칼슘", "아연"]
    extra_supplements JSONB,          -- 추가 영양제 배열
    
    -- 성장 주사
    growth_injection BOOLEAN DEFAULT false,
    injection_time TIME,
    injection_notes TEXT,
    
    -- 메모 & 기분
    daily_notes TEXT,
    mood VARCHAR(20),                 -- "좋음", "보통", "나쁨"
    
    -- 메타
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 제약
    UNIQUE(child_id, routine_date)
);
```

---

### **2. meals (식사 기록)**

```sql
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    
    meal_type VARCHAR(20) NOT NULL,   -- 'breakfast', 'lunch', 'dinner', 'snack'
    meal_time TIME,
    
    -- 식사 내용
    description TEXT,                 -- 식사 내용
    is_healthy BOOLEAN,               -- 건강한 식사 여부
    portion_size VARCHAR(20),         -- "많음", "보통", "적음"
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### **3. meal_photos (식사 사진)**

```sql
CREATE TABLE meal_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    
    -- Supabase Storage
    photo_url TEXT NOT NULL,          -- Storage URL
    file_name VARCHAR(255),
    file_size INTEGER,
    
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

**Storage Bucket**: `meal-photos` (Public, 5MB limit, image/*)

---

### **4. exercise_logs (운동 기록)**

```sql
CREATE TABLE exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_routine_id UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    
    exercise_id UUID REFERENCES exercises(id),
    exercise_name VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,         -- 운동 시간 (분)
    completed BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### **5. exercises (운동 템플릿)**

```sql
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    category VARCHAR(50) NOT NULL,    -- "바른자세", "성장판자극", "유산소"
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- 영상
    youtube_url TEXT,                 -- 유튜브 URL
    thumbnail_url TEXT,               -- 썸네일 URL
    
    -- 운동 정보
    duration_minutes INTEGER,         -- 권장 시간
    difficulty VARCHAR(20),           -- "쉬움", "보통", "어려움"
    target_age_min INTEGER,
    target_age_max INTEGER,
    
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📱 **화면 설계**

### **3가지 뷰 모드**

```
[입력 모드]  [캘린더]  [통계]
    ●           ○         ○
```

---

### **1. 입력 모드 (메인 화면)**

```
┌─────────────────────────────────┐
│  📅 2026년 2월 4일 (화)          │
│  ◀ 이전날   오늘   다음날 ▶      │
├─────────────────────────────────┤
│                                 │
│  📏 신체 측정                    │
│  ┌───────────────────────────┐  │
│  │ 키:  [___145.2___] cm     │  │
│  │ 몸무게: [___38.5___] kg   │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  🍽️ 식사 기록                    │
│  ┌───────────────────────────┐  │
│  │ 🌅 아침   ✅             │  │
│  │ 🌞 점심   [+ 추가하기]    │  │
│  │ 🌙 저녁   ○               │  │
│  │ 🍪 간식   ○               │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  😴 수면                         │
│  ┌───────────────────────────┐  │
│  │ 취침: [22:00]             │  │
│  │ 기상: [07:00]             │  │
│  │ 수면 질: ●●●●○ (좋음)     │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  💧 수분 섭취                    │
│  ┌───────────────────────────┐  │
│  │ ████████████░░░ 1500ml   │  │
│  │ 목표: 2000ml              │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  💊 영양제                       │
│  ┌───────────────────────────┐  │
│  │ ✅ 비타민D                │  │
│  │ ✅ 칼슘                   │  │
│  │ ✅ 아연                   │  │
│  │ [+ 추가 영양제]           │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  💉 성장 주사                    │
│  ┌───────────────────────────┐  │
│  │ ☑️ 오늘 맞음   시간: [21:00]│  │
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
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  😊 오늘의 기분                  │
│  ┌───────────────────────────┐  │
│  │ 😊 좋음  😐 보통  😞 나쁨 │  │
│  │   ●       ○       ○       │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  [💾 저장하기]                   │
└─────────────────────────────────┘
```

---

### **2. 캘린더 뷰**

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
│  범례:                           │
│  ● 완료  🔥 오늘  ○ 미입력     │
│                                 │
├─────────────────────────────────┤
│  이번 주 요약                    │
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

### **3. 통계 뷰**

```
┌─────────────────────────────────┐
│  📊 이번 달 통계                 │
├─────────────────────────────────┤
│                                 │
│  루틴 완료율 추이                │
│  ┌───────────────────────────┐  │
│  │  100% │─────────────│     │  │
│  │   75% │   ╱╲ ╱╲      │     │  │
│  │   50% │ ╱    ╲╱  ╲╱│     │  │
│  │   25% │             │     │  │
│  │    0% │─────────────│     │  │
│  │       1주  2주  3주  4주  │  │
│  └───────────────────────────┘  │
│                                 │
│  식사 건강도                     │
│  ┌───────────────────────────┐  │
│  │ 🌅 아침: ●●●●○  4.2/5    │  │
│  │ 🌞 점심: ●●●●●  4.8/5    │  │
│  │ 🌙 저녁: ●●●●○  4.1/5    │  │
│  │ 🍪 간식: ●●●○○  3.5/5    │  │
│  └───────────────────────────┘  │
│                                 │
│  운동 시간 (분)                  │
│  ┌───────────────────────────┐  │
│  │  바른자세:  ▰▰▰▱▱  150분  │  │
│  │  성장판:    ▰▰▰▰▱  200분  │  │
│  │  유산소:    ▰▰▱▱▱  120분  │  │
│  └───────────────────────────┘  │
│                                 │
│  수면 시간 평균                  │
│  ┌───────────────────────────┐  │
│  │  ⏰ 평균 취침: 22:15      │  │
│  │  ⏰ 평균 기상: 07:10      │  │
│  │  😴 평균 수면: 8시간 55분 │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## 🎨 **UI/UX 가이드**

### **섹션별 아이콘**

| 섹션 | 아이콘 | 색상 |
|------|--------|------|
| 신체 측정 | 📏 | --primary-blue |
| 식사 | 🍽️ | --success |
| 수면 | 😴 | --primary-indigo |
| 수분 | 💧 | --info |
| 영양제 | 💊 | --warning |
| 성장 주사 | 💉 | --error |
| 운동 | 🏃 | --primary-green |
| 메모 | 📝 | --gray-600 |
| 기분 | 😊 | --warning |

---

### **완료 상태 시각화**

```css
/* 미완료 */
.routine-item {
    border-left: 4px solid #e5e7eb;
    opacity: 0.6;
}

/* 부분 완료 */
.routine-item.partial {
    border-left: 4px solid #f59e0b;
    opacity: 0.85;
}

/* 완료 */
.routine-item.completed {
    border-left: 4px solid #10b981;
    opacity: 1;
}
```

---

### **반응형 디자인**

```css
/* 모바일 (기본) */
.routine-section {
    padding: 16px;
    margin-bottom: 12px;
}

/* 태블릿 (768px+) */
@media (min-width: 768px) {
    .routine-section {
        padding: 24px;
        margin-bottom: 16px;
    }
}
```

---

## 💻 **코드 구조**

### **Controllers**

```javascript
// controllers/RoutineController.js
export class RoutineController {
    constructor() {
        this.routineService = new RoutineService();
        this.storageService = new StorageService();
        this.currentChild = null;
        this.currentDate = new Date();
        this.routine = null;
        this.viewMode = 'input'; // 'input', 'calendar', 'stats'
    }
    
    async init() {
        this.loadCurrentChild();
        await this.loadRoutine();
        this.renderUI();
        this.attachEvents();
    }
    
    switchView(mode) {
        this.viewMode = mode;
        this.renderUI();
    }
    
    async loadRoutine() {
        const dateStr = formatDate(this.currentDate);
        this.routine = await this.routineService.getRoutine(
            this.currentChild.id,
            dateStr
        );
        
        if (!this.routine) {
            // 빈 루틴 생성
            this.routine = this.createEmptyRoutine();
        }
    }
    
    async saveRoutine() {
        const data = this.collectFormData();
        
        if (this.routine.id) {
            await this.routineService.updateRoutine(this.routine.id, data);
        } else {
            this.routine = await this.routineService.createRoutine(data);
        }
        
        showToast('저장되었습니다! ✅');
    }
    
    // 식사 관련
    async addMeal(mealType) {
        const modal = showMealModal(mealType);
        modal.onSave(async (mealData) => {
            await this.routineService.addMeal(this.routine.id, mealData);
            await this.loadRoutine();
            this.renderUI();
        });
    }
    
    async uploadMealPhoto(mealId, file) {
        const url = await this.storageService.uploadMealPhoto(mealId, file);
        showToast('사진 업로드 완료 ✅');
        return url;
    }
    
    // 운동 관련
    async logExercise() {
        const modal = showExerciseModal();
        modal.onSave(async (exerciseData) => {
            await this.routineService.logExercise(this.routine.id, exerciseData);
            await this.loadRoutine();
            this.renderUI();
        });
    }
    
    // 렌더링
    renderUI() {
        switch (this.viewMode) {
            case 'input':
                this.renderInputView();
                break;
            case 'calendar':
                this.renderCalendarView();
                break;
            case 'stats':
                this.renderStatsView();
                break;
        }
    }
    
    renderInputView() {
        const container = document.getElementById('routineContainer');
        container.innerHTML = `
            <div class="routine-input">
                ${this.renderBodyMeasurement()}
                ${this.renderMeals()}
                ${this.renderSleep()}
                ${this.renderWater()}
                ${this.renderSupplements()}
                ${this.renderGrowthInjection()}
                ${this.renderExercises()}
                ${this.renderNotes()}
                ${this.renderMood()}
            </div>
        `;
    }
    
    renderCalendarView() {
        // 캘린더 렌더링
    }
    
    renderStatsView() {
        // 통계 렌더링
    }
}
```

---

### **Services**

```javascript
// services/RoutineService.js
export class RoutineService {
    constructor(apiClient) {
        this.api = apiClient;
    }
    
    async getRoutine(childId, date) {
        const { data, error } = await this.api
            .from('daily_routines')
            .select(`
                *,
                meals (*,
                    meal_photos (*)
                ),
                exercise_logs (*)
            `)
            .eq('child_id', childId)
            .eq('routine_date', date)
            .single();
        
        return data;
    }
    
    async createRoutine(routineData) {
        const { data, error } = await this.api
            .from('daily_routines')
            .insert(routineData)
            .select()
            .single();
        
        return data;
    }
    
    async updateRoutine(id, routineData) {
        const { data, error } = await this.api
            .from('daily_routines')
            .update(routineData)
            .eq('id', id)
            .select()
            .single();
        
        return data;
    }
    
    async getRoutinesByMonth(childId, year, month) {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
        
        const { data, error } = await this.api
            .from('daily_routines')
            .select('*')
            .eq('child_id', childId)
            .gte('routine_date', startDate)
            .lte('routine_date', endDate)
            .order('routine_date');
        
        return data;
    }
    
    // 식사 관련
    async addMeal(routineId, mealData) {
        const { data, error } = await this.api
            .from('meals')
            .insert({
                daily_routine_id: routineId,
                ...mealData
            })
            .select()
            .single();
        
        return data;
    }
    
    // 운동 관련
    async logExercise(routineId, exerciseData) {
        const { data, error } = await this.api
            .from('exercise_logs')
            .insert({
                daily_routine_id: routineId,
                ...exerciseData
            })
            .select()
            .single();
        
        return data;
    }
    
    async getExerciseTemplates() {
        const { data, error } = await this.api
            .from('exercises')
            .select('*')
            .eq('is_active', true)
            .order('order_index');
        
        return data;
    }
}
```

---

### **Storage Service**

```javascript
// services/StorageService.js
export class StorageService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.bucket = 'meal-photos';
    }
    
    async uploadMealPhoto(mealId, file) {
        // 파일 압축
        const compressedFile = await this.compressImage(file);
        
        // 파일명 생성
        const timestamp = Date.now();
        const fileName = `${mealId}/${timestamp}_${file.name}`;
        
        // 업로드
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .upload(fileName, compressedFile, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        // Public URL 생성
        const { data: publicData } = this.supabase.storage
            .from(this.bucket)
            .getPublicUrl(fileName);
        
        // meal_photos 테이블에 기록
        await this.supabase
            .from('meal_photos')
            .insert({
                meal_id: mealId,
                photo_url: publicData.publicUrl,
                file_name: file.name,
                file_size: compressedFile.size
            });
        
        return publicData.publicUrl;
    }
    
    async compressImage(file) {
        // 이미지 압축 로직
        // (최대 1024px, 80% 품질)
        return compressedFile;
    }
}
```

---

## 📊 **통계 계산**

### **완료율 계산**

```javascript
function calculateCompletionRate(routine) {
    const sections = {
        body: routine.daily_weight !== null,
        meals: routine.meals && routine.meals.length >= 3,
        sleep: routine.sleep_time && routine.wake_time,
        water: routine.water_intake_ml >= 1500,
        supplements: routine.basic_supplements && routine.basic_supplements.length > 0,
        exercise: routine.exercise_logs && routine.exercise_logs.length > 0
    };
    
    const completed = Object.values(sections).filter(Boolean).length;
    const total = Object.keys(sections).length;
    
    return Math.round((completed / total) * 100);
}
```

---

### **주간 통계**

```javascript
async function getWeeklyStats(childId, startDate, endDate) {
    const routines = await routineService.getRoutinesByDateRange(
        childId, startDate, endDate
    );
    
    return {
        completionRate: calculateAverageCompletionRate(routines),
        mealHealthScore: calculateMealHealthScore(routines),
        exerciseTotalMinutes: calculateTotalExerciseTime(routines),
        averageSleepHours: calculateAverageSleep(routines)
    };
}
```

---

## ✅ **체크리스트**

### **Day 4-5 작업 (데일리 루틴 개발)**

- [ ] `src/controllers/RoutineController.js` 작성
- [ ] `src/services/RoutineService.js` 작성
- [ ] `src/services/StorageService.js` 작성
- [ ] `src/pages/routine.html` 작성
- [ ] `src/styles/pages/routine.css` 작성
- [ ] 식사 추가 모달 구현
- [ ] 운동 선택 모달 구현
- [ ] 사진 업로드 기능 구현
- [ ] 캘린더 뷰 구현
- [ ] 통계 뷰 구현
- [ ] 유튜브 영상 재생 구현

---

## 🚀 **다음 단계**

Day 4-5 완료 후 Day 6으로 진행:
- Day 6: 설문지 페이지 개발
- Day 7: 관리자 페이지 (환자 관리)

---

**작성일**: 2026-02-05  
**버전**: v3.0  
**문서 유형**: 데일리 루틴 완전 가이드
