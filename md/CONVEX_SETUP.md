# Convex 설정 가이드

## 🚀 Convex 도입으로 실시간 동기화!

이제 **사용자 앱과 관리자 앱이 실시간으로 동기화**됩니다!

### ✨ 무엇이 바뀌나요?

**Before (localStorage)**:
```
사용자 앱 ❌ 관리자 앱
각각 브라우저에 저장
동기화 불가능
```

**After (Convex)**:
```
사용자 앱 ✅ 관리자 앱
     ↓         ↓
  Convex Cloud
실시간 자동 동기화! 🔄
```

---

## 📦 1. 설치

### Node.js 설치 (아직 없다면)
https://nodejs.org/ 에서 LTS 버전 다운로드 및 설치

### 프로젝트 설정
```bash
# 1. 패키지 설치
npm install

# 2. Convex 로그인 (브라우저에서 자동 인증)
npx convex login

# 3. Convex 프로젝트 생성
npx convex init

# 4. Convex 개발 서버 시작
npm run dev
```

**중요**: `npm run dev`를 실행하면:
- Convex 백엔드가 클라우드에 배포됩니다
- 로컬에서 실시간 동기화가 시작됩니다
- 터미널을 닫으면 동기화가 중단됩니다 (다시 `npm run dev` 실행)

---

## 🔑 2. Convex URL 설정

`npm run dev` 실행 후 터미널에 표시되는 URL을 복사합니다:
```
✔ Convex URL: https://xxx.convex.cloud
```

이 URL을 HTML 파일에 추가해야 합니다.

### index.html 수정
```html
<head>
  ...
  <script src="https://cdn.jsdelivr.net/npm/convex@1.16.2/dist/browser.umd.js"></script>
  <script>
    // Convex 초기화
    const CONVEX_URL = "https://xxx.convex.cloud"; // 여기에 URL 입력!
    const convex = new Convex(CONVEX_URL);
  </script>
</head>
```

**모든 HTML 파일에 추가해야 합니다**:
- index.html
- growth.html
- challenge.html
- admin.html
- info.html

---

## 📊 3. 데이터 마이그레이션

기존 localStorage 데이터를 Convex로 이동합니다.

### 자동 마이그레이션 스크립트 실행

브라우저 Console에서 실행:

```javascript
// 1. 기존 데이터 확인
const children = JSON.parse(localStorage.getItem('children') || '[]');
const growthRecords = JSON.parse(localStorage.getItem('growthRecords') || '{}');
console.log('아이:', children.length + '명');
console.log('성장 기록:', Object.keys(growthRecords).length + '개');

// 2. Convex로 이동 (자동으로 실행됨)
// migration.js 파일 참조
```

---

## 🧪 4. 테스트

### 실시간 동기화 테스트

1. **사용자 앱 열기** (브라우저 A):
   ```
   http://localhost:8000/index.html
   ```

2. **관리자 앱 열기** (브라우저 B):
   ```
   http://localhost:8000/admin.html
   ```

3. **관리자에서 환자 추가**:
   - 환자 이름: "테스트"
   - 생년월일: "2015-01-01"
   - 저장

4. **사용자 앱 확인**:
   - 새로고침 없이 자동으로 업데이트! ✨

---

## 🗂️ 데이터 구조

### Children (아이)
```typescript
{
  _id: Id<"children">,
  name: "서준",
  gender: "male",
  birthDate: "2015-03-15",
  createdAt: 1704067200000,
  updatedAt: 1704067200000,
}
```

### GrowthRecords (성장 기록)
```typescript
{
  _id: Id<"growthRecords">,
  childId: Id<"children">,
  date: "2024-01-01",
  height: 120.5,
  weight: 25.3,
  percentile: {
    height: 50,
    weight: 45,
  },
  createdAt: 1704067200000,
}
```

### Patients (환자 - 관리자용)
```typescript
{
  _id: Id<"patients">,
  name: "전서우",
  birthDate: "2013-09-18",
  gender: "male",
  chartNumber: "27205",
  fatherHeight: 168,
  motherHeight: 158,
  targetHeight: "180-185",
  specialNotes: "야구 선수 지망",
  createdAt: 1704067200000,
  updatedAt: 1704067200000,
}
```

### Measurements (측정 기록 - 환자별)
```typescript
{
  _id: Id<"measurements">,
  patientId: Id<"patients">,
  date: "2024-01-12",
  height: 150.3,
  weight: 41.7,
  boneAge: "12세5개월",
  predictedHeight: "173-174",
  treatment: "루프린 주사",
  memo: "아리미덱스 처방 계속",
  createdAt: 1704067200000,
}
```

---

## 🔐 보안

### 현재 (개발 단계)
- ✅ 누구나 읽기/쓰기 가능
- ⚠️ 프로덕션에서는 인증 필요

### 프로덕션 (배포 시)
Convex Auth를 사용하여:
- 👤 사용자: 자기 아이 데이터만 조회/수정
- 👨‍⚕️ 관리자: 모든 환자 데이터 조회/수정

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: "https://your-domain.com",
      applicationID: "your-app-id",
    },
  ],
};
```

---

## 📈 Convex 무료 플랜

- ✅ **10만 요청/월** (충분함)
- ✅ **1GB 저장공간**
- ✅ **실시간 동기화**
- ✅ **자동 백업**

---

## 🚨 주의사항

### 개발 중
1. **터미널 유지**: `npm run dev`를 실행한 터미널을 닫지 마세요
2. **URL 변경 금지**: Convex URL을 변경하면 데이터가 초기화됩니다

### 배포 시
```bash
# 프로덕션 배포
npm run build

# .env 파일에 URL 저장
echo "CONVEX_URL=https://xxx.convex.cloud" > .env
```

---

## 🆘 문제 해결

### "Convex is not defined" 에러
→ HTML에 Convex CDN이 없음
```html
<script src="https://cdn.jsdelivr.net/npm/convex@1.16.2/dist/browser.umd.js"></script>
```

### 데이터가 동기화 안 됨
→ `npm run dev`가 실행 중인지 확인

### "Invalid Convex URL" 에러
→ URL을 다시 확인 (`npx convex dev`의 출력 참조)

---

## 📚 더 알아보기

- Convex 공식 문서: https://docs.convex.dev
- Convex Dashboard: https://dashboard.convex.dev

---

## ✅ 체크리스트

설정 완료를 위한 체크리스트:

- [ ] Node.js 설치
- [ ] `npm install` 실행
- [ ] `npx convex login` 로그인
- [ ] `npx convex init` 프로젝트 생성
- [ ] `npm run dev` 실행
- [ ] Convex URL 복사
- [ ] 모든 HTML 파일에 URL 추가
- [ ] 브라우저에서 테스트
- [ ] 실시간 동기화 확인 ✨

