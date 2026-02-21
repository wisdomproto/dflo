# ✅ 데일리 루틴 식사 사진 업로드 기능 완료

**작성일**: 2026-02-05  
**기능**: 식사 기록에 사진 업로드 및 썸네일 표시  
**상태**: ✅ **완료**

---

## 🎯 요청사항

> "데일리 루틴에서, 식사 기록 누르면 사진도 입력하게 하고, 사진 입력하면 섬네일이 앞에 나오도록 해주자"

---

## ✅ 구현 완료 내역

### 1️⃣ **식사 모달에 사진 업로드 추가**

#### HTML 구조
```html
<div class="input-group">
    <label>식사 사진 <span class="optional">선택</span></label>
    <div class="photo-upload-area">
        <!-- 파일 입력 (숨김) -->
        <input type="file" id="mealPhoto" accept="image/*" 
               style="display: none;" 
               onchange="handleMealPhotoSelect(event)">
        
        <!-- 업로드 버튼 -->
        <button class="photo-upload-btn" 
                onclick="document.getElementById('mealPhoto').click()">
            📷 사진 추가
        </button>
        
        <!-- 사진 미리보기 -->
        <div class="photo-preview-container" id="photoPreviewContainer" 
             style="display: none;">
            <div class="photo-preview">
                <img id="photoPreview" src="" alt="식사 사진">
                <button class="photo-remove-btn" onclick="removeMealPhoto()">✕</button>
            </div>
        </div>
    </div>
</div>
```

#### 추가된 위치
- 식사 모달의 **첫 번째 입력 필드**로 배치
- 식사 시간 입력 필드 **위**에 위치

---

### 2️⃣ **JavaScript 기능 구현**

#### 전역 변수 추가
```javascript
let currentMealPhoto = null; // 현재 선택된 식사 사진
```

#### 새로운 함수들

##### 📷 **handleMealPhotoSelect(event)** - 사진 선택 핸들러
```javascript
function handleMealPhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 1. 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        alert('사진 크기는 5MB 이하여야 합니다.');
        return;
    }
    
    // 2. 이미지 파일 확인
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
    }
    
    // 3. FileReader로 Base64 변환
    const reader = new FileReader();
    reader.onload = function(e) {
        currentMealPhoto = {
            dataUrl: e.target.result,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        };
        showPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
}
```

##### 👁️ **showPhotoPreview(dataUrl)** - 미리보기 표시
```javascript
function showPhotoPreview(dataUrl) {
    const previewContainer = document.getElementById('photoPreviewContainer');
    const previewImg = document.getElementById('photoPreview');
    const uploadBtn = document.querySelector('.photo-upload-btn');
    
    previewImg.src = dataUrl;
    previewContainer.style.display = 'block';
    uploadBtn.style.display = 'none';  // 업로드 버튼 숨김
}
```

##### 🙈 **hidePhotoPreview()** - 미리보기 숨기기
```javascript
function hidePhotoPreview() {
    const previewContainer = document.getElementById('photoPreviewContainer');
    const previewImg = document.getElementById('photoPreview');
    const uploadBtn = document.querySelector('.photo-upload-btn');
    
    previewImg.src = '';
    previewContainer.style.display = 'none';
    uploadBtn.style.display = 'inline-flex';  // 업로드 버튼 표시
}
```

##### 🗑️ **removeMealPhoto()** - 사진 제거
```javascript
function removeMealPhoto() {
    currentMealPhoto = null;
    document.getElementById('mealPhoto').value = '';
    hidePhotoPreview();
}
```

#### 수정된 함수들

##### 📂 **openMealModal(mealType)** - 수정
```javascript
// 기존 데이터에 사진이 있으면 복원
if (meals[mealType]) {
    // ... 기존 코드 ...
    
    if (meals[mealType].photo) {
        currentMealPhoto = meals[mealType].photo;
        showPhotoPreview(currentMealPhoto.dataUrl);
    } else {
        currentMealPhoto = null;
        hidePhotoPreview();
    }
}
```

##### 💾 **saveMeal()** - 수정
```javascript
meals[currentMealType] = {
    time: time,
    description: description,
    rating: selectedRating,
    portion: selectedPortion,
    photo: currentMealPhoto  // ⭐ 사진 데이터 저장
};
```

##### 🔄 **updateMealStatus(mealType)** - 수정 (썸네일 표시)
```javascript
function updateMealStatus(mealType) {
    const statusElement = document.getElementById(mealType + 'Status');
    const mealCard = statusElement.closest('.meal-card');
    
    if (meals[mealType]) {
        // 기존 썸네일 제거
        const existingThumbnail = mealCard.querySelector('.meal-thumbnail');
        if (existingThumbnail) {
            existingThumbnail.remove();
        }
        
        // 썸네일 추가 ⭐
        if (meals[mealType].photo) {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'meal-thumbnail';
            thumbnail.innerHTML = `<img src="${meals[mealType].photo.dataUrl}" alt="식사 사진">`;
            
            // meal-icon 다음에 삽입
            const mealIcon = mealCard.querySelector('.meal-icon');
            mealIcon.after(thumbnail);
        }
        
        statusElement.textContent = '✓ 완료';
        mealCard.classList.add('completed');
    }
}
```

