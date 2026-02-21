# 🏃 데일리 루틴 운동 기능 - 상세 가이드

**작성일**: 2026-02-05  
**기능**: 운동 리스트 + 체크박스 + YouTube 팝업 뷰어  

---

## 📺 YouTube 영상 정보

### 바른자세 운동 (9개)

| 순번 | 운동 이름 | 아이콘 | YouTube URL | 시작 시간 |
|-----|----------|--------|-------------|----------|
| 1 | 목 스트레칭 | 🦒 | https://www.youtube.com/watch?v=-DULXNYk3Sg | 42초부터 |
| 2 | 등 스트레칭 | 🧘 | https://www.youtube.com/watch?v=-DULXNYk3Sg | 1분 57초부터 |
| 3 | 복부 스트레칭 | 💪 | https://www.youtube.com/watch?v=RzuXWJJf7bY | 52초부터 |
| 4 | 옆구리 스트레칭 | 🤸 | https://www.youtube.com/watch?v=cBYdbmVwB0E | 2분 15초부터 |
| 5 | 등 근육 운동 | 🏋️ | https://www.youtube.com/watch?v=U62yLjlBSE8 | 3분 39초부터 |
| 6 | 허벅지 뒤 스트레칭 | 🦵 | https://www.youtube.com/watch?v=RzuXWJJf7bY | 2분 8초부터 |
| 7 | 엉덩이 스트레칭 | 🍑 | https://www.youtube.com/watch?v=kcgO4-ifJqE | 47초부터 |
| 8 | 허벅지 앞 스트레칭 | 🦴 | https://www.youtube.com/watch?v=cBYdbmVwB0E | 48초부터 |
| 9 | 엉덩이 근육 운동 | 💪 | https://www.youtube.com/watch?v=bqjB7pRbIfw | 3분 50초부터 |

### 성장판자극 운동 (4개)

| 순번 | 운동 이름 | 아이콘 | YouTube URL |
|-----|----------|--------|-------------|
| 1 | 줄넘기 | 🪢 | (URL 추가 필요) |
| 2 | 제자리 점프 | 🤸 | (URL 추가 필요) |
| 3 | 계단 점프 | 🏃 | (URL 추가 필요) |
| 4 | 점핑잭 | 🏋️ | (URL 추가 필요) |

---

## 🎬 YouTube 영상 처리 상세

### URL 파싱 로직

```javascript
// 예시 URL: https://www.youtube.com/watch?v=-DULXNYk3Sg&t=42s

// 1단계: URL 파싱
const url = new URL(videoUrl);
const urlParams = new URLSearchParams(url.search);

// 2단계: 비디오 ID 추출
const videoId = urlParams.get('v');  // "-DULXNYk3Sg"

// 3단계: 타임스탬프 추출 (두 가지 형식 지원)
// 형식 1: ?t=42s
const timestamp = urlParams.get('t');  // "42s"

// 형식 2: #t=42s
const hashTimestamp = url.hash.replace('#t=', '').replace('s', '');  // "42"

// 4단계: Embed URL 생성
let embedUrl = `https://www.youtube.com/embed/${videoId}`;

// 5단계: 타임스탬프 추가
if (timestamp) {
    const seconds = timestamp.replace('s', '');
    embedUrl += `?start=${seconds}&autoplay=1`;
}

// 최종 URL: https://www.youtube.com/embed/-DULXNYk3Sg?start=42&autoplay=1
```

### 지원하는 YouTube URL 형식

1. **기본 형식**:
   ```
   https://www.youtube.com/watch?v=VIDEO_ID
   ```

2. **쿼리 파라미터 타임스탬프**:
   ```
   https://www.youtube.com/watch?v=VIDEO_ID&t=42s
   ```

3. **해시 타임스탬프**:
   ```
   https://www.youtube.com/watch?v=VIDEO_ID#t=42s
   ```

4. **단축 URL (youtu.be)**:
   ```
   https://youtu.be/VIDEO_ID?t=42s
   ```

---

## 🎨 UI 컴포넌트 분석

### 1️⃣ 운동 카테고리 탭

```html
<div class="exercise-tabs">
    <button class="exercise-tab active" data-category="posture">
        바른자세
    </button>
    <button class="exercise-tab" data-category="growth">
        성장판자극
    </button>
