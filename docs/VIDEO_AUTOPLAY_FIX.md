# 🎥 카메라 표시 문제 해결
## 📅 날짜: 2026-02-11

---

## ❌ 문제

1. **카메라가 화면에 안 보임**
2. **"백그라운드에서 영상 효과가 실행 중입니다" 메시지**

---

## ✅ 해결 방법

### 1️⃣ **video 요소에 `muted` 속성 추가**

```html
<!-- Before -->
<video id="videoElement" autoplay playsinline></video>

<!-- After -->
<video id="videoElement" autoplay playsinline muted></video>
```

**이유**:
- 브라우저는 소리가 있는 비디오의 자동 재생을 차단
- `muted` 속성이 없으면 `autoplay`가 작동하지 않음
- **필수 속성**입니다!

---

### 2️⃣ **JavaScript에서 명시적으로 muted 설정**

```javascript
videoElement.srcObject = stream;
videoElement.muted = true; // 자동 재생을 위해 음소거 필수

await videoElement.play();
```

---

### 3️⃣ **비디오 재생 확인**

```javascript
videoElement.onloadedmetadata = async () => {
    console.log('📹 비디오 메타데이터 로드 완료');
    console.log('비디오 크기:', videoElement.videoWidth, 'x', videoElement.videoHeight);
    
    try {
        await videoElement.play();
        console.log('▶️ 비디오 재생 시작');
    } catch (playError) {
        console.error('❌ 비디오 재생 실패:', playError);
    }
};
```

---

## 🔍 "백그라운드 영상 효과" 메시지 원인

### 📱 **모바일 브라우저 동작**

```
"백그라운드에서 영상 효과가 실행 중입니다"
```

**원인**:
- 브라우저가 탭이 백그라운드에 있다고 감지
- 배터리 절약을 위해 비디오 렌더링 일시 중지
- 하지만 **MediaPipe는 계속 실행 중**

**해결**:
1. **탭을 포커스 상태로 유지**
2. **Page Visibility API 사용**

---

### 🔧 **Page Visibility API 추가**

```javascript
// 페이지가 보이는지 확인
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('⏸️ 페이지가 백그라운드로 전환됨');
        // 비디오 처리 일시 중지
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    } else {
        console.log('▶️ 페이지가 포그라운드로 전환됨');
        // 비디오 처리 재개
        if (!animationId && pose) {
            startVideoProcessing();
        }
    }
});
```

---

## 🎯 체크리스트

### ✅ **HTML**
- [ ] `<video>` 요소에 `muted` 속성 추가
- [ ] `autoplay` 속성 확인
- [ ] `playsinline` 속성 확인 (iOS 필수)

### ✅ **JavaScript**
- [ ] `videoElement.muted = true` 설정
- [ ] `videoElement.play()` 명시적 호출
- [ ] 재생 에러 핸들링

### ✅ **CSS**
- [ ] `#videoElement { display: block; }` 확인
- [ ] `position: relative` 설정
- [ ] `width: 100%` 설정

---

## 📊 브라우저별 autoplay 정책

| 브라우저 | muted 필수 | 사용자 제스처 |
|---------|-----------|-------------|
| Chrome | ✅ 필수 | 선택 |
| Safari | ✅ 필수 | 선택 |
| Firefox | ✅ 필수 | 선택 |
| 삼성 인터넷 | ✅ 필수 | 선택 |

**결론**: 모든 브라우저에서 `muted` 속성이 **필수**입니다!

---

## 🚨 자주 발생하는 문제

### 1️⃣ **비디오가 검은 화면**

```javascript
// 해결: stream이 제대로 할당되었는지 확인
console.log('Stream:', videoElement.srcObject);
console.log('Video Ready State:', videoElement.readyState);
// readyState === 4 이면 재생 가능
```

---

### 2️⃣ **자동 재생 안 됨**

```javascript
// 해결: muted 추가 및 명시적 play() 호출
videoElement.muted = true;
try {
    await videoElement.play();
} catch (error) {
    console.error('재생 실패:', error);
    // 사용자에게 재생 버튼 클릭 요청
}
```

---

### 3️⃣ **백그라운드 메시지**

**해결**:
- Page Visibility API로 백그라운드 감지
- 백그라운드일 때 처리 일시 중지
- 포그라운드 복귀 시 재개

---

## 🎉 결과

### ✅ **수정 완료**

1. `muted` 속성 추가
2. 명시적 재생 처리
3. 에러 핸들링 강화
4. 로깅 추가

### 📱 **모든 브라우저에서 작동**

- Chrome ✅
- Safari ✅
- 삼성 인터넷 ✅
- Firefox ✅

---

## 📝 참고 자료

- [MDN: HTMLMediaElement.muted](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/muted)
- [Google: Autoplay Policy](https://developers.google.com/web/updates/2017/09/autoplay-policy-changes)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

---

**작성일**: 2026-02-11  
**작성자**: AI Assistant  
**버전**: v3.1.0
