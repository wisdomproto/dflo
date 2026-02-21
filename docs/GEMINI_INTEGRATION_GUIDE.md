# Google Gemini API 연동 가이드

## 🎯 목표
정적 웹사이트에 Google Gemini AI 챗봇을 안전하게 연동하기

---

## ⚠️ 중요: API 키 보안

### 문제점:
- 정적 웹사이트는 클라이언트 사이드 JavaScript만 사용
- API 키를 코드에 넣으면 누구나 볼 수 있음
- API 키 탈취 → 무단 사용 → 요금 폭탄 위험

### 해결책:
**프록시 서버를 통해 API 키 숨기기**

---

## 🚀 추천 방법: Cloudflare Workers (무료)

### 장점:
✅ 완전 무료 (월 100,000 요청)
✅ 빠른 글로벌 엣지 네트워크
✅ 설정 간단
✅ 서버 관리 불필요

---

## 📝 단계별 구현

### STEP 1: Google AI Studio에서 API 키 발급

1. **Google AI Studio 접속**
   - https://makersuite.google.com/app/apikey

2. **API 키 생성**
   - "Create API Key" 클릭
   - API 키 복사 (절대 공유하지 말 것!)

3. **할당량 설정 (필수)**
   - Google Cloud Console → API & Services
   - Generative Language API 선택
   - Quotas & System Limits
   - 일일 요청 제한 설정 (예: 100회)

---

### STEP 2: Cloudflare Workers 설정

1. **Cloudflare 가입**
   - https://dash.cloudflare.com/sign-up
   - 무료 플랜 선택

2. **Worker 생성**
   - Workers & Pages → Create Application
   - Create Worker
   - 이름: `gemini-proxy` (원하는 이름)

3. **코드 배포**
   ```javascript
   // 파일: docs/gemini-cloudflare-worker.js 참고
   ```

4. **환경 변수 설정**
   - Settings → Variables
   - Environment Variables 추가:
     - Name: `GEMINI_API_KEY`
     - Value: (Google AI Studio에서 발급받은 키)
     - Type: Secret (암호화)

5. **배포**
   - "Save and Deploy" 클릭
   - Worker URL 확인: `https://gemini-proxy.YOUR_SUBDOMAIN.workers.dev`

---

### STEP 3: 웹사이트에 AI 챗봇 추가

1. **JavaScript 파일 추가**
   ```html
   <!-- info.html -->
   <script src="js/ai-chat.js"></script>
   ```

2. **Worker URL 설정**
   ```javascript
   // js/ai-chat.js
   const aiChatBot = new AIChatBot('https://gemini-proxy.YOUR_SUBDOMAIN.workers.dev');
   ```

3. **UI 컴포넌트 추가**
   - `docs/ai-chat-ui-component.html` 내용을 `info.html`에 삽입

---

### STEP 4: 테스트

1. **로컬 테스트**
   ```bash
   # 간단한 HTTP 서버 실행
   python -m http.server 8000
   # 또는
   npx serve .
   ```

2. **브라우저 열기**
   - http://localhost:8000/info.html

3. **챗봇 테스트**
   - "우리 아이 키가 작은데 어떻게 해야 하나요?" 질문
   - AI 응답 확인

---

## 🎨 커스터마이징

### 1. 시스템 프롬프트 수정

```javascript
// js/ai-chat.js
const GROWTH_CONSULTATION_PROMPT = `
당신은 연세새봄의원 187 성장 클리닉의 전문 상담사입니다.

[여기에 원하는 역할과 지침 작성]
`;
```

### 2. UI 색상 변경

```css
.chat-message.user .message-content {
    background: #your-color; /* 사용자 메시지 배경색 */
}

.chat-message.assistant .message-content {
    background: #your-color; /* AI 메시지 배경색 */
}
```

### 3. 응답 길이 제한

```javascript
// Cloudflare Worker에서
body: JSON.stringify({
    contents: [{
        parts: [{ text: message }]
    }],
    generationConfig: {
        maxOutputTokens: 200, // 응답 길이 제한
        temperature: 0.7,      // 창의성 (0.0~1.0)
    }
})
```

---

## 💰 비용 관리

### Google AI Studio (Gemini API)
- **무료 할당량**: 
  - 월 60회 요청/분
  - 일 1,500회 요청
  - 월 45,000회 요청

- **유료 플랜** (무료 초과 시):
  - $0.00025 / 1,000 characters input
  - $0.0005 / 1,000 characters output

### Cloudflare Workers
- **무료 플랜**:
  - 월 100,000 요청
  - CPU 시간 10ms/요청

### 비용 절감 팁:
1. 응답 길이 제한 (maxOutputTokens)
2. 일일 할당량 설정
3. 사용량 알림 설정
4. 캐싱 활용 (자주 묻는 질문)

---

## 🔒 보안 체크리스트

- [ ] API 키를 코드에 직접 넣지 않기
- [ ] Cloudflare Worker 환경 변수 사용
- [ ] Google Cloud Console에서 할당량 제한
- [ ] CORS 설정 (허용 도메인 지정)
- [ ] Rate Limiting 구현
- [ ] 사용량 모니터링 설정
- [ ] 에러 로깅 설정

---

## 🐛 문제 해결

### 문제 1: CORS 오류
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**해결:**
- Cloudflare Worker에서 CORS 헤더 확인
- `Access-Control-Allow-Origin: *` 설정

### 문제 2: API 키 오류
```
API key not valid. Please pass a valid API key.
```

**해결:**
- API 키 재확인
- Cloudflare Worker 환경 변수 확인
- Google AI Studio에서 API 활성화 확인

### 문제 3: 응답 느림

**해결:**
- maxOutputTokens 줄이기
- 네트워크 상태 확인
- Cloudflare Worker 로그 확인

---

## 📚 참고 자료

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API 문서](https://ai.google.dev/docs)
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Firebase Functions](https://firebase.google.com/docs/functions)

---

## 🎯 다음 단계

1. [ ] API 키 발급
2. [ ] Cloudflare Worker 배포
3. [ ] 웹사이트에 챗봇 추가
4. [ ] 테스트 및 디버깅
5. [ ] 프롬프트 최적화
6. [ ] 사용자 피드백 수집

---

## ⚡ 빠른 시작 (5분)

```bash
# 1. 파일 복사
cp docs/gemini-cloudflare-worker.js ./worker.js
cp js/ai-chat.js ./js/
cp docs/ai-chat-ui-component.html ./ai-chat-component.html

# 2. Worker 배포 (Cloudflare Dashboard)

# 3. info.html 수정
# - ai-chat-component.html 내용 붙여넣기
# - <script src="js/ai-chat.js"></script> 추가

# 4. Worker URL 설정
# js/ai-chat.js 파일에서 URL 변경

# 5. 테스트
npx serve .
```

완료! 🎉