---

### 3️⃣ **CSS 스타일 추가**

#### 📷 사진 업로드 버튼
```css
.photo-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #f0fdfa;          /* 연한 민트색 */
    border: 2px dashed #14b8a6;   /* 민트색 점선 테두리 */
    border-radius: 8px;
    color: #0f766e;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    width: 100%;
    justify-content: center;
}

.photo-upload-btn:hover {
    background: #ccfbf1;
    border-color: #0d9488;
}
```

#### 🖼️ 사진 미리보기
```css
.photo-preview {
    position: relative;
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.photo-preview img {
    width: 100%;
    height: auto;
    display: block;
}
```

#### ✕ 사진 제거 버튼
```css
.photo-remove-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.3s;
}

.photo-remove-btn:hover {
    background: rgba(239, 68, 68, 0.9);  /* 빨간색으로 변경 */
    transform: scale(1.1);
}
```

#### 🖼️ 식사 카드 썸네일
```css
.meal-thumbnail {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    flex-shrink: 0;
}

.meal-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;  /* 이미지를 카드에 맞게 자름 */
}
```

#### 📋 완료된 식사 카드 레이아웃 변경
```css
.meal-card.completed {
    flex-direction: row;          /* 세로 → 가로 */
    justify-content: flex-start;
    gap: 12px;
}

.meal-card.completed .meal-icon {
    font-size: 24px;  /* 아이콘 크기 축소 */
}

.meal-card.completed .meal-info {
    text-align: left;  /* 왼쪽 정렬 */
    flex: 1;
}
```

---

## 🎨 UI 미리보기

### 식사 모달 (사진 업로드 전)
```
┌─────────────────────────────────┐
│ 🌅 아침 추가                 ✕│
├─────────────────────────────────┤
│                                 │
│ 식사 사진 [선택]               │
│ ┌─────────────────────────────┐│
│ │   📷 사진 추가              ││
│ └─────────────────────────────┘│
│                                 │
│ 식사 시간                       │
│ [__:__]                         │
│                                 │
│ 식사 내용                       │
│ [________________]              │
│                                 │
│        [취소]  [저장]           │
└─────────────────────────────────┘
```

### 식사 모달 (사진 업로드 후)
```
┌─────────────────────────────────┐
│ 🌅 아침 추가                 ✕│
├─────────────────────────────────┤
│                                 │
│ 식사 사진 [선택]               │
│ ┌─────────────────────────────┐│
│ │    ┌─────────────┐     ✕   ││
│ │    │             │          ││
│ │    │  [사진]     │          ││
│ │    │             │          ││
│ │    └─────────────┘          ││
│ └─────────────────────────────┘│
│                                 │
│ 식사 시간                       │
│ [12:30]                         │
│                                 │
│        [취소]  [저장]           │
└─────────────────────────────────┘
```

### 식사 카드 (썸네일 표시)
```
사진 없음:
┌──────────┐ ┌──────────┐
│    🌅    │ │    🌞    │
│   아침    │ │   점심    │
│ + 추가하기 │ │  ✓ 완료  │
└──────────┘ └──────────┘

사진 있음:
┌──────────┐ ┌───────────────────┐
│    🌅    │ │ 🌞 [썸네일]  점심 │
│   아침    │ │              ✓ 완료│
│ + 추가하기 │ └───────────────────┘
└──────────┘
```

---

## 🔄 데이터 흐름

### 1️⃣ 사진 선택
```
사용자 파일 선택
    ↓
handleMealPhotoSelect(event)
    ↓
파일 크기 체크 (5MB 이하)
    ↓
이미지 파일 확인
    ↓
FileReader로 Base64 변환
    ↓
currentMealPhoto 객체 생성
    ↓
showPhotoPreview(dataUrl)
```

### 2️⃣ 사진 저장
```
saveMeal() 호출
    ↓
meals[currentMealType] = {
    time: ...,
    description: ...,
    rating: ...,
    portion: ...,
    photo: currentMealPhoto  ⭐
}
    ↓
updateMealStatus(mealType)
    ↓
썸네일 DOM 생성 및 삽입
```

### 3️⃣ 데이터 구조
```javascript
currentMealPhoto = {
    dataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    fileName: "breakfast.jpg",
    fileSize: 234567,
    fileType: "image/jpeg"
}

meals.breakfast = {
    time: "08:30",
    description: "토스트, 우유, 과일",
    rating: 4,
    portion: "normal",
    photo: currentMealPhoto  ⭐
}
```

---

## 🎯 주요 기능

### ✅ 구현된 기능
1. **사진 업로드 버튼** - 민트색 점선 테두리
2. **파일 선택** - accept="image/*"로 이미지만 선택
3. **파일 크기 제한** - 5MB 이하만 허용
4. **Base64 변환** - FileReader API 사용
5. **미리보기 표시** - 모달 내 300px 최대 너비
6. **사진 제거** - ✕ 버튼으로 삭제 가능
7. **썸네일 표시** - 식사 카드에 48x48px 썸네일
8. **데이터 저장** - localStorage에 Base64로 저장
9. **데이터 복원** - 기존 사진 다시 로드

