# i18n + Blog Infrastructure Implementation Plan

> **Status (2026-05-18):** Phase 0–5 of this plan shipped under the `/test/` staging path (commit `c965a99` restored translations from worktree). **Phase 6 promoted on 2026-05-18** — all output paths moved from `/test/{lang}/` to `/{lang}/` and `SITE_PATH_PREFIX` default changed to `''`. See [memory phase6_i18n_root_promotion.md](../../../../.claude/projects/c--projects-dflo-0-1/memory/phase6_i18n_root_promotion.md) for the promotion diff. Path strings below still say `/test/...` since that's what the original tasks built — current code lives under `/{lang}/`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the i18n + SEO + blog infrastructure that lets `/test/index.html` render as 4 localized pages (ko/th/vi/en) with full SEO surface, per-country messenger CTAs, and a blog system fed from ContentFlow's existing 연세새봄의원 project data.

**Architecture:** Node ESM build script + YAML locale files + HTML template. No framework. Templates use `{{key.path}}` placeholders. ContentFlow exposes a new public read-only endpoint for published blog posts; dflo fetches at build time and caches to JSON. Built output goes to `public/test/{lang}/` and is served as static files by Vite (current `/test/` HardRedirect pattern extends to `/test/{lang}/`).

**Tech Stack:** Node 20+ (built-in `--test` runner), js-yaml, marked (Markdown for blog), Next.js 16 App Router (ContentFlow side), Supabase service role (server-only).

**Related:** `docs/superpowers/specs/2026-05-13-i18n-blog-infrastructure-design.md`

---

## Phase 0 — Foundation (Tasks 1-5)

### Task 1: Set up i18n directory + dependency

**Files:**
- Create: `v4/i18n/.gitkeep`
- Modify: `v4/package.json`

- [ ] **Step 1: Create directory skeleton**

Run:
```bash
mkdir -p v4/i18n/locales v4/i18n/template v4/i18n/blog-cache v4/scripts/lib
touch v4/i18n/.gitkeep
```

- [ ] **Step 2: Add js-yaml + marked dependencies**

Run from `v4/`:
```bash
npm install --save-dev js-yaml marked
```

Verify in `v4/package.json` devDependencies includes `"js-yaml"` and `"marked"`.

- [ ] **Step 3: Verify Node version**

Run: `node --version`
Expected: `v20.x.x` or higher (built-in `--test` runner required).

- [ ] **Step 4: Commit**

```bash
cd v4
git add package.json package-lock.json i18n/
git commit -m "chore: scaffold i18n directory + js-yaml/marked deps"
```

---

### Task 2: Extract Korean strings from `/test/index.html` to `i18n/locales/ko.yml`

**Files:**
- Create: `v4/i18n/locales/ko.yml`
- Reference: `v4/public/test/index.html` (do not modify yet)

- [ ] **Step 1: Read `/test/index.html` body sections**

Read `v4/public/test/index.html` lines 449–1100. Identify every Korean text node inside the `<body>`. Group by section (hero / intro / medal / confirm-timing / hormone / intro2 / obesity / precocious / proportion / bodywork / late / process / director).

- [ ] **Step 2: Write `ko.yml` mirroring the 13-section structure**

Create `v4/i18n/locales/ko.yml`:
```yaml
meta:
  lang: ko
  og_locale: ko_KR
  title: "성장 프로그램 소개 | 187 성장클리닉"

hero:
  title_line1: "우리 아이 키,"
  title_line2: "지금 어디쯤일까요?"
  logo_alt: "187 성장클리닉"
  hero_img_alt: "연세새봄의원 187 성장클리닉 대표 이미지"

intro:
  h2_line1: "아이의 성장은"
  h2_accent: "성장호르몬 하나로만"
  h2_line2: " 결정되지 않습니다"
  body: |
    사춘기 진행, 수면, 갑상선, 스트레스, 체중, 자세까지
    함께 살펴야 건강한 성장 방향을 잡을 수 있습니다.
    연세새봄은 아이의 성장 방해 요인을 통합적으로 확인합니다.

medal:
  panel_alt: "모델 에이전시 지정 병원, 운동선수 모델 특화 클리닉 안내"

check:
  eyebrow: "우리 아이에게 필요할까?"
  heading_part1: "성장 검사를 "
  heading_accent: "고려해볼 수 있는 경우"
  cards:
    - alt: "또래보다 키가 작은 아이"
      caption_line1: "또래보다 키가"
      caption_line2: "눈에 띄게 작은 경우"
    - alt: "성장 속도가 느린 아이"
      caption_line1: "최근 1년 성장 속도가"
      caption_line2: "느린 경우"
    - alt: "성장 속도가 갑자기 변한 아이"
      caption_line1: "성장 속도가"
      caption_line2: "갑자기 변한 경우"
    - alt: "평균 키보다 작은 아이"
      caption_line1: "평균 키보다"
      caption_line2: "10cm 이상 작은 경우"
    - alt: "자세와 체형 불균형이 있는 아이"
      caption_line1: "자세·체형 불균형이"
      caption_line2: "있는 경우"
    - alt: "호르몬 이상이 의심되는 아이"
      caption_line1: "호르몬 이상이"
      caption_line2: "의심되는 경우"

golden:
  eyebrow: "성장 치료의 골든타임"
  heading_part1: "키 성장 "
  heading_accent: "확인 시기"
  heading_part2: "는 언제일까요?"
  img_alt: "남자아이와 여자아이 성장 치료 시기 안내"
  lead: |
    성장 치료의 효과는 <strong>성장판 상태와 사춘기 진행 정도</strong>에 따라 달라질 수 있습니다.
    검사는 치료 결정과 별개로 진행할 수 있으므로,
    성장 속도가 걱정된다면 먼저 현재 상태를 확인해보는 것이 좋습니다.

# Continue for remaining sections — hormone / intro2 / obesity / precocious /
# proportion / bodywork / late / process / director.
# Use the same nested mirror pattern as above. Read each section in
# v4/public/test/index.html and extract every Korean string into this file.

cta_global:
  header_consult: "1:1 상담"
  bottom_nav_consult: "예상키 측정"
  inline_cta_arrow: "→"
```

(Continue extraction for all 13 sections — section-by-section. Final file should be ~250–400 lines.)

- [ ] **Step 3: Verify YAML parses cleanly**

Create temp file `v4/scripts/check-yaml.mjs`:
```js
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
const doc = yaml.load(readFileSync('i18n/locales/ko.yml', 'utf8'));
console.log('Sections:', Object.keys(doc));
console.log('Card count:', doc.check.cards.length);
```

Run: `cd v4 && node scripts/check-yaml.mjs`
Expected: Lists top-level keys (meta, hero, intro, medal, check, golden, ...) and prints `Card count: 6`.

Delete the temp file: `rm v4/scripts/check-yaml.mjs`

- [ ] **Step 4: Commit**

```bash
cd v4
git add i18n/locales/ko.yml
git commit -m "feat(i18n): extract Korean strings from /test/index.html to ko.yml"
```

---

### Task 3: Create `template/index.html` with `{{placeholders}}`

**Files:**
- Create: `v4/i18n/template/index.html`
- Reference: `v4/public/test/index.html`

- [ ] **Step 1: Copy `/test/index.html` to template**

```bash
cd v4
cp public/test/index.html i18n/template/index.html
```

- [ ] **Step 2: Replace every Korean string with placeholder**

Edit `v4/i18n/template/index.html`. For every Korean text node identified in Task 2, replace with the matching `{{path.to.key}}` placeholder.

Examples:
- `<title>성장 프로그램 소개 | 187 성장클리닉</title>` → `<title>{{meta.title}}</title>`
- `<h1>우리 아이 키,<br>지금 어디쯤일까요?</h1>` → `<h1>{{hero.title_line1}}<br>{{hero.title_line2}}</h1>`
- `<img class="logo" src="/images/logo.jpg" alt="187 성장클리닉">` → `<img class="logo" src="/images/logo.jpg" alt="{{hero.logo_alt}}">`
- Loop sections like `check.cards[]` use `{{#each check.cards}}<div>...</div>{{/each}}` syntax (the renderer in Task 4 implements this with a simple iteration).

Replace asset paths `../programs/images/...` with `/programs/images/...` (absolute from site root) so they work from `/test/{lang}/`.

Add `<html lang="{{meta.lang}}">` at line 2.

- [ ] **Step 3: Verify no Korean characters remain in template**

Run: `cd v4 && grep -P '[\x{AC00}-\x{D7A3}]' i18n/template/index.html | head -5`
Expected: no output (all Korean replaced).

If output appears: replace those strings too. If a Korean string is in a `<style>` block (CSS comment), it's fine to keep — only `<body>` content needs translation.

- [ ] **Step 4: Commit**

```bash
cd v4
git add i18n/template/index.html
git commit -m "feat(i18n): create HTML template with placeholders"
```

---

### Task 4: Write minimal renderer + round-trip test

**Files:**
- Create: `v4/scripts/lib/render.mjs`
- Create: `v4/scripts/test/render.test.mjs`

- [ ] **Step 1: Write failing test**

Create `v4/scripts/test/render.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { render } from '../lib/render.mjs';

test('render replaces simple {{key}} placeholder', () => {
  const out = render('Hello {{name}}!', { name: 'World' });
  assert.equal(out, 'Hello World!');
});

test('render walks nested paths', () => {
  const out = render('{{a.b.c}}', { a: { b: { c: 'deep' } } });
  assert.equal(out, 'deep');
});

test('render preserves text without placeholders', () => {
  const out = render('plain text', {});
  assert.equal(out, 'plain text');
});

test('render handles {{#each list}} blocks', () => {
  const tpl = '{{#each items}}<li>{{name}}</li>{{/each}}';
  const out = render(tpl, { items: [{ name: 'a' }, { name: 'b' }] });
  assert.equal(out, '<li>a</li><li>b</li>');
});

test('render throws on missing key', () => {
  assert.throws(() => render('{{missing}}', {}), /missing/);
});
```

