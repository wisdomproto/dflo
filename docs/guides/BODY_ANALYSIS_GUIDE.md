# 🏃 체형 분석 가이드 (MediaPipe)

## 📌 개요

MediaPipe Pose Landmarker를 사용하여 아이의 체형을 분석하는 기능입니다.

---

## 🎯 분석 항목

### 정면 분석
1. **어깨 기울기** - 좌우 어깨 높이 차이
2. **골반 기울기** - 좌우 골반 높이 차이
3. **무릎 정렬** - 무릎 간격

### 측면 분석
1. **거북목** - 목 각도 (귀-어깨 수평 거리)
2. **라운드 숄더** - 어깨 전방 돌출 정도
3. **골반 앞당김** - 골반-척추 각도

---

## 🔧 MediaPipe 사용법

### 1. CDN 추가
```html
<!-- MediaPipe Pose -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466862/drawing_utils.min.js"></script>
```

### 2. Pose 초기화
```javascript
const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
    }
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
```

### 3. 랜드마크 포인트 (33개)
```javascript
// 주요 포인트
const POSE_LANDMARKS = {
    NOSE: 0,
    LEFT_EYE: 2,
    RIGHT_EYE: 5,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28
};
```

---

## 📐 분석 로직

### 어깨 기울기 계산
```javascript
function calculateShoulderTilt(landmarks) {
    const leftShoulder = landmarks[11];  // LEFT_SHOULDER
    const rightShoulder = landmarks[12]; // RIGHT_SHOULDER
    
    const deltaY = rightShoulder.y - leftShoulder.y;
    const deltaX = rightShoulder.x - leftShoulder.x;
    
    // 각도 계산 (도)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    return {
        angle: angle,
        heightDiff: Math.abs(deltaY),
        status: getShoulderStatus(angle)
    };
}

function getShoulderStatus(angle) {
    const absAngle = Math.abs(angle);
    if (absAngle < 2) return 'normal';
    if (absAngle < 5) return 'mild';
    if (absAngle < 10) return 'moderate';
    return 'severe';
}
```

### 골반 기울기 계산
```javascript
function calculateHipTilt(landmarks) {
    const leftHip = landmarks[23];  // LEFT_HIP
    const rightHip = landmarks[24]; // RIGHT_HIP
    
    const deltaY = rightHip.y - leftHip.y;
    const deltaX = rightHip.x - leftHip.x;
    
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    return {
        angle: angle,
        heightDiff: Math.abs(deltaY),
        status: getHipStatus(angle)
    };
}

function getHipStatus(angle) {
    const absAngle = Math.abs(angle);
    if (absAngle < 2) return 'normal';
    if (absAngle < 5) return 'mild';
    if (absAngle < 10) return 'moderate';
    return 'severe';
}
```

### 거북목 분석 (측면)
```javascript
function calculateForwardHeadPosture(landmarks) {
    const ear = landmarks[7]; // LEFT_EAR (측면이면 하나만 보임)
    const shoulder = landmarks[11]; // LEFT_SHOULDER
    
    // 귀-어깨 수평 거리
    const horizontalDist = Math.abs(ear.x - shoulder.x);
    
    // 수직선 대비 각도
    const angle = Math.atan2(horizontalDist, ear.y - shoulder.y) * (180 / Math.PI);
    
    return {
        distance: horizontalDist,
        angle: angle,
        status: getForwardHeadStatus(angle)
    };
}

function getForwardHeadStatus(angle) {
    if (angle < 10) return 'normal';
    if (angle < 15) return 'mild';
    if (angle < 20) return 'moderate';
    return 'severe';
}
```

---

## 🎨 시각화

### Canvas에 랜드마크 그리기
```javascript
function drawLandmarks(ctx, landmarks, width, height) {
    // 점 그리기
    landmarks.forEach((landmark, index) => {
        const x = landmark.x * width;
        const y = landmark.y * height;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#667eea';
        ctx.fill();
    });
    
    // 선 그리기 (어깨-골반)
    drawConnection(ctx, landmarks[11], landmarks[23], width, height, '#667eea');
    drawConnection(ctx, landmarks[12], landmarks[24], width, height, '#667eea');
}

function drawConnection(ctx, point1, point2, width, height, color) {
    ctx.beginPath();
    ctx.moveTo(point1.x * width, point1.y * height);
    ctx.lineTo(point2.x * width, point2.y * height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}
```

---

## ✅ 체크리스트

### 사진 촬영 가이드
- [ ] 카메라 수평 유지
- [ ] 전신이 보이도록 촬영
- [ ] 밝은 조명
- [ ] 단색 배경 (권장)
- [ ] 몸 실루엣이 보이는 옷

### 정면 사진
- [ ] 정면을 보고 서기
- [ ] 양 발을 어깨너비로 벌리기
- [ ] 양팔을 자연스럽게 내리기
- [ ] 카메라와 2-3m 거리

### 측면 사진
- [ ] 정확히 옆모습 (90도)
- [ ] 귀와 어깨가 보이도록
- [ ] 자연스러운 자세 유지

---

## 🚨 주의사항

### 법적 고지
```
⚠️ 본 체형 분석은 참고용입니다.
정확한 진단은 전문 의료기관에서 받으시기 바랍니다.
```

### 데이터 프라이버시
- 사진은 로컬에서만 처리 (서버 업로드 없음)
- 분석 결과만 저장
- 사용자 동의 필수

---

## 📚 참고 문서

- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose.html)
- [Pose Landmark Detection Guide](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)

---

**작성일:** 2026-02-05  
**작성자:** AI Assistant
