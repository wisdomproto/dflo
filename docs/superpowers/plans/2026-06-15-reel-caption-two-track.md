# 릴스 자막 2트랙 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 릴스 화면 텍스트를 두 트랙으로 분리한다 — 상단 강조 오버레이(핵심 청크만, 인서트 시 숨김)와 하단 카라오케 이해 자막(풀 나레이션을 구절 단위로 동기).

**Architecture:** 순수 JS 함수(`splitIntoPhrases`/`distributeFrames`)가 청크 나레이션을 글자수 비례 구절로 쪼개 `captions-{lang}.json`(청크별 `{text, fromFrame, durFrames}` 배열, 청크-상대 프레임)을 빌드 시 생성한다. `PresenterShort` 렌더러는 `captions` prop이 있으면 2트랙(EmphasisZone 상단 + KaraokeCaptionZone 하단), 없으면 기존 단일 자막(레거시)으로 분기 → 기존 릴스 무회귀. 첫 적용(pilot)은 `adhd약키성장` ko.

**Tech Stack:** Node.js ESM(`node --test`), Remotion 4 + React + TypeScript.

**스펙:** `docs/superpowers/specs/2026-06-15-reel-caption-two-track-design.md`

---

## File Structure

- Create `remotion/scripts/lib/captions.mjs` — 순수 함수 `splitIntoPhrases(text, lang, opts)` + `distributeFrames(phrases, durFrames)`. 렌더러·CLI 공용, 단위 테스트 대상.
- Create `remotion/scripts/lib/captions.test.mjs` — `node --test` 단위 테스트.
- Create `remotion/scripts/gen-captions.mjs` — CLI: `script.json` + `timing-{lang}.json` → `captions-{lang}.json`.
- Create `remotion/src/shorts/adhd약키성장/captions-ko.json` — pilot 생성물(Task 3 산출).
- Modify `remotion/src/shorts/_shared/PresenterShort.tsx` — 상수 추가, `Phrase`/`Captions` 타입, `EmphasisZone`·`KaraokeCaptionZone` 컴포넌트, `captions` prop 분기.
- Modify `remotion/src/shorts/adhd약키성장/index.tsx` — captions import + prop 전달(pilot 적용).
- Modify `CLAUDE.md` — Remotion PresenterShort 설명에 2트랙 자막 한 줄 반영.

---

### Task 1: 순수 구절분할 + 프레임배분 함수 (TDD)

**Files:**
- Create: `remotion/scripts/lib/captions.mjs`
- Test: `remotion/scripts/lib/captions.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `remotion/scripts/lib/captions.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitIntoPhrases, distributeFrames } from "./captions.mjs";

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
  for (const ph of p) assert.ok(Array.from(ph).length <= 8);
});

test("distributeFrames: durFrames 합이 정확히 일치", () => {
  const segs = distributeFrames(["가나다", "라마바사", "아자"], 100);
  assert.equal(segs.reduce((a, s) => a + s.durFrames, 0), 100);
  assert.equal(segs[0].fromFrame, 0);
  assert.equal(segs[1].fromFrame, segs[0].durFrames);
  assert.equal(segs[2].fromFrame, segs[0].durFrames + segs[1].durFrames);
});

test("단일 구절은 전체 길이를 차지", () => {
  assert.deepEqual(distributeFrames(["hello"], 60), [{ text: "hello", fromFrame: 0, durFrames: 60 }]);
});