- [ ] **Step 2: Run test (should fail — render.mjs missing)**

Run: `cd v4 && node --test scripts/test/render.test.mjs`
Expected: FAIL with "Cannot find module '../lib/render.mjs'".

- [ ] **Step 3: Implement `render.mjs`**

Create `v4/scripts/lib/render.mjs`:
```js
function resolvePath(data, path) {
  const parts = path.split('.');
  let cur = data;
  for (const p of parts) {
    if (cur == null || !(p in cur)) {
      throw new Error(`missing key: ${path}`);
    }
    cur = cur[p];
  }
  return cur;
}

function renderEach(template, data) {
  const eachRe = /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  return template.replace(eachRe, (_match, listPath, inner) => {
    const list = resolvePath(data, listPath);
    if (!Array.isArray(list)) {
      throw new Error(`{{#each ${listPath}}} target is not an array`);
    }
    return list.map((item) => render(inner, item)).join('');
  });
}

export function render(template, data) {
  let out = renderEach(template, data);
  const simpleRe = /\{\{\s*([\w.]+)\s*\}\}/g;
  out = out.replace(simpleRe, (_match, path) => String(resolvePath(data, path)));
  return out;
}
```

- [ ] **Step 4: Run test (should pass)**

Run: `cd v4 && node --test scripts/test/render.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd v4
git add scripts/lib/render.mjs scripts/test/render.test.mjs
git commit -m "feat(i18n): minimal template renderer with {{placeholder}} + {{#each}}"
```

---

### Task 5: Build script renders ko → `/test/ko/index.html` (round-trip)

**Files:**
- Create: `v4/scripts/build-i18n.mjs`
- Create: `v4/scripts/test/build-i18n.test.mjs`

- [ ] **Step 1: Write round-trip test**

Create `v4/scripts/test/build-i18n.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

test('build:i18n generates /test/ko/index.html with no placeholders left', () => {
  execSync('node scripts/build-i18n.mjs', { cwd: process.cwd(), stdio: 'pipe' });

  const outPath = 'public/test/ko/index.html';
  assert.ok(existsSync(outPath), `${outPath} should exist after build`);

  const html = readFileSync(outPath, 'utf8');
  assert.ok(!/\{\{[^}]+\}\}/.test(html), 'no {{placeholder}} should remain');
  assert.ok(/<html\s+lang="ko"/.test(html), 'html lang attribute should be ko');
  assert.ok(html.includes('우리 아이 키'), 'should contain Korean hero copy');
});
```

- [ ] **Step 2: Run test (should fail)**

Run: `cd v4 && node --test scripts/test/build-i18n.test.mjs`
Expected: FAIL with "Cannot find module" or build script error.

- [ ] **Step 3: Implement `build-i18n.mjs`**

Create `v4/scripts/build-i18n.mjs`:
```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';
import { render } from './lib/render.mjs';

const ROOT = process.cwd();
const ACTIVE_LANGS = ['ko'];   // expanded in Task 6

function loadLocale(lang) {
  const path = join(ROOT, 'i18n/locales', `${lang}.yml`);
  return yaml.load(readFileSync(path, 'utf8'));
}

function writeFile(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  console.log(`  wrote ${path}`);
}

function buildLocale(lang) {
  console.log(`[i18n] building ${lang}`);
  const data = loadLocale(lang);
  const template = readFileSync(join(ROOT, 'i18n/template/index.html'), 'utf8');
  const html = render(template, data);
  writeFile(join(ROOT, 'public/test', lang, 'index.html'), html);
}

function main() {
  for (const lang of ACTIVE_LANGS) {
    buildLocale(lang);
  }
  console.log(`[i18n] done — ${ACTIVE_LANGS.length} locale(s)`);
}

main();
```

- [ ] **Step 4: Run test (should pass)**

Run: `cd v4 && node --test scripts/test/build-i18n.test.mjs`
Expected: PASS, with `public/test/ko/index.html` created.

- [ ] **Step 5: Visual round-trip check**

Manually compare `public/test/index.html` (original) and `public/test/ko/index.html` (built). They should be visually identical when opened in a browser (asset paths may differ — original uses `../programs/`, built uses `/programs/`).

Run: `cd v4 && ls -la public/test/ko/index.html public/test/index.html`
Expected: both exist; built version typically ±5% size of original.

- [ ] **Step 6: Add npm scripts**

Edit `v4/package.json` scripts:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && npm run build:i18n && vite build",
  "build:i18n": "node scripts/build-i18n.mjs",
  "test:i18n": "node --test scripts/test/",
  "start": "vite preview --port ${PORT:-3000} --host 0.0.0.0",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

Verify: `cd v4 && npm run test:i18n` runs and passes both test files.

- [ ] **Step 7: Commit**

```bash
cd v4
git add scripts/build-i18n.mjs scripts/test/build-i18n.test.mjs package.json
git commit -m "feat(i18n): build script renders ko locale to /test/ko/index.html"
```

---

## Phase 1 — Multi-language Stub Builds (Tasks 6-7)

### Task 6: Add th/vi/en stub locales + multi-lang build loop

**Files:**
- Create: `v4/i18n/locales/th.yml`, `vi.yml`, `en.yml`
- Modify: `v4/scripts/build-i18n.mjs:8`

- [ ] **Step 1: Generate stub locale files from ko.yml shape**

Create helper `v4/scripts/seed-stub-locales.mjs`:
```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';

const STUBS = ['th', 'vi', 'en'];
const PLACEHOLDER = '[NEEDS TRANSLATION]';

function stubify(value) {
  if (typeof value === 'string') return PLACEHOLDER;
  if (Array.isArray(value)) return value.map(stubify);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = stubify(value[k]);
    return out;
  }
  return value;
}

const ko = yaml.load(readFileSync('i18n/locales/ko.yml', 'utf8'));

for (const lang of STUBS) {
  const path = `i18n/locales/${lang}.yml`;
  if (existsSync(path)) {
    console.log(`skip ${path} (exists)`);
    continue;
  }
  const stub = stubify(ko);
  stub.meta = { lang, og_locale: { th: 'th_TH', vi: 'vi_VN', en: 'en_US' }[lang], title: PLACEHOLDER };
  writeFileSync(path, yaml.dump(stub, { lineWidth: 100 }));
  console.log(`wrote ${path}`);
}
```

Run: `cd v4 && node scripts/seed-stub-locales.mjs`
Expected: Creates `th.yml`, `vi.yml`, `en.yml` with all string values = `[NEEDS TRANSLATION]`.

Delete the helper: `rm v4/scripts/seed-stub-locales.mjs`

- [ ] **Step 2: Activate 4 languages in build loop**

Edit `v4/scripts/build-i18n.mjs` line 8:
```js
const ACTIVE_LANGS = ['ko', 'th', 'vi', 'en'];
```

- [ ] **Step 3: Run build + verify**

Run: `cd v4 && npm run build:i18n`
Expected output mentions `building ko / th / vi / en` and 4 `public/test/{lang}/index.html` files exist.

Run: `ls v4/public/test/{ko,th,vi,en}/index.html`
Expected: all 4 exist.

- [ ] **Step 4: Verify stub locales render with NEEDS TRANSLATION markers**

Run: `grep -c "NEEDS TRANSLATION" v4/public/test/th/index.html`
Expected: dozens of matches (every string slot).

Run: `grep -c "NEEDS TRANSLATION" v4/public/test/ko/index.html`
Expected: 0 (ko has real content).

- [ ] **Step 5: Commit**

```bash
cd v4
git add i18n/locales/th.yml i18n/locales/vi.yml i18n/locales/en.yml scripts/build-i18n.mjs
git commit -m "feat(i18n): activate 4-lang build with th/vi/en stub locales"
```

---

### Task 7: Add ja/zh-tw/id stub locales (infra-only, not active)

**Files:**
- Create: `v4/i18n/locales/ja.yml`, `zh-tw.yml`, `id.yml`

- [ ] **Step 1: Re-create seed helper temporarily**

Create `v4/scripts/seed-stub-locales.mjs` (same as Task 6 but with extended STUBS):
```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';

const STUBS = ['ja', 'zh-tw', 'id'];
const LANG_META = {
  ja: { og_locale: 'ja_JP' },
  'zh-tw': { og_locale: 'zh_TW' },
  id: { og_locale: 'id_ID' },
};
const PLACEHOLDER = '[NEEDS TRANSLATION]';

function stubify(value) {
  if (typeof value === 'string') return PLACEHOLDER;
  if (Array.isArray(value)) return value.map(stubify);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = stubify(value[k]);
    return out;
  }
  return value;
}

const ko = yaml.load(readFileSync('i18n/locales/ko.yml', 'utf8'));
for (const lang of STUBS) {
  const path = `i18n/locales/${lang}.yml`;
  if (existsSync(path)) continue;
  const stub = stubify(ko);
  stub.meta = { lang, og_locale: LANG_META[lang].og_locale, title: PLACEHOLDER };
  writeFileSync(path, yaml.dump(stub, { lineWidth: 100 }));
  console.log(`wrote ${path}`);
}
```

Run: `cd v4 && node scripts/seed-stub-locales.mjs && rm scripts/seed-stub-locales.mjs`
Expected: Creates ja/zh-tw/id YAML files.

- [ ] **Step 2: Do NOT add these to ACTIVE_LANGS yet**

Verify `v4/scripts/build-i18n.mjs` still has `ACTIVE_LANGS = ['ko', 'th', 'vi', 'en']`. ja/zh-tw/id are infra-ready but not built.

- [ ] **Step 3: Commit**

```bash
cd v4
git add i18n/locales/ja.yml i18n/locales/zh-tw.yml i18n/locales/id.yml
git commit -m "feat(i18n): add ja/zh-tw/id stub locales (infra-only, not in build)"
```

---

## Phase 2 — Messenger Routing (Tasks 8-9)

### Task 8: messenger.yml + `getMessengerCTA()` helper

**Files:**
- Create: `v4/i18n/messenger.yml`
- Create: `v4/scripts/lib/messenger.mjs`
- Create: `v4/scripts/test/messenger.test.mjs`

- [ ] **Step 1: Create `messenger.yml`**

Create `v4/i18n/messenger.yml`:
```yaml
ko:
  channel: kakao
  url: "https://pf.kakao.com/_ZxneSb"
  label: "1:1 카카오톡 상담"
  color_bg: "#FAE100"
  color_fg: "#3C1E1E"
