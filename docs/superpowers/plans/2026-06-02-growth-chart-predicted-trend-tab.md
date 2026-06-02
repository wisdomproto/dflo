# 성장 그래프 "예측키 추세" 탭 구현 계획

> **Status: ✅ 완료 (2026-06-02)** — admin 환자상세 + 환자앱(RecordsPage treatment 뷰) 적용. X축은 BA 측정 순번이 아니라 **실제 측정 날짜(YY.MM.DD)** 로 구현(사용자 요구로 변경). 첫상담 덱은 추후.

> **For agentic workers:** 이 프로젝트는 컴포넌트 단위 테스트 인프라가 없다(vitest/jest 미설정). 따라서 TDD 대신 **각 단계 후 `npx tsc --noEmit`** 로 타입 안전성을 확인하고, 시각 검증은 사용자가 직접 한다(메모리 `preview_verification_preference`). Steps use `- [ ]` for tracking.

**Goal:** admin 환자 상세의 성장 그래프 영역에 탭 2개를 두어, 기존 "만나이 X축 백분위 차트"(탭1)와 새 "예측키 추세"(탭2)를 전환한다. 새 뷰는 예측키 라인 한 줄 + X축 아래 회차/만나이/뼈나이/Δ(뼈−만) 표기.

**Architecture:** `AdminPatientGrowthChart`(기존)는 그대로 두어 환자앱 simplified 모드에 영향이 없게 한다. `AdminPatientDetailPage`의 성장그래프 섹션에 탭 state + 버튼을 추가하고, 탭에 따라 `AdminPatientGrowthChart`(탭1) 또는 신규 `PredictedHeightTrend`(탭2)를 렌더한다. 실제 진료 회차는 `visits`(날짜순 1-based) 순번으로 매긴다. 검증된 throwaway 프로토타입(`GrowthLabPage` + `/admin/growth-lab` 라우트)은 제거한다.

**Tech Stack:** React 19, TypeScript, Chart.js + react-chartjs-2, Tailwind. 검증 = `tsc`.

**Design source:** throwaway 프로토타입 `GrowthLabPage`의 `Proto2DualAxis`(예측키 단일축 + HTML 행). 그대로 정식 컴포넌트로 이식하되, X축 회차를 BA 측정 순번(1~9)이 아니라 **실제 진료 회차(visits 순번)**로 교체.

---

## File Structure

- **Create** `v4/src/features/hospital/components/PredictedHeightTrend.tsx`
  - 예측키 추세 뷰. props: `{ child, measurements, visits }`.
  - 내부: visits 날짜순 → `visit_id → 진료회차번호` 맵 / BA+키 있는 measurement만 추출해 `{ visitNo, ca, ba, height, pah }` 계산 / Chart.js Line(예측키 단일축, X 라벨 숨김) + 아래 HTML grid(회차·만·뼈·Δ, Δ 색상).
  - 예측키 = `heightAtSamePercentile(height, ba, 18, gender, nationality)` (KR/CN LMS, 기존 헬퍼 재사용).
- **Modify** `v4/src/pages/admin/AdminPatientDetailPage.tsx`
  - `chartTab` state 추가, 성장그래프 헤더(451-464)에 탭 버튼 2개, 차트 div(465-479)에서 탭별 조건 렌더. `PredictedHeightTrend` import + `visits` 전달.
- **Delete** `v4/src/pages/admin/GrowthLabPage.tsx` (throwaway)
- **Modify** `v4/src/app/router.tsx`
  - `GrowthLabPage` lazy import(65) + `/admin/growth-lab/:childId` 라우트 블록 제거.

---

## Task 1: PredictedHeightTrend 컴포넌트

**Files:**
- Create: `v4/src/features/hospital/components/PredictedHeightTrend.tsx`

