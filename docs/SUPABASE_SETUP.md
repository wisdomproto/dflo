# 🚀 Supabase 설정 가이드

## 📋 목차
1. [Supabase 프로젝트 생성](#1-supabase-프로젝트-생성)
2. [데이터베이스 테이블 생성](#2-데이터베이스-테이블-생성)
3. [프론트엔드 연결 설정](#3-프론트엔드-연결-설정)
4. [샘플 데이터 추가](#4-샘플-데이터-추가)
5. [배포 및 테스트](#5-배포-및-테스트)

---

## 1. Supabase 프로젝트 생성

### 1-1. Supabase 계정 생성
1. https://supabase.com 접속
2. **Start your project** 클릭
3. GitHub 계정으로 로그인 (또는 이메일로 가입)

### 1-2. 새 프로젝트 생성
1. 대시보드에서 **New Project** 클릭
2. 프로젝트 정보 입력:
   - **Name**: `187-growth-care` (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 서버)
   - **Pricing Plan**: `Free` (무료 플랜)
3. **Create new project** 클릭
4. ⏳ 프로젝트 생성 대기 (약 2-3분)

---

## 2. 데이터베이스 테이블 생성

### 2-1. SQL Editor 열기
1. 좌측 메뉴에서 **SQL Editor** 클릭
2. **New query** 클릭

### 2-2. 스키마 실행
1. `supabase/schema.sql` 파일 열기
2. 전체 내용 복사 (Ctrl+A → Ctrl+C)
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭 (또는 Ctrl+Enter)
5. ✅ "Success. No rows returned" 메시지 확인

### 2-3. 테이블 확인
1. 좌측 메뉴에서 **Table Editor** 클릭
2. 생성된 테이블 확인:
   - ✅ `users` - 사용자 (부모/의사/관리자)
   - ✅ `children` - 아이 정보
   - ✅ `child_required_info` - 아이 필수 정보
   - ✅ `child_optional_male` - 남아 선택 정보
   - ✅ `child_optional_female` - 여아 선택 정보
   - ✅ `measurements` - 측정 기록
   - ✅ `recipes` - 건강 레시피
   - ✅ `growth_cases` - 성장 관리 사례
   - ✅ `growth_guides` - 성장 가이드
   - ✅ `challenges` - 챌린지 기록
   - ✅ `announcements` - 공지사항

---

## 3. 프론트엔드 연결 설정

### 3-1. API 키 가져오기
1. 좌측 메뉴에서 **Settings** → **API** 클릭
2. 다음 2개 값을 복사:
   - **Project URL**: `https://xxxxxxxxx.supabase.co`
   - **anon public** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3-2. js/supabase-config.js 수정
1. `js/supabase-config.js` 파일 열기
2. 다음 부분을 복사한 값으로 수정:

```javascript
// ⚠️ 여기를 수정하세요!
const SUPABASE_URL = 'https://xxxxxxxxx.supabase.co'; // 여기에 Project URL 붙여넣기
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // 여기에 anon public key 붙여넣기
```

3. 파일 저장 (Ctrl+S)

### 3-3. 연결 테스트
1. 브라우저에서 `admin-dashboard.html` 열기
2. F12 → Console 탭 확인
3. 다음 메시지가 나오면 성공:
   ```
   ✅ Supabase 설정 로드 완료
   ```

---

## 4. 샘플 데이터 추가

### 4-1. 관리자 계정 생성
1. Supabase 대시보드 → **SQL Editor**
2. 다음 SQL 실행:

```sql
-- 관리자 계정 추가
INSERT INTO users (email, name, role) VALUES
('admin@187growth.com', '관리자', 'admin');
```

### 4-2. 샘플 레시피 추가
관리자 페이지에서 직접 추가하거나, SQL로 추가:

```sql
INSERT INTO recipes (recipe_number, order_index, title, image_url, key_benefits, main_nutrients, ingredients, steps, is_published) VALUES
('레시피 01', 1, '치즈 닭가슴살 볶음밥', 'https://i.ibb.co/p6h1F8pJ/01.jpg', 
'단백질과 칼슘이 풍부해 뼈 성장과 근육 발달에 도움이 됩니다.', 
ARRAY['칼슘', '단백질', '비타민 B12'], 
'[{"name":"밥","amount":"2공기"},{"name":"닭가슴살","amount":"150g"}]'::jsonb,
'[{"step":1,"description":"닭가슴살을 한입 크기로 자릅니다."}]'::jsonb,
true);
```

### 4-3. 샘플 가이드 추가

```sql
INSERT INTO growth_guides (title, subtitle, icon, content, order_index, is_published) VALUES
('성장판 검사', '우리 아이 성장판 검사 시기와 방법', '🏥', 
'성장판 검사는 아이의 성장 가능성을 파악하는 중요한 검사입니다...', 
1, true);
```

---

## 5. 배포 및 테스트

### 5-1. 로컬 테스트
1. `admin-dashboard.html` 열기
2. 각 탭 클릭하여 데이터 로드 확인:
   - 👥 환자 관리
   - 🍳 레시피
   - 🌟 사례
   - 📚 가이드

### 5-2. Cloudflare Pages 배포
```bash
# Windows
deploy.bat

# Mac/Linux
./deploy.sh
```

### 5-3. 배포된 사이트 확인
- URL: `https://187-growth-care.pages.dev`
- 관리자 페이지: `https://187-growth-care.pages.dev/admin-dashboard.html`

---

## 📊 데이터베이스 구조

### 주요 테이블 관계
```
users (부모)
  └── children (아이)
        ├── child_required_info (필수 정보)
        ├── child_optional_male/female (선택 정보)
        ├── measurements (측정 기록)
        └── challenges (챌린지)

recipes (레시피)
growth_cases (사례)
growth_guides (가이드)
```

---

## 🔒 보안 설정

### Row Level Security (RLS) 정책

#### 이미 설정된 정책:
1. **부모**: 자기 아이 데이터만 조회/수정 가능
2. **의사/관리자**: 모든 환자 데이터 조회 가능
3. **레시피/사례/가이드**: 누구나 조회 가능, 관리자만 수정 가능

#### 추가 보안 설정 (선택사항)
Supabase 대시보드 → **Authentication** → **Policies**에서 추가 정책 설정 가능

---

## ⚙️ 환경별 설정

### 개발 환경
```javascript
// js/supabase-config.js
const SUPABASE_URL = 'https://dev-project.supabase.co';
const SUPABASE_ANON_KEY = 'dev-key...';
```

### 프로덕션 환경
```javascript
// js/supabase-config.js
const SUPABASE_URL = 'https://prod-project.supabase.co';
const SUPABASE_ANON_KEY = 'prod-key...';
```

---

## 🚨 문제 해결

### "Failed to fetch" 오류
- Supabase URL과 ANON KEY가 올바른지 확인
- 브라우저 콘솔(F12)에서 네트워크 탭 확인
- Supabase 프로젝트가 활성 상태인지 확인

### RLS 권한 오류
- SQL Editor에서 RLS 정책 확인:
  ```sql
  SELECT * FROM pg_policies;
  ```
- 필요시 `supabase/schema.sql` 재실행

### CORS 오류
- Supabase는 자동으로 CORS 허용
- 문제 발생 시 Supabase 대시보드 → **Settings** → **API** 확인

---

## 📞 지원

### Supabase 공식 문서
- https://supabase.com/docs

### 프로젝트 이슈
- GitHub Issues: [여기에 프로젝트 GitHub URL]

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] Supabase 프로젝트 생성 완료
- [ ] 데이터베이스 테이블 생성 완료 (11개 테이블)
- [ ] `js/supabase-config.js`에 API 키 설정 완료
- [ ] 관리자 계정 생성 완료
- [ ] 샘플 데이터 추가 완료
- [ ] 로컬에서 관리자 페이지 테스트 완료
- [ ] Cloudflare Pages 배포 완료
- [ ] 배포된 사이트 접속 확인

---

## 🎉 완료!

이제 187 성장케어 플랫폼이 Supabase 데이터베이스와 연결되었습니다!

### 다음 단계:
1. `admin-dashboard.html`에서 레시피, 사례, 가이드 추가
2. 환자 데이터 관리 시작
3. 사용자 페이지(`index.html`, `growth.html`)를 Supabase와 연동

---

**작성일**: 2026-01-31  
**버전**: 1.0  
**프로젝트**: 187 성장케어
