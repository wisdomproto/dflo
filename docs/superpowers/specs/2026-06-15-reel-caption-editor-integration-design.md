# 2트랙 자막 — 편집기·워커 파이프라인 통합 설계

날짜: 2026-06-15 · 상태: 승인됨(설계) → 구현 계획 대기

선행 스펙: `docs/superpowers/specs/2026-06-15-reel-caption-two-track-design.md`(standalone 2트랙 렌더러)

## 목적

방금 만든 2트랙 자막(강조 상단 + 카라오케 하단)은 **standalone 경로(`npx remotion render`, per-slug `index.tsx`가 `captions-<lang>.json`을 prop으로 전달)에만** 연결돼 있다. 실제 제품의 두 렌더 경로 — **로컬 편집기 프리뷰**(`PresenterBridge` → Remotion Player)와 **워커 렌더**(`reel-worker.mjs` → `PresenterGeneric` → mp4) — 는 DB `reel_script`/`reel_runtime`를 `inputProps`로 받아 그리는데 **`captions`를 안 넘겨서 레거시 단일 자막만 표시**한다.

이 통합은 2트랙을 **워커 렌더 산출물(올리는 mp4)과 로컬 프리뷰 양쪽에** 흐르게 한다.

## 범위

- **대상(스코프 A)**: 워커 렌더 + 로컬-dev 프리뷰가 2트랙이 되게.
- **제외**: 배포 v4 브라우저 프리뷰(`@reel` alias가 Railway 빌드에선 `src/reel-stubs` 스텁으로 폴백 — remotion/src 부재). 배포 프리뷰는 스텁 안내문 그대로 둔다. GPU 립싱크도 별개.
- 편집은 배포 스튜디오에서, 프리뷰·렌더는 로컬이라는 **현재 아키텍처를 그대로 따른다**.

## 핵심 전략: 프리컴퓨트 prop → 컴포지션 내부 계산

captions를 미리 만들어 워커·프리뷰 `inputProps`에 끼워넣는 대신, **`PresenterShort`가 렌더 시점에 내부 계산**한다 — `script.chunks`의 나레이션 텍스트 + `timing`(durFrames)에서 구절분할.

근거: 워커(`PresenterGeneric`)와 프리뷰(`PresenterBridge`)는 **이미 `script`+`timing`+`lang`을 `PresenterShort`에 넘긴다**. 내부 계산이면 두 경로의 **플러밍 변경이 0** — 둘 다 자동으로 2트랙이 된다. (`chunks = timing.map(t => ({...t, ...scriptChunk}))` 병합으로 `durFrames`와 나레이션이 한 객체에 있음.)

## 단일 소스: 순수함수 위치 이동

`remotion/scripts/lib/captions.mjs` → **`remotion/src/lib/captions.mjs`**.
- 이래야 컴포지션(`PresenterShort`, remotion/src)이 상대경로로 import 가능.
- v4도 `@reel` alias(= remotion/src)로 도달 가능(이번 통합에선 v4가 직접 import할 필요는 없음 — 내부계산이라 — 단 단일 소스 위치로 정당).
- JS(.mjs) 유지 → `node --test` 그대로, JS/TS 드리프트 없음.
- 신규 래퍼 `buildCaptions(chunks, lang)`: 청크 배열 → `{ [id]: distributeFrames(splitIntoPhrases(chunk[lang], lang), chunk.durFrames) }`. 나레이션 없는 청크는 빈 배열.

테스트 파일은 tsc(src 타입체크)가 `.mjs`를 건드리지 않도록 위치 조정(예: `remotion/scripts/lib/captions.test.mjs`가 `../../src/lib/captions.mjs`를 import, 또는 tsconfig exclude). 구현 계획에서 tsc green 유지되는 위치 확정.

## 활성화: 릴스별 플래그

- `reel_script.script`에 **`twoTrack?: boolean`** 필드 추가(v4 `ReelScriptDoc.script` 타입에 명시; `Record<string, unknown>`이라 DB 비파괴적).
- `PresenterShort`: `const twoTrack = !!captions || !!(script as any).twoTrack;`
- 캡션 소스 우선순위:
  - 명시 `captions` prop 있으면 그것(standalone 수동 오버라이드, 하위호환).
  - 없고 `twoTrack`이면 `buildCaptions(chunks, lang)`(내부 자동, `useMemo`).