th:
  channel: kakao
  url: "https://pf.kakao.com/_ZxneSb"
  label: "ปรึกษาผ่าน KakaoTalk"
  color_bg: "#FAE100"
  color_fg: "#3C1E1E"
vi:
  channel: kakao
  url: "https://pf.kakao.com/_ZxneSb"
  label: "Tư vấn qua KakaoTalk"
  color_bg: "#FAE100"
  color_fg: "#3C1E1E"
en:
  channel: kakao
  url: "https://pf.kakao.com/_ZxneSb"
  label: "Consult via KakaoTalk"
  color_bg: "#FAE100"
  color_fg: "#3C1E1E"
ja:
  channel: line
  url: "TBD"
  label: "LINEで相談"
  color_bg: "#06C755"
  color_fg: "#FFFFFF"
zh-tw:
  channel: line
  url: "TBD"
  label: "LINE 諮詢"
  color_bg: "#06C755"
  color_fg: "#FFFFFF"
id:
  channel: whatsapp
  url: "TBD"
  label: "Konsultasi WhatsApp"
  color_bg: "#25D366"
  color_fg: "#FFFFFF"
```

- [ ] **Step 2: Write failing test**

Create `v4/scripts/test/messenger.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { getMessengerCTA } from '../lib/messenger.mjs';

test('returns Kakao for ko', () => {
  const cta = getMessengerCTA('ko');
  assert.equal(cta.channel, 'kakao');
  assert.match(cta.url, /pf\.kakao\.com/);
  assert.equal(cta.color_bg, '#FAE100');
});

test('returns Kakao fallback for th/vi/en (1차 launch)', () => {
  for (const lang of ['th', 'vi', 'en']) {
    const cta = getMessengerCTA(lang);
    assert.equal(cta.channel, 'kakao', `${lang} should fallback to kakao`);
    assert.ok(cta.url.startsWith('https://'), `${lang} url should be live`);
  }
});

test('throws if active lang has TBD url', () => {
  // ja is stub (TBD) but not in ACTIVE_LANGS, so this only triggers
  // when caller passes a TBD lang as "active".
  assert.throws(
    () => getMessengerCTA('ja', { requireLiveUrl: true }),
    /TBD/,
  );
});

test('returns stub data without requireLiveUrl', () => {
  const cta = getMessengerCTA('ja');
  assert.equal(cta.channel, 'line');
  assert.equal(cta.url, 'TBD');
});
```

- [ ] **Step 3: Run test (should fail)**

Run: `cd v4 && node --test scripts/test/messenger.test.mjs`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement `messenger.mjs`**

Create `v4/scripts/lib/messenger.mjs`:
```js
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

let cached = null;
function load() {
  if (!cached) {
    cached = yaml.load(readFileSync('i18n/messenger.yml', 'utf8'));
  }
  return cached;
}

export function getMessengerCTA(lang, opts = {}) {
  const all = load();
  const cta = all[lang];
  if (!cta) throw new Error(`no messenger config for lang: ${lang}`);
  if (opts.requireLiveUrl && cta.url === 'TBD') {
    throw new Error(`messenger URL for ${lang} is TBD — populate i18n/messenger.yml`);
  }
  return cta;
}
```

- [ ] **Step 5: Run test (should pass)**

Run: `cd v4 && node --test scripts/test/messenger.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd v4
git add i18n/messenger.yml scripts/lib/messenger.mjs scripts/test/messenger.test.mjs
git commit -m "feat(i18n): messenger.yml + getMessengerCTA helper (4 active, 3 stub)"
```

---

### Task 9: Inject messenger CTAs into template

**Files:**
- Modify: `v4/i18n/template/index.html` (CTA `<a href>` and `<span>` slots)
- Modify: `v4/scripts/build-i18n.mjs` (merge messenger data into render context)

- [ ] **Step 1: Locate existing KakaoTalk CTAs in template**

Run: `cd v4 && grep -n "pf.kakao.com" i18n/template/index.html`
Expected: Lists every hard-coded KakaoTalk URL line (header CTA + 5 inline `case-cta-inline` + bottom-nav).

- [ ] **Step 2: Replace hard-coded URLs with placeholders**

Edit `v4/i18n/template/index.html`. For each CTA `<a>` tag:

Before:
```html
<a class="case-cta-inline" href="https://pf.kakao.com/_ZxneSb" target="_blank" rel="noopener" data-source="case_obesity">
  우리 아이 비만 · 성장이 걱정되신다면 1:1 전문 상담 <span class="arrow">→</span>
</a>
```

After:
```html
<a class="case-cta-inline" href="{{messenger.url}}" target="_blank" rel="noopener"
   data-source="case_obesity" data-channel="{{messenger.channel}}"
   style="background:{{messenger.color_bg}}; color:{{messenger.color_fg}}">
  {{obesity.cta_label}} <span class="arrow">{{cta_global.inline_cta_arrow}}</span>
</a>
```

Apply the same pattern to:
- Header `.t-header-kakao` pill (uses `{{cta_global.header_consult}}` as label)
- Bottom nav consult tab
- All 5 inline `case-cta-inline` in `#obesity / #precocious / #proportion / #bodywork / #late`

Each section's `cta_label` lives in its YAML node (e.g., `obesity.cta_label` already in ko.yml from Task 2). If a section's `cta_label` is missing in ko.yml, add it.

- [ ] **Step 3: Merge messenger into render context**

Edit `v4/scripts/build-i18n.mjs` `buildLocale` function:
```js
import { getMessengerCTA } from './lib/messenger.mjs';
// ...

function buildLocale(lang) {
  console.log(`[i18n] building ${lang}`);
  const data = loadLocale(lang);
  data.messenger = getMessengerCTA(lang, { requireLiveUrl: true });
  const template = readFileSync(join(ROOT, 'i18n/template/index.html'), 'utf8');
  const html = render(template, data);
  writeFile(join(ROOT, 'public/test', lang, 'index.html'), html);
}
```

- [ ] **Step 4: Rebuild + verify**

Run: `cd v4 && npm run build:i18n`
Expected: Builds 4 langs successfully (all use Kakao URL).

Run: `grep -c "pf.kakao.com" public/test/ko/index.html`
Expected: ≥6 (header + 5 inline + bottom nav).

Run: `grep "data-channel" public/test/en/index.html | head -2`
Expected: Lines containing `data-channel="kakao"`.

- [ ] **Step 5: Commit**

```bash
cd v4
git add i18n/template/index.html scripts/build-i18n.mjs
git commit -m "feat(i18n): wire all messenger CTAs through messenger.yml helper"
```

---

## Phase 3 — SEO Surface (Tasks 10-13)

### Task 10: seo.yml + meta tag injection

**Files:**
- Create: `v4/i18n/seo.yml`
- Create: `v4/scripts/lib/seo.mjs`
- Create: `v4/scripts/test/seo.test.mjs`
- Modify: `v4/i18n/template/index.html` (`<head>` section)
- Modify: `v4/scripts/build-i18n.mjs`

- [ ] **Step 1: Create `seo.yml`**

Create `v4/i18n/seo.yml`:
```yaml
ko:
  title: "187 성장클리닉 | 우리 아이 예상키 무료 측정"
  description: "사춘기·수면·체중·자세까지 통합 분석. 연세새봄 187 성장클리닉의 다각도 성장 관리. 예상키 무료 측정 + 1:1 카카오톡 상담."
  og_image: "/test/og/og-ko.jpg"
  faq:
    - q: "성장 검사는 몇 살부터 받을 수 있나요?"
      a: "만 3세부터 가능합니다. 또래보다 키가 작거나 성장 속도가 느린 경우 조기 검사를 권장합니다."
    - q: "성장호르몬 치료는 모든 아이에게 효과가 있나요?"
      a: "성장판이 닫히기 전, 호르몬 분비량이 부족한 경우에 가장 효과적입니다. 검사로 적합 여부를 먼저 확인합니다."
    - q: "치료 비용은 얼마나 드나요?"
      a: "검사 종류와 치료 방법에 따라 다릅니다. 1:1 상담을 통해 개별 안내드립니다."
    - q: "성조숙증은 왜 관리해야 하나요?"
      a: "사춘기가 또래보다 1년 이상 빠르면 성장판이 일찍 닫혀 최종 키 손실로 이어질 수 있습니다."
    - q: "비대면 상담도 가능한가요?"
      a: "카카오톡으로 1차 상담 가능합니다. 정밀 검사·치료는 내원이 필요합니다."

th:
  title: "[NEEDS TRANSLATION]"
  description: "[NEEDS TRANSLATION]"
  og_image: "/test/og/og-th.jpg"
  faq: []

vi:
  title: "[NEEDS TRANSLATION]"
  description: "[NEEDS TRANSLATION]"
  og_image: "/test/og/og-vi.jpg"
  faq: []

en:
  title: "[NEEDS TRANSLATION]"
  description: "[NEEDS TRANSLATION]"
  og_image: "/test/og/og-en.jpg"
  faq: []
```

- [ ] **Step 2: Write failing test**

