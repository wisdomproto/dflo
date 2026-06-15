# 2트랙 자막 편집기·워커 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2트랙 자막(강조 상단 + 카라오케 하단)을 릴스 워커 렌더·로컬 프리뷰 양쪽에 흐르게 한다 — captions를 prop으로 끼우는 대신 `PresenterShort`가 내부에서 계산하고, 릴스별 `script.twoTrack` 플래그로 켠다.

**Architecture:** 순수 분할함수를 `remotion/src/lib/captions.mjs`로 옮기고 `buildCaptions(chunks, lang)` 래퍼를 추가한다. `PresenterShort`는 `script.twoTrack`(또는 명시 `captions` prop)이 켜지면 `buildCaptions`로 자막을 내부 계산한다. 워커(`PresenterGeneric`)·프리뷰(`PresenterBridge`)는 이미 `script`+`timing`을 넘기므로 플러밍 변경이 없다. 스튜디오 토글이 `script.twoTrack`을 기록하고, 온보딩은 기본 ON.

**Tech Stack:** Remotion 4 + React + TypeScript, Node `node --test`(plain JS), Supabase(reel_script JSONB).

**스펙:** `docs/superpowers/specs/2026-06-15-reel-caption-editor-integration-design.md`
**선행:** `docs/superpowers/specs/2026-06-15-reel-caption-two-track-design.md`

---

## File Structure

- Move `remotion/scripts/lib/captions.mjs` → `remotion/src/lib/captions.mjs` (+ `buildCaptions`), add `remotion/src/lib/captions.d.mts`(타입), move test → `remotion/src/lib/captions.test.mjs`. 컴포지션(src)이 import 가능해지고, 명시적 `.mjs` 확장자 + 사이드카 `.d.mts`로 tsc·webpack·vite·node 전부 안전.
- Modify `remotion/src/shorts/_shared/PresenterShort.tsx` — `buildCaptions` import, `Script.twoTrack`, 내부 caps 계산, 카라오케가 caps 사용.
- Delete `remotion/scripts/gen-captions.mjs`, `remotion/src/shorts/adhd약키성장/captions-ko.json` — 내부계산이 대체.
- Modify `remotion/src/shorts/adhd약키성장/{index.tsx,script.json}` — captions prop 제거, `twoTrack:true`.
- Modify `v4/src/features/marketing/types.ts` — `ReelScriptDoc.script.twoTrack`.
- Modify `remotion/scripts/lib/reelWorkerLib.mjs` — 온보딩 기본 `twoTrack:true`.
- Modify `v4/src/features/marketing/components/content/reelEditor/HeaderCtaForm.tsx` — twoTrack 토글.
- Modify `CLAUDE.md` — 통합 한 줄.

---

### Task 1: 순수 lib 이동 + buildCaptions (TDD)

**Files:**
- Create: `remotion/src/lib/captions.mjs`
- Create: `remotion/src/lib/captions.d.mts`
- Create: `remotion/src/lib/captions.test.mjs`
- Delete: `remotion/scripts/lib/captions.mjs`, `remotion/scripts/lib/captions.test.mjs`

- [ ] **Step 1: Write the test (incl. new buildCaptions case)**

