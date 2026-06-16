# 릴 에디터 라벨 편집 강화 — 설계

날짜: 2026-06-16 · 상태: 승인됨(설계) → 구현 계획 대기

## 목적

릴 에디터 프리뷰의 인포그래픽 인서트 라벨(`insertLabels`) 편집을 강화한다:
1. **클릭 선택 + 하이라이트** — 프리뷰에서 라벨을 클릭하면 선택·강조(현재는 선택 개념 없음).
2. **5% 정사각 격자 자석 이동** — 마우스 드래그 라이브 스냅 + 키보드 화살표, 둘 다 0.05(=54px) 단위.
3. **스타일 컨트롤** — 폰트·볼드·글자색·외각색·그림자 편집(현재 외각·그림자·폰트 미지원, 그림자/폰트는 하드코딩).

## 범위

- 대상: **insertLabel만**. 스티커는 현행 유지.
- 릴 에디터(`reelEditor/*`) + Remotion `PresenterShort` InsertPanel 렌더.
- 선택/하이라이트는 **에디터 전용 DOM**(렌더 출력에 안 나감). 스타일 필드(폰트/외각/그림자)는 렌더에도 반영.

## 좌표계 (기존)

- 라벨 `x`/`y` = **인서트 패널 존(300~1380px, 정사각 1080×1080) 내 분수 0..1**. 전체 프레임이 아님.
- `pxToPanelFrac`(`utils/reelEditor.ts`)가 포인터 px → 패널 분수. `CanvasDragLayer`가 `getBoundingClientRect()`로 레이어 픽셀 크기 측정.
- 패널이 정사각이라 x·y 모두 0.05 = 54px → **화면상 정사각 격자**.

## A. 클릭 선택 + 5% 자석 이동

### 선택 모델
- `ReelEditorPanel`에 `selectedLabelIdx: number | null` state 신규.
- **라벨 pointerdown 시 즉시 선택**(드래그도 armed) → 순수 클릭=선택만, 드래그=선택+이동.
- 하이라이트: `CanvasDragLayer`가 선택 라벨에 **굵은 실선 아웃라인**(드래그 중 점선과 구분). `ChunkInspector`의 해당 라벨 카드도 강조(테두리/배경). **인스펙터 카드 클릭으로도 선택**(양방향).
- `Esc` = 선택 해제. 청크·언어 변경 시 `selectedLabelIdx = null`. 라벨 수 변하면 clamp/해제.

### 5% 자석 이동
- 순수 헬퍼(`utils/reelEditor.ts`, 테스트 대상):
  - `snapFrac(v, step = 0.05)` = `clamp01(Math.round(v / step) * step)`.
  - `nudgeLabel(label, dx, dy, step = 0.05)` = `{ ...label, x: clamp01(label.x + dx*step), y: clamp01(label.y + dy*step) }`.
- **마우스 드래그**: `CanvasDragLayer`가 `pxToPanelFrac` 결과를 `snapFrac`으로 라이브 스냅 → 0.05 격자에 자석처럼. 놓을 때 1회 커밋(기존 `onCommit` → `patchSelChunk` → undo 1스냅샷).
- **키보드**: `ReelEditorPanel`에 sibling keydown effect — 라벨 선택 + 입력칸(INPUT/TEXTAREA/contentEditable) 포커스 아닐 때 **←→↑↓ = `nudgeLabel(±1)`**. 기존 `useUndoableDoc`의 포커스 가드 패턴 재사용. 각 누름 = 1 커밋(undo 20-deep, 연타 시 스냅샷 다수는 v1 허용).

## B. 라벨 스타일 컨트롤 (실용 세트)

### 타입 확장 (`ReelInsertLabel`, v4 `types.ts`)
기존: `x, y, size?, weight?, color?, pill?` + per-lang text. 추가:
- `font?: 'kr' | 'thai' | 'inter' | 'sc' | 'tc'` — 폰트 패밀리 키(기본 'kr').
- `stroke?: string` — 외각(글자 테두리) 색. 없으면 외각 미적용.
- `shadow?: boolean` — 그림자 on/off. 미지정 = 기존 동작.

