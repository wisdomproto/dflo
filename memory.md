# 187 성장케어 - Project Memory

> 이 문서는 Claude 세션 간 컨텍스트 유지를 위한 프로젝트 메모리입니다.
> 마지막 업데이트: 2026-03-24

## 프로젝트 현황 요약

| 항목 | 상태 |
|------|------|
| v4 앱 (환자용) | ✅ Phase 0-5 완료, Phase 6 부분 완료 |
| 리팩토링 | ✅ 완료 (AdminContentPage, RoutinePage 분리) |
| 병원 웹사이트 리뉴얼 | ✅ Phase 7 완료 |
| AI 식단 분석 | ✅ 동작 중 (Gemini 2.5 Flash) |
| AI 체형 분석 | ⚠️ MOCK (랜덤 데이터) |
| RAG 챗봇 | 🔜 DEFERRED |
| 배포 | Railway 설정 있음 (v4 + ai-server) |

## 핵심 결정사항 기록

### 아키텍처
- **v4 앱**: React 19 + TS + Vite + Zustand + Supabase (로그인 필요)
- **웹사이트**: 같은 v4 앱 내 `/website` 라우트 (로그인 불필요, 공개)
- **AI 서버**: Express + Gemini, 포트 3001, 별도 프로세스
- **DB 인증**: 레거시 평문 비밀번호 (users 테이블 email + password)

### 웹사이트 설계 (Phase 7)
- 원본 사이트: https://www.yssaebomq.com/ (Wix 기반)
- 목적: 전환율(카카오톡 문의) 극대화
- 디자인: 모바일 퍼스트, 브랜드 컬러 #0F6E56, max-w-5xl
- 배너 데이터: localStorage (Supabase 테이블 없이 경량화)
- v4 앱 모듈 재사용: CaseDetail, GrowthChart, MeasurementTable, contentService, exercises data

### 관리자 접근
- 앱 어드민: `admin@187growth.com` / `admin187!` → `/admin/*`
- 웹사이트 배너 관리: PIN `8054` → `/website/admin/banners`

## 코딩 컨벤션 (빠른 참조)
- 컴포넌트 200줄 이하 (최대 350)
- UI 텍스트 전부 한국어
- Tailwind만 사용 (CSS 파일 없음)
- `@/` path alias
- feature 컴포넌트는 named export, 페이지는 default export
- Supabase 쿼리는 services/ 파일에
- console.* 금지 → logger 사용

## 최근 작업 히스토리

### 2026-03-24 세션
1. **리팩토링 완료**
   - AdminContentPage (479줄) → AdminRecipeTab + AdminGuideTab + AdminCaseTab + AdminContentShared
   - RoutinePage (402줄) → SleepCard + MealCard + ExerciseCard + SupplementCard
   - GrowthPage dead code 제거
   - fetchMealsByRoutine 중복 제거

2. **병원 웹사이트 리뉴얼 (Phase 7)**
   - 랜딩페이지 구축: 히어로 → 통계 → 예상키측정 → 프로그램 → 가이드 → 레시피 → 운동 → 사례
   - 원본 사이트에서 7개 프로그램 콘텐츠 + 이미지 크롤링
   - WebsiteSlider: 데스크톱 3장, 모바일 1장 슬라이딩 배너
   - 병원소개 모달 (원장 소개 + 시설 사진)
   - 진료시간/병원위치 플로팅 버튼 + 모달
   - 프로그램 상세 페이지 (이미지 + 유튜브 비디오 + 대상 아동)
   - 치료사례 클릭 → CaseDetailModal (성장차트 + 측정기록 테이블)
   - 롤링 히어로 배너 (4슬라이드, 5초 자동, 페이드 전환)
   - 배너 관리자 페이지 (PIN 8054, 이미지 업로드, localStorage)

## 남은 작업
- [ ] AI 체형 분석 실제 Gemini 연동 (현재 mock)
- [ ] RAG 챗봇 구현
- [ ] 웹사이트 배포 (현재 localhost만)
- [ ] list5 (성장 체형 교정운동), list6 (곧은 발육 케어) 콘텐츠 보강 (Wix 동적 로딩으로 크롤링 실패)
- [ ] SEO 메타 태그 최적화
- [ ] 웹사이트 성능 최적화 (이미지 lazy loading 등)

## 사용자 선호사항
- 한국어로 소통
- 커밋 후 바로 push 선호
- 디자인은 실제 구현 + 브라우저 확인 선호 (Figma/Pencil 보다)
- 기존 코드 재사용 적극 권장
- 병원 관련 UI는 신뢰감 있는 톤 (#0F6E56 다크 그린)
