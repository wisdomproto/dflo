# 프로그램 이미지 폴더 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `v4/public/programs/images/` 를 `_common`(한국어 기본본) + 언어 오버라이드 폴더 구조로 재편하고, 빌드 이미지 스왑을 1단계 fallback(언어 폴더 우선 → `_common`)으로 교체하며, 안 쓰는 orphan 이미지·폐기 정적 HTML을 삭제한다.

**Architecture:** 화이트리스트 49개 한국어본을 `_common/{slug}/`로 모으고, 진짜 태국어 번역 7개만 `th/{slug}/`에 남긴다. `build-i18n.mjs`는 렌더 후 HTML의 각 `/programs/images/{slug}/{file}` 참조를 파일시스템 존재 기반으로 해석한다: `{lang}/{slug}/{file}` 있으면 그것, 없으면 `_common/{slug}/{file}`, 둘 다 없으면 빌드 경고. 리졸버는 순수 함수(`exists` predicate 주입)로 분리해 fixture 단위 테스트한다.

**Tech Stack:** Node ESM (no framework), `node:test` + `node:assert`, js-yaml, 기존 `v4/scripts/lib/*.mjs` 패턴.

---

## ⚠️ 커밋 정책 (이 프로젝트 한정)

- 사용자가 **"업데이트"** 라고 말하기 전까지 **절대 커밋/푸시 금지**. 아래 각 태스크의 commit 스텝은 "업데이트" 시점에 실행할 내용을 미리 적어둔 것.
- 스펙 `docs/superpowers/specs/2026-06-02-program-images-cleanup-design.md` 롤백 절: **폴더 이동 + 빌드 로직 변경은 한 커밋으로** 묶어 되돌리기 쉽게 한다. 따라서 Task 2~7은 하나의 마이그레이션 커밋으로 합치고, Task 1(리졸버+테스트, 순수 추가)만 분리 가능.

## 사전 사실 (조사 완료 — 실행자는 신뢰해도 됨)

- 화이트리스트 = 템플릿 `i18n/template/index.html`이 실제 참조하는 49개. 동적 배열(`need-1~6`, `problem-1~4`, `card-1~4`, obesity `cause/life/risk-1~4`, precocious `cause-1~6`)은 렌더 후 실제 파일명이 박힌다.
- th에서 루트와 byte-DIFF면서 **진짜 태국어 번역**인 화이트리스트 파일 = 7개(아래 KEEP_TH).
- `compare-1vs6.webp`는 th/vi/en에 byte-DIFF 사본이 있으나 **번역본이 아니라 옛 한국어 사본**(Phase 27 잔재). 루트본은 Task 1(별건)에서 새 통합성장 이미지로 교체됨 → `_common`엔 새 한국어본, th/vi/en 옛 사본은 삭제.
- `th/obesity-growth/cause-1.png`(2.8MB)는 webp 변환 전 원본 잔재 → 삭제.
- 정적 `public/programs/*.html` 8개(7 프로그램 + `growth-clinic.html`)는 라우터 링크 없음 → 폐기. `BannerSlideEditor.tsx`의 placeholder 문자열 2곳만 예시로 참조(하드 의존 아님).

## File Structure

| 경로 | 책임 | 변경 |
|---|---|---|
| `v4/scripts/lib/program-img.mjs` | 프로그램 이미지 경로 1단계 fallback 리졸버 (`resolveProgramImgPath`) + 렌더된 HTML 후처리(`localizeProgramImages`) | **신규** |
| `v4/scripts/test/program-img.test.mjs` | 위 모듈 단위 테스트(fixture 디렉토리) | **신규** |
| `v4/scripts/build-i18n.mjs` | 빌드 오케스트레이터 — 인라인 `localizeProgramImg` 제거하고 새 모듈 사용 | 수정 (90-110행 부근) |
| `v4/public/programs/images/_common/{slug}/` | 한국어 기본본 49개 | **신규(이동 대상)** |
| `v4/public/programs/images/th/{slug}/` | 태국어 번역 오버라이드 7개만 | 정리(대량 삭제) |
| `v4/public/programs/images/{body-proportion,feet-care,...}/` (루트 슬러그 폴더 7개) | (구)한국어 루트 | **삭제(이동 후 빈 폴더 제거)** |
| `v4/public/programs/images/vi/`, `en/` | `.gitkeep`만 유지, 옛 compare 사본 삭제 | 정리 |
| `v4/public/programs/*.html` (8개) | 폐기 정적 상세 페이지 | **삭제** |
| `v4/src/features/website/pages/BannerSlideEditor.tsx` | placeholder 예시 URL 2곳 | 수정(죽은 링크 예시 제거) |
| `CLAUDE.md`(루트) / `v4/CLAUDE.md` | "다국어 자산 처리" 문서 | 수정(새 구조 반영) |