Create `remotion/src/lib/captions.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitIntoPhrases, distributeFrames, buildCaptions } from "./captions.mjs";

test("한국어: 공백 단어를 글자수 예산 내로 묶는다", () => {
  const p = splitIntoPhrases("에이디에이치디 약을 먹으면 키가 안 큰다 오늘 정리해 드리겠습니다", "ko", { maxChars: 12 });
  assert.ok(p.length >= 2);
  for (const ph of p) assert.equal(ph, ph.trim());
});

test("태국어: 구절-공백에서 끊고 단어 내부는 안 쪼갠다", () => {
  const p = splitIntoPhrases("ยา ADHD ทำให้ลูกตัวไม่สูง วันนี้เคลียร์ให้ชัด", "th", { maxChars: 14 });
  assert.ok(p.length >= 2);
  for (const ph of p) assert.equal(ph, ph.trim());
});

test("중국어(공백 없음): 글자수 예산으로 쪼갠다", () => {
  const p = splitIntoPhrases("吃ADHD药孩子就长不高今天讲清楚这点很重要", "cn", { maxChars: 6 });
  assert.ok(p.length >= 2);
  for (const ph of p) assert.ok(Array.from(ph).length <= 6);
});

test("distributeFrames: durFrames 합이 정확히 일치", () => {
  const segs = distributeFrames(["가나다", "라마바사", "아자"], 100);
  assert.equal(segs.reduce((a, s) => a + s.durFrames, 0), 100);
  assert.equal(segs[0].fromFrame, 0);
  assert.equal(segs[1].fromFrame, segs[0].durFrames);
});

test("단일 구절은 전체 길이를 차지", () => {
  assert.deepEqual(distributeFrames(["hello"], 60), [{ text: "hello", fromFrame: 0, durFrames: 60 }]);
});

test("빈 입력은 빈 배열", () => {
  assert.deepEqual(splitIntoPhrases("", "ko"), []);
  assert.deepEqual(distributeFrames([], 100), []);
});

test("buildCaptions: 청크별 구절 + durFrames 합 일치 + 빈 나레이션은 빈 배열", () => {
  const chunks = [
    { id: "c1", durFrames: 100, ko: "가나다 라마바 사아자 차카타 파하" },
    { id: "c2", durFrames: 60, ko: "" },
  ];
  const caps = buildCaptions(chunks, "ko");
  assert.deepEqual(Object.keys(caps), ["c1", "c2"]);
  assert.ok(caps.c1.length >= 1);
  assert.equal(caps.c1.reduce((a, p) => a + p.durFrames, 0), 100);
  assert.deepEqual(caps.c2, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd remotion; node --test src/lib/captions.test.mjs`
Expected: FAIL — `Cannot find module ... src/lib/captions.mjs`.

- [ ] **Step 3: Create the moved + extended lib**

Create `remotion/src/lib/captions.mjs`:

```js
// 청크 나레이션 → 카라오케 자막 구절. 순수 함수(컴포지션 내부계산 공용).
// 한국어/태국어/영어/베트남어 = 공백 토큰화, 중국어(cn/ch) = 글자 토큰화.
const CJK = new Set(["cn", "ch"]);
const SENT_END = /[。！？!?．.…]$/;

function len(s) {
  return Array.from(s).length;
}

// 공백 언어(ko/th/vi/en)는 단어 내부를 쪼개지 않는다 — 단일 단어가 maxChars 를 넘으면
// 그 구절은 예산을 초과해도 통째로 유지(카라오케 관행). cn/ch 는 글자 단위라 항상 예산 내.
export function splitIntoPhrases(text, lang, opts = {}) {
  const maxChars = opts.maxChars ?? (CJK.has(lang) ? 12 : 20);
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const cjk = CJK.has(lang);
  const atoms = cjk ? Array.from(clean) : clean.split(" ");
  const sep = cjk ? "" : " ";
  const phrases = [];
  let cur = "";
  for (const a of atoms) {
    const cand = cur ? cur + sep + a : a;
    if (cur && len(cand) > maxChars) {
      phrases.push(cur);
      cur = a;
    } else {
      cur = cand;
    }
    if (SENT_END.test(a) && cur) {
      phrases.push(cur);
      cur = "";
    }
  }
  if (cur) phrases.push(cur);
  return phrases;
}

// 전제: durFrames >= phrases.length (실제 청크는 99~224프레임, 구절 ~3~10개라 항상 성립).
// 마지막 구절이 나머지를 흡수해 합이 정확히 durFrames 가 된다.
export function distributeFrames(phrases, durFrames) {
  if (!phrases.length) return [];
  const weights = phrases.map((p) => Math.max(1, len(p)));
  const total = weights.reduce((a, b) => a + b, 0);
  const out = [];
  let acc = 0;
  for (let i = 0; i < phrases.length; i++) {
    const d = i === phrases.length - 1
      ? durFrames - acc
      : Math.max(1, Math.floor((weights[i] / total) * durFrames));
    out.push({ text: phrases[i], fromFrame: acc, durFrames: Math.max(1, d) });
    acc += out[i].durFrames;
  }
  return out;
}

// 청크 배열(=timing 병합본, durFrames + 언어별 나레이션 보유) → { [id]: 구절[] }.
// 나레이션 없는 청크는 빈 배열. 컴포지션이 렌더 시점에 호출(워커·프리뷰·standalone 공용).
export function buildCaptions(chunks, lang) {
  const out = {};
  for (const c of chunks) {
    out[c.id] = distributeFrames(splitIntoPhrases(c[lang] ?? "", lang), c.durFrames);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd remotion; node --test src/lib/captions.test.mjs`
