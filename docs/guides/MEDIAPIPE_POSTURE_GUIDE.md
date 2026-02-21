# 🏃 MediaPipe 체형 분석 가이드

## 📌 개요

MediaPipe Pose를 활용하여 아이의 체형을 자동으로 분석하는 웹 기반 시스템입니다.

---

## 🎯 분석 항목

### 1. 정면 분석
- ✅ **어깨 기울기** (좌우 대칭)
- ✅ **골반 기울기** (좌우 대칭)
- ✅ **전체 자세 균형**

### 2. 측면 분석
- ✅ **거북목** (Forward Head Posture)
- ✅ **라운드 숄더** (Round Shoulder)
- ✅ **척추 정렬**

---

## 🔧 기술 스택

### MediaPipe Pose Landmarker
- **33개 관절 포인트** 감지
- **실시간 처리** 가능
- **브라우저 내 로컬 연산** (서버 불필요)

### 주요 관절 포인트
```
0: 코
5: 왼쪽 어깨
6: 오른쪽 어깨
7: 왼쪽 팔꿈치
8: 오른쪽 팔꿈치
11: 왼쪽 골반
12: 오른쪽 골반
23: 왼쪽 골반 (하단)
24: 오른쪽 골반 (하단)
```

---

## 📐 분석 로직

### 1. 어깨 기울기 계산

```javascript
function analyzeShoulderTilt(landmarks) {
    const leftShoulder = landmarks[11];   // 왼쪽 어깨
    const rightShoulder = landmarks[12];  // 오른쪽 어깨
    
    // 높이 차이 (Y축)
    const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    
    // 어깨 너비 (X축)
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    
    // 기울기 각도 (라디안 → 도)
    const angle = Math.atan2(heightDiff, shoulderWidth) * (180 / Math.PI);
    
    // 평가
    if (angle < 2) return { status: 'good', message: '정상' };
    if (angle < 5) return { status: 'warning', message: '약간 기울어짐' };
    return { status: 'danger', message: '주의 필요' };
}
```

### 2. 골반 기울기 계산

```javascript
function analyzePelvisTilt(landmarks) {
    const leftHip = landmarks[23];   // 왼쪽 골반
    const rightHip = landmarks[24];  // 오른쪽 골반
    
    // 높이 차이
    const heightDiff = Math.abs(leftHip.y - rightHip.y);
    
    // 골반 너비
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    
    // 기울기 각도
    const angle = Math.atan2(heightDiff, hipWidth) * (180 / Math.PI);
    
    // 평가
    if (angle < 3) return { status: 'good', message: '정상' };
    if (angle < 6) return { status: 'warning', message: '약간 기울어짐' };
    return { status: 'danger', message: '주의 필요' };
}
```

### 3. 거북목 분석 (측면)

```javascript
function analyzeTurtleNeck(landmarks) {
    const ear = landmarks[7];        // 귀 (왼쪽)
    const shoulder = landmarks[11];  // 어깨 (왼쪽)
    
    // 수평 거리 (X축)
    const horizontalDist = Math.abs(ear.x - shoulder.x);
    
    // 수직 거리 (Y축)
    const verticalDist = Math.abs(ear.y - shoulder.y);
    
    // 각도 계산
    const angle = Math.atan2(horizontalDist, verticalDist) * (180 / Math.PI);
    
    // 평가
    if (angle < 15) return { status: 'good', message: '정상' };
    if (angle < 25) return { status: 'warning', message: '거북목 경향' };
    return { status: 'danger', message: '거북목 주의' };
}
```

---

## 🎨 UI/UX 가이드

### 촬영 가이드라인

1. **카메라 위치**
   - 정면: 카메라를 가슴 높이에 두고 촬영
   - 측면: 90도 옆에서 촬영

2. **아이 자세**
   - 정면: 양발을 어깨 너비로 벌리고 바르게 서기
   - 측면: 자연스럽게 서서 정면을 보기

3. **의류**
   - 몸의 실루엣이 드러나는 옷 (헐렁한 옷 X)
   - 민소매 또는 반팔 권장

4. **환경**
   - 밝은 조명
   - 단색 배경 권장
   - 전신이 화면에 들어오도록

---

## 📊 분석 결과 표시

### 점수 시스템

```javascript
const scoreSystem = {
    good: {
        score: 90-100,
        color: '#10b981',  // 초록
        icon: '✅',
        message: '정상 범위입니다'
    },
    warning: {
        score: 70-89,
        color: '#f59e0b',  // 주황
        icon: '⚠️',
        message: '약간 개선이 필요합니다'
    },
    danger: {
        score: 0-69,
        color: '#ef4444',  // 빨강
        icon: '⛔',
        message: '전문가 상담을 권장합니다'
    }
};
```

### 결과 화면 구성

```
┌─────────────────────────────┐
│   체형 분석 결과              │
├─────────────────────────────┤
│                             │
│  [사진 + 관절 포인트 오버레이] │
│                             │
├─────────────────────────────┤
│  어깨 균형: ✅ 정상 (1.2°)   │
│  골반 균형: ⚠️ 주의 (4.5°)   │
│  전체 점수: 85점             │
├─────────────────────────────┤
│  [상세 보기] [다시 촬영하기]   │
└─────────────────────────────┘
```

---

## ⚠️ 주의사항

### 1. 의료법 관련
```
✅ 사용 가능: "체형 자가 체크", "참고용 분석"
❌ 사용 금지: "진단", "치료", "의학적 판단"
```

### 2. 정확도 향상 팁
- 카메라 수평 맞추기
- 충분한 거리 확보 (1.5m 이상)
- 밝은 조명
- 단색 배경

### 3. 개인정보 보호
- 사진은 로컬에서만 처리
- 서버 전송 시 암호화
- 사용자 동의 필수

---

## 🔄 분석 플로우

```
1. 카메라 권한 요청
    ↓
2. 촬영 가이드 표시
    ↓
3. 사진 촬영 또는 업로드
    ↓
4. MediaPipe Pose 분석
    ↓
5. 관절 포인트 추출
    ↓
6. 각도 및 비율 계산
    ↓
7. 점수 및 평가 생성
    ↓
8. 결과 화면 표시
    ↓
9. 결과 저장 (선택)
```

---

## 📱 반응형 디자인

### 모바일 최적화
- 세로 모드 권장
- 터치 제스처 지원
- 자동 초점 및 노출 조정
- 화면 회전 감지

---

## 🚀 성능 최적화

### 모델 로딩
```javascript
// 첫 페이지 로드 시 미리 로딩
const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
);

const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: "GPU"  // GPU 가속
    },
    runningMode: "IMAGE",
    numPoses: 1  // 한 명만 감지
});
```

---

## 📚 참고 자료

- [MediaPipe Pose](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [MediaPipe Pose Landmarks](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker/index#pose_landmarker_model)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

---

**작성일:** 2026-02-05  
**작성자:** AI Assistant  
**버전:** 1.0.0
