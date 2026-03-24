# 187 성장케어 - Project Memory

> 이 문서는 Claude 세션 간 컨텍스트 유지를 위한 프로젝트 메모리입니다.
> 마지막 업데이트: 2026-03-24

## 프로젝트 현황 요약

| 항목 | 상태 |
|------|------|
| v4 앱 (환자용) | ✅ Phase 0-5 완료, Phase 6 부분 완료 |
| 리팩토링 | ✅ 완료 (AdminContentPage, RoutinePage, HeightCalculator 분리) |
| 병원 웹사이트 리뉴얼 | ✅ Phase 7 완료 + 디자인 개선 |
| AI 식단 분석 | ✅ 동작 중 (Gemini 2.5 Flash) |
| AI 체형 분석 | ⚠️ MOCK (랜덤 데이터) |
| RAG 챗봇 | 🔜 DEFERRED |
| 배포 | ✅ Railway 라이브 (dflo-production.up.railway.app) |

## 핵심 결정사항 기록

### 아키텍처
- **v4 앱**: React 19 + TS + Vite + Zustand + Supabase (로그인 필요)
- **웹사이트**: 같은 v4 앱 내 `/website` 라우트 (로그인 불필요, 공개)
- **AI 서버**: Express + Gemini, 포트 3001, 별도 프로세스
- **DB 인증**: 레거시 평문 비밀번호 (users 테이블 email + password)
- **배포**: Railway (Vite preview, `$PORT` 자동 할당, allowedHosts 설정)

### 웹사이트 설계 (Phase 7)
- 원본 사이트: https://www.yssaebomq.com/ (Wix 기반)
- 목적: 전환율(카카오톡 문의) 극대화
- 디자인: 모바일 퍼스트, 브랜드 컬러 #0F6E56, bg-gray-50, max-w-5xl
- 배너 데이터: localStorage (Supabase 테이블 없이 경량화)
- v4 앱 모듈 재사용: CaseDetail, GuideDetail, RecipeDetail, GrowthChart, MeasurementTable, contentService, exercises data

### 관리자 접근
- 앱 어드민: `admin@187growth.com` / `admin187!` → `/admin/*`
- 웹사이트 배너 관리: PIN `8054` → `/website/admin/banners`

### 웹사이트 디자인 결정
- 히어로 배너: 16:9, 수동 내비게이션 (자동 롤링 제거), 실사 이미지 배경
- 예상키 측정: 섹션이 아닌 **플로팅 버튼 + 모달 팝업** 방식
- 아버지/어머니 키 입력 제거 (LMS 기반으로 충분)
- 각 섹션 제목에 이모지 (🏥📋🥗🏃📊) → 시각적 구분
- 카드 왼쪽 컬러 보더 통일 (프로그램=green, 가이드=green, 레시피=orange, 운동=blue, 사례=blue/pink)
- 가이드/레시피 카드 클릭 → 상세 모달 (v4 컴포넌트 재사용)
- 운동 카드 클릭 → YouTubeModal 팝업 재생
- 커뮤니티 메뉴: 블로그/인스타/유튜브 외부 링크

## 코딩 컨벤션 (빠른 참조)
- 컴포넌트 200줄 이하 (최대 350)
- UI 텍스트 전부 한국어
- Tailwind만 사용 (CSS 파일 없음)
- `@/` path alias
- feature 컴포넌트는 named export, 페이지는 default export
- Supabase 쿼리는 services/ 파일에
- console.* 금지 → logger 사용

## 최근 작업 히스토리

### 2026-03-24 세션 1 (초기)
1. **리팩토링 완료**
   - AdminContentPage (479줄) → AdminRecipeTab + AdminGuideTab + AdminCaseTab + AdminContentShared
   - RoutinePage (402줄) → SleepCard + MealCard + ExerciseCard + SupplementCard
   - GrowthPage dead code 제거
   - fetchMealsByRoutine 중복 제거

2. **병원 웹사이트 리뉴얼 (Phase 7)**
   - 랜딩페이지 구축: 히어로 → 통계 → 프로그램 → 가이드 → 레시피 → 운동 → 사례
   - 원본 사이트에서 7개 프로그램 콘텐츠 + 이미지 크롤링
   - 프로그램 상세 페이지, 병원소개 모달, 진료시간/위치 모달
   - 치료사례 CaseDetailModal (성장차트 + 측정기록)
   - 롤링 히어로 배너 + 배너 관리자 (PIN 8054)

### 2026-03-24 세션 2 (현재)
1. **웹사이트 디자인 개선**
   - 히어로 배너 16:9 + 실사 이미지 (banner-1, banner-2, banner-5)
   - 배너 자동 롤링 제거 (수동 내비게이션만)
   - 배너 CTA 버튼 (→ 예상키 측정 모달)
   - 예상키 측정: 섹션 → 플로팅 버튼 + 모달 방식으로 변경
   - 아버지/어머니 키 입력 제거
   - 섹션 제목 통일 (이모지 + 볼드 제목, 작은 태그 제거)
   - 카드 디자인: 왼쪽 컬러 보더 + 그림자 통일
   - 전체 배경 bg-gray-50, 섹션 간 상하 패딩 강화
   - 헤더 로고 이미지 적용

2. **콘텐츠 상호작용 추가**
   - 가이드 카드 클릭 → GuideDetail 모달 (v4 재사용)
   - 레시피 카드 클릭 → RecipeDetail 모달 (v4 재사용)
   - 운동 카드 클릭 → YouTubeModal 팝업
   - 커뮤니티 메뉴: 블로그/인스타/유튜브 링크

3. **리팩토링**
   - HeightCalculator (336줄) → HeightCalculator (~120줄) + HeightCalculatorResult (~170줄)

4. **배포**
   - Railway 설정: Vite preview + allowedHosts
   - 라이브: https://dflo-production.up.railway.app/website

5. **문서 정리**
   - CLAUDE.md, PRD.md, memory.md 전면 업데이트

## 남은 작업
- [ ] AI 체형 분석 실제 Gemini 연동 (현재 mock)
- [ ] RAG 챗봇 구현
- [ ] list5 (성장 체형 교정운동), list6 (곧은 발육 케어) 콘텐츠 보강
- [ ] SEO 메타 태그 최적화
- [ ] 웹사이트 성능 최적화 (이미지 lazy loading 등)
- [ ] 2번 배너 이미지 개선 (성조숙증)

## 외부 링크
- **블로그**: https://blog.naver.com/saebom2469
- **유튜브**: https://www.youtube.com/@187growup
- **인스타그램**: https://www.instagram.com/187growup/
- **카카오톡**: VITE_KAKAO_CHANNEL_URL 환경변수

## 사용자 선호사항
- 한국어로 소통
- 커밋 후 바로 push 선호
- 디자인은 실제 구현 + 브라우저 확인 선호 (Figma/Pencil 보다)
- 기존 코드 재사용 적극 권장
- 병원 관련 UI는 신뢰감 있는 톤 (#0F6E56 다크 그린)
- 섹션 구분은 이모지 + 배경색 교차 + 카드 그림자
- 배너 자동 롤링 OFF (수동 내비게이션 선호)
