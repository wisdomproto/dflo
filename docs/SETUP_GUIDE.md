# 🚀 프로젝트 설정 가이드

## 📋 목차
1. [초기 설정](#초기-설정)
2. [API 키 설정](#api-키-설정)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [로컬 개발 서버](#로컬-개발-서버)
5. [배포](#배포)

---

## 1️⃣ 초기 설정

### 프로젝트 클론
```bash
git clone https://github.com/your-username/187-growth-care.git
cd 187-growth-care
```

### config.js 생성
```bash
# config.example.js를 복사
cp config.example.js config.js
```

### .gitignore 확인
```bash
# config.js가 .gitignore에 있는지 확인
cat .gitignore | grep config.js
# 출력: config.js ✅
```

---

## 2️⃣ API 키 설정

### Supabase 키 발급
1. [Supabase](https://supabase.com/) 로그인
2. 프로젝트 선택
3. Settings → API
4. **Project URL** 복사
5. **anon public** 키 복사

### 카카오 JavaScript 키 발급
1. [Kakao Developers](https://developers.kakao.com/) 로그인
2. 내 애플리케이션 → 애플리케이션 추가
3. 앱 설정 → 앱 키
4. **JavaScript 키** 복사

### config.js 수정
```javascript
const CONFIG = {
    // Supabase 설정
    SUPABASE_URL: 'https://your-project.supabase.co',     // ← 여기 수정
    SUPABASE_ANON_KEY: 'your-anon-key-here',              // ← 여기 수정
    
    // 카카오 로그인 설정
    KAKAO_JS_KEY: 'your-kakao-javascript-key-here',       // ← 여기 수정
    
    // 기타 설정 (수정 불필요)
    APP_NAME: '187 성장케어',
    SESSION_KEY: 'growth_care_user',
    CHILDREN_KEY: 'growth_care_children'
};

window.CONFIG = CONFIG;
```

### 설정 확인
```bash
# Git에 config.js가 추적되지 않는지 확인
git status
# config.js가 목록에 없어야 함 ✅

# .gitignore 작동 확인
git check-ignore config.js
# 출력: config.js ✅
```

---

## 3️⃣ 데이터베이스 설정

### Supabase 테이블 생성
1. Supabase 대시보드 → SQL Editor
2. 다음 SQL 파일 실행:

#### users 테이블 (카카오 로그인 지원)
```sql
-- supabase/add-kakao-login-fields.sql 실행
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS kakao_id BIGINT UNIQUE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image TEXT;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS login_type VARCHAR(20) DEFAULT 'email';

ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id);
CREATE INDEX IF NOT EXISTS idx_users_login_type ON users(login_type);
```

### RLS (Row Level Security) 설정
```sql
-- users 테이블 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 데이터만 조회 가능
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- 신규 가입 허용
CREATE POLICY "Allow public insert" ON users
    FOR INSERT WITH CHECK (true);
```

---

## 4️⃣ 로컬 개발 서버

### Python HTTP Server (권장)
```bash
# Python 3
python -m http.server 8000

# 브라우저에서
# http://localhost:8000/
```

### Node.js HTTP Server
```bash
# npx 사용 (설치 불필요)
npx http-server -p 8000

# 또는 전역 설치
npm install -g http-server
http-server -p 8000
```

### VS Code Live Server
1. VS Code 확장 프로그램: "Live Server" 설치
2. index.html 우클릭 → "Open with Live Server"
3. 자동으로 브라우저 열림

---

## 5️⃣ 배포

### Cloudflare Pages (무료)

#### 방법 1: GitHub 연동 (권장)
```bash
# 1. GitHub에 푸시
git add .
git commit -m "Initial commit"
git push origin main

# 2. Cloudflare Pages 대시보드
# - Connect to Git
# - 저장소 선택
# - Build settings:
#   Build command: (비워두기)
#   Build output directory: /
# - Deploy

# 3. 환경변수 설정
# Settings → Environment variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
KAKAO_JS_KEY=your-kakao-key
```

#### 방법 2: Wrangler CLI
```bash
# Wrangler 설치
npm install -g wrangler

# 로그인
wrangler login

# config.js를 환경변수로 변환 (선택사항)
# wrangler.toml에 설정

# 배포
wrangler pages deploy . --project-name=187-growth-care

# 환경변수 설정
wrangler pages secret put KAKAO_JS_KEY
# 값 입력: your-kakao-key
```

### Vercel (무료)
```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 배포
vercel

# 환경변수 설정
vercel env add KAKAO_JS_KEY
# 값 입력: your-kakao-key
```

### Netlify (무료)
```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 로그인
netlify login

# 배포
netlify deploy --prod

# 환경변수 설정
netlify env:set KAKAO_JS_KEY your-kakao-key
```

---

## ✅ 최종 체크리스트

### 로컬 개발
- [ ] `config.js` 생성 및 키 입력
- [ ] `.gitignore`에 `config.js` 포함 확인
- [ ] `git status`로 `config.js` 미추적 확인
- [ ] Supabase SQL 실행
- [ ] 로컬 서버 실행 (`python -m http.server 8000`)
- [ ] 브라우저에서 `http://localhost:8000/` 접속
- [ ] 로그인 테스트
- [ ] 카카오 로그인 테스트

### 배포
- [ ] GitHub에 푸시 (config.js 제외)
- [ ] Cloudflare Pages 연동
- [ ] 환경변수 설정
- [ ] 배포 완료 확인
- [ ] 배포된 URL에서 테스트
- [ ] 카카오 Developers에 배포 도메인 등록

---

## 🚨 문제 해결

### config.js를 찾을 수 없음
```
Error: Cannot find config.js
```
**해결:**
```bash
cp config.example.js config.js
# config.js 수정 후 페이지 새로고침
```

### 카카오 SDK 초기화 실패
```
Error: Kakao is not defined
```
**해결:**
1. 브라우저 콘솔에서 `Kakao` 확인
2. CDN 로드 확인: `<script src="https://t1.kakaocdn.net/..."></script>`
3. 네트워크 탭에서 404 에러 확인

### Supabase 연결 실패
```
Error: Failed to fetch
```
**해결:**
1. `CONFIG.SUPABASE_URL` 확인
2. `CONFIG.SUPABASE_ANON_KEY` 확인
3. Supabase 프로젝트 상태 확인
4. CORS 설정 확인

### Git에 config.js가 추가됨
```
modified: config.js
```
**해결:**
```bash
# Git 추적 중단
git rm --cached config.js

# .gitignore 확인
echo "config.js" >> .gitignore

# 커밋
git add .gitignore
git commit -m "Stop tracking config.js"
```

---

## 📚 관련 문서

- [API 보안 가이드](docs/guides/API_SECURITY_GUIDE.md)
- [카카오 로그인 가이드](docs/guides/KAKAO_LOGIN_GUIDE.md)
- [Supabase 가이드](docs/guides/SUPABASE_GUIDE.md)
- [QUICK_RULES.md](QUICK_RULES.md)

---

**작성일:** 2026-02-05  
**작성자:** AI Assistant