</div>
```

**스타일**:
```css
.exercise-tab {
    flex: 1;
    padding: 10px;
    background: transparent;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.3s;
}

.exercise-tab.active {
    background: white;
    color: #14b8a6;  /* Teal */
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
```

### 2️⃣ 스크롤 컨테이너

```html
<div class="exercise-scroll-container" id="exerciseScrollContainer">
    <!-- 운동 카드들이 동적으로 추가됨 -->
</div>
```

**스타일**:
```css
.exercise-scroll-container {
    max-height: 400px;         /* 스크롤 영역 제한 */
    overflow-y: auto;          /* 세로 스크롤 */
    background: #f9fafb;       /* 연한 회색 배경 */
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 16px;
}

/* 커스텀 스크롤바 */
.exercise-scroll-container::-webkit-scrollbar {
    width: 6px;
}

.exercise-scroll-container::-webkit-scrollbar-thumb {
    background: #14b8a6;       /* Teal 색상 */
    border-radius: 3px;
}
```

### 3️⃣ 운동 카드

```html
<div class="exercise-item-card" onclick="toggleExercise('neck-stretch')">
    <!-- 체크박스 -->
    <input 
        type="checkbox" 
        class="exercise-checkbox" 
        onclick="event.stopPropagation(); toggleExercise('neck-stretch')">
    
    <!-- 운동 아이콘 -->
    <div class="exercise-item-icon">🦒</div>
    
    <!-- 운동 정보 -->
    <div class="exercise-item-info">
        <div class="exercise-item-title">목 스트레칭</div>
        <div class="exercise-item-description">
            일자목과 거북목을 예방하고 개선하는 스트레칭
        </div>
    </div>
    
    <!-- 영상 버튼 -->
    <div class="exercise-item-actions">
        <button class="video-btn" 
            onclick="event.stopPropagation(); openYoutubeModal(...)">
            📺 영상
        </button>
    </div>
</div>
```

**스타일**:
```css
.exercise-item-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.3s;
}

/* 호버 효과 */
.exercise-item-card:hover {
    border-color: #14b8a6;
    box-shadow: 0 2px 8px rgba(20, 184, 166, 0.15);
}

/* 체크 상태 */
.exercise-item-card.checked {
    background: #d1fae5;        /* 연한 녹색 */
    border-color: #10b981;      /* 녹색 테두리 */
}
```

### 4️⃣ 체크박스

```css
.exercise-checkbox {
    width: 24px;
    height: 24px;
    cursor: pointer;
    flex-shrink: 0;  /* 크기 고정 */
}
```

### 5️⃣ 영상 버튼

```css
.video-btn {
    background: #eff6ff;        /* 연한 파란색 배경 */
    border: 1px solid #3b82f6;  /* 파란색 테두리 */
    color: #2563eb;             /* 진한 파란색 텍스트 */
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s;
    white-space: nowrap;
}

.video-btn:hover {
    background: #3b82f6;        /* 파란색 배경 */
    color: white;               /* 흰색 텍스트 */
}
```

### 6️⃣ YouTube 모달

```html
<div class="modal" id="youtubeModal">
    <div class="modal-content video-modal">
        <!-- 헤더 -->
        <div class="modal-header">
            <h3 id="videoTitle">목 스트레칭</h3>
            <button class="modal-close" onclick="closeYoutubeModal()">✕</button>
        </div>
        
        <!-- 비디오 플레이어 -->
        <div class="modal-body video-body">
            <div class="video-container">
                <iframe 
                    id="youtubePlayer" 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/VIDEO_ID?start=42&autoplay=1" 
                    frameborder="0" 
                    allowfullscreen>
                </iframe>
            </div>
            
            <!-- 운동 설명 -->
            <div class="video-description" id="videoDescription">
                일자목과 거북목을 예방하고 개선하는 스트레칭
            </div>
        </div>
        
        <!-- 푸터 -->
        <div class="modal-footer">
            <button class="btn-primary" onclick="closeYoutubeModal()">닫기</button>
        </div>
    </div>
</div>
```

**16:9 비율 유지**:
```css
.video-container {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%;  /* 16:9 = 9/16 = 0.5625 = 56.25% */
    background: #000;
}