- 강조 소스: 기존대로 `c["emph_"+lang] ?? c["cap_"+lang] ?? []`, 인서트 청크 skip.
- **스튜디오 ON/OFF 토글**: 릴 에디터에 `script.twoTrack`을 켜고 끄는 토글 추가(저장은 기존 `reel_script` 저장 경로 재사용). 위치는 인스펙터/헤더 영역(구현 계획에서 정확 컴포넌트 확정).
- **신규 기본 ON**: `push-reel-script.mjs` 온보딩이 reel_script 생성 시 `script.twoTrack = true`.
- **기존 #1~#33은 플래그 없음 → OFF**(선택 소급) — 켜고 싶은 릴스만 토글.

## 변경 지점

| 파일 | 변경 |
|---|---|
| `remotion/src/lib/captions.mjs` (이동 + 확장) | `splitIntoPhrases`/`distributeFrames` + `buildCaptions(chunks, lang)` |
| `remotion/scripts/lib/captions.test.mjs` (또는 이동) | `buildCaptions` 테스트 추가, import 경로 갱신 |
| `remotion/src/shorts/_shared/PresenterShort.tsx` | `../../lib/captions.mjs` import, `twoTrack = !!captions \|\| !!script.twoTrack`, `caps = captions ?? (twoTrack ? buildCaptions(chunks, lang) : undefined)` (useMemo), 렌더 분기에서 `caps` 사용 |
| `remotion/scripts/reel-worker.mjs` · `PresenterGeneric.tsx` · v4 `PresenterBridge.tsx` | **무변경** (script+timing 이미 전달) |
| v4 `types.ts` `ReelScriptDoc` | `script.twoTrack?: boolean` 추가 |
| 릴 에디터 컴포넌트(인스펙터/헤더) | twoTrack ON/OFF 토글 |
| `remotion/scripts/push-reel-script.mjs` | 신규 온보딩 시 `twoTrack: true` 기본 |
| `remotion/src/shorts/adhd약키성장/index.tsx` | captions import 제거, `script.json`에 `twoTrack:true` |
| **폐기**: `remotion/scripts/gen-captions.mjs`, `remotion/src/shorts/adhd약키성장/captions-ko.json` | 내부 계산이 대체(단일 메커니즘) |

## 무회귀 / 마이그레이션

- `script.twoTrack` 없는 모든 기존 릴스 → 단일 자막 그대로(워커·프리뷰·standalone 전부).
- 배포 v4 → stub 프리뷰 그대로(scope A, 손 안 댐).
- standalone `captions` prop 경로 → 여전히 동작(폴백 우선순위 최상).
- gen-captions/captions-ko.json 폐기는 standalone 자동계산으로 대체되므로 adhd 출력 동일(같은 분할 로직).

## 데이터 흐름 (통합 후)

```
스튜디오 편집 → reel_script(script.twoTrack=true, chunks[lang]/cap_/hl_) → DB
   ├─ 로컬 프리뷰: PresenterBridge → PresenterShort(내부 buildCaptions) → 2트랙 Player
   └─ 워커 렌더: reel-worker → PresenterGeneric → PresenterShort(내부 buildCaptions) → 2트랙 mp4 → R2
```
- 카라오케 자막은 `timing`(durFrames) 필요 → `reel_runtime.timing[lang]`(이전 TTS/full 잡 산출). 프리뷰·렌더 모두 timing이 이미 전제(둘 다 timing 없이는 렌더 불가)라 추가 의존성 없음.

## 테스트

- `captions.mjs` 단위테스트(이동) + `buildCaptions` 추가: 청크맵 → 각 청크 구절 배열, durFrames 합 = 청크 durFrames, 나레이션 없는 청크 = 빈 배열.
- tsc: `cd remotion; npx tsc --noEmit` exit 0 / `cd v4; npx tsc -b --noEmit` exit 0(릴 에디터 토글·타입 변경).
- 로컬 프리뷰: adhd를 에디터에서 열어(또는 REEL_STUBS 미설정 dev) 카라오케/강조 표시 확인.
- 워커 렌더(립싱크 영상 존재 시): adhd ko `render` 잡 → 산출 mp4 스틸로 2트랙 확인. 영상 없으면 standalone 스틸(stand-in 영상)으로 컴포지션 2트랙 검증.

## 열린 항목(구현 중 확정)

- 스튜디오 토글의 정확한 컴포넌트·위치(릴 에디터 인스펙터/헤더).
- 테스트 파일 최종 위치(tsc green 유지).
- 세이프존 픽셀·폰트·구절 maxChars 튜닝은 **이 통합 완료 후 후속**(선행 스펙의 열린 항목) — 통합되면 에디터 프리뷰로 튜닝 검증.