Create `v4/scripts/test/seo.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { buildHead, buildHreflang, buildSeo } from '../lib/seo.mjs';

test('buildSeo returns ko-specific title/description', () => {
  const seo = buildSeo('ko');
  assert.match(seo.title, /187 성장클리닉/);
  assert.ok(seo.description.length > 50);
});

test('buildHreflang emits 7 alternates + x-default', () => {
  const tags = buildHreflang();
  assert.ok(tags.includes('hreflang="ko"'));
  assert.ok(tags.includes('hreflang="th"'));
  assert.ok(tags.includes('hreflang="vi"'));
  assert.ok(tags.includes('hreflang="en"'));
  assert.ok(tags.includes('hreflang="ja"'));
  assert.ok(tags.includes('hreflang="zh-TW"'));
  assert.ok(tags.includes('hreflang="id"'));
  assert.ok(tags.includes('hreflang="x-default"'));
});

test('buildHead includes canonical for the given lang', () => {
  const head = buildHead('ko');
  assert.ok(head.includes('rel="canonical" href="https://www.dr187growup.com/ko/"'));
  assert.ok(head.includes('property="og:locale" content="ko_KR"'));
});
```

- [ ] **Step 3: Implement `seo.mjs`**

Create `v4/scripts/lib/seo.mjs`:
```js
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const ORIGIN = 'https://www.dr187growup.com';
const ALL_LANGS = ['ko', 'th', 'vi', 'en', 'ja', 'zh-tw', 'id'];
const HREFLANG_MAP = { ko: 'ko', th: 'th', vi: 'vi', en: 'en', ja: 'ja', 'zh-tw': 'zh-TW', id: 'id' };
const OG_LOCALE_MAP = { ko: 'ko_KR', th: 'th_TH', vi: 'vi_VN', en: 'en_US', ja: 'ja_JP', 'zh-tw': 'zh_TW', id: 'id_ID' };

let cached = null;
function loadSeo() {
  if (!cached) cached = yaml.load(readFileSync('i18n/seo.yml', 'utf8'));
  return cached;
}

export function buildSeo(lang) {
  const data = loadSeo();
  const entry = data[lang];
  if (!entry) throw new Error(`no seo config for lang: ${lang}`);
  return entry;
}

export function buildHreflang(path = '/') {
  return ALL_LANGS.map((lang) => {
    const hrefLang = HREFLANG_MAP[lang];
    return `<link rel="alternate" hreflang="${hrefLang}" href="${ORIGIN}/${lang}${path}">`;
  }).concat([
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/ko${path}">`,
  ]).join('\n  ');
}

export function buildHead(lang, opts = {}) {
  const path = opts.path || '/';
  const seo = buildSeo(lang);
  const ogLocale = OG_LOCALE_MAP[lang];
  return [
    `<title>${seo.title}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}">`,
    `<link rel="canonical" href="${ORIGIN}/${lang}${path}">`,
    buildHreflang(path),
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="${ogLocale}">`,
    `<meta property="og:title" content="${escapeAttr(seo.title)}">`,
    `<meta property="og:description" content="${escapeAttr(seo.description)}">`,
    `<meta property="og:image" content="${ORIGIN}${seo.og_image}">`,
    `<meta property="og:url" content="${ORIGIN}/${lang}${path}">`,
  ].join('\n  ');
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
```

- [ ] **Step 4: Run test (should pass)**

Run: `cd v4 && node --test scripts/test/seo.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Inject buildHead into template**

Edit `v4/i18n/template/index.html`. Find the `<head>` block (around line 3). Replace the existing `<title>` and add a placeholder right after `<meta name="viewport">`:

```html
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{{seo_head}}
<link rel="stylesheet" href="/test/_shell.css">
...
```

Remove the original `<title>{{meta.title}}</title>` line — replaced by `{{seo_head}}`.

Note: also update `<link rel="stylesheet" href="_shell.css">` → `href="/test/_shell.css"` (absolute path needed from `/test/{lang}/`).

- [ ] **Step 6: Merge seo into build context**

Edit `v4/scripts/build-i18n.mjs`:
```js
import { buildHead } from './lib/seo.mjs';
// ...
function buildLocale(lang) {
  console.log(`[i18n] building ${lang}`);
  const data = loadLocale(lang);
  data.messenger = getMessengerCTA(lang, { requireLiveUrl: true });
  data.seo_head = buildHead(lang, { path: '/' });
  const template = readFileSync(join(ROOT, 'i18n/template/index.html'), 'utf8');
  const html = render(template, data);
  writeFile(join(ROOT, 'public/test', lang, 'index.html'), html);
}
```

- [ ] **Step 7: Rebuild + verify**

Run: `cd v4 && npm run build:i18n`
Expected: 4 langs built without error.

Run: `grep "hreflang" public/test/ko/index.html | head -3`
Expected: Lines like `<link rel="alternate" hreflang="ko" href="https://www.dr187growup.com/ko/">`.

Run: `grep "og:locale" public/test/en/index.html`
Expected: `<meta property="og:locale" content="en_US">`.

- [ ] **Step 8: Commit**

```bash
cd v4
git add i18n/seo.yml i18n/template/index.html scripts/lib/seo.mjs scripts/test/seo.test.mjs scripts/build-i18n.mjs
git commit -m "feat(seo): inject meta/hreflang/OG tags per locale"
```

---

### Task 11: Create OG image placeholders

**Files:**
- Create: `v4/public/test/og/og-{ko,th,vi,en}.jpg` (placeholders)
- Create: `v4/public/test/og/README.md`

- [ ] **Step 1: Generate 4 placeholder JPGs**

Use a 1×1 px JPEG placeholder for each language until real OG images are designed. Create with ImageMagick or via Node:

Create `v4/scripts/seed-og-placeholders.mjs`:
```js
import { writeFileSync, mkdirSync } from 'node:fs';
// 1x1 JPEG, minimum valid bytes
const JPEG_1x1 = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
  0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06,
  0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d,
  0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d,
  0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28,
  0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01,
  0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02,
  0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10,
  0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00,
  0x01, 0x7d, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
  0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42,
  0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0xff, 0xda, 0x00,
  0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd0, 0xff, 0xd9,
]);
mkdirSync('public/test/og', { recursive: true });
for (const lang of ['ko', 'th', 'vi', 'en']) {
  writeFileSync(`public/test/og/og-${lang}.jpg`, JPEG_1x1);
  console.log(`wrote og-${lang}.jpg`);
}
```

Run: `cd v4 && node scripts/seed-og-placeholders.mjs && rm scripts/seed-og-placeholders.mjs`
Expected: 4 placeholder JPGs created.

- [ ] **Step 2: Add README for OG image spec**

Create `v4/public/test/og/README.md`:
```markdown
# OG Images

Per-language Open Graph share images. Currently 1×1 placeholders.

## Spec (when designed)
- Size: 1200×630 px
- Format: JPG (quality 80) or PNG
- Base: 187 성장클리닉 logo + brand purple (#4A2D6B)
- Per-language text overlay (title in respective language)

## Files
- `og-ko.jpg` — Korean
- `og-th.jpg` — Thai
- `og-vi.jpg` — Vietnamese
- `og-en.jpg` — English
- (Future: og-ja, og-zh-tw, og-id)
```

- [ ] **Step 3: Commit**

```bash
cd v4
git add public/test/og/
git commit -m "feat(seo): OG image placeholders for 4 active langs (real assets TBD)"
```

---

### Task 12: JSON-LD generators (MedicalClinic, Physician, FAQPage)

**Files:**
- Create: `v4/scripts/lib/jsonld.mjs`
- Create: `v4/scripts/test/jsonld.test.mjs`
- Modify: `v4/scripts/lib/seo.mjs` (export `buildJsonLd`)
- Modify: `v4/i18n/template/index.html` (head)
- Modify: `v4/scripts/build-i18n.mjs`

- [ ] **Step 1: Write failing test**

Create `v4/scripts/test/jsonld.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { medicalClinicJsonLd, physicianJsonLd, faqPageJsonLd } from '../lib/jsonld.mjs';

test('medicalClinicJsonLd returns valid schema', () => {
  const obj = medicalClinicJsonLd('ko');
  assert.equal(obj['@context'], 'https://schema.org');
  assert.equal(obj['@type'], 'MedicalClinic');
  assert.equal(obj.name, '연세새봄의원 187 성장클리닉');
  assert.equal(obj.medicalSpecialty, 'Pediatrics');
  assert.ok(obj.url.endsWith('/ko/'));
});

test('faqPageJsonLd builds Q&A list from seo.yml', () => {
  const obj = faqPageJsonLd('ko');
  assert.equal(obj['@type'], 'FAQPage');
  assert.ok(Array.isArray(obj.mainEntity));
  assert.ok(obj.mainEntity.length >= 5);
  assert.equal(obj.mainEntity[0]['@type'], 'Question');
});

test('faqPageJsonLd returns empty mainEntity if locale has no FAQ', () => {
  const obj = faqPageJsonLd('th');
  assert.deepEqual(obj.mainEntity, []);
});

test('physicianJsonLd worksFor MedicalClinic', () => {
  const obj = physicianJsonLd('ko');
  assert.equal(obj['@type'], 'Physician');
  assert.equal(obj.worksFor['@type'], 'MedicalClinic');
});
```

- [ ] **Step 2: Run test (should fail)**

Run: `cd v4 && node --test scripts/test/jsonld.test.mjs`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `jsonld.mjs`**

Create `v4/scripts/lib/jsonld.mjs`:
```js
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const ORIGIN = 'https://www.dr187growup.com';
const CLINIC_NAME = '연세새봄의원 187 성장클리닉';
const CLINIC_PHONE = '+82-2-XXX-XXXX';  // TODO: confirm with user
const CLINIC_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: 'TBD',
  addressLocality: 'Seoul',
  addressRegion: 'Seoul',
  postalCode: 'TBD',
  addressCountry: 'KR',
};
const DIRECTOR_NAME = 'TBD';  // TODO: confirm with user

let seoCache = null;
function loadSeo() {
  if (!seoCache) seoCache = yaml.load(readFileSync('i18n/seo.yml', 'utf8'));
  return seoCache;
}

