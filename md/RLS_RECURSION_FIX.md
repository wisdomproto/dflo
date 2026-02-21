# 🔧 Supabase RLS 무한 재귀 오류 해결

## ❌ 문제

```
infinite recursion detected in policy for relation "users"
```

**원인**: RLS (Row Level Security) 정책에서 `users` 테이블을 조회할 때 다시 `users` 테이블을 참조하여 무한 재귀 발생

---

## ✅ 해결 방법 (2가지 옵션)

### **옵션 1: 간단한 스키마 사용 (권장)** 🎯

**개발 환경**에서는 RLS 없이 테이블만 생성합니다.

#### **1단계: 새 SQL 파일 사용**
```sql
-- supabase/schema-simple.sql 사용
-- Supabase Dashboard → SQL Editor → New Query
-- 파일 내용을 복사해서 실행
```

**장점:**
- ✅ 무한 재귀 오류 없음
- ✅ 빠른 개발 가능
- ✅ 테스트 환경에 최적화

**단점:**
- ⚠️ 인증 기능 없음 (나중에 추가 가능)

---

### **옵션 2: RLS 정책 수정** 🔒

**프로덕션 환경**을 준비 중이라면 RLS 정책을 수정합니다.

#### **1단계: 기존 테이블 삭제 (선택)**
```sql
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS growth_guides CASCADE;
DROP TABLE IF EXISTS growth_cases CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS child_optional_female CASCADE;
DROP TABLE IF EXISTS child_optional_male CASCADE;
DROP TABLE IF EXISTS child_required_info CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

#### **2단계: 수정된 RLS 정책 적용**
```sql
-- supabase/fix-rls-recursion.sql 사용
-- 기존 정책을 auth.jwt() 기반으로 변경
```

**장점:**
- ✅ 보안 강화 (RLS 활성화)
- ✅ 역할 기반 접근 제어

**단점:**
- ⚠️ 인증 설정 필요
- ⚠️ 더 복잡한 설정

---

## 🚀 권장 순서

### **현재 단계: 개발 환경**
```bash
1. ✅ schema-simple.sql 사용 (RLS 비활성화)
2. ✅ 테이블 생성 및 테스트
3. ✅ 관리자 대시보드 개발
4. ✅ 데이터 입력 및 테스트
```

### **나중 단계: 프로덕션 준비**
```bash
1. 🔒 Supabase Auth 설정
2. 🔒 fix-rls-recursion.sql 실행
3. 🔒 역할 기반 권한 테스트
4. 🚀 Cloudflare Pages 배포
```

---

## 📋 다음 단계

### **1️⃣ Supabase Dashboard에서 SQL 실행**

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard

2. **SQL Editor 이동**
   - 좌측 메뉴 → SQL Editor

3. **New Query 생성**
   - `+ New Query` 버튼 클릭

4. **schema-simple.sql 실행**
   ```sql
   -- supabase/schema-simple.sql 파일 내용을 복사해서 붙여넣기
   -- Run 버튼 클릭
   ```

5. **결과 확인**
   ```
   ✅ 테이블 생성 완료!
   📋 생성된 테이블:
     - users (사용자)
     - children (아이 정보)
     - measurements (측정 기록)
     - recipes (건강 레시피)
     - growth_cases (성장 관리 사례)
     - growth_guides (성장 가이드)
   ```

---

### **2️⃣ 연결 테스트 재실행**

```bash
# 브라우저에서 테스트 페이지 열기
test-supabase-connection.html

# "🚀 테스트 다시 실행" 버튼 클릭
```

**예상 결과:**
```
✅ 1. Supabase 클라이언트 생성 - 성공
✅ 2. 데이터베이스 연결 테스트 - 성공
✅ 3. 테이블 존재 확인 - 모든 테이블 존재
✅ 4. RLS 정책 확인 - 성공 (비활성화 상태)
```

---

### **3️⃣ 관리자 대시보드 테스트**

```bash
# 브라우저에서 열기
admin-dashboard.html

# 테스트 항목:
1. 환자 추가/수정/삭제
2. 레시피 추가/수정/삭제
3. 사례 추가/수정/삭제
4. 가이드 추가/수정/삭제
```

---

## 📚 관련 파일

### **새로 생성된 파일**
- `supabase/schema-simple.sql` - RLS 비활성화 버전 (개발용)
- `supabase/fix-rls-recursion.sql` - RLS 수정 버전 (프로덕션용)

### **기존 파일**
- `supabase/schema.sql` - 전체 스키마 (RLS 포함)
- `js/supabase-config.js` - Supabase 설정
- `test-supabase-connection.html` - 연결 테스트 페이지

---

## 🎯 요약

**현재 상황**: RLS 정책 무한 재귀 오류 발생

**해결책**: `supabase/schema-simple.sql` 사용 (RLS 비활성화)

**다음 단계**: 
1. SQL 실행
2. 테스트 재실행
3. 관리자 대시보드 테스트

---

**준비되었습니다! Supabase Dashboard에서 SQL을 실행하고 결과를 공유해 주세요! 🚀**