- [ ] **Step 1:** `Proto2DualAxis` + `buildProjection` 불필요한 부분(예측 곡선용 buildProjection은 이 뷰에 불필요)을 빼고, 컴포넌트 작성. props `{ child: Child; measurements: HospitalMeasurement[]; visits: Visit[] }`.
  - import: `heightAtSamePercentile`, `Nationality` from bone-age/lib/growthStandard; `calculateAgeAtDate` from shared/utils/age; Chart.js 등록(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler); `Child`/`HospitalMeasurement`/`Visit` from shared/types.
  - 진료 회차: `const order = [...visits].sort(byDate); const visitNo = new Map(order.map((v,i)=>[v.id, i+1]))`.
  - rows: measurements에서 `bone_age != null && height > 0` 필터 → `{ visitNo: visitNo.get(m.visit_id) ?? idx+1, ca, ba, height, pah }`, 날짜순.
  - 차트: 예측키 라인 단일 Y축('예측키 (cm)'), X ticks 숨김, `y.afterFit` width 고정.
  - HTML grid: `repeat(rows.length,1fr)`, paddingLeft = Y축폭. 각 셀: `{visitNo}회`(굵게) / `만 N.N세`(연회색) / `뼈 N.N세`(주황) / `Δ`(뼈−만, +면 빨강/−면 초록).
- [ ] **Step 2:** `npx tsc --noEmit` → PASS 확인.

## Task 2: AdminPatientDetailPage 탭 통합

**Files:**
- Modify: `v4/src/pages/admin/AdminPatientDetailPage.tsx`

- [ ] **Step 1:** import 추가 `import { PredictedHeightTrend } from '@/features/hospital/components/PredictedHeightTrend';`
- [ ] **Step 2:** state 추가 `const [chartTab, setChartTab] = useState<'curve' | 'trend'>('curve');`
- [ ] **Step 3:** 성장그래프 헤더(451-464)의 "성장 그래프" 라벨 자리에 탭 버튼 2개(`성장 곡선` / `예측키 추세`) — 활성 탭 강조, 접기 버튼(›)은 우측 유지.
- [ ] **Step 4:** 차트 div(465-479)에서 `chartTab === 'curve' ? <AdminPatientGrowthChart .../> : <PredictedHeightTrend child={child} measurements={measurements} visits={visits} />`.
- [ ] **Step 5:** `npx tsc --noEmit` → PASS.

## Task 3: throwaway 제거

**Files:**
- Delete: `v4/src/pages/admin/GrowthLabPage.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1:** router.tsx에서 `GrowthLabPage` lazy import(65) 및 `/admin/growth-lab/:childId` 라우트 블록(425-433) 제거.
- [ ] **Step 2:** `GrowthLabPage.tsx` 삭제.
- [ ] **Step 3:** `npx tsc --noEmit` → PASS (GrowthLabPage 참조 잔존 없음 확인).

## Task 4: 최종 검증

- [ ] **Step 1:** `npx tsc --noEmit` 전체 PASS.
- [ ] **Step 2:** 사용자에게 하드 리로드 후 admin 환자 상세에서 탭 전환 확인 요청 (회차=실제 진료 회차, Δ 색상).

---

## Notes (구현 결과 반영)
- 환자앱 RecordsPage **treatment 뷰 완료** — 모바일 pill 탭. consultation 뷰는 BA 회차 적어 제외, 첫상담 덱은 추후.
- X축은 "회차 순번"이 아니라 **실제 측정 날짜(YY.MM.DD)** 로 구현 (사용자 요구로 변경). 날짜는 measurement 에 있어 `visits` prop 불필요 → 제거.
- `AdminPatientGrowthChart` 에 `defaultHidePrediction` prop 추가(성장 곡선 탭 예측키 baProj 기본 off) — `visible.baProj` 직접 false 면 simplified 도 꺼지므로 prop 방식. simplified/첫상담은 prop 안 줘 영향 0.
- baOnly(뼈나이 측정만) 기본 ON, `Y_MAX` 185→190.