export function medicalClinicJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: CLINIC_NAME,
    url: `${ORIGIN}/${lang}/`,
    logo: `${ORIGIN}/images/logo.jpg`,
    image: `${ORIGIN}/test/og/og-${lang}.jpg`,
    medicalSpecialty: 'Pediatrics',
    telephone: CLINIC_PHONE,
    address: CLINIC_ADDRESS,
    areaServed: 'KR',
  };
}

export function physicianJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: DIRECTOR_NAME,
    medicalSpecialty: 'Pediatrics',
    worksFor: {
      '@type': 'MedicalClinic',
      name: CLINIC_NAME,
      url: `${ORIGIN}/${lang}/`,
    },
  };
}

export function faqPageJsonLd(lang) {
  const seo = loadSeo()[lang];
  const faq = (seo && Array.isArray(seo.faq)) ? seo.faq : [];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function renderJsonLd(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}
```

- [ ] **Step 4: Run test (should pass)**

Run: `cd v4 && node --test scripts/test/jsonld.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Extend `buildHead` to include JSON-LD**

Edit `v4/scripts/lib/seo.mjs` `buildHead`:
```js
import { medicalClinicJsonLd, physicianJsonLd, faqPageJsonLd, renderJsonLd } from './jsonld.mjs';

export function buildHead(lang, opts = {}) {
  const path = opts.path || '/';
  const seo = buildSeo(lang);
  const ogLocale = OG_LOCALE_MAP[lang];
  return [
    `<title>${seo.title}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}">`,
    `<link rel="canonical" href="${ORIGIN}/${lang}${path}">`,
    buildHreflang(path),
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="${ogLocale}">`,
    `<meta property="og:title" content="${escapeAttr(seo.title)}">`,
    `<meta property="og:description" content="${escapeAttr(seo.description)}">`,
    `<meta property="og:image" content="${ORIGIN}${seo.og_image}">`,
    `<meta property="og:url" content="${ORIGIN}/${lang}${path}">`,
    renderJsonLd(medicalClinicJsonLd(lang)),
    renderJsonLd(physicianJsonLd(lang)),
    renderJsonLd(faqPageJsonLd(lang)),
  ].join('\n  ');
}
```

- [ ] **Step 6: Rebuild + verify JSON-LD in output**

Run: `cd v4 && npm run build:i18n`

Run: `grep -A2 "application/ld+json" public/test/ko/index.html | head -20`
Expected: 3 `<script type="application/ld+json">` blocks visible.

Run: paste output of `cat public/test/ko/index.html` first 100 lines into [Google Rich Results Test](https://search.google.com/test/rich-results) via curl test mock OR just verify JSON parses: `cd v4 && node -e "const s=require('fs').readFileSync('public/test/ko/index.html','utf8');const m=s.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/g);m.forEach(x=>JSON.parse(x.replace(/<\/?script[^>]*>/g,'')));console.log('all 3 JSON-LD blocks valid')"`
Expected: `all 3 JSON-LD blocks valid`.

- [ ] **Step 7: Commit**

```bash
cd v4
git add scripts/lib/jsonld.mjs scripts/lib/seo.mjs scripts/test/jsonld.test.mjs
git commit -m "feat(seo): JSON-LD schemas (MedicalClinic + Physician + FAQPage)"
```

---

### Task 13: sitemap.xml + robots.txt

**Files:**
- Create: `v4/scripts/lib/sitemap.mjs`
- Create: `v4/scripts/test/sitemap.test.mjs`
- Modify: `v4/scripts/build-i18n.mjs` (call sitemap gen at end)
- Create: `v4/public/test/robots.txt`

- [ ] **Step 1: Write failing test**

Create `v4/scripts/test/sitemap.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { buildSitemap } from '../lib/sitemap.mjs';

test('sitemap contains one <url> per active lang home', () => {
  const xml = buildSitemap({ activeLangs: ['ko', 'th', 'vi', 'en'], blogSlugs: {} });
  const matches = xml.match(/<loc>/g) || [];
  assert.equal(matches.length, 4);
});

test('sitemap embeds xhtml:link rel=alternate for each lang', () => {
  const xml = buildSitemap({ activeLangs: ['ko', 'th', 'vi', 'en'], blogSlugs: {} });
  assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  assert.ok(xml.includes('rel="alternate"'));
  assert.ok(xml.includes('hreflang="ko"'));
  assert.ok(xml.includes('hreflang="x-default"'));
});

test('sitemap adds per-post entries when blogSlugs provided', () => {
  const xml = buildSitemap({
    activeLangs: ['ko'],
    blogSlugs: { ko: ['hello-world', 'second-post'] },
  });
  assert.ok(xml.includes('/ko/blog/hello-world/'));
  assert.ok(xml.includes('/ko/blog/second-post/'));
});
```

- [ ] **Step 2: Implement `sitemap.mjs`**

Create `v4/scripts/lib/sitemap.mjs`:
```js
const ORIGIN = 'https://www.dr187growup.com';
const ALL_LANGS = ['ko', 'th', 'vi', 'en', 'ja', 'zh-tw', 'id'];
const HREFLANG_MAP = { ko: 'ko', th: 'th', vi: 'vi', en: 'en', ja: 'ja', 'zh-tw': 'zh-TW', id: 'id' };

function urlEntry(loc, allPaths) {
  // allPaths: { lang -> path } for hreflang siblings
  const alternates = Object.entries(allPaths).map(([lang, path]) =>
    `    <xhtml:link rel="alternate" hreflang="${HREFLANG_MAP[lang]}" href="${ORIGIN}/${lang}${path}"/>`
  );
  if (allPaths.ko) {
    alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/ko${allPaths.ko}"/>`);
  }
  return [
    `  <url>`,
    `    <loc>${loc}</loc>`,
    ...alternates,
    `  </url>`,
  ].join('\n');
}