test("빈 입력은 빈 배열", () => {
  assert.deepEqual(splitIntoPhrases("", "ko"), []);
  assert.deepEqual(distributeFrames([], 100), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd remotion; node --test scripts/lib/captions.test.mjs`
Expected: FAIL — `Cannot find module ... captions.mjs` (구현 파일 없음).

- [ ] **Step 3: Write minimal implementation**

Create `remotion/scripts/lib/captions.mjs`:

```js
// 청크 나레이션 → 카라오케 자막 구절. 순수 함수(렌더러·CLI 공용).
// 한국어/태국어/영어/베트남어 = 공백 토큰화, 중국어(cn/ch) = 글자 토큰화.
const CJK = new Set(["cn", "ch"]);
const SENT_END = /[。！？!?．.…]$/;

function len(s) {
  return Array.from(s).length;
}

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd remotion; node --test scripts/lib/captions.test.mjs`
Expected: PASS — `tests 6`, `pass 6`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add remotion/scripts/lib/captions.mjs remotion/scripts/lib/captions.test.mjs
git commit -m "feat(remotion): 자막 구절분할·프레임배분 순수 함수 + 테스트"
```

---

### Task 2: gen-captions CLI

**Files:**
- Create: `remotion/scripts/gen-captions.mjs`

- [ ] **Step 1: Write the CLI script**

Create `remotion/scripts/gen-captions.mjs`:

```js
// script.json + timing-<lang>.json → captions-<lang>.json (청크별 카라오케 구절).
// Usage: node scripts/gen-captions.mjs <slug> <lang>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { splitIntoPhrases, distributeFrames } from "./lib/captions.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [slug, lang] = process.argv.slice(2);
if (!slug || !lang) {
  console.error("Usage: node scripts/gen-captions.mjs <slug> <lang>");
  process.exit(1);
}

const base = join(here, "..", "src", "shorts", slug);
const script = JSON.parse(readFileSync(join(base, "script.json"), "utf8"));
const timing = JSON.parse(readFileSync(join(base, `timing-${lang}.json`), "utf8"));
const byId = Object.fromEntries(script.chunks.map((c) => [c.id, c]));

const out = {};
for (const t of timing) {
  const c = byId[t.id] || {};
  const phrases = splitIntoPhrases(c[lang] || "", lang);
  out[t.id] = distributeFrames(phrases, t.durFrames);
}

const dest = join(base, `captions-${lang}.json`);
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote ${dest} (${Object.keys(out).length} chunks)`);
```

- [ ] **Step 2: Smoke-run on a missing arg to verify guard**

Run: `cd remotion; node scripts/gen-captions.mjs`
Expected: prints `Usage: node scripts/gen-captions.mjs <slug> <lang>` and exits non-zero.

- [ ] **Step 3: Commit**

```bash
git add remotion/scripts/gen-captions.mjs
git commit -m "feat(remotion): gen-captions CLI (script+timing → captions-<lang>.json)"
```

---

### Task 3: pilot 자막 데이터 생성 (adhd ko)

**Files:**
- Create: `remotion/src/shorts/adhd약키성장/captions-ko.json` (스크립트 산출)

- [ ] **Step 1: Generate captions-ko.json**

Run: `cd remotion; node scripts/gen-captions.mjs adhd약키성장 ko`
Expected: `Wrote .../adhd약키성장/captions-ko.json (10 chunks)`.

- [ ] **Step 2: Sanity-check the output shape**

Run: `cd remotion; node -e "const c=require('./src/shorts/adhd약키성장/captions-ko.json'); const k=Object.keys(c); console.log('chunks',k.length); console.log('c1 phrases',c.c1.length); console.log('c1 sum', c.c1.reduce((a,p)=>a+p.durFrames,0))"`
Expected: `chunks 10`, `c1 phrases` ≥ 2, `c1 sum 166` (= c1 durFrames).

- [ ] **Step 3: Commit**

```bash
git add remotion/src/shorts/adhd약키성장/captions-ko.json
git commit -m "feat(remotion): adhd ko 카라오케 자막 데이터 생성(pilot)"
```

---

### Task 4: PresenterShort 2트랙 렌더러

**Files:**
- Modify: `remotion/src/shorts/_shared/PresenterShort.tsx`

- [ ] **Step 1: 레이아웃 상수 추가**

`PresenterShort.tsx:17` 의 `const CAP_TOP = 1404, CAP_H = 280;` 바로 아래 줄에 추가:

```tsx
const EMPH_TOP = 330, EMPH_H = 250;        // 강조 오버레이 (영상 상단, 헤더 아래)
const CAP2_TOP = 1392, CAP2_H = 200;       // 이해 자막 밴드 (세이프존 상향, 2트랙)
```

- [ ] **Step 2: Phrase/Captions 타입 추가**

`PresenterShort.tsx` 의 `type Timing = ...` 줄(26) 바로 아래에 추가:

```tsx
type Phrase = { text: string; fromFrame: number; durFrames: number };
type Captions = Record<string, Phrase[]>;
```

- [ ] **Step 3: EmphasisZone · KaraokeCaptionZone 컴포넌트 추가**

`CaptionZone` 컴포넌트 정의 끝(`PresenterShort.tsx:57`, `};` 다음 줄)에 추가:

```tsx
// 강조 오버레이 (영상 상단) — 핵심 청크에만. 인서트 청크는 호출부에서 거른다.
const EmphasisZone: React.FC<{ lines: string[]; hl: string; dur: number }> = ({ lines, hl, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const op = interpolate(frame, [0, 5], [0, 1], clamp) * interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: EMPH_TOP, left: 0, width: 1080, height: EMPH_H, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR, padding: "0 56px", opacity: op, transform: `scale(${interpolate(pop, [0, 1], [0.84, 1])})` }}>
      {lines.map((ln, k) => (
        <div key={k} style={{ fontSize: 72, fontWeight: 900, color: "#fff", lineHeight: 1.2, textShadow: stroke }}>{hlLine(ln, hl)}</div>
      ))}
    </div>
  );
};