Expected: PASS — `tests 7`, `pass 7`, `fail 0`.

- [ ] **Step 5: Create the type sidecar**

Create `remotion/src/lib/captions.d.mts`:

```ts
export function splitIntoPhrases(text: string, lang: string, opts?: { maxChars?: number }): string[];
export function distributeFrames(
  phrases: string[],
  durFrames: number,
): { text: string; fromFrame: number; durFrames: number }[];
export function buildCaptions(
  chunks: Array<{ id: string; durFrames: number } & Record<string, unknown>>,
  lang: string,
): Record<string, { text: string; fromFrame: number; durFrames: number }[]>;
```

- [ ] **Step 6: Delete the old scripts/lib copies**

Run: `cd remotion; git rm scripts/lib/captions.mjs scripts/lib/captions.test.mjs`
Expected: both removed (no other file imports them — verify with `cd remotion; Select-String -Path scripts/*.mjs,src/**/*.tsx -Pattern "scripts/lib/captions" -List` → no matches except possibly gen-captions.mjs which is deleted in Task 3; if gen-captions still references it, that's fine — it's removed next task. Do NOT delete gen-captions here.)

- [ ] **Step 7: Commit**

```bash
git add remotion/src/lib/captions.mjs remotion/src/lib/captions.d.mts remotion/src/lib/captions.test.mjs
git commit -m "refactor(remotion): 자막 순수 lib 를 src/lib 로 이동 + buildCaptions 래퍼"
```

---

### Task 2: PresenterShort 내부 계산 + script.twoTrack 게이트

**Files:**
- Modify: `remotion/src/shorts/_shared/PresenterShort.tsx`

- [ ] **Step 1: import buildCaptions**

`PresenterShort.tsx` 의 `import { StickerLayer } from "./StickerLayer";` 줄 바로 아래에 추가:

```tsx
import { buildCaptions } from "../../lib/captions.mjs";
```

- [ ] **Step 2: Script 타입에 twoTrack 추가**

`PresenterShort.tsx` 의 `Script` 타입(현재):

```tsx
type Script = {
  header: Record<string, { top: string; mark: string }>;
  cta?: Record<string, string>;
  chunks: any[];
  headerStyle?: { markBg?: string; markFg?: string };
};
```

를 다음으로 교체:

```tsx
type Script = {
  header: Record<string, { top: string; mark: string }>;
  cta?: Record<string, string>;
  chunks: any[];
  headerStyle?: { markBg?: string; markFg?: string };
  twoTrack?: boolean;
};
```

- [ ] **Step 3: twoTrack 게이트 + caps 내부 계산**

`PresenterShort.tsx` 본문의 `const twoTrack = !!captions;` 한 줄을 다음 두 줄로 교체(이 위치는 `chunks` 가 이미 정의된 뒤라 `buildCaptions(chunks, lang)` 안전):

```tsx
  const twoTrack = !!captions || !!script.twoTrack;
  const caps = captions ?? (twoTrack ? buildCaptions(chunks, lang) : undefined);
```

- [ ] **Step 4: 카라오케가 caps 를 쓰도록 교체**