.video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
```

---

## 🔄 JavaScript 흐름

### 1️⃣ 페이지 로드

```javascript
document.addEventListener('DOMContentLoaded', function() {
    updateDateDisplay();           // 날짜 표시
    loadRoutineData();             // 저장된 루틴 데이터 로드
    initializeEventListeners();    // 이벤트 리스너 등록
    renderExerciseList();          // 운동 리스트 렌더링 ⭐
});
```

### 2️⃣ 운동 리스트 렌더링

```javascript
function renderExerciseList() {
    const container = document.getElementById('exerciseScrollContainer');
    
    // 1. 데이터 가져오기
    const exercises = challengeData.exercise[currentExerciseCategory];
    
    // 2. HTML 생성
    container.innerHTML = exercises.map(exercise => `
        <div class="exercise-item-card ${selectedExercises[exercise.id] ? 'checked' : ''}" 
             onclick="toggleExercise('${exercise.id}')">
            
            <!-- 체크박스 -->
            <input type="checkbox" 
                   class="exercise-checkbox" 
                   ${selectedExercises[exercise.id] ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleExercise('${exercise.id}')">
            
            <!-- 아이콘 -->
            <div class="exercise-item-icon">${exercise.icon}</div>
            
            <!-- 정보 -->
            <div class="exercise-item-info">
                <div class="exercise-item-title">${exercise.title}</div>
                <div class="exercise-item-description">${exercise.description}</div>
            </div>
            
            <!-- 영상 버튼 (videoUrl이 있는 경우만) -->
            ${exercise.videoUrl ? `
                <div class="exercise-item-actions">
                    <button class="video-btn" 
                        onclick="event.stopPropagation(); 
                                 openYoutubeModal('${exercise.id}', 
                                                  '${exercise.title}', 
                                                  '${exercise.description}', 
                                                  '${exercise.videoUrl}')">
                        📺 영상
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // 3. 요약 업데이트
    updateExerciseSummary();
}
```

### 3️⃣ 운동 토글

```javascript
function toggleExercise(exerciseId) {
    // 상태 반전
    selectedExercises[exerciseId] = !selectedExercises[exerciseId];
    
    // 리렌더링
    renderExerciseList();
}
```

### 4️⃣ YouTube 모달 열기

```javascript
function openYoutubeModal(exerciseId, title, description, videoUrl) {
    const modal = document.getElementById('youtubeModal');
    const titleElement = document.getElementById('videoTitle');
    const descElement = document.getElementById('videoDescription');
    const iframe = document.getElementById('youtubePlayer');
    
    // 1. URL 변환
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch')) {
        // ?v=VIDEO_ID 추출
        const urlParams = new URLSearchParams(new URL(videoUrl).search);
        const videoId = urlParams.get('v');
        
        // ?t=42s 또는 #t=42s 추출
        const timestamp = urlParams.get('t') || 
                         new URL(videoUrl).hash.replace('#t=', '').replace('s', '');
        
        // Embed URL 생성
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
        
        // 타임스탬프 추가
        if (timestamp) {
            embedUrl += `?start=${timestamp}&autoplay=1`;
        } else {
            embedUrl += `?autoplay=1`;
        }
    }
    
    // 2. 모달 업데이트
    titleElement.textContent = title;
    descElement.textContent = description;
    iframe.src = embedUrl;
    
    // 3. 모달 표시
    modal.style.display = 'flex';
}
```

### 5️⃣ YouTube 모달 닫기

```javascript
function closeYoutubeModal() {
    const modal = document.getElementById('youtubeModal');
    const iframe = document.getElementById('youtubePlayer');
    
    // 1. iframe src 초기화 (비디오 정지)
    iframe.src = '';
    
    // 2. 모달 숨기기
    modal.style.display = 'none';
}
```

---

## 📦 데이터 구조

### challengeData 객체

```javascript
const challengeData = {
    exercise: {
        posture: [
            {
                id: 'neck-stretch',
                title: '목 스트레칭',
                description: '일자목과 거북목을 예방하고 개선하는 스트레칭',
                icon: '🦒',
                videoUrl: 'https://www.youtube.com/watch?v=-DULXNYk3Sg&t=42s',
                category: 'posture'
            },
            // ... 8개 더
        ],
        growth: [
            {
                id: 'jump-rope',
                title: '줄넘기',
                description: '성장판을 자극하고 심폐 지구력을 향상시키는 운동',
                icon: '🪢',
                category: 'growth'
            },
            // ... 3개 더
        ]
    }
};
```

### selectedExercises 상태

```javascript
// 체크된 운동들의 상태 관리
selectedExercises = {
    'neck-stretch': true,      // 체크됨
    'back-stretch': false,     // 체크 안 됨
    'abs-stretch': true,       // 체크됨
    // ...
};
```

---

## 🎯 사용자 시나리오

### 시나리오 1: 운동 체크하기
1. **데일리 루틴 페이지 접속**
2. 운동 섹션으로 스크롤
3. **바른자세** 탭 선택 (기본값)
4. 원하는 운동 카드 클릭
5. 체크박스가 체크되고 카드 배경이 녹색으로 변경
6. 하단 요약에 "✅ 목 스트레칭 (총 1개)" 표시

### 시나리오 2: YouTube 영상 보기
1. 운동 카드에서 **📺 영상** 버튼 클릭
2. 팝업 모달이 나타남
3. YouTube 영상이 자동 재생됨 (타임스탬프부터 시작)
4. 운동 설명 텍스트 확인
5. **닫기** 버튼 또는 **✕** 버튼으로 모달 닫기
6. 영상이 자동으로 정지됨

### 시나리오 3: 카테고리 전환
1. **성장판자극** 탭 클릭
2. 운동 리스트가 fadeIn 애니메이션과 함께 변경
3. 4개의 성장판자극 운동 표시
4. 각 운동 체크/영상 시청 가능

---

## 🔍 문제 해결

### Q1: YouTube 영상이 재생되지 않아요!

**원인**: 
- CORS 제한
- 광고 차단 프로그램
- 네트워크 문제

**해결책**:
```javascript
// autoplay=1 파라미터 확인
embedUrl += `?start=${timestamp}&autoplay=1`;

