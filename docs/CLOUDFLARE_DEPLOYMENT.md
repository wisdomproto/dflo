# 🚀 Cloudflare Pages 배포 가이드

## 📋 목차
- [배포 방법](#배포-방법)
- [설정](#설정)
- [커스텀 도메인](#커스텀-도메인)
- [환경 변수](#환경-변수)
- [문제 해결](#문제-해결)

---

## 🌟 배포 방법

### 방법 1: Wrangler CLI (추천 ⭐)

#### 1. Wrangler 설치
```bash
npm install -g wrangler
```

#### 2. Cloudflare 로그인
```bash
wrangler login
```
- 브라우저가 열리면 Cloudflare 계정으로 로그인
- 권한 승인

#### 3. 배포
```bash
# 프로젝트 폴더에서 실행
wrangler pages deploy . --project-name=187-growth-care
```

#### 4. 완료!
```
✨ Deployment complete!
🌍 https://187-growth-care.pages.dev
```

---

### 방법 2: Dashboard (드래그 앤 드롭)

#### 1. Cloudflare Dashboard 접속
1. https://dash.cloudflare.com/ 접속
2. **Workers & Pages** 클릭
3. **Create application** 클릭
4. **Pages** 탭 선택
5. **Upload assets** 클릭

#### 2. 파일 업로드
- **옵션 A**: 프로젝트 폴더 전체를 드래그 앤 드롭
- **옵션 B**: ZIP 파일로 압축 후 업로드

**제외할 파일/폴더:**
- `node_modules/`
- `.git/`
- `.vscode/`
- `*-backup.*`
- `*-old.*`

#### 3. 프로젝트 설정
- **Project name**: `187-growth-care`
- **Production branch**: `main`
- **Build settings**: None (정적 사이트)

#### 4. 배포 시작
- **Deploy** 버튼 클릭
- 배포 완료 대기 (약 1-2분)

---

### 방법 3: GitHub 연동 (자동 배포)

#### 1. GitHub 저장소 생성
```bash
# GitHub에 새 저장소 생성
# 저장소명: 187-growth-care

# 로컬에서 Git 초기화
git init
git add .
git commit -m "Initial commit: 187 성장케어 모바일 웹앱"
git branch -M main
git remote add origin https://github.com/your-username/187-growth-care.git
git push -u origin main
```

#### 2. Cloudflare Pages 연결
1. Cloudflare Dashboard → **Pages** → **Create a project**
2. **Connect to Git** 선택
3. **GitHub** 선택 및 권한 승인
4. 저장소 선택: `your-username/187-growth-care`

#### 3. 빌드 설정
- **Framework preset**: `None`
- **Build command**: (비워둠)
- **Build output directory**: `/`
- **Root directory**: `/`

#### 4. 환경 변수 (선택사항)
```
ENVIRONMENT=production
```

#### 5. 배포 시작
- **Save and Deploy** 클릭
- Git push 시 자동 배포됨

---

## ⚙️ 설정

### wrangler.toml
프로젝트 루트에 `wrangler.toml` 파일이 있습니다:

```toml
name = "187-growth-care"
compatibility_date = "2024-01-01"

[site]
bucket = "."
```

### 보안 헤더
자동으로 적용되는 보안 헤더:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 캐시 설정
- **HTML 파일**: 캐시 안 함 (항상 최신)
- **CSS/JS**: 1년 캐시
- **JSON 데이터**: 1시간 캐시

---

## 🌐 커스텀 도메인

### 1. 도메인 추가
1. Cloudflare Pages → 프로젝트 선택
2. **Custom domains** 탭
3. **Set up a custom domain** 클릭
4. 도메인 입력 (예: `growth.yonsae.com`)

### 2. DNS 설정
Cloudflare가 자동으로 DNS 레코드 생성:
```
CNAME  growth  187-growth-care.pages.dev
```

### 3. SSL/TLS
- 자동으로 무료 SSL 인증서 발급
- HTTP → HTTPS 자동 리다이렉트

---

## 🔒 환경 변수

프로덕션 환경 변수 설정:

1. Cloudflare Pages → 프로젝트 선택
2. **Settings** → **Environment variables**
3. **Add variable** 클릭

**예시:**
```
ENVIRONMENT=production
API_URL=https://api.yonsae.com
```

JavaScript에서 사용:
```javascript
// 사용 불가 (정적 사이트)
// 환경 변수는 빌드 시에만 사용 가능
```

---

## 📊 성능 최적화

### 1. 이미지 최적화
Cloudflare Images 사용:
```html
<img src="https://imagedelivery.net/YOUR-ACCOUNT/image.jpg/public">
```

### 2. Minification
자동으로 적용:
- HTML Minification
- CSS Minification
- JavaScript Minification

### 3. Brotli 압축
자동으로 적용 (추가 설정 불필요)

---

## 🐛 문제 해결

### 배포 실패

**증상**: `wrangler pages deploy` 실패

**해결책:**
```bash
# 1. 로그인 확인
wrangler whoami

# 2. 재로그인
wrangler logout
wrangler login

# 3. 프로젝트명 확인
wrangler pages deploy . --project-name=187-growth-care
```

### 404 오류

**증상**: 페이지 접속 시 404

**해결책:**
1. `404.html` 파일 확인
2. 파일명 대소문자 확인 (`index.html` vs `Index.html`)
3. 상대 경로 확인

### 캐시 문제

**증상**: 업데이트가 반영 안 됨

**해결책:**
1. **브라우저 캐시 삭제**: `Ctrl + Shift + R`
2. **Cloudflare 캐시 삭제**:
   - Cloudflare Dashboard → **Caching** → **Purge Everything**

### CORS 오류

**증상**: API 호출 시 CORS 오류

**해결책:**
`wrangler.toml`에 헤더 추가:
```toml
[[headers]]
for = "/api/*"
[headers.values]
Access-Control-Allow-Origin = "*"
Access-Control-Allow-Methods = "GET, POST, OPTIONS"
```

---

## 📈 모니터링

### 1. Analytics
Cloudflare Pages → 프로젝트 선택 → **Analytics**

확인 가능한 지표:
- 방문자 수
- 페이지 뷰
- 대역폭 사용량
- 요청 수

### 2. Logs
```bash
wrangler pages deployment list --project-name=187-growth-care
```

### 3. Real-time Logs
```bash
wrangler pages deployment tail --project-name=187-growth-care
```

---

## 🔄 업데이트 배포

### CLI 사용
```bash
wrangler pages deploy . --project-name=187-growth-care
```

### Git 사용 (자동)
```bash
git add .
git commit -m "Update: 새로운 기능 추가"
git push
```
→ 자동으로 배포됨

---

## 💰 비용

**Cloudflare Pages는 완전 무료입니다!**

✅ **무료 플랜 포함:**
- 무제한 대역폭
- 무제한 요청
- 500 빌드/월
- 무제한 사이트
- 무료 SSL
- 전 세계 CDN

---

## 📞 지원

**문제가 있으면:**
1. Cloudflare 문서: https://developers.cloudflare.com/pages/
2. 커뮤니티: https://community.cloudflare.com/
3. Discord: https://discord.gg/cloudflaredev

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] 모든 파일 커밋됨
- [ ] `wrangler.toml` 설정 확인
- [ ] `.cfignore` 설정 확인
- [ ] 카카오톡 링크 업데이트됨
- [ ] 테스트 완료
- [ ] README 업데이트

---

## 🎉 완료!

**배포 URL**: https://187-growth-care.pages.dev

**커스텀 도메인 설정 시**:
- https://growth.yonsae.com (예시)

---

**작성일**: 2026-01-13  
**버전**: 1.0  
**프로젝트**: 187 성장케어 모바일 웹앱