### 📱 모바일 최적화
- 터치 친화적 버튼 크기
- 반응형 이미지 크기
- 파일 입력 숨김 처리
- 직관적인 UI/UX

---

## 🔒 보안 및 제한

### 파일 크기 제한
```javascript
if (file.size > 5 * 1024 * 1024) {
    alert('사진 크기는 5MB 이하여야 합니다.');
    return;
}
```

### 파일 형식 제한
```javascript
if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드할 수 있습니다.');
    return;
}
```

### HTML Accept 속성
```html
<input type="file" accept="image/*">
```
- 이미지 파일만 선택 가능
- 지원 형식: jpg, jpeg, png, gif, webp, bmp 등

---

## 💾 저장 방식

### Base64 인코딩
- **장점**:
  - 별도 서버 업로드 불필요
  - localStorage에 직접 저장 가능
  - 즉시 표시 가능

- **단점**:
  - 파일 크기가 약 33% 증가
  - 5MB 파일 → 약 6.7MB Base64

### localStorage 저장
```javascript
localStorage.setItem('routine_2026-02-05', JSON.stringify({
    meals: {
        breakfast: {
            photo: {
                dataUrl: "data:image/jpeg;base64,/9j/4AAQ...",
                fileName: "breakfast.jpg",
                fileSize: 234567
            }
        }
    }
}));
```

---

## 🚀 사용 방법

### 1️⃣ 식사 기록 추가
1. 식사 카드 클릭 (아침/점심/저녁/간식)
2. 모달 열림

### 2️⃣ 사진 업로드
1. **📷 사진 추가** 버튼 클릭
2. 파일 선택 (5MB 이하 이미지)
3. 미리보기 자동 표시
4. **✕** 버튼으로 제거 가능

### 3️⃣ 식사 정보 입력
1. 식사 시간 선택
2. 식사 내용 입력
3. 건강도 선택 (⭐1~5)
4. 식사량 선택 (많음/보통/적음)

### 4️⃣ 저장
1. **저장** 버튼 클릭
2. 식사 카드에 썸네일 표시
3. "✓ 완료" 상태로 변경

---

## 🎨 디자인 가이드

### 색상
- **업로드 버튼**: #f0fdfa (연한 민트)
- **업로드 버튼 테두리**: #14b8a6 (민트)
- **호버 배경**: #ccfbf1 (약간 진한 민트)
- **제거 버튼**: rgba(0,0,0,0.7) → rgba(239,68,68,0.9) (호버 시 빨강)

### 크기
- **썸네일**: 48x48px
- **미리보기**: 최대 300px 너비
- **제거 버튼**: 32x32px

### 애니메이션
- 호버 효과: 0.3s transition
- 제거 버튼 호버: scale(1.1)

---

## 📝 수정된 파일

### HTML
- **routine.html** - 식사 모달에 사진 업로드 UI 추가

### JavaScript
- **js/routine.js** - 사진 업로드 관련 함수 8개 추가
  - `handleMealPhotoSelect()`
  - `showPhotoPreview()`
  - `hidePhotoPreview()`
  - `removeMealPhoto()`
  - `openMealModal()` (수정)
  - `closeMealModal()` (수정)
  - `saveMeal()` (수정)
  - `updateMealStatus()` (수정)

### CSS
- **css/routine-mobile.css** - 사진 업로드 스타일 추가
  - `.photo-upload-area`
  - `.photo-upload-btn`
  - `.photo-preview-container`
  - `.photo-preview`
  - `.photo-remove-btn`
  - `.meal-thumbnail`
  - `.meal-card.completed` (수정)

---

## ✅ 테스트 체크리스트

### 기능 테스트
- [x] 사진 업로드 버튼 클릭
- [x] 파일 선택 (이미지만)
- [x] 5MB 이하 제한
- [x] 미리보기 표시
- [x] 사진 제거 버튼
- [x] 데이터 저장
- [x] 썸네일 표시 (48x48px)
- [x] 데이터 복원
- [x] localStorage 저장/로드

### UI/UX 테스트
- [x] 업로드 버튼 디자인
- [x] 미리보기 크기 조절
- [x] 제거 버튼 위치
- [x] 썸네일 정렬
- [x] 완료 카드 레이아웃

### 반응형 테스트
- [x] 모바일 (375px)
- [x] 태블릿 (768px)
- [x] 데스크톱 (1024px+)

---

## 🎉 완료!

**모든 요구사항이 구현되었습니다!**

- ✅ 식사 기록 모달에 사진 업로드 추가
- ✅ 파일 선택 및 미리보기
- ✅ 식사 카드에 썸네일 표시 (48x48px)
- ✅ Base64로 localStorage 저장
- ✅ 모바일 최적화 디자인

**지금 바로 사용 가능합니다!** 🚀

---

**문의사항이나 추가 요청이 있으시면 말씀해주세요!** 😊