export function buildSitemap({ activeLangs, blogSlugs = {} }) {
  const entries = [];

  // Home pages
  const homePaths = Object.fromEntries(activeLangs.map((l) => [l, '/']));
  for (const lang of activeLangs) {
    entries.push(urlEntry(`${ORIGIN}/${lang}/`, homePaths));
  }

  // Blog listing pages
  const blogListPaths = Object.fromEntries(activeLangs.map((l) => [l, '/blog/']));
  for (const lang of activeLangs) {
    if (blogSlugs[lang]) {
      entries.push(urlEntry(`${ORIGIN}/${lang}/blog/`, blogListPaths));
    }
  }

  // Individual blog posts
  for (const [lang, slugs] of Object.entries(blogSlugs)) {
    for (const slug of slugs) {
      // hreflang alternates only for langs that have this slug
      const altPaths = {};
      for (const [otherLang, otherSlugs] of Object.entries(blogSlugs)) {
        if (otherSlugs.includes(slug)) {
          altPaths[otherLang] = `/blog/${slug}/`;
        }
      }
      entries.push(urlEntry(`${ORIGIN}/${lang}/blog/${slug}/`, altPaths));
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap-0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
  ].join('\n');
}
```

- [ ] **Step 3: Run test (should pass)**

Run: `cd v4 && node --test scripts/test/sitemap.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 4: Generate sitemap from build script**

Edit `v4/scripts/build-i18n.mjs`. Add at end of `main()`:
```js
import { buildSitemap } from './lib/sitemap.mjs';
// ...

function main() {
  for (const lang of ACTIVE_LANGS) {
    buildLocale(lang);
  }
  const sitemap = buildSitemap({ activeLangs: ACTIVE_LANGS, blogSlugs: {} });
  writeFile(join(ROOT, 'public/test/sitemap.xml'), sitemap);
  console.log(`[i18n] done — ${ACTIVE_LANGS.length} locale(s)`);
}
```

(`blogSlugs` will be populated in Task 19 after blog renderer exists.)

- [ ] **Step 5: Create robots.txt**

Create `v4/public/test/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://www.dr187growup.com/test/sitemap.xml
```

(Will move to `/sitemap.xml` and `/robots.txt` after promote-to-root phase.)

- [ ] **Step 6: Rebuild + verify**

Run: `cd v4 && npm run build:i18n`
Run: `cat public/test/sitemap.xml | head -20`
Expected: Valid XML with 4 `<url>` entries (home pages).

- [ ] **Step 7: Commit**

```bash
cd v4
git add scripts/lib/sitemap.mjs scripts/test/sitemap.test.mjs scripts/build-i18n.mjs public/test/robots.txt
git commit -m "feat(seo): sitemap.xml generator with hreflang alternates + robots.txt"
```

---

## Phase 4 — Analytics (Task 14)

### Task 14: GA4 `trackConsultClick` in `_shell.js`

**Files:**
- Modify: `v4/public/test/_shell.js`
- Modify: `v4/i18n/template/index.html` (inject `<script>` with locale config)

- [ ] **Step 1: Find existing analytics calls in _shell.js**

Run: `cd v4 && grep -n "kakao\|gtag\|track" public/test/_shell.js | head -10`
Expected: lists any existing CTA tracking patterns.

- [ ] **Step 2: Add `trackConsultClick` to _shell.js**

Edit `v4/public/test/_shell.js`. Add at top (after any existing namespace):
```js
// ============== GA4 Consult Tracking ==============
// Locale + channel injected by build-i18n template via window.__I18N__.
window.trackConsultClick = function (source) {
  var i18n = window.__I18N__ || {};
  if (typeof gtag === 'undefined') return;
  gtag('event', 'consult_click', {
    channel: i18n.channel || 'unknown',
    locale: i18n.locale || 'unknown',
    source: source || 'unspecified',
    page_type: i18n.page_type || 'home',
  });
};

// Auto-bind: every <a> with data-source attribute fires trackConsultClick on click
document.addEventListener('DOMContentLoaded', function () {
  var anchors = document.querySelectorAll('a[data-source]');
  anchors.forEach(function (a) {
    a.addEventListener('click', function () {
      window.trackConsultClick(a.getAttribute('data-source'));
    });
  });
});
```

- [ ] **Step 3: Inject window.__I18N__ in template**

Edit `v4/i18n/template/index.html`. Just before `<script src="/test/_shell.js"></script>` (search for `_shell.js`), add:
```html
<script>
  window.__I18N__ = {
    locale: "{{meta.lang}}",
    channel: "{{messenger.channel}}",
    page_type: "home"
  };
</script>
<script src="/test/_shell.js"></script>
```

Also update `<script src="_shell.js">` → `<script src="/test/_shell.js">` (absolute path).

- [ ] **Step 4: Rebuild + verify injection**

Run: `cd v4 && npm run build:i18n`

Run: `grep -A4 "__I18N__" public/test/ko/index.html`
Expected: Shows the window.__I18N__ block with `locale: "ko"` and `channel: "kakao"`.

Run: `grep -A4 "__I18N__" public/test/en/index.html`
Expected: `locale: "en"`, `channel: "kakao"`.

- [ ] **Step 5: Commit**

```bash
cd v4
git add public/test/_shell.js i18n/template/index.html
git commit -m "feat(analytics): trackConsultClick fires GA4 event with channel/locale/source"
```

---

## Phase 5 — ContentFlow Blog API (Task 15)

### Task 15: Add `/api/blog/by-project/[projectId]/posts` to ContentFlow

**Files (in `C:\project\contentflow1\contentflow\`):**
- Create: `src/app/api/blog/by-project/[projectId]/posts/route.ts`

- [ ] **Step 1: Create the route file**

Create `contentflow/src/app/api/blog/by-project/[projectId]/posts/route.ts`:
```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Service-role client — bypasses RLS. Used ONLY for public-read endpoints
// that filter explicitly to status='published'.
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const { searchParams } = new URL(req.url)
  const lang = searchParams.get('lang') || 'ko'

  if (!projectId) {
    return Response.json({ error: 'projectId required' }, { status: 400 })
  }

  // 1. Pull all published blog_contents for this project
  const { data: posts, error: postsErr } = await adminClient
    .from('blog_contents')
    .select(`
      id, content_id, seo_title, url_slug, meta_description,
      primary_keyword, secondary_keywords, seo_details, status,
      published_at,
      contents:content_id(id, title, tags, project_id, updated_at),
      base_articles:content_id(body, body_plain_text)
    `)
    .eq('contents.project_id', projectId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (postsErr) {
    return Response.json({ error: postsErr.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return Response.json({ posts: [] }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  }

  // 2. For non-ko langs, fetch translations
  const contentIds = posts.map((p: any) => p.content_id)
  let translations: any[] = []
  if (lang !== 'ko') {
    const { data: trData } = await adminClient
      .from('translations')
      .select('content_id, language, channel_type, status, title, body, cards_json, seo_title, seo_description')
      .in('content_id', contentIds)
      .eq('language', lang)
      .eq('channel_type', 'blog')
      .eq('status', 'completed')
    translations = trData || []
  }

  // 3. Fetch blog_cards for each post
  const blogContentIds = posts.map((p: any) => p.id)
  const { data: cards } = await adminClient
    .from('blog_cards')
    .select('id, blog_content_id, card_type, content, sort_order')
    .in('blog_content_id', blogContentIds)
    .order('sort_order', { ascending: true })

  // 4. Merge
  const result = posts.map((p: any) => {
    const tr = translations.find((t) => t.content_id === p.content_id)
    const postCards = (cards || []).filter((c: any) => c.blog_content_id === p.id)
    return {
      id: p.id,
      slug: p.url_slug,
      title: tr?.title || p.seo_title || p.contents?.title,
      meta_description: tr?.seo_description || p.meta_description,
      primary_keyword: p.primary_keyword,
      secondary_keywords: p.secondary_keywords,
      tags: p.contents?.tags || [],
      published_at: p.published_at,
      updated_at: p.contents?.updated_at,
      body_html: tr?.body || p.base_articles?.body,
      cards: tr?.cards_json || postCards,
      global_style: p.seo_details?.globalStyle || null,
    }
  })

  return Response.json({ posts: result }, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  })
}
```

- [ ] **Step 2: Confirm `SUPABASE_SERVICE_ROLE_KEY` is in contentflow `.env.local`**

Run: `cd /c/project/contentflow1/contentflow && grep -c SUPABASE_SERVICE_ROLE_KEY .env.local`
Expected: 1

If 0: ask user to add it (`SUPABASE_SERVICE_ROLE_KEY=...`).

- [ ] **Step 3: Test the endpoint locally**

Restart contentflow dev server (already running on port 3001). Then test:
```bash
# Replace {project-uuid} with actual 연세새봄의원 project_id from contentflow Supabase
curl "http://localhost:3001/api/blog/by-project/{project-uuid}/posts?lang=ko" | head -50
```
Expected: JSON response `{ posts: [...] }` (may be empty array if no published posts yet — that's fine).

If 500 error: check terminal logs in contentflow dev server.

If the project UUID is unknown, query Supabase from contentflow UI: open `/projects` page, find 연세새봄의원, copy ID from URL.

- [ ] **Step 4: Commit (in contentflow project)**

```bash
cd /c/project/contentflow1/contentflow
git add src/app/api/blog/by-project/
git commit -m "feat(api): public read-only blog posts endpoint by project_id"
```

---

## Phase 6 — dflo Blog Fetcher (Task 16)

### Task 16: `fetch-contentflow-posts.mjs` with caching

**Files (back in dflo `v4/`):**
- Create: `v4/scripts/lib/fetch-contentflow-posts.mjs`
- Create: `v4/scripts/test/fetch-contentflow-posts.test.mjs`
- Modify: `v4/.env.local` (add ContentFlow URL + project ID)

- [ ] **Step 1: Add env vars to v4/.env.local**

Ask user to add to `v4/.env.local`:
```
CONTENTFLOW_API_URL=http://localhost:3001
CONTENTFLOW_PROJECT_ID=<연세새봄의원 project UUID>
```

(Production env vars set in Railway separately later.)

- [ ] **Step 2: Write failing test (using fetch mock)**

Create `v4/scripts/test/fetch-contentflow-posts.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchAndCache } from '../lib/fetch-contentflow-posts.mjs';

test('fetchAndCache writes JSON per slug', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'i18n-test-'));

  // Mock fetch
  const origFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ posts: [
      { slug: 'post-a', title: 'A', body_html: '<p>a</p>', cards: [], published_at: '2026-05-01' },
      { slug: 'post-b', title: 'B', body_html: '<p>b</p>', cards: [], published_at: '2026-05-02' },
    ]}),
  });

  const slugs = await fetchAndCache({
    apiUrl: 'http://mock',
    projectId: 'mock-id',
    lang: 'ko',
    cacheDir,
  });

  global.fetch = origFetch;

  assert.deepEqual(slugs.sort(), ['post-a', 'post-b']);
  assert.ok(existsSync(join(cacheDir, 'ko', 'post-a.json')));
  assert.ok(existsSync(join(cacheDir, 'ko', 'post-b.json')));

  rmSync(cacheDir, { recursive: true });
});

test('fetchAndCache returns empty when API returns no posts', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'i18n-test-'));
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ posts: [] }) });

  const slugs = await fetchAndCache({
    apiUrl: 'http://mock', projectId: 'x', lang: 'ko', cacheDir,
  });

  global.fetch = origFetch;
  assert.deepEqual(slugs, []);
  rmSync(cacheDir, { recursive: true });
});
```

- [ ] **Step 3: Run test (should fail)**

Run: `cd v4 && node --test scripts/test/fetch-contentflow-posts.test.mjs`
Expected: FAIL (module missing).

- [ ] **Step 4: Implement fetcher**

Create `v4/scripts/lib/fetch-contentflow-posts.mjs`:
```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function fetchAndCache({ apiUrl, projectId, lang, cacheDir }) {
  const url = `${apiUrl}/api/blog/by-project/${projectId}/posts?lang=${lang}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ContentFlow fetch ${url} failed: ${res.status}`);
  }
  const { posts = [] } = await res.json();

  const dir = join(cacheDir, lang);
  mkdirSync(dir, { recursive: true });

  const slugs = [];
  for (const post of posts) {
    if (!post.slug) continue;
    writeFileSync(join(dir, `${post.slug}.json`), JSON.stringify(post, null, 2));
    slugs.push(post.slug);
  }
  return slugs;
}

export async function fetchAllLangs({ apiUrl, projectId, langs, cacheDir }) {
  const result = {};
  for (const lang of langs) {
    try {
      result[lang] = await fetchAndCache({ apiUrl, projectId, lang, cacheDir });
      console.log(`  [blog] cached ${result[lang].length} posts for ${lang}`);
    } catch (e) {
      console.warn(`  [blog] fetch failed for ${lang}: ${e.message}`);
      result[lang] = [];
    }
  }
  return result;
}
```

- [ ] **Step 5: Run test (should pass)**

Run: `cd v4 && node --test scripts/test/fetch-contentflow-posts.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd v4
git add scripts/lib/fetch-contentflow-posts.mjs scripts/test/fetch-contentflow-posts.test.mjs
git commit -m "feat(blog): build-time fetcher for ContentFlow posts with file cache"
```

---

## Phase 7 — Blog Rendering (Tasks 17-19)

### Task 17: Blog post template + render helper

**Files:**
- Create: `v4/i18n/template/blog-post.html`
- Create: `v4/scripts/lib/blog.mjs`
- Create: `v4/scripts/test/blog.test.mjs`

- [ ] **Step 1: Create blog post template**

Create `v4/i18n/template/blog-post.html`:
```html
<!DOCTYPE html>
<html lang="{{meta.lang}}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{{seo_head}}
<link rel="stylesheet" href="/test/_shell.css">
<style>
  .post-container { max-width: 740px; margin: 0 auto; padding: 24px; }
  .post-header { padding: 32px 0 24px; border-bottom: 1px solid var(--hairline); }
  .post-title { font-size: 28px; font-weight: 900; color: var(--ink); letter-spacing: -0.6px; line-height: 1.3; }
  .post-meta { font-size: 13px; color: var(--muted); margin-top: 12px; }
  .post-body { padding: 28px 0; font-size: 16px; line-height: 1.85; color: var(--body); }
  .post-body img { margin: 24px 0; border-radius: 8px; }
  .post-cta { margin: 40px 0; padding: 24px; background: var(--shell-page-bg); text-align: center; border-radius: 12px; }
  .post-cta a {
    display: inline-flex; padding: 14px 28px; background: {{messenger.color_bg}}; color: {{messenger.color_fg}};
    text-decoration: none; font-weight: 700; border-radius: 2px;
  }
  @media (min-width: 640px) { .post-title { font-size: 36px; } }