`PresenterShort.tsx` 의 카라오케 분기(현재):

```tsx
          {twoTrack
            ? <KaraokeCaptionZone phrases={(captions && captions[c.id]) || []} dur={c.durFrames} />
            : <CaptionZone c={c} lang={lang} />}
```

를 다음으로 교체(`captions` → `caps`):

```tsx
          {twoTrack
            ? <KaraokeCaptionZone phrases={(caps && caps[c.id]) || []} dur={c.durFrames} />
            : <CaptionZone c={c} lang={lang} />}
```

(강조 블록 `c["emph_"+lang] ?? c["cap_"+lang]` 는 청크 필드를 직접 읽으므로 변경 없음.)

- [ ] **Step 5: 타입체크**

Run: `cd remotion; npx tsc --noEmit`
Expected: exit 0. (PresenterShort 가 `../../lib/captions.mjs` 를 import → 사이드카 `captions.d.mts` 로 타입 해석. `script.twoTrack` 은 Script 타입에 있음.)

- [ ] **Step 6: Commit**

```bash
git add remotion/src/shorts/_shared/PresenterShort.tsx
git commit -m "feat(remotion): PresenterShort 자막 내부계산 + script.twoTrack 게이트(captions prop 폴백 유지)"
```

---

### Task 3: gen-captions·captions-ko.json 폐기 + adhd 를 플래그로 전환

**Files:**
- Delete: `remotion/scripts/gen-captions.mjs`, `remotion/src/shorts/adhd약키성장/captions-ko.json`
- Modify: `remotion/src/shorts/adhd약키성장/index.tsx`, `remotion/src/shorts/adhd약키성장/script.json`

- [ ] **Step 1: gen-captions 와 adhd 캡션 JSON 삭제**

Run: `cd remotion; git rm scripts/gen-captions.mjs "src/shorts/adhd약키성장/captions-ko.json"`
Expected: 둘 다 제거.

- [ ] **Step 2: adhd index.tsx 에서 captions import/prop 제거**

`remotion/src/shorts/adhd약키성장/index.tsx` 전체를 다음으로 교체:

```tsx
import script from "./script.json";
import tKo from "./timing-ko.json";
import { PresenterShort, presenterDuration } from "../_shared/PresenterShort";

// ADHD 약과 키 성장의 진실 — PresenterShort 2트랙 자막(script.twoTrack=true → 내부계산). 마케팅 콘텐츠 #18.
// videoSrc = presenter-base 랜덤 cut 재립싱크. 비ko 언어 추가 시 timing-<lang>.json import + mkFinal 추가.
const S = script as never;
const SLUG = "adhd약키성장";

const mkFinal = (lang: string, t: any): React.FC => () => (
  <PresenterShort script={S} timing={t} lang={lang} slug={SLUG} videoSrc={`videos/${SLUG}-presenter-lipsync-${lang}.mp4`} />
);

// KO (원장 모국어, 클론음성)
export const ADHDMED_KO_DURATION = presenterDuration(tKo);
export const AdhdMedKO = mkFinal("ko", tKo);
```

- [ ] **Step 3: adhd script.json 에 twoTrack 플래그 추가**

`remotion/src/shorts/adhd약키성장/script.json` 의 최상단 `"slug": "adhd약키성장",` 줄 바로 아래에 한 줄 추가:

```json
  "twoTrack": true,
```

(결과: `{ "slug": "...", "twoTrack": true, "fps": 30, ... }`. PresenterShort 가 `script.twoTrack` → 내부 buildCaptions → 기존과 동일한 2트랙 출력.)

- [ ] **Step 4: 타입체크**

Run: `cd remotion; npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A remotion/scripts/gen-captions.mjs remotion/src/shorts/adhd약키성장/
git commit -m "refactor(remotion): gen-captions/captions-ko.json 폐기 — adhd 를 script.twoTrack 내부계산으로 전환"
```

---

### Task 4: v4 타입 + 온보딩 기본 ON