// iframe allow 속성 확인
<iframe allow="autoplay; encrypted-media" allowfullscreen></iframe>
```

### Q2: 체크박스가 작동하지 않아요!

**원인**: 
- 이벤트 버블링 충돌
- JavaScript 로드 순서

**해결책**:
```javascript
// event.stopPropagation() 추가
onclick="event.stopPropagation(); toggleExercise('${exercise.id}')"

// DOM 로드 확인
document.addEventListener('DOMContentLoaded', function() {
    renderExerciseList();
});
```

### Q3: 스크롤이 부드럽지 않아요!

**해결책**:
```css
.exercise-scroll-container {
    overflow-y: auto;
    scroll-behavior: smooth;  /* 부드러운 스크롤 */
    -webkit-overflow-scrolling: touch;  /* iOS 최적화 */
}
```

### Q4: 모달을 닫아도 음악이 계속 들려요!

**원인**: iframe src가 초기화되지 않음

**해결책**:
```javascript
function closeYoutubeModal() {
    const iframe = document.getElementById('youtubePlayer');
    iframe.src = '';  // ⭐ 중요: src 완전 초기화
    modal.style.display = 'none';
}
```

---

## 🚀 향후 개선 사항

### 1️⃣ 운동 시간 입력
```javascript
// 각 운동별 수행 시간(분) 입력
{
    exerciseId: 'neck-stretch',
    duration: 10,  // 10분
    completed: true
}
```

### 2️⃣ 운동 완료 통계
- 일주일 총 운동 시간
- 가장 많이 한 운동 Top 3
- 운동 완료율 그래프

### 3️⃣ 운동 추천 시스템
- 아이 나이에 맞는 운동 추천
- 키/몸무게 데이터 기반 추천
- 의사 소견 반영

### 4️⃣ 즐겨찾기 기능
```javascript
favoriteExercises = ['neck-stretch', 'back-stretch'];

// 즐겨찾기 운동을 상단에 표시
const sortedExercises = [
    ...favoriteExercises.map(id => exercises.find(ex => ex.id === id)),
    ...exercises.filter(ex => !favoriteExercises.includes(ex.id))
];
```

---

## 📚 참고 자료

- **YouTube IFrame API**: https://developers.google.com/youtube/iframe_api_reference
- **CSS Flexbox**: https://css-tricks.com/snippets/css/a-guide-to-flexbox/
- **JavaScript Event Handling**: https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation

---

**문의**: 추가 기능이나 수정 사항이 있으면 말씀해주세요! 😊
