# 🆓 100% 무료 AI 챗봇 만들기 (PDF → 웹앱 즉시 연동!)

## 🎯 완전 무료!
- ✅ Google Gemini (무료)
- ✅ Chroma DB (로컬, 무료)
- ✅ FastAPI (로컬 서버, 무료)
- ❌ OpenAI 불필요!
- ❌ Pinecone 불필요!
- ❌ Cloudflare Workers 불필요!

**총 비용: $0 (완전 무료!)**

---

## ⚡ 빠른 시작 (3단계, 10분)

### STEP 1: 설치 (2분)

```bash
# 패키지 설치
pip install -r requirements-free.txt

# API 키 설정 (.env 파일)
cat > .env << EOF
GEMINI_API_KEY=your-gemini-api-key-here
EOF
```

**Gemini API 키 발급 (무료):**
1. https://makersuite.google.com/app/apikey
2. "Create API Key" 클릭
3. API 키 복사
4. `.env` 파일에 붙여넣기

---

### STEP 2: PDF → RAG 자동 구축 (5분)

```bash
# PDF 파일 확인
# "우리 아이 키 성장 바이블 원고.pdf" 준비 완료! ✅

# 자동 구축 실행
python scripts/pdf_to_rag_free.py
```

**실행 과정:**
```
==================================================
🚀 PDF → RAG 자동 구축 시작! (100% 무료)
==================================================

📄 PDF 파일 읽는 중: 우리 아이 키 성장 바이블 원고.pdf
   진행률: 10/50 페이지
   진행률: 20/50 페이지
   ...
✅ 텍스트 추출 완료: 총 125,432자

📋 텍스트 청크 분할 중 (크기: 1000, 오버랩: 200)
✅ 총 327개 청크 생성 완료

🔄 Chroma DB에 업로드 중...
   업로드 진행: 327/327 (100.0%)
✅ 업로드 완료! 총 327개 문서

==================================================
✅ 모든 작업 완료!
==================================================

📊 최종 통계:
   - 총 청크 수: 327
   - Chroma DB 저장 위치: ./chroma_db/
   - 컬렉션 이름: growth_bible

💰 비용: $0 (완전 무료!)

🎉 이제 AI 챗봇에서 사용할 수 있습니다!
```

**자동 검색 테스트:**
```
(Enter 키를 누르면 자동 테스트 실행)

==================================================
🧪 검색 테스트
==================================================

❓ 질문: 아이가 밥을 안 먹는데 어떻게 해야 하나요?
------------------------------------------------------------

📄 결과 1 (유사도: 89%)
   제목: ## 프롤로그
   페이지: 3
   내용: 아이가 밥투정하며 잘 먹지 않을 때, 또래 친구들보다...

📄 결과 2 (유사도: 85%)
   제목: ## 1장 - 식습관의 중요성
   페이지: 15
   내용: 식사 환경을 개선하는 것이 중요합니다...
```

---

### STEP 3: 로컬 API 서버 + 웹앱 실행 (3분)

#### 3-1. 로컬 API 서버 시작

**터미널 1:**
```bash
# 로컬 API 서버 실행
python scripts/local_api_server.py
```

**실행 결과:**
```
==================================================
🚀 로컬 API 서버 시작!
==================================================

📡 서버 정보:
   - URL: http://localhost:8080
   - API 문서: http://localhost:8080/docs
   - 데이터베이스: Chroma DB (로컬)
   - AI 모델: Google Gemini Pro
   - 비용: 무료!

💡 테스트:
   curl -X POST http://localhost:8080/api/chat \
        -H "Content-Type: application/json" \
        -d '{"message": "아이가 밥을 안 먹어요"}'

==================================================

INFO:     Started server process
INFO:     Waiting for application startup.
✅ Chroma DB 컬렉션 로드 완료
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8080
```

#### 3-2. 웹앱 실행

**터미널 2:**
```bash
# 웹앱 실행
python -m http.server 8000
```

#### 3-3. info.html 수정

**info.html 파일 맨 아래에 추가:**
```html
<!-- 기존 스크립트 대신 로컬 버전 사용 -->
<script src="js/ai-growth-consultant-local.js"></script>
```

#### 3-4. 브라우저 열기

```
http://localhost:8000/info.html
```

**AI 챗봇 섹션으로 스크롤 → 테스트!**

---

## 📊 시스템 구조

```
┌─────────────┐
│   사용자     │
└──────┬──────┘
       │ "아이가 밥을 안 먹어요"
       ↓
┌──────────────────────┐
│ 웹앱 (info.html)      │
│ • AI 챗봇 UI          │
└──────┬───────────────┘
       │ HTTP POST (localhost:8080)
       ↓
┌──────────────────────┐
│ FastAPI 서버 (로컬)   │
│ • Chroma DB 검색     │
│ • Gemini 답변 생성   │
└──┬────────┬──────────┘
   │        │
   ↓        ↓
┌────────┐ ┌────────┐
│Chroma  │ │Gemini  │
│ DB     │ │  Pro   │
│(로컬)  │ │(무료)  │
└────────┘ └────────┘
```

---

## 🧪 테스트 질문