</style>
</head>
<body data-page="blog-post">
<div class="post-container">
  <header class="post-header">
    <h1 class="post-title">{{post.title}}</h1>
    <div class="post-meta">{{post.published_at_display}}</div>
  </header>
  <article class="post-body">
    {{post.body_html}}
  </article>
  <div class="post-cta">
    <a href="{{messenger.url}}" target="_blank" rel="noopener"
       data-source="blog_post" data-channel="{{messenger.channel}}">
      {{messenger.label}}
    </a>
  </div>
</div>
<script>
  window.__I18N__ = { locale: "{{meta.lang}}", channel: "{{messenger.channel}}", page_type: "blog" };
</script>
<script src="/test/_shell.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write failing test for blog renderer**

Create `v4/scripts/test/blog.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { renderPost } from '../lib/blog.mjs';

test('renderPost substitutes title and body', () => {
  const post = {
    slug: 'hello',
    title: 'Hello World',
    body_html: '<p>body</p>',
    published_at: '2026-05-01T00:00:00Z',
  };
  const template = `<h1>{{post.title}}</h1><article>{{post.body_html}}</article><div>{{post.published_at_display}}</div>`;
  const html = renderPost({
    post,
    template,
    locale: { meta: { lang: 'ko' } },
    messenger: { url: 'x', label: 'l', color_bg: '#fff', color_fg: '#000', channel: 'kakao' },
    seoHead: '',
  });
  assert.ok(html.includes('<h1>Hello World</h1>'));
  assert.ok(html.includes('<p>body</p>'));
  assert.ok(html.includes('2026'));
});
```

- [ ] **Step 3: Implement `blog.mjs`**

Create `v4/scripts/lib/blog.mjs`:
```js
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { render } from './render.mjs';

function formatDate(iso, lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const fmt = new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : lang, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return fmt.format(d);
}

export function renderPost({ post, template, locale, messenger, seoHead }) {
  const data = {
    ...locale,
    messenger,
    seo_head: seoHead,
    post: {
      ...post,
      published_at_display: formatDate(post.published_at, locale.meta.lang),
    },
  };
  return render(template, data);
}

export function loadCachedPosts(cacheDir, lang) {
  const dir = join(cacheDir, lang);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}
```

- [ ] **Step 4: Run test (should pass)**

Run: `cd v4 && node --test scripts/test/blog.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd v4
git add i18n/template/blog-post.html scripts/lib/blog.mjs scripts/test/blog.test.mjs
git commit -m "feat(blog): post template + renderer with date formatting"
```

---

### Task 18: Blog index page template + render

**Files:**
- Create: `v4/i18n/template/blog-index.html`
- Modify: `v4/scripts/lib/blog.mjs` (add `renderIndex`)
- Modify: `v4/scripts/test/blog.test.mjs`

- [ ] **Step 1: Create blog index template**

Create `v4/i18n/template/blog-index.html`:
```html
<!DOCTYPE html>
<html lang="{{meta.lang}}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{{seo_head}}
<link rel="stylesheet" href="/test/_shell.css">
<style>
  .index-container { max-width: 1024px; margin: 0 auto; padding: 36px 24px; }
  .index-header h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
  .post-list { display: grid; gap: 20px; margin-top: 24px; }
  .post-card { padding: 20px; border: 1px solid var(--hairline); border-radius: 12px; transition: border-color .15s; }
  .post-card:hover { border-color: var(--brand); }
  .post-card a { color: inherit; text-decoration: none; }
  .post-card h2 { font-size: 18px; font-weight: 800; line-height: 1.4; }
  .post-card .meta { font-size: 12px; color: var(--muted); margin-top: 8px; }
  .post-card .desc { font-size: 14px; color: var(--body); margin-top: 8px; line-height: 1.7; }
</style>
</head>
<body data-page="blog-index">
<div class="index-container">
  <header class="index-header">
    <h1>{{blog.index_heading}}</h1>
  </header>
  <div class="post-list">
    {{#each posts}}
    <article class="post-card">
      <a href="/{{lang}}/blog/{{slug}}/">
        <h2>{{title}}</h2>
        <div class="meta">{{published_at_display}}</div>
        <p class="desc">{{meta_description}}</p>
      </a>
    </article>
    {{/each}}
  </div>
</div>
<script src="/test/_shell.js"></script>
</body>
</html>
```

- [ ] **Step 2: Add `blog.index_heading` to each locale yml**

Edit `v4/i18n/locales/ko.yml`, add at top level:
```yaml
blog:
  index_heading: "성장 인사이트"
```

Apply equivalent to th/vi/en (use `[NEEDS TRANSLATION]` for stubs).

- [ ] **Step 3: Implement `renderIndex` in blog.mjs**

Edit `v4/scripts/lib/blog.mjs`, add:
```js
export function renderIndex({ posts, template, locale, seoHead }) {
  const data = {
    ...locale,
    seo_head: seoHead,
    lang: locale.meta.lang,
    posts: posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      meta_description: p.meta_description || '',
      published_at_display: formatDate(p.published_at, locale.meta.lang),
    })),
  };
  return render(template, data);
}
```

- [ ] **Step 4: Add test for renderIndex**

Append to `v4/scripts/test/blog.test.mjs`:
```js
import { renderIndex } from '../lib/blog.mjs';

test('renderIndex lists posts with links', () => {
  const posts = [
    { slug: 'a', title: 'Post A', meta_description: 'desc a', published_at: '2026-05-01' },
    { slug: 'b', title: 'Post B', meta_description: 'desc b', published_at: '2026-05-02' },
  ];
  const template = `{{#each posts}}<article><a href="/{{lang}}/blog/{{slug}}/">{{title}}</a></article>{{/each}}`;
  const html = renderIndex({
    posts,
    template,
    locale: { meta: { lang: 'ko' }, blog: { index_heading: 'Blog' } },
    seoHead: '',
  });
  assert.ok(html.includes('<a href="/ko/blog/a/">'));
  assert.ok(html.includes('Post B'));
});
```

Run: `cd v4 && node --test scripts/test/blog.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd v4
git add i18n/template/blog-index.html i18n/locales/ko.yml i18n/locales/th.yml i18n/locales/vi.yml i18n/locales/en.yml scripts/lib/blog.mjs scripts/test/blog.test.mjs
git commit -m "feat(blog): index page template + renderer"
```

---

### Task 19: Integrate blog into build-i18n

**Files:**
- Modify: `v4/scripts/build-i18n.mjs`
- Modify: `v4/scripts/lib/jsonld.mjs` (add `blogPostingJsonLd`)
- Modify: `v4/scripts/lib/seo.mjs` (add `buildBlogPostHead`)

- [ ] **Step 1: Add `blogPostingJsonLd` to jsonld.mjs**

Edit `v4/scripts/lib/jsonld.mjs`, add:
```js
export function blogPostingJsonLd({ post, lang }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || '',
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    inLanguage: lang,
    url: `${ORIGIN}/${lang}/blog/${post.slug}/`,
    publisher: {
      '@type': 'MedicalClinic',
      name: CLINIC_NAME,
      logo: { '@type': 'ImageObject', url: `${ORIGIN}/images/logo.jpg` },
    },
  };
}
```

- [ ] **Step 2: Add `buildBlogPostHead` to seo.mjs**

Edit `v4/scripts/lib/seo.mjs`, add:
```js
import { blogPostingJsonLd, renderJsonLd } from './jsonld.mjs';

export function buildBlogPostHead({ post, lang }) {
  const path = `/blog/${post.slug}/`;
  const description = post.meta_description || '';
  return [
    `<title>${post.title}</title>`,
    `<meta name="description" content="${escapeAttr(description)}">`,
    `<link rel="canonical" href="${ORIGIN}/${lang}${path}">`,
    buildHreflang(path),
    `<meta property="og:type" content="article">`,
    `<meta property="og:locale" content="${OG_LOCALE_MAP[lang]}">`,
    `<meta property="og:title" content="${escapeAttr(post.title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${ORIGIN}/${lang}${path}">`,
    renderJsonLd(blogPostingJsonLd({ post, lang })),
  ].join('\n  ');
}

export function buildBlogIndexHead(lang) {
  const path = '/blog/';
  return [
    `<title>Blog | ${buildSeo(lang).title}</title>`,
    `<link rel="canonical" href="${ORIGIN}/${lang}${path}">`,
    buildHreflang(path),
  ].join('\n  ');
}
```

- [ ] **Step 3: Wire blog rendering into build-i18n.mjs**

Edit `v4/scripts/build-i18n.mjs` — add blog generation:
```js
import { fetchAllLangs } from './lib/fetch-contentflow-posts.mjs';
import { loadCachedPosts, renderPost, renderIndex } from './lib/blog.mjs';
import { buildBlogPostHead, buildBlogIndexHead } from './lib/seo.mjs';

const CACHE_DIR = join(ROOT, 'i18n/blog-cache');
const POST_TEMPLATE = readFileSync(join(ROOT, 'i18n/template/blog-post.html'), 'utf8');
const INDEX_TEMPLATE = readFileSync(join(ROOT, 'i18n/template/blog-index.html'), 'utf8');

