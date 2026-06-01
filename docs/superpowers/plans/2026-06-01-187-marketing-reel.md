# 187 마케팅 릴스 (KR) 구현 계획

> **For agentic workers:** Remotion 영상 — 전통 TDD 부적합. 검증 = `npx remotion still`로 프레임 PNG 추출 후 육안 + `npx tsc --noEmit`. 각 씬 완성마다 still 확인. 체크박스(`- [ ]`)로 추적.

**Goal:** 스토리보드(`docs/superpowers/specs/2026-05-31-187-marketing-reel-storyboard.md`) 8씬을 Remotion 컴포지션 `HeightReelsKRMarketing`(≈990f / ~33s, 9:16)으로 구현.

**Architecture:** 기존 `HeightReelsKRPromo` 패턴 재사용 — `TransitionSeries` + fade 15f. 신규 씬 3개(Fear/Vs/Celeb) + 개조 3개(Clinic/Cases/Result) + 재사용 3개(Hook/Input/Cta). 카피는 `lib/texts.ts` 단일 소스. 기존 컴포지션은 **건드리지 않고 보존**.

**Tech Stack:** Remotion 4, TypeScript, `lib/texts.ts`(locale), `lib/fonts.ts`, `lib/constants.ts`.

---

## 파일 구조

| 파일 | 작업 | 책임 |
|------|------|------|
| `remotion/src/lib/texts.ts` | 수정 | 신규 카피 키 + statsCount2 95 (ko/th) |
| `remotion/src/scenes/FearIntroScene.tsx` | 생성 | S1 작은 vs 큰 대비 + "우리 아이 키 성장 / 골든타임" |
| `remotion/src/scenes/VsScene.tsx` | 생성 | S3 좌우 분할 + 6아이콘 순차 팝업 |
| `remotion/src/scenes/CelebScene.tsx` | 생성 | S4 "외국 셀럽·아역배우가 찾는 곳" |
| `remotion/src/scenes/ClinicScene.tsx` | 수정 | S2 학회 + 포지셔닝(clinicPos) + 95% 통합 |
| `remotion/src/scenes/CasesScene.tsx` | 수정 | S5 casesCelebLine 강 카피 |
| `remotion/src/scenes/ResultScene.tsx` | 수정 | S7 하단 demoFreeSite 멘트 |
| `remotion/src/HeightReelsKRMarketing.tsx` | 생성 | 8씬 합성 컴포지션 |
| `remotion/src/Root.tsx` | 수정 | 컴포지션 등록 (durationInFrames 990) |
| `remotion/public/images/fear-1.jpg` | (자산) | S1 AI 이미지 — 없으면 CSS 막대 플레이스홀더 |

---

## Task 1: texts.ts 카피
**Files:** Modify `remotion/src/lib/texts.ts`
- [x] `LocaleTexts` 인터페이스에 신규 키 추가 (fearGolden, clinicPos, clinicLecture, celebLine, celebSub, vsLeftTitle/Desc, vsRightTitle, vsItems[], vsPunch, casesCelebLine, demoMeasureLine, demoFreeSite, ctaGoldenTime)
- [x] ko/th 둘 다 값 채움 (th는 stub 번역 — 추후 검수)
- [x] statsCount2: 90 → 95 (ko + th)
- [x] 검증: `npx tsc --noEmit` PASS

## Task 2: VsScene (신규, 자산 불필요)
**Files:** Create `remotion/src/scenes/VsScene.tsx`
- [x] 좌우 분할 AbsoluteFill. 좌(회색) vsLeftTitle/Desc + 주사기. 우(보라) vsRightTitle + 6아이콘(vsItems) `spring` 순차 팝업(stagger). 중앙 VS 배지. 하단 vsPunch.
- [x] Root에 임시 단독 등록 후 `npx remotion still HeightReelsKRMarketing out/vs.png --frame=N` — 또는 임시 컴포지션으로 확인
- [x] 검증: still PNG 육안 (좌우 분할·6아이콘·VS)

## Task 3: CelebScene (신규)
**Files:** Create `remotion/src/scenes/CelebScene.tsx`
- [x] 보라+골드 배경. 별 모티프 + celebLine(큰 텍스트, 골드 강조) + celebSub. fade/scale 인.
- [x] 검증: still PNG 육안

## Task 4: FearIntroScene (신규)
**Files:** Create `remotion/src/scenes/FearIntroScene.tsx`
- [x] `public/images/fear-1.jpg` 있으면 Img cover, 없으면 작은 vs 큰 막대 CSS 플레이스홀더. fearGolden 자막(골든타임 골드 강조).
- [x] 검증: still PNG 육안

## Task 5: ClinicScene 개조 (S2 통합)
**Files:** Modify `remotion/src/scenes/ClinicScene.tsx`
- [x] 기존 원장+stats+병원 유지. clinicLecture(학회 + 🇲🇾🇹🇭) 추가, 하단 clinicName→clinicPos 헤드라인. statsCount2 95 자동 반영.
- [x] 검증: still PNG 육안 (`HeightReelsKRPromo`도 깨지지 않는지 — 공유 컴포넌트)

## Task 6: CasesScene 개조 (S5)
**Files:** Modify `remotion/src/scenes/CasesScene.tsx`
- [x] 자막을 `casesCelebLine`로 (기존 casesActorsLine 유지 옵션 분기 or 교체). 다중 placeholder.
- [x] 검증: still PNG 육안 (기존 Promo 영향 확인)

## Task 7: ResultScene 개조 (S7)
**Files:** Modify `remotion/src/scenes/ResultScene.tsx`
- [x] 하단에 demoFreeSite("홈페이지에서 무료로 측정") 자막 밴드 추가 (기존 결과 차트 유지).
- [x] 검증: still PNG 육안 (기존 Promo/Demo 릴 영향 확인)

## Task 8: 합성 + Root 등록
**Files:** Create `remotion/src/HeightReelsKRMarketing.tsx`, Modify `remotion/src/Root.tsx`
- [x] `setLocale("ko")` + TransitionSeries 8씬: Fear(120)→Clinic(180)→Vs(180)→Celeb(90)→Cases(120)→Hook(120,hideCta)→Input+Result(...)→Cta(135). fade 15f.
  - 주의: S6 측정데모 = Hook(짧게)+Input, S7 = Result. 시퀀스 길이 스펙 §3 참조.
- [x] Root.tsx에 `<Composition id="HeightReelsKRMarketing" durationInFrames={990} fps={30} width={1080} height={1920} />`
- [x] 검증: `npx tsc --noEmit` PASS + `npx remotion still` 여러 프레임

## Task 9: 렌더 + 최종 검증
- [x] `npx remotion render HeightReelsKRMarketing out/reels-kr-marketing.mp4`
- [x] 대표 프레임 still 육안 (8씬 전부)
- [x] 기존 `HeightReelsKRPromo`/`THPromo`/데모 릴 still로 회귀 확인 (공유 씬 개조 영향)
- [x] 커밋

---

## 검증 명령
```bash
cd remotion
npx tsc --noEmit
npx remotion still HeightReelsKRMarketing out/m-<n>.png --frame=<f>
npx remotion render HeightReelsKRMarketing out/reels-kr-marketing.mp4
```

## 회귀 주의 (공유 컴포넌트)
ClinicScene/CasesScene/ResultScene은 기존 `HeightReelsKRPromo`·`HeightReelsTHPromo`·`HeightReels`(데모)도 사용. 개조 시 신규 키는 **추가**하고 기존 키(casesActorsLine 등)는 보존 → 기존 릴 불변. 개조 후 기존 컴포지션 still로 확인.