### 기준 리스트 (실행자가 그대로 사용)

```
WHITELIST (slug → files, 49개):
  growth-hormone-balance: hero.jpg golden-time.jpg compare-1vs6.webp process-grid.jpg director.jpg need-1.jpg need-2.jpg need-3.jpg need-4.jpg need-5.jpg need-6.jpg
  obesity-growth: body-bmi.jpg waffle-photo.jpg fat-cell.jpg risk-1.jpg risk-2.jpg risk-3.jpg risk-4.jpg cause-1.jpg cause-2.jpg cause-3.jpg cause-4.jpg life-1.jpg life-2.jpg life-3.jpg life-4.jpg
  precocious-puberty: chart.jpg height-boy.jpg arrow-illust.jpg cause-1.jpg cause-2.jpg cause-3.jpg cause-4.jpg cause-5.jpg cause-6.jpg
  body-proportion: ratio.jpg comparison.jpg
  feet-care: back.jpg problem-1.jpg problem-2.jpg problem-3.jpg problem-4.jpg
  posture-exercise: equipment-main.jpg equipment-row.jpg
  late-growth: growth-chart.jpg card-1.jpg card-2.jpg card-3.jpg card-4.jpg

KEEP_TH (th에 남길 진짜 번역 오버라이드, 7개):
  body-proportion/comparison.jpg
  body-proportion/ratio.jpg
  growth-hormone-balance/director.jpg
  growth-hormone-balance/golden-time.jpg
  growth-hormone-balance/process-grid.jpg
  obesity-growth/fat-cell.jpg
  precocious-puberty/arrow-illust.jpg
```

---

### Task 1: 프로그램 이미지 리졸버 모듈 + 테스트

**Files:**
- Create: `v4/scripts/lib/program-img.mjs`
- Test: `v4/scripts/test/program-img.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`v4/scripts/test/program-img.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveProgramImgPath, localizeProgramImages } from '../lib/program-img.mjs';

// resolveProgramImgPath(lang, slug, file, exists) — exists(relPath)→bool 주입
test('언어 폴더에 있으면 언어 경로', () => {
  const exists = (p) => p === 'th/growth-hormone-balance/director.jpg';
  assert.equal(
    resolveProgramImgPath('th', 'growth-hormone-balance', 'director.jpg', exists),
    '/programs/images/th/growth-hormone-balance/director.jpg',
  );
});

test('언어 폴더에 없으면 _common fallback', () => {
  const exists = (p) => p === '_common/growth-hormone-balance/hero.jpg';
  assert.equal(
    resolveProgramImgPath('th', 'growth-hormone-balance', 'hero.jpg', exists),
    '/programs/images/_common/growth-hormone-balance/hero.jpg',
  );
});

test('ko 도 _common 을 본다 (ko 폴더 없음)', () => {
  const exists = (p) => p === '_common/late-growth/card-1.jpg';
  assert.equal(
    resolveProgramImgPath('ko', 'late-growth', 'card-1.jpg', exists),
    '/programs/images/_common/late-growth/card-1.jpg',
  );
});

test('둘 다 없으면 null', () => {
  const exists = () => false;
  assert.equal(resolveProgramImgPath('en', 'obesity-growth', 'cause-1.jpg', exists), null);
});

// localizeProgramImages(html, lang, imagesRoot, warn) — 실제 FS fixture
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'progimg-'));
  mkdirSync(join(root, '_common/growth-hormone-balance'), { recursive: true });
  mkdirSync(join(root, 'th/growth-hormone-balance'), { recursive: true });
  writeFileSync(join(root, '_common/growth-hormone-balance/hero.jpg'), 'x');
  writeFileSync(join(root, '_common/growth-hormone-balance/director.jpg'), 'x');
  writeFileSync(join(root, 'th/growth-hormone-balance/director.jpg'), 'x');
  return root;
}

test('localize: th 는 번역본 우선 + 나머지 _common', () => {
  const root = makeFixture();
  const html = '<img src="/programs/images/growth-hormone-balance/hero.jpg"><img src="/programs/images/growth-hormone-balance/director.jpg">';
  const out = localizeProgramImages(html, 'th', root, () => {});
  assert.match(out, /_common\/growth-hormone-balance\/hero\.jpg/);
  assert.match(out, /th\/growth-hormone-balance\/director\.jpg/);
});