async function buildBlog({ lang, locale, messenger, slugs }) {
  const posts = loadCachedPosts(CACHE_DIR, lang);

  // Listing page
  const indexHtml = renderIndex({
    posts, template: INDEX_TEMPLATE, locale,
    seoHead: buildBlogIndexHead(lang),
  });
  writeFile(join(ROOT, 'public/test', lang, 'blog/index.html'), indexHtml);

  // Per-post pages
  for (const post of posts) {
    const html = renderPost({
      post, template: POST_TEMPLATE, locale, messenger,
      seoHead: buildBlogPostHead({ post, lang }),
    });
    writeFile(join(ROOT, 'public/test', lang, 'blog', post.slug, 'index.html'), html);
  }
}

async function main() {
  const refetch = process.argv.includes('--refetch');
  let blogSlugs = {};
  if (refetch || !existsSync(CACHE_DIR)) {
    const apiUrl = process.env.CONTENTFLOW_API_URL;
    const projectId = process.env.CONTENTFLOW_PROJECT_ID;
    if (apiUrl && projectId) {
      blogSlugs = await fetchAllLangs({
        apiUrl, projectId, langs: ACTIVE_LANGS, cacheDir: CACHE_DIR,
      });
    } else {
      console.warn('[blog] CONTENTFLOW_API_URL or CONTENTFLOW_PROJECT_ID missing — skipping fetch');
    }
  } else {
    // Read cache for slug list
    for (const lang of ACTIVE_LANGS) {
      blogSlugs[lang] = loadCachedPosts(CACHE_DIR, lang).map((p) => p.slug);
    }
  }

  for (const lang of ACTIVE_LANGS) {
    const locale = loadLocale(lang);
    const messenger = getMessengerCTA(lang, { requireLiveUrl: true });
    locale.messenger = messenger;
    locale.seo_head = buildHead(lang, { path: '/' });
    const template = readFileSync(join(ROOT, 'i18n/template/index.html'), 'utf8');
    writeFile(join(ROOT, 'public/test', lang, 'index.html'), render(template, locale));

    if (blogSlugs[lang] && blogSlugs[lang].length > 0) {
      await buildBlog({ lang, locale, messenger, slugs: blogSlugs[lang] });
    }
  }

  const sitemap = buildSitemap({ activeLangs: ACTIVE_LANGS, blogSlugs });
  writeFile(join(ROOT, 'public/test/sitemap.xml'), sitemap);
  console.log(`[i18n] done — ${ACTIVE_LANGS.length} locale(s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Update top-level import: add `import { existsSync } from 'node:fs';`

(Note: removed inline `buildLocale` function — its body is now inlined in `main()`.)

- [ ] **Step 4: Run build with --refetch**

Run: `cd v4 && npm run build:i18n -- --refetch`

Expected output:
- `[blog] cached N posts for ko` (or 0 if no published posts yet)
- 4 langs built
- If posts exist, see `public/test/ko/blog/{slug}/index.html` and `public/test/ko/blog/index.html`

Run: `ls v4/public/test/ko/blog/ 2>/dev/null` 
Expected: `index.html` exists. If posts: subdirs per slug.

- [ ] **Step 5: Verify sitemap includes blog**

Run: `cd v4 && grep "blog/" public/test/sitemap.xml | head -5`
Expected: blog URLs present (if posts exist).

- [ ] **Step 6: Commit**

```bash
cd v4
git add scripts/build-i18n.mjs scripts/lib/jsonld.mjs scripts/lib/seo.mjs
git commit -m "feat(blog): integrate blog rendering + BlogPosting JSON-LD into build"
```

---

## Phase 8 — Integration (Tasks 20-21)

### Task 20: Router HardRedirect for `/test/{lang}/`

**Files:**
- Modify: `v4/src/app/router.tsx:163-165`

- [ ] **Step 1: Add multi-lang HardRedirect routes**

Edit `v4/src/app/router.tsx` around lines 163-165. After existing `/test` and `/test/` redirects:
```tsx
// /test/ static prototype — hard redirect to index.html so Vite serves it.
{ path: '/test', element: <HardRedirect to="/test/index.html" /> },
{ path: '/test/', element: <HardRedirect to="/test/index.html" /> },

// /test/{lang}/ — hard redirect each locale to its index.html for proper static serving
{ path: '/test/:lang', element: <LangRedirect /> },
{ path: '/test/:lang/', element: <LangRedirect /> },
{ path: '/test/:lang/blog', element: <LangBlogRedirect /> },
{ path: '/test/:lang/blog/', element: <LangBlogRedirect /> },
```

Add helper components (near `HardRedirect`):
```tsx
function LangRedirect() {
  const { lang } = useParams<{ lang: string }>();
  return <HardRedirect to={`/test/${lang ?? 'ko'}/index.html`} />;
}

function LangBlogRedirect() {
  const { lang } = useParams<{ lang: string }>();
  return <HardRedirect to={`/test/${lang ?? 'ko'}/blog/index.html`} />;
}
```

- [ ] **Step 2: Verify dev server picks up routes**

dflo dev server is already running on port 5179 (background process `bj9gija6n`). Vite hot-reloads router changes.

Test in browser (or curl):
- `http://localhost:5179/test/ko/index.html` → should render built Korean homepage
- `http://localhost:5179/test/ko/` → should hard-redirect to `/test/ko/index.html`
- `http://localhost:5179/test/en/index.html` → English (stub content)

- [ ] **Step 3: Commit**

```bash
cd v4
git add src/app/router.tsx
git commit -m "feat(router): hard-redirect /test/{lang}/ to static index.html"
```

---

### Task 21: Build integration with Vite + final verification

**Files:**
- Modify: `v4/package.json` (verify scripts already set in Task 5)
- Verify: `v4/.gitignore` includes built artifacts

- [ ] **Step 1: Update .gitignore for build artifacts**

Read `v4/.gitignore`. If absent, add these lines:
```
# i18n build artifacts
/public/test/ko/
/public/test/th/
/public/test/vi/
/public/test/en/
/public/test/sitemap.xml
/i18n/blog-cache/
```

Rationale: ko/th/vi/en built dirs are *generated* from `i18n/locales/*.yml` + `i18n/template/*` — they're rebuilt every commit. Keeping the source-of-truth (`/test/index.html`) tracked but skipping built locales avoids git noise.

If the user prefers built artifacts committed (for inspection), skip this step.

- [ ] **Step 2: Verify full build chain works**

Run: `cd v4 && npm run build`
Expected: Sequence runs `tsc -b` → `npm run build:i18n` → `vite build` without errors. `dist/` populated.

Check `dist/test/ko/index.html` exists.

- [ ] **Step 3: Run all i18n tests**

Run: `cd v4 && npm run test:i18n`
Expected: All test files pass (render, build-i18n, messenger, seo, jsonld, sitemap, fetch-contentflow-posts, blog).

- [ ] **Step 4: Manual smoke test**

Open in browser:
1. `http://localhost:5179/test/ko/index.html` → full Korean homepage with messenger CTAs, hreflang in head
2. `http://localhost:5179/test/en/index.html` → English stub (`[NEEDS TRANSLATION]` markers visible)
3. View page source → confirm 3 JSON-LD blocks, 8 hreflang links, og:locale tag

- [ ] **Step 5: Commit**

```bash
cd v4
git add .gitignore
git commit -m "chore(i18n): gitignore built locale directories and blog cache"
```

---

## Self-Review

**Spec coverage check:**
- [x] Structure freeze (13 sections) — Task 2 extracts to ko.yml mirroring 13 sections; Task 3 creates template with same structure
- [x] Node + YAML + template architecture — Tasks 3-5
- [x] File layout (i18n/ scripts/ public/test/{lang}/) — Tasks 1, 5, 19
- [x] Locale file schema + stub `[NEEDS TRANSLATION]` — Tasks 2, 6, 7
- [x] Messenger routing 4 active + 3 stub — Tasks 8-9
- [x] SEO: meta/canonical/hreflang/OG — Task 10
- [x] OG image placeholders + spec README — Task 11
- [x] JSON-LD: MedicalClinic + Physician + FAQPage — Task 12
- [x] sitemap.xml with xhtml:link alternates — Task 13
- [x] robots.txt — Task 13
- [x] GA4 trackConsultClick(channel, source, locale, page_type) — Task 14
- [x] ContentFlow `/api/blog/by-project/{id}/posts` endpoint — Task 15
- [x] dflo build-time fetcher with cache — Task 16
- [x] Blog post + index templates + renderer — Tasks 17-18
- [x] BlogPosting JSON-LD per post — Task 19
- [x] sitemap includes blog posts — Task 19
- [x] Vite build integration via npm scripts — Task 5, 21
- [x] Router redirects for /test/{lang}/ — Task 20

**Placeholder scan:**
- Task 12 jsonld.mjs has TODO comments for clinic phone/address/director name — explicit placeholders for user data, NOT implementation TBD. Mentioned in step.
- All code blocks contain runnable code.

**Type consistency:**
- `getMessengerCTA(lang, opts?)` signature consistent across Tasks 8, 9, 19.
- `buildHead(lang, opts)` and `buildBlogPostHead({post, lang})` differ — intentional (different use cases).
- `loadCachedPosts(cacheDir, lang)` used consistently in Tasks 17, 18, 19.
- All YAML key paths used in template (`{{meta.lang}}`, `{{hero.title_line1}}`, etc.) match those defined in Task 2.

**Scope check:**
- Plan covers Spec A only (i18n + SEO + messenger + blog infra)
- Excluded: actual translation copy (waits for Korean freeze), Spec B (case matching), production deploy verification, real OG image design
- All exclusions documented in spec

**Out-of-scope items deferred:**
- Phase 6 (promote `/test/` → `/`) — separate later task
- Production deploy verification — separate later task
- Real OG image design — user task, placeholder sufficient
- Korean copy polishing — separate user task

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-13-i18n-blog-infrastructure.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Best for plans with 15+ tasks like this one (21 tasks).

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Slower but stays in context.

**Which approach?**