### 렌더 (`PresenterShort.tsx` InsertPanel)
- fonts.ts에서 `NOTO_SANS_THAI`·`INTER`·`NOTO_SANS_SC`·`NOTO_SANS_TC` 추가 import.
- `FONT_MAP = { kr: NOTO_SANS_KR, thai: NOTO_SANS_THAI, inter: INTER, sc: NOTO_SANS_SC, tc: NOTO_SANS_TC }`.
- 정적 스타일을 순수 `labelBoxStyle(L)` 로 추출(테스트용):
  - `fontFamily: FONT_MAP[L.font ?? 'kr'] ?? NOTO_SANS_KR`
  - `fontWeight: L.weight ?? 800`
  - `color: L.color ?? '#1f2430'`
  - 외각: `L.stroke` 있으면 `WebkitTextStroke: '2px ' + L.stroke` + `paintOrder: 'stroke fill'`(없으면 미포함).
  - 그림자: `(L.shadow ?? !L.pill)` 면 `textShadow: '0 2px 10px rgba(0,0,0,0.18)'`, 아니면 `'none'`.
  - pill: `L.pill` 있으면 `{ background, padding, borderRadius, boxShadow }`(기존 그대로).
- InsertPanel은 `labelBoxStyle(L)`에 애니메이션(위치 `left/top`·`opacity`·`transform scale`)을 합쳐 렌더.

### 인스펙터 컨트롤 (`ChunkInspector.tsx`, 선택 라벨 카드)
- **폰트**: select(한국어/태국어/Inter/간체/번체) → `font`.
- **볼드**: select(보통 400 / 굵게 700 / 매우굵게 900) → `weight`.
- **글자색**: color 피커 → `color`.
- **외각색**: color 피커 + "없음" 클리어 → `stroke`(빈 값=undefined).
- **그림자**: 체크박스 → `shadow`.
- 기존 `pill`/`size`/`x`/`y`/텍스트 컨트롤 유지.

## 무회귀

- `shadow` 미지정 = `!L.pill`(pill 없으면 그림자 on) = 현재 동작 그대로. 기존 라벨 모양 불변.
- `stroke`/`font` 미지정 = 외각 없음 / kr 폰트 = 현재 동작.
- 선택·하이라이트는 에디터 DOM 전용 → 렌더 산출 무영향.
- 스티커·다른 인스펙터 컨트롤 무변경.

## 데이터 흐름

```
프리뷰 라벨 pointerdown → selectedLabelIdx 설정(캔버스+인스펙터 하이라이트)
  ├─ 드래그 → pxToPanelFrac → snapFrac(0.05) → onCommit(labels) → patchSelChunk → undo
  ├─ 화살표 → nudgeLabel(±0.05) → patchSelChunk → undo
  └─ 인스펙터 스타일 변경(font/weight/color/stroke/shadow) → patchLabel → patchSelChunk → undo
PresenterShort InsertPanel: labelBoxStyle(L) + 애니메이션 → 캔버스/렌더 동일 표시
```

## 테스트

- `snapFrac`: 0.05 반올림, clamp 0..1, 모서리(0/1)에서 더 안 넘어감.
- `nudgeLabel`: ±step 적용 + clamp, 모서리에서 정지.
- `labelBoxStyle`: 폰트맵 분기(기본 kr·각 키), `stroke` 있을 때 WebkitTextStroke+paintOrder, `shadow` 기본값(undefined+pill없음=on, undefined+pill=off, 명시 true/false), pill 분기.
- 인터랙션(클릭 선택·드래그 라이브 스냅·화살표 nudge·하이라이트)·실제 폰트/외각/그림자 모양 = 로컬 프리뷰 수동 검증(인서트 이미지 있는 환경).

## 열린 항목(구현 중 확정)

- 외각 굵기 고정값(기본 2px) 적정성 — 시각 보고 미세조정.
- 선택 아웃라인 색/굵기(드래그 점선과 구분되는 값).
- 화살표 연타 시 undo 스냅샷 coalesce 여부(v1은 press당 1, 필요 시 후속).
