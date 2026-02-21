# 🔒 API 키 보안 가이드

## ⚠️ 문제: API 키가 GitHub에 노출되면?

```javascript
// ❌ 위험: HTML/JS 파일에 직접 키를 넣으면
const KAKAO_JS_KEY = 'abc123def456';
```
→ **GitHub에 올리면 전 세계에 공개됨!**  
→ **악의적인 사용자가 키를 도용 가능!**  
→ **비용 폭탄, 데이터 유출 위험!**

---

## ✅ 해결 방법 1: config.js + .gitignore

### 1단계: config.js 파일 생성
```bash
# config.example.js를 복사
cp config.example.js config.js
```

### 2단계: config.js에 실제 키 입력
```javascript
const CONFIG = {
    SUPABASE_URL: 'https://mufjnulwnppgvibmmbfo.supabase.co',
    SUPABASE_ANON_KEY: 'your-real-key-here',
    KAKAO_JS_KEY: 'your-real-kakao-key-here',
    // ...
};
```

### 3단계: .gitignore에 추가 (이미 추가됨)
```
# .gitignore
config.js       ← GitHub에 올라가지 않음
.env
.env.local
```

### 4단계: HTML에서 사용
```html
<!-- login.html -->
<script src="config.js"></script>
<script>
    // CONFIG 객체 사용
    const supabase = window.supabase.createClient(
        CONFIG.SUPABASE_URL, 
        CONFIG.SUPABASE_ANON_KEY
    );
    
    Kakao.init(CONFIG.KAKAO_JS_KEY);
</script>
```

---

## ✅ 해결 방법 2: 환경변수 + Cloudflare Workers

### 더 안전한 방법 (추천)
1. **Cloudflare Workers** 사용
2. 서버에서만 API 키 사용
3. 클라이언트는 Worker를 통해 간접 호출

```javascript
// cloudflare-worker.js (서버)
export default {
    async fetch(request, env) {
        // 환경변수에서 키 가져오기
        const kakaoKey = env.KAKAO_JS_KEY;
        
        // 카카오 API 호출
        const response = await fetch('https://kapi.kakao.com/...', {
            headers: {
                'Authorization': `KakaoAK ${kakaoKey}`
            }
        });
        
        return response;
    }
}
```

---

## 📋 현재 프로젝트 설정

### 파일 구조
```
187-growth-care/
├── config.js              ← 실제 키 (Git 무시)
├── config.example.js      ← 템플릿 (Git 포함)
├── .gitignore             ← config.js 차단
├── login.html             ← config.js 사용
└── signup.html            ← config.js 사용
```

### config.js (로컬에만 존재)
```javascript
const CONFIG = {
    SUPABASE_URL: 'https://mufjnulwnppgvibmmbfo.supabase.co',
    SUPABASE_ANON_KEY: 'your-real-key',      // ← 실제 키
    KAKAO_JS_KEY: 'your-real-kakao-key',     // ← 실제 키
};
window.CONFIG = CONFIG;
```

### config.example.js (GitHub에 올림)
```javascript
const CONFIG = {
    SUPABASE_URL: 'https://mufjnulwnppgvibmmbfo.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',  // ← 템플릿
    KAKAO_JS_KEY: 'YOUR_KAKAO_JAVASCRIPT_KEY',    // ← 템플릿
};
window.CONFIG = CONFIG;
```

---

## 🔍 API 키 타입별 보안 수준

### 1. 카카오 JavaScript 키
- **보안 수준:** 🟡 중간
- **노출 여부:** 공개 가능 (제한적)
- **보호 방법:** 도메인 화이트리스트
- **설명:** 
  - 클라이언트에서 사용하도록 설계됨
  - 카카오 Developers에서 도메인 등록 필수
  - 등록된 도메인에서만 작동
  - ✅ **그래도 .gitignore에 추가 권장**

### 2. Supabase Anon Key
- **보안 수준:** 🟡 중간
- **노출 여부:** 공개 가능 (RLS 적용 시)
- **보호 방법:** Row Level Security (RLS)
- **설명:**
  - 공개용 키 (클라이언트 사용)
  - RLS 정책으로 데이터 접근 제어
  - Service Role Key는 **절대 노출 금지**
  - ✅ **그래도 .gitignore에 추가 권장**

### 3. Admin/Secret 키
- **보안 수준:** 🔴 높음 (절대 노출 금지!)
- **노출 여부:** 비공개
- **보호 방법:** 서버 환경변수
- **설명:**
  - Supabase Service Role Key
  - 카카오 Admin Key
  - 네이버 Client Secret
  - ❌ **절대 클라이언트 코드에 넣지 말 것!**

---

## 🚨 긴급: 키가 노출되었다면?

### 즉시 조치
1. **키 즉시 재발급**
   - Kakao Developers → 앱 설정 → 키 재발급
   - Supabase → Settings → API → Reset key

2. **Git 히스토리에서 완전 삭제**
```bash
# BFG Repo-Cleaner 사용
git clone --mirror git@github.com:your-repo.git
java -jar bfg.jar --delete-files config.js your-repo.git
cd your-repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

3. **GitHub Secrets 스캔**
   - GitHub → Security → Secret scanning alerts 확인

---

## ✅ 체크리스트

### 개발 시작 전
- [ ] config.example.js를 복사하여 config.js 생성
- [ ] config.js에 실제 API 키 입력
- [ ] .gitignore에 config.js 추가 확인
- [ ] Git status로 config.js가 추적되지 않는지 확인

### Git 커밋 전
- [ ] `git status` 실행
- [ ] config.js가 목록에 없는지 확인
- [ ] API 키가 포함된 파일이 없는지 확인
- [ ] .env 파일이 없는지 확인

### 배포 시
- [ ] Cloudflare Pages → Settings → Environment variables 설정
- [ ] 환경변수로 키 전달
- [ ] config.js는 배포하지 않음

---

## 📚 참고 자료

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Kakao Developers - 보안 가이드](https://developers.kakao.com/docs/latest/ko/getting-started/security)

---

## 💡 팁

### Git에서 파일 추적 중단
```bash
# 이미 커밋된 config.js를 추적 중단
git rm --cached config.js
echo "config.js" >> .gitignore
git add .gitignore
git commit -m "Stop tracking config.js"
```

### 로컬에서 키 확인
```javascript
// 브라우저 콘솔에서
console.log(CONFIG.KAKAO_JS_KEY); // 로컬: 실제 키
                                   // GitHub: YOUR_KAKAO_JAVASCRIPT_KEY
```

---

**요약:**
1. ✅ config.js에 실제 키 저장
2. ✅ .gitignore에 config.js 추가
3. ✅ config.example.js는 템플릿으로 Git에 포함
4. ✅ 배포 시 환경변수 사용

**절대 금지:**
- ❌ HTML/JS 파일에 직접 키 입력
- ❌ Git에 config.js 커밋
- ❌ Admin 키를 클라이언트에서 사용

---

**작성일:** 2026-02-05  
**작성자:** AI Assistant