**Files:**
- Modify: `v4/src/features/marketing/types.ts`
- Modify: `remotion/scripts/lib/reelWorkerLib.mjs`

- [ ] **Step 1: ReelScriptDoc.script 에 twoTrack 추가**

`v4/src/features/marketing/types.ts` 의 `ReelScriptDoc`(현재):

```tsx
export interface ReelScriptDoc {
  slug: string;
  script: {
    header: Record<string, { top: string; mark: string }>;
    headerStyle?: { markBg?: string; markFg?: string };
    cta?: Record<string, string>;
    chunks: ReelChunk[];
  } & Record<string, unknown>;
}
```

의 `cta?: ...` 줄 아래(또는 `chunks` 위)에 한 줄 추가:

```tsx
    twoTrack?: boolean;
```

- [ ] **Step 2: 온보딩 buildPushDoc 기본 twoTrack:true**

`remotion/scripts/lib/reelWorkerLib.mjs` 의 `buildPushDoc` 마지막 줄(현재):

```mjs
  return { slug, script: { ...rest, chunks } };
```

를 다음으로 교체(명시 false 는 존중, 없으면 기본 ON):

```mjs
  return { slug, script: { ...rest, chunks, twoTrack: rest.twoTrack ?? true } };
```

- [ ] **Step 3: 타입체크**

Run: `cd v4; npx tsc -b --noEmit`
Expected: exit 0. (v4 타입 게이트는 `tsc -b` — 일반 `tsc --noEmit` 는 solution tsconfig 라 no-op.)

- [ ] **Step 4: Commit**

```bash
git add v4/src/features/marketing/types.ts remotion/scripts/lib/reelWorkerLib.mjs
git commit -m "feat: reel_script.twoTrack 타입 + 온보딩 기본 ON(buildPushDoc)"
```

---

### Task 5: 스튜디오 twoTrack 토글 (HeaderCtaForm)

**Files:**
- Modify: `v4/src/features/marketing/components/content/reelEditor/HeaderCtaForm.tsx`

- [ ] **Step 1: 토글 행 추가**

`HeaderCtaForm.tsx` 의 CTA 블록과 안내 문구 사이 — 즉 다음 블록:

```tsx
          {/* CTA 문구 */}
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-gray-500">CTA 문구</label>
            <CommitInput value={cta} onCommit={commitCta} placeholder="지금 바로 확인하세요" />
          </div>
          <p className="text-[11px]" style={{ color: ACCENT }}>
            편집은 입력 칸을 벗어날 때(blur) 저장됩니다.
          </p>
```

를 다음으로 교체(토글 행을 CTA 와 안내 사이에 삽입):

```tsx
          {/* CTA 문구 */}
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-gray-500">CTA 문구</label>
            <CommitInput value={cta} onCommit={commitCta} placeholder="지금 바로 확인하세요" />
          </div>
          {/* 2트랙 자막 토글 — 전 언어 공통(언어 독립 플래그) */}
          <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
            <input
              type="checkbox"
              checked={!!script.twoTrack}
              onChange={(e) => onPatchScript({ twoTrack: e.target.checked })}
              className="h-3.5 w-3.5 cursor-pointer"
            />
            2트랙 자막 (강조 상단 + 카라오케 하단) · 전 언어 공통
          </label>
          <p className="text-[11px]" style={{ color: ACCENT }}>
            편집은 입력 칸을 벗어날 때(blur) 저장됩니다.
          </p>
```

- [ ] **Step 2: 타입체크**

