# 🚀 187 성장케어 배포 가이드

## 📦 배포 파일 구조

```
187-growth-care/
├── index.html              # 홈 페이지
├── growth.html             # 성장 진단
├── challenge.html          # 챌린지
├── info.html               # 정보 (FAQ)
├── cases.html              # 치료 사례
├── admin.html              # 관리자 페이지
├── manifest.json           # PWA 설정
├── css/                    # 스타일시트
│   ├── mobile.css
│   ├── admin.css
│   └── ...
├── js/                     # JavaScript
│   ├── main.js
│   ├── admin.js
│   ├── growth-data.js
│   └── ...
└── data/                   # 초기 데이터 (중요!)
    ├── faqs.json           # FAQ 초기 데이터
    └── cases.json          # 치료 사례 초기 데이터
```

## ⚠️ 중요: data 폴더 포함 필수

**배포 시 `data/` 폴더를 반드시 포함해야 합니다!**

### data 폴더의 역할
- **첫 방문자를 위한 초기 데이터 제공**
- `data/faqs.json`: 12개의 기본 FAQ
- `data/cases.json`: 4개의 샘플 치료 사례
- localStorage가 비어있을 때 자동으로 로드됨

### 만약 data 폴더가 없다면?
- FAQ 페이지와 치료 사례 페이지가 비어있게 됩니다
- 관리자가 직접 데이터를 입력하거나 JSON 파일을 업로드해야 합니다

## 📋 배포 전 체크리스트

### 1. 파일 확인
```bash
# 필수 파일 확인
- [ ] index.html
- [ ] growth.html
- [ ] challenge.html
- [ ] info.html
- [ ] cases.html
- [ ] admin.html
- [ ] manifest.json
- [ ] css/ 폴더 (전체)
- [ ] js/ 폴더 (전체)
- [ ] data/ 폴더 (faqs.json, cases.json)
```

### 2. 데이터 확인
```bash
# data 폴더 확인
ls -la data/
# 결과:
# faqs.json   (약 4KB)
# cases.json  (약 3KB)
```

### 3. 초기 데이터 테스트
1. 브라우저의 localStorage 초기화
   ```javascript
   localStorage.clear();
   location.reload();
   ```
2. 정보 페이지 접속 → FAQ가 자동으로 로드되는지 확인
3. 치료 사례 페이지 접속 → 샘플 사례가 표시되는지 확인

## 🌐 배포 방법

### 방법 1: 정적 호스팅 (권장)

#### Netlify
1. [Netlify](https://www.netlify.com/) 접속
2. "Add new site" → "Deploy manually"
3. **전체 프로젝트 폴더**를 드래그 앤 드롭
4. 배포 완료! 자동으로 HTTPS URL 생성

#### Vercel
1. [Vercel](https://vercel.com/) 접속
2. "New Project" → "Import"
3. **전체 프로젝트 폴더** 업로드
4. 배포 완료!

#### GitHub Pages
```bash
# 1. GitHub 저장소 생성
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin [your-repo-url]
git push -u origin main

# 2. GitHub Settings → Pages → Source: main branch
```

### 방법 2: 자체 서버 (Apache/Nginx)

#### Apache
```apache
# .htaccess
Options +FollowSymLinks
RewriteEngine On

# SPA 라우팅 (선택사항)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L,QSA]
```

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/187-growth-care;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # JSON 파일 MIME 타입
    location ~* \.json$ {
        add_header Content-Type application/json;
    }
}
```

## 💾 데이터 백업 및 마이그레이션

### 기존 사이트에서 데이터 내보내기
1. 관리자 페이지 접속 (`admin.html`)
2. **FAQ 관리** → 💾 다운로드 버튼 클릭
   - `faqs_YYYY-MM-DD.json` 파일 다운로드
3. **치료 사례** → 💾 다운로드 버튼 클릭
   - `cases_YYYY-MM-DD.json` 파일 다운로드

### 새 사이트로 데이터 가져오기
1. 관리자 페이지 접속
2. **FAQ 관리** → 📂 업로드 버튼 클릭
   - 다운로드한 `faqs_YYYY-MM-DD.json` 선택
3. **치료 사례** → 📂 업로드 버튼 클릭
   - 다운로드한 `cases_YYYY-MM-DD.json` 선택

### 배포 전 데이터 사전 설정
배포 전에 data 폴더의 JSON 파일을 원하는 내용으로 수정할 수 있습니다:

```bash
# 1. 기존 사이트에서 데이터 다운로드
# 2. 다운로드한 파일을 data 폴더에 복사
cp faqs_2025-12-29.json data/faqs.json
cp cases_2025-12-29.json data/cases.json

# 3. 배포
```

## 🔧 환경별 설정

### 개발 환경
```bash
# 로컬 서버 실행
python -m http.server 8000
# 또는
npx serve .

# 접속: http://localhost:8000
```

### 프로덕션 환경
- **HTTPS 필수**: PWA 기능을 위해 HTTPS 사용
- **data 폴더 접근 가능**: fetch로 JSON 파일을 읽어야 함
- **CORS 설정**: 필요 시 서버에서 CORS 헤더 추가

## 📱 PWA 설정 (선택사항)

### manifest.json 커스터마이징
```json
{
  "name": "187 성장케어",
  "short_name": "성장케어",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#14b8a6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 아이콘 추가 (선택사항)
- 192x192 PNG 아이콘 추가
- 512x512 PNG 아이콘 추가

## 🐛 배포 후 확인사항

### 1. 페이지 접근 테스트
- [ ] 홈 (index.html)
- [ ] 성장 진단 (growth.html)
- [ ] 챌린지 (challenge.html)
- [ ] 정보 (info.html) → FAQ 표시 확인
- [ ] 치료 사례 (cases.html) → 샘플 사례 표시 확인
- [ ] 관리자 (admin.html)

### 2. 초기 데이터 로드 확인
```javascript
// 브라우저 콘솔에서 확인
console.log('FAQ:', JSON.parse(localStorage.getItem('adminFaqs')).length);
console.log('사례:', JSON.parse(localStorage.getItem('adminCases')).length);

// 예상 결과:
// FAQ: 12
// 사례: 4
```

### 3. 기능 테스트
- [ ] 아이 추가/수정/삭제
- [ ] 성장 기록 추가
- [ ] 챌린지 완료 체크
- [ ] FAQ 확인
- [ ] 치료 사례 확인
- [ ] 관리자 데이터 다운로드/업로드

### 4. 모바일 테스트
- [ ] 반응형 레이아웃
- [ ] 터치 동작
- [ ] 하단 탭 네비게이션

## 🔄 업데이트 방법

### 데이터 업데이트
```bash
# 1. 새로운 FAQ나 사례를 data 폴더의 JSON 파일에 추가
# 2. 기존 사용자는 영향 없음 (localStorage 우선)
# 3. 새로운 사용자만 업데이트된 데이터를 받음
```

### 강제 데이터 업데이트 (주의!)
사용자의 localStorage를 초기화하고 새 데이터를 로드하려면:

```javascript
// admin.js에 임시로 추가
localStorage.removeItem('adminFaqs');
localStorage.removeItem('adminCases');
```

**⚠️ 경고**: 사용자가 입력한 모든 데이터가 삭제됩니다!

## 📞 문의

배포 중 문제가 발생하면:
1. 브라우저 콘솔 로그 확인
2. Network 탭에서 파일 로드 확인
3. data/faqs.json, data/cases.json 접근 가능 여부 확인

---

**축하합니다! 🎉 이제 187 성장케어 앱이 배포되었습니다!**