test('localize: 누락 시 원본 유지 + warn 호출', () => {
  const root = makeFixture();
  const warned = [];
  const html = '<img src="/programs/images/growth-hormone-balance/missing.jpg">';
  const out = localizeProgramImages(html, 'ko', root, (m) => warned.push(m));
  assert.match(out, /\/programs\/images\/growth-hormone-balance\/missing\.jpg/);
  assert.equal(warned.length, 1);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd v4 && node --test scripts/test/program-img.test.mjs`
Expected: FAIL — `Cannot find module '../lib/program-img.mjs'`

- [ ] **Step 3: 모듈 구현**

`v4/scripts/lib/program-img.mjs`:

```js
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// 렌더된 HTML에서 프로그램 이미지 참조 매칭. 렌더 후라 {{}} 없음.
const IMG_RE = /\/programs\/images\/([a-z0-9-]+)\/([a-z0-9._-]+\.(?:jpe?g|png|webp))/gi;

// 1단계 fallback: 언어 폴더 우선 → _common(한국어 기본본) → null
export function resolveProgramImgPath(lang, slug, file, exists) {
  if (exists(`${lang}/${slug}/${file}`)) return `/programs/images/${lang}/${slug}/${file}`;
  if (exists(`_common/${slug}/${file}`)) return `/programs/images/_common/${slug}/${file}`;
  return null;
}

// imagesRoot = v4/public/programs/images 절대경로
export function localizeProgramImages(html, lang, imagesRoot, warn = console.warn) {
  const exists = (rel) => existsSync(join(imagesRoot, rel));
  return html.replace(IMG_RE, (m, slug, file) => {
    const resolved = resolveProgramImgPath(lang, slug, file, exists);
    if (!resolved) {
      warn(`[i18n] 누락된 프로그램 이미지: ${slug}/${file} (lang=${lang})`);
      return m;
    }
    return resolved;
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd v4 && node --test scripts/test/program-img.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋 (※ "업데이트" 시에만)**

```bash
git add v4/scripts/lib/program-img.mjs v4/scripts/test/program-img.test.mjs
git commit -m "feat(i18n): 프로그램 이미지 1단계 fallback 리졸버 모듈 추가"
```

---

### Task 2: build-i18n.mjs 에 리졸버 연결

**Files:**
- Modify: `v4/scripts/build-i18n.mjs:90-110`

- [ ] **Step 1: import 추가**

`build-i18n.mjs` 상단 import 블록(다른 `lib/*` import들 옆)에 추가:

```js
import { localizeProgramImages } from './lib/program-img.mjs';
```

- [ ] **Step 2: 인라인 swap 을 새 리졸버로 교체**

`build-i18n.mjs`의 현재 90-98행:

```js
    // Non-Korean locales pull per-language program images from /programs/images/{lang}/{slug}/
    // and use the English-style logo. Korean keeps the original paths (legacy program HTML
    // pages and the existing logo.jpg masthead depend on them).
    const localizeProgramImg = (html) => {
      if (lang === 'ko') return html;
      return html
        .replaceAll('/programs/images/', `/programs/images/${lang}/`)
        .replaceAll('/images/logo.jpg', '/images/logo_en.png');
    };
```

를 아래로 교체:

```js
    // 프로그램 이미지: 언어 폴더 우선 → _common(한국어 기본본) 1단계 fallback (lib/program-img.mjs).
    // 로고: 비한국어는 영문 워드마크로 swap.
    const IMAGES_ROOT = join(ROOT, 'public/programs/images');
    const localizeProgramImg = (html) => {
      let out = localizeProgramImages(html, lang, IMAGES_ROOT);
      if (lang !== 'ko') out = out.replaceAll('/images/logo.jpg', '/images/logo_en.png');
      return out;
    };
```

(`ROOT` 와 `join` 은 파일 상단에서 이미 import/정의됨 — 확인만.)

- [ ] **Step 3: 호출부 변경 없음 확인**

`build-i18n.mjs` 102행·110행이 `localizeProgramImg(render(...))` 를 그대로 호출하는지 확인(시그니처 동일하므로 수정 불필요).

- [ ] **Step 4: 이 시점 빌드는 아직 깨짐 — Task 3~5 파일 이동 후 검증**

NOTE: 파일을 아직 안 옮겼으므로 지금 빌드하면 모든 참조가 `_common`·`{lang}`에 없어 "누락" 경고를 쏟는다. 정상. Task 6에서 함께 검증한다. (그래서 Task 2~7은 한 커밋.)

---

### Task 3: 화이트리스트 49개 → `_common` 이동 + orphan 루트 삭제

**Files:**
- Move: `v4/public/programs/images/{slug}/*` → `_common/{slug}/`
- Delete: orphan 루트 파일 30개

- [ ] **Step 1: `_common` 으로 git mv (WHITELIST 49개)**

```bash
cd v4/public/programs/images
declare -A WL
WL[growth-hormone-balance]="hero.jpg golden-time.jpg compare-1vs6.webp process-grid.jpg director.jpg need-1.jpg need-2.jpg need-3.jpg need-4.jpg need-5.jpg need-6.jpg"
WL[obesity-growth]="body-bmi.jpg waffle-photo.jpg fat-cell.jpg risk-1.jpg risk-2.jpg risk-3.jpg risk-4.jpg cause-1.jpg cause-2.jpg cause-3.jpg cause-4.jpg life-1.jpg life-2.jpg life-3.jpg life-4.jpg"
WL[precocious-puberty]="chart.jpg height-boy.jpg arrow-illust.jpg cause-1.jpg cause-2.jpg cause-3.jpg cause-4.jpg cause-5.jpg cause-6.jpg"
WL[body-proportion]="ratio.jpg comparison.jpg"
WL[feet-care]="back.jpg problem-1.jpg problem-2.jpg problem-3.jpg problem-4.jpg"
WL[posture-exercise]="equipment-main.jpg equipment-row.jpg"
WL[late-growth]="growth-chart.jpg card-1.jpg card-2.jpg card-3.jpg card-4.jpg"
for slug in "${!WL[@]}"; do
  mkdir -p "_common/$slug"
  for f in ${WL[$slug]}; do git mv "$slug/$f" "_common/$slug/$f"; done
done
```

- [ ] **Step 2: 이동 검증 (49개)**

Run: `cd v4/public/programs/images && find _common -type f | wc -l`
Expected: `49`

- [ ] **Step 3: 남은 루트 orphan + 빈 슬러그 폴더 삭제**

```bash
cd v4/public/programs/images
# WHITELIST 를 다 옮겼으니 루트 7개 슬러그 폴더에 남은 건 전부 orphan
for slug in body-proportion feet-care growth-hormone-balance late-growth obesity-growth posture-exercise precocious-puberty; do
  git rm -r "$slug"
done
```

- [ ] **Step 4: 루트에 `_common th vi en` 만 남았는지 확인**

Run: `cd v4/public/programs/images && ls -d */`
Expected: `_common/  en/  th/  vi/` (4개만)

---

### Task 4: th 폴더를 번역 오버라이드 7개로 정리

**Files:**
- Delete: `th/` 의 KEEP_TH 7개를 제외한 전부 + stray png

- [ ] **Step 1: KEEP_TH 외 전부 삭제**

```bash
cd v4/public/programs/images
# KEEP_TH 7개만 살린다 (slug/file)
keep="body-proportion/comparison.jpg body-proportion/ratio.jpg growth-hormone-balance/director.jpg growth-hormone-balance/golden-time.jpg growth-hormone-balance/process-grid.jpg obesity-growth/fat-cell.jpg precocious-puberty/arrow-illust.jpg"
# th 하위 모든 파일 순회, keep 에 없으면 git rm
while IFS= read -r path; do
  rel="${path#th/}"                     # slug/file
  case " $keep " in
    *" $rel "*) : ;;                     # 유지
    *) git rm "$path" ;;                 # 삭제 (orphan/SAME/need변형/stray png/옛 compare)
  esac
done < <(git ls-files 'th/**')
```

- [ ] **Step 2: th 에 7개만 남았는지 확인**

Run: `cd v4/public/programs/images && find th -type f | sort`
Expected (정확히 7줄):
```
th/body-proportion/comparison.jpg
th/body-proportion/ratio.jpg
th/growth-hormone-balance/director.jpg
th/growth-hormone-balance/golden-time.jpg
th/growth-hormone-balance/process-grid.jpg
th/obesity-growth/fat-cell.jpg
th/precocious-puberty/arrow-illust.jpg
```

- [ ] **Step 3: stray png 가 지워졌는지 재확인**

Run: `cd v4/public/programs/images && ls th/obesity-growth/cause-1.png 2>/dev/null || echo "삭제됨"`
Expected: `삭제됨`

---

### Task 5: vi/en 옛 compare 사본 삭제 (.gitkeep 유지)

**Files:**
- Delete: `vi/growth-hormone-balance/compare-1vs6.webp`, `en/growth-hormone-balance/compare-1vs6.webp`

- [ ] **Step 1: 삭제**

```bash
cd v4/public/programs/images
git rm vi/growth-hormone-balance/compare-1vs6.webp en/growth-hormone-balance/compare-1vs6.webp
```

- [ ] **Step 2: vi/en 에 .gitkeep 만 남았는지 확인**

Run: `cd v4/public/programs/images && find vi en -type f | sort`
Expected (16줄, 전부 `.gitkeep`):
```
en/body-proportion/.gitkeep
en/feet-care/.gitkeep
en/growth-hormone-balance/.gitkeep
en/late-growth/.gitkeep
en/obesity-growth/.gitkeep
en/posture-exercise/.gitkeep
en/precocious-puberty/.gitkeep
vi/body-proportion/.gitkeep
vi/feet-care/.gitkeep
vi/growth-hormone-balance/.gitkeep
vi/late-growth/.gitkeep
vi/obesity-growth/.gitkeep
vi/posture-exercise/.gitkeep
vi/precocious-puberty/.gitkeep
```
(en 7 + vi 7 = 14줄. growth-hormone-balance 에 .gitkeep 이 compare 와 공존했으면 그대로 유지됨.)

---

### Task 6: 정적 프로그램 HTML 8개 폐기 + placeholder 정리 + 빌드 검증

**Files:**
- Delete: `v4/public/programs/*.html` (8개)
- Modify: `v4/src/features/website/pages/BannerSlideEditor.tsx:369,382`

- [ ] **Step 1: 정적 HTML 삭제**

```bash
cd v4/public/programs
git rm body-proportion.html feet-care.html growth-clinic.html growth-hormone-balance.html late-growth.html obesity-growth.html posture-exercise.html precocious-puberty.html
```

- [ ] **Step 2: BannerSlideEditor placeholder 예시 URL 교체 (죽은 링크 제거)**

`BannerSlideEditor.tsx` 369행:
```
            placeholder="https://... 또는 /programs/body-proportion.html"
```
→
```
            placeholder="https://... 또는 /program/body-proportion"
```

`BannerSlideEditor.tsx` 382행:
```
              placeholder="/programs/body-proportion.html"
```
→
```
              placeholder="/program/body-proportion"
```
(React 라우트 `/program/:slug` 가 유효한 실제 상세 페이지라 예시로 적합.)

- [ ] **Step 3: 타입체크 (placeholder 문자열 변경이 깨뜨리지 않는지)**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 0 (문자열만 바뀜)

- [ ] **Step 4: i18n 빌드 — 경고 0 확인**

Run: `cd v4 && npm run build:i18n 2>&1 | grep -i "누락\|missing\|warn" || echo "경고 없음"`
Expected: `경고 없음` (CONTENTFLOW 미설정 블로그 skip 경고는 무관 — 프로그램 이미지 누락 경고만 0이면 됨)

- [ ] **Step 5: 산출 HTML 의 모든 programs/images src 가 실존 파일인지 점검**

Run:
```bash
cd v4 && node -e '
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");
const langs = ["ko","th","vi","en"];
const pages = ["index.html","clinic.html","cases.html","calculator.html"];
let bad = 0;
for (const lang of langs) for (const pg of pages) {
  const fp = join("public", lang, pg);
  if (!existsSync(fp)) continue;
  const html = readFileSync(fp, "utf8");
  const re = /\/programs\/images\/[a-z0-9_\/.-]+\.(?:jpe?g|png|webp)/gi;
  for (const m of html.match(re) || []) {
    const f = join("public", m);
    if (!existsSync(f)) { console.log(`${lang}/${pg}: MISSING ${m}`); bad++; }
  }
}
console.log(bad === 0 ? "OK — 모든 이미지 src 실존" : `FAIL — ${bad}건 누락`);
'
```
Expected: `OK — 모든 이미지 src 실존`

- [ ] **Step 6: ko=한국어본, th=번역7+나머지한국어본, vi/en=한국어본 fallback 확인(스팟 체크)**

Run:
```bash
cd v4 && grep -o '/programs/images/[a-z_/.0-9-]*director\.jpg' public/th/index.html | head -1; \
grep -o '/programs/images/[a-z_/.0-9-]*hero\.jpg' public/th/index.html | head -1; \
grep -o '/programs/images/[a-z_/.0-9-]*card-1\.jpg' public/en/index.html | head -1
```
Expected:
```
/programs/images/th/growth-hormone-balance/director.jpg   (th 번역본)
/programs/images/_common/growth-hormone-balance/hero.jpg  (th → _common fallback)
/programs/images/_common/late-growth/card-1.jpg           (en → _common fallback)
```

---

### Task 7: 문서 갱신

**Files:**
- Modify: `CLAUDE.md`(루트) — "다국어 자산 처리" 의 프로그램 이미지 줄
- Modify: `v4/CLAUDE.md` — i18n "다국어 자산 처리" 항목

- [ ] **Step 1: 루트 `CLAUDE.md` 의 프로그램 이미지 설명 갱신**

루트 `CLAUDE.md` "다국어 자산 처리" 의:
```
- **프로그램 이미지**: 한국어는 기존 `public/programs/images/{slug}/` 유지. 비한국어는 `public/programs/images/{lang}/{slug}/` (사용자가 직접 채움 — 공통 이미지도 복사). 빌드가 lang별로 URL swap
```
를:
```
- **프로그램 이미지**: `_common/{slug}/` = 한국어 기본본(전 언어 fallback), `{lang}/{slug}/` = 번역 오버라이드만. 빌드(`lib/program-img.mjs`)가 참조마다 1단계 fallback 해석: `{lang}/{slug}/{file}` 있으면 그것, 없으면 `_common/{slug}/{file}`. 미번역 언어는 자동으로 한국어본 노출(404 차단). 별도 `ko/` 폴더 없음
```
로 교체.

- [ ] **Step 2: `.gitignore`/tracked 경로 설명 갱신**

루트 `CLAUDE.md` 의 "소스(... `programs/images/{lang}/{slug}/`)는 tracked" 부분에서 경로를 `programs/images/{_common,th,vi,en}/{slug}/` 로 갱신(빌드 산출 ignore 규칙엔 영향 없음 — `public/{ko,th,vi,en}/*.html` 만 ignore).

- [ ] **Step 3: `v4/CLAUDE.md` 동일 취지 갱신**

`v4/CLAUDE.md` 에 프로그램 이미지 fallback 구조를 언급하는 항목이 있으면 위와 동일하게 갱신(없으면 skip — "문서 갱신 불필요").

- [ ] **Step 4: 빌드 재확인 (문서 변경은 빌드 무관, 안전 확인)**

Run: `cd v4 && npm run build:i18n 2>&1 | tail -3`
Expected: `[i18n] done — 4 locale(s)`

- [ ] **Step 5: 마이그레이션 커밋 (※ "업데이트" 시에만 — Task 2~7 한 커밋)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(i18n): 프로그램 이미지 _common+언어오버라이드 구조로 재편

- 화이트리스트 49개 한국어본을 _common/{slug}/ 로 모음
- 진짜 태국어 번역 7개만 th/{slug}/ 유지, 나머지 th 사본·orphan·stray png 삭제
- 빌드 swap 을 1단계 fallback(언어 폴더 우선 → _common)으로 교체
- 안 쓰는 루트 orphan 30개 + 폐기 정적 HTML 8개 삭제
EOF
)"
```

---

## Self-Review (작성자 체크 완료)

- **스펙 커버리지**: 폴더 재편(Task 3~5) / orphan·정적 폐기(Task 3·6) / 1단계 fallback 빌드(Task 1·2) / 검증(Task 6 Step 4~6) / 롤백=한 커밋(Task 7 Step 5) — 스펙 전 항목 대응됨.
- **Placeholder 스캔**: TBD/TODO 없음. 모든 코드·명령·기대출력 구체화됨.
- **타입 일관성**: `resolveProgramImgPath(lang,slug,file,exists)` / `localizeProgramImages(html,lang,imagesRoot,warn)` 시그니처가 Task 1 정의 ↔ Task 2 호출에서 일치. `IMG_RE` 는 `jpe?g|png|webp` 커버(compare-1vs6.webp 포함).
- **위험 노트**: Task 2 단독 상태는 빌드가 깨진 중간 상태 → Task 2~7을 한 커밋으로 묶어 해소(스펙 롤백 정책과 일치). 커밋 자체는 "업데이트" 전까지 보류.