// 이해 자막 (하단 세이프존) — 청크 안에서 구절 단위로 카라오케 등장.
const KaraokeCaptionZone: React.FC<{ phrases: Phrase[]; dur: number }> = ({ phrases, dur }) => {
  const frame = useCurrentFrame();
  if (!phrases.length) return null;
  const active = phrases.find((p) => frame >= p.fromFrame && frame < p.fromFrame + p.durFrames) || phrases[phrases.length - 1];
  const local = frame - active.fromFrame;
  const op = interpolate(local, [0, 4], [0, 1], clamp) * interpolate(frame, [dur - 6, dur], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: CAP2_TOP, left: 0, width: 1080, height: CAP2_H, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR, padding: "0 64px", opacity: op }}>
      <div style={{ fontSize: 54, fontWeight: 800, color: "#fff", lineHeight: 1.3, textShadow: stroke }}>{active.text}</div>
    </div>
  );
};
```

- [ ] **Step 4: captions prop 추가**

`PresenterShort.tsx` 컴포넌트 시그니처(136~139)를 교체:

```tsx
export const PresenterShort: React.FC<{
  script: Script; timing: Timing[]; lang: string; slug: string; videoSrc: string;
  captions?: Captions;
  assets?: { videoSrc: string; audio: Record<string, string> };
}> = ({ script, timing, lang, slug, videoSrc, captions, assets }) => {
```

- [ ] **Step 5: twoTrack 플래그 추가**

`PresenterShort.tsx` 의 `const vsrc = assets?.videoSrc ?? videoSrc;` 줄(142) 바로 아래에 추가:

```tsx
  const twoTrack = !!captions;
```

- [ ] **Step 6: 자막 렌더 블록을 2트랙 분기로 교체**

`PresenterShort.tsx:190-195` 의 기존 자막 블록 전체:

```tsx
      {/* ── 자막 (영상 아래) — CTA 청크는 제외(카드가 덮음) ── */}
      {chunks.map((c, i) => (i === ctaIdx ? null : (
        <Sequence key={"cap" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
          <CaptionZone c={c} lang={lang} />
        </Sequence>
      )))}
```

를 다음으로 교체:

```tsx
      {/* ── 강조 오버레이 (2트랙 전용) — 핵심 청크·인서트 아닌 청크만 ── */}
      {twoTrack && chunks.map((c, i) => {
        if (i === ctaIdx) return null;
        if (c.insert || c["insert_" + lang]) return null;
        const eLines: string[] = c["emph_" + lang] ?? c["cap_" + lang] ?? [];
        if (!eLines.length) return null;
        return (
          <Sequence key={"emph" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
            <EmphasisZone lines={eLines} hl={c["hl_" + lang] || ""} dur={c.durFrames} />
          </Sequence>
        );
      })}

      {/* ── 자막 (영상 아래) — CTA 청크 제외. 2트랙=카라오케 / 레거시=단일블록 ── */}
      {chunks.map((c, i) => (i === ctaIdx ? null : (
        <Sequence key={"cap" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
          {twoTrack
            ? <KaraokeCaptionZone phrases={(captions && captions[c.id]) || []} dur={c.durFrames} />
            : <CaptionZone c={c} lang={lang} />}
        </Sequence>
      )))}
```

- [ ] **Step 7: 타입체크로 컴파일 확인**

Run: `cd remotion; npx tsc --noEmit`
Expected: 에러 0 (exit 0). `EmphasisZone`/`KaraokeCaptionZone` 미사용 경고 없음(둘 다 렌더 블록에서 사용됨).

- [ ] **Step 8: Commit**

```bash
git add remotion/src/shorts/_shared/PresenterShort.tsx
git commit -m "feat(remotion): PresenterShort 2트랙 자막(강조 상단+카라오케 하단, captions prop 분기)"
```

---

### Task 5: adhd 파일럿 적용 + 시각 검증

**Files:**
- Modify: `remotion/src/shorts/adhd약키성장/index.tsx`

- [ ] **Step 1: index.tsx 에 captions 연결**

`remotion/src/shorts/adhd약키성장/index.tsx` 전체를 교체:

```tsx
import script from "./script.json";
import tKo from "./timing-ko.json";
import capKo from "./captions-ko.json";
import { PresenterShort, presenterDuration } from "../_shared/PresenterShort";

// ADHD 약과 키 성장의 진실 — PresenterShort 2트랙 자막(강조+카라오케). 마케팅 콘텐츠 #18.
// videoSrc = presenter-base 랜덤 cut 재립싱크. 비ko 언어 추가 시 timing/captions-<lang>.json import + mkFinal 추가.
const S = script as never;
const SLUG = "adhd약키성장";

const mkFinal = (lang: string, t: any, caps?: any): React.FC => () => (
  <PresenterShort script={S} timing={t} lang={lang} slug={SLUG} captions={caps} videoSrc={`videos/${SLUG}-presenter-lipsync-${lang}.mp4`} />
);

// KO (원장 모국어, 클론음성)
export const ADHDMED_KO_DURATION = presenterDuration(tKo);
export const AdhdMedKO = mkFinal("ko", tKo, capKo);
```

- [ ] **Step 2: 타입체크**

Run: `cd remotion; npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: 컴포지션 ID 확인**

Run: `cd remotion` 후 Grep으로 `AdhdMed` 를 `src/Root.tsx` 에서 찾아 `<Composition id="...">` 값을 확인.
Expected: adhd ko 컴포지션의 `id` 문자열을 얻는다(예: `AdhdMedKO` 또는 로마자 변형). 이 값을 아래 `<CompId>` 에 사용.

- [ ] **Step 4: 비인서트 청크 스틸 렌더 (강조+자막 보임)**

Run: `cd remotion; npx remotion still <CompId> out/_work/cap-f50.png --frame=50`
Expected: PNG 생성. 육안 확인 — 상단(y≈330~580)에 큰 강조 텍스트("ADHD 약 먹으면 / 키 안 큰다?"), 하단(y≈1392~1592)에 카라오케 구절 한 덩어리. (영상 에셋 없으면 패널은 "영상 미생성" 플레이스홀더지만 텍스트 레이어는 정상 렌더.)

- [ ] **Step 5: 인서트 청크 스틸 렌더 (강조 숨김 확인)**

Run: `cd remotion; npx remotion still <CompId> out/_work/cap-f900.png --frame=900`
Expected: PNG 생성. 육안 확인 — 패널 자리에 인포그래픽(ig3) + 자체 라벨, **상단 강조 텍스트 없음**, 하단 카라오케 자막은 보임.

- [ ] **Step 6: Commit**

```bash
git add remotion/src/shorts/adhd약키성장/index.tsx
git commit -m "feat(remotion): adhd ko 릴스 2트랙 자막 적용(pilot)"
```

---

### Task 6: 문서 반영 + 마무리

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md PresenterShort 설명에 2트랙 한 줄 반영**

`CLAUDE.md` 의 `**원장 프레젠터 포맷 = 쇼츠 표준**` 항목에서 자막 관련 서술 뒤에 한 문장 추가(레이아웃 설명 흐름에 맞춰):

```
**자막 2트랙**(2026-06-15): 화면 텍스트를 강조(상단 오버레이, 핵심 청크만·인서트 시 자동 숨김)와 이해 자막(하단 세이프존 카라오케, 풀 나레이션을 글자수 비례 구절분할)으로 분리. `PresenterShort` 가 `captions` prop 있으면 2트랙, 없으면 레거시 단일자막(무회귀). 빌드: `scripts/gen-captions.mjs <slug> <lang>` → `captions-<lang>.json`. 첫 적용 adhd ko. 스펙 `docs/superpowers/specs/2026-06-15-reel-caption-two-track-design.md`.
```

- [ ] **Step 2: 전체 테스트 재확인(무회귀)**

Run: `cd remotion; node --test scripts/lib/captions.test.mjs; npx tsc --noEmit`
Expected: 테스트 6/6 pass, tsc exit 0.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: 릴스 자막 2트랙 시스템 반영"
```

---

## 무회귀 / 마이그레이션 노트

- `captions` prop 없는 기존 릴스(다른 모든 shorts)는 레거시 단일자막 경로 그대로 → 출력 불변.
- 강조 텍스트 소스는 `emph_{lang} ?? cap_{lang} ?? []`. 특정 청크에서 강조를 끄려면 그 청크에 `"emph_{lang}": []` 를 명시(간헐 등장 편집). 미지정이면 기존 `cap_{lang}` 요약을 강조로 사용.
- 다른 언어/릴스 적용: `gen-captions.mjs <slug> <lang>` 로 `captions-<lang>.json` 생성 후 해당 `index.tsx` 에서 import·전달.
- 픽셀(EMPH/CAP2 밴드 Y·높이·폰트)·구절 maxChars·강조 hold 프레임은 실제 IG/FB UI 캡처로 추후 튜닝(스펙 "열린 항목").
- **오디오 언어 독립(더빙 vs 자막 노선)은 신규 코드 불필요** — `lang` 은 텍스트(강조·자막)만 구동하고, 영상은 `videoSrc`(명시 문자열), 청크 오디오는 `assets.audio[chunkId]`(명시 URL, 워커 경로) 또는 `audio/shorts/<slug>/<lang>/<id>.wav`(기본 경로)에서 온다. 즉 "한국어 음성 + 태국어 자막"은 `lang="th"`(텍스트 태국어) + `videoSrc`/`assets.audio` 를 한국어 소스로 지정하면 됨. 더빙본은 `lang="th"` + 태국어 음성. 별도 audioLang prop은 불필요(YAGNI).