웹앱에서 다음 질문들을 테스트해보세요:

```
✅ "아이가 밥을 안 먹는데 어떻게 해야 하나요?"
✅ "성장호르몬 주사는 언제부터 맞아야 하나요?"
✅ "키가 작은 아이를 위한 운동은 뭐가 좋나요?"
✅ "우리 아이가 또래보다 작은데 병원 가야 하나요?"
✅ "성조숙증은 어떻게 알 수 있나요?"
```

**예상 응답:**
```
AI: "'우리 아이 키 성장 바이블' 책에 따르면, 아이가 밥을 
안 먹는 경우 다음 방법을 시도해보세요:

1. 식사 환경 개선
   - 가족과 함께 즐겁게 식사
   - TV나 스마트폰 없이 집중
   
2. 식사 시간 규칙적으로
   - 하루 3끼 + 간식 2회
   - 일정한 시간대 유지

3. 억지로 먹이지 않기
   - 스트레스는 오히려 역효과
   - 소량이라도 칭찬하기

📚 참고 자료 (책):
1. 프롤로그 (페이지 3) (유사도 89%)
2. 1장 - 식습관의 중요성 (페이지 15) (유사도 85%)

자세한 상담은 성장 클리닉을 방문해주세요."
```

---

## 💰 비용 비교

### 유료 버전 (Pinecone + OpenAI):
- OpenAI Embedding: $0.02/1K 요청
- Pinecone: $70/월 (Standard)
- Cloudflare Workers: $5/월
- **월 비용: ~$75+**

### 무료 버전 (Gemini + Chroma):
- Gemini: 무료 (월 45K 요청)
- Chroma DB: 무료 (로컬 저장)
- FastAPI: 무료 (로컬 서버)
- **월 비용: $0!** 🎉

---

## 📁 파일 구조

```
프로젝트/
├── 우리 아이 키 성장 바이블 원고.pdf  ← PDF 파일
├── scripts/
│   ├── pdf_to_rag_free.py            ← PDF → RAG 자동 구축
│   └── local_api_server.py           ← FastAPI 로컬 서버
├── js/
│   └── ai-growth-consultant-local.js ← 웹앱 클라이언트 (로컬)
├── chroma_db/                        ← Chroma DB 저장소 (자동 생성)
├── requirements-free.txt             ← 무료 패키지
└── .env                              ← Gemini API 키
```

---

## 🐛 문제 해결

### Q: "Chroma DB 로드 실패" 오류
```bash
# PDF → RAG 먼저 실행
python scripts/pdf_to_rag_free.py

# 그 다음 API 서버 실행
python scripts/local_api_server.py
```

### Q: "서버 연결 실패" 오류
```bash
# 터미널에서 API 서버가 실행 중인지 확인
# http://localhost:8080 접속해보기

# 포트 변경이 필요하면:
# local_api_server.py 파일 맨 아래 수정
uvicorn.run(app, host="0.0.0.0", port=8080)  # 다른 포트로 변경
```

### Q: Gemini API 할당량 초과
```bash
# 무료 할당량: 월 45,000 요청
# 충분히 많지만, 초과 시:
# 1. 다른 Google 계정으로 새 API 키 발급
# 2. 또는 다음 달까지 대기
```

### Q: PDF 한글 깨짐
```bash
# 다른 PDF 라이브러리 시도
pip install pdfplumber

# pdf_to_rag_free.py 수정
import pdfplumber
# PyPDF2 대신 pdfplumber 사용
```

---

## 🚀 장점

### ✅ **완전 무료**
- 월 비용 $0
- API 키 1개만 필요 (Gemini)

### ✅ **로컬 실행**
- 데이터가 내 컴퓨터에 저장
- 인터넷 없이도 검색 가능
- 개인정보 안전

### ✅ **즉시 연동**
- 복잡한 배포 불필요
- 로컬에서 바로 테스트
- 개발 → 운영 전환 쉬움

### ✅ **쉬운 관리**
- Chroma DB는 폴더 하나
- 백업/복원 간단
- 다른 프로젝트에도 재사용

---

## 🎯 다음 단계

### 1. 프로덕션 배포 (선택)
나중에 실제 서비스할 때:
- AWS/GCP에 FastAPI 서버 배포
- Chroma DB를 영구 스토리지로 마이그레이션
- 또는 Pinecone으로 전환

### 2. 기능 추가
- 대화 히스토리 저장
- 사용자별 맞춤 답변
- 음성 입력/출력
- 이미지 분석 (성장 곡선)

### 3. 성능 최적화
- 캐싱 추가
- 배치 처리
- 응답 시간 단축

---

## 🎉 완료!

이제 완전 무료로 AI 챗봇이 작동합니다!

**실행 순서:**
```bash
# 1. PDF → RAG 구축 (최초 1회)
python scripts/pdf_to_rag_free.py

# 2. API 서버 실행 (터미널 1)
python scripts/local_api_server.py

# 3. 웹앱 실행 (터미널 2)
python -m http.server 8000

# 4. 브라우저
http://localhost:8000/info.html
```

**비용: $0 (완전 무료!)** 🎊

질문이 있으시면 언제든지 물어보세요! 😊