Run: `cd v4; npx tsc -b --noEmit`
Expected: exit 0. (`script.twoTrack` 은 Task 4 에서 타입에 추가됨. `onPatchScript({ twoTrack })` 는 `Partial<Script>` 라 통과.)

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/reelEditor/HeaderCtaForm.tsx
git commit -m "feat(v4): 릴 에디터 2트랙 자막 ON/OFF 토글(script.twoTrack)"
```

---

### Task 6: 검증 + 문서

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 전체 게이트 재확인**

Run: `cd remotion; node --test src/lib/captions.test.mjs; npx tsc --noEmit; "tsc-remotion: $LASTEXITCODE"`
Expected: 테스트 7/7 pass, tsc exit 0.

Run: `cd v4; npx tsc -b --noEmit; "tsc-v4: $LASTEXITCODE"`
Expected: exit 0.

- [ ] **Step 2: standalone 컴포지션 2트랙 시각 검증(영상 stand-in)**

adhd 의 `videoSrc` 가 로컬에 없으면 OffthreadVideo 404 로 스틸이 실패하므로, **throwaway** 로 기존 영상으로 갈아끼워 컴포지션만 검증:
- `remotion/src/shorts/adhd약키성장/index.tsx` 의 `videoSrc={...lipsync...}` 를 임시로 `videoSrc={`videos/growingup.mp4`}` 로 변경.
- Run: `cd remotion; npx remotion still adhdmed-ko out/_work/cap-int-f50.png --frame=50`
- Expected: PNG 생성. 상단 강조 + 하단 카라오케 자막(= script.twoTrack 내부계산 경로)이 보이면 통합 OK.
- **되돌리기**: `cd C:\project\dflo; git checkout -- remotion/src/shorts/adhd약키성장/index.tsx` (커밋된 실제 lipsync 경로 복원).

(영상 에셋이 로컬에 있으면 stand-in 없이 바로 still. 인서트 청크는 ig 이미지 없으면 실패 — 비인서트 frame 50 만으로 충분.)

- [ ] **Step 3: CLAUDE.md 한 줄 갱신**

`CLAUDE.md` 의 `**자막 2트랙**(2026-06-15, feat 브랜치):` 로 시작하는 항목 끝에 다음 문장을 잇는다:

```
**편집기·워커 통합**(2026-06-15): captions 를 prop/JSON 으로 끼우지 않고 `PresenterShort` 가 `script.twoTrack` 켜지면 내부에서 `buildCaptions(chunks,lang)` 로 계산 → 워커 렌더·로컬 프리뷰 자동 2트랙(플러밍 0). 순수 lib 는 `remotion/src/lib/captions.mjs`(+`.d.mts`). 릴스별 토글은 릴 에디터 `HeaderCtaForm`, 신규 온보딩(`buildPushDoc`) 기본 ON, 기존 릴스는 OFF(선택 소급). `gen-captions.mjs`/`captions-<lang>.json` 폐기. 배포 v4 프리뷰는 stub(remotion/src 부재) 그대로 — 프리뷰·렌더는 로컬 워크플로우. 스펙 `docs/superpowers/specs/2026-06-15-reel-caption-editor-integration-design.md`.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: 2트랙 자막 편집기·워커 통합 반영"
```

---

## 무회귀 / 마이그레이션 노트

- `script.twoTrack` 없는 모든 기존 릴스(#1~#33 포함) → 단일 자막 그대로(워커·프리뷰·standalone).
- standalone `captions` prop 경로 유지(폴백 우선) — 다른 릴스가 아직 prop 을 쓰면 동작.
- 배포 v4 프리뷰 = stub(scope A, 손 안 댐). 본 통합은 **로컬 프리뷰 + 워커 렌더**만 2트랙화.
- 카라오케는 `timing`(durFrames) 필요 → `reel_runtime.timing[lang]`(이전 TTS/full 잡). 프리뷰·렌더 모두 timing 전제라 추가 의존성 없음.
- 후속(별도): 세이프존 픽셀·폰트·구절 maxChars 튜닝(선행 스펙 열린 항목) — 통합 후 에디터 프리뷰로 검증.

## 병렬 세션 주의

이 작업은 병렬 세션이 활발히 만지는 파일(`PresenterShort.tsx`, 릴 에디터 컴포넌트, `reelWorkerLib.mjs`)을 건드린다. **피처 브랜치에서 진행 → 완료 후 rebase 통합** 권장(직전 패턴). 커밋 직전 `git fetch` + 분기 확인, force push 금지.
