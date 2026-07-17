# 중국어(zh-hant/zh-hans) 로케일 추가 — 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 4p + 상담페이지 + 블로그 120편을 번체(`zh-hant`)·간체(`zh-hans`)로 en 과 동급 배포한다.

**Architecture:** 언어 목록이 7곳에 중복돼 있고 **대부분 조용히 실패**한다(한국어로 폴백하거나 `undefined` 를 뱉는다). 그래서 순서가 핵심이다 — **① 중복을 먼저 합치고 안전망(테스트)을 깔고 ② 콘텐츠·자산을 다 채운 뒤 ③ `ACTIVE_LANGS` 활성화를 맨 마지막에** 한다. 활성화 전까지 사이트는 4개 언어 그대로라 언제 멈춰도 안전하다.

**Tech Stack:** Node 정적 빌드(`build-i18n.mjs` + js-yaml, 프레임워크 없음) · `node --test` · React/Vite(v4) · Express(ai-server) · Supabase REST

**설계 문서:** `docs/superpowers/specs/2026-07-17-chinese-locales-design.md` — 결정 근거는 전부 거기. 이 계획은 "어떻게".

**⚠️ 이 작업의 성질:** 틀리면 시끄럽게 죽지 않는다. 계산기는 조용히 한국어가 되고, 픽셀은 조용히 한국 광고 픽셀을 쏘고, 분석은 조용히 한국어 수치에 합산되고, hreflang 은 조용히 `undefined` 가 된다. **"에러 없음"을 통과 신호로 쓰지 말 것.** 매 task 의 검증은 "값이 맞나"를 본다.

---

## Chunk 1: 안전망 먼저 (중복 제거 + 커버리지 테스트)

이 chunk 는 **중국어를 추가하지 않는다.** 추가했을 때 조용히 깨질 곳을 먼저 시끄럽게 만든다.

### Task 1: `sitemap.mjs` 의 복제 상수를 `seo.mjs` 에서 import

`sitemap.mjs:1-3` 이 `ORIGIN`·`PATH_PREFIX`·`HREFLANG_MAP` 을 `seo.mjs:10,11,17` 에서 **복사**해 갖고 있다. 값은 지금 동일하지만 대조하는 장치가 없다. 언어를 추가하면 여기가 먼저 터진다.

**Files:**
- Modify: `v4/scripts/lib/sitemap.mjs:1-3`
- Test: `v4/scripts/test/sitemap.test.mjs` (기존)

- [ ] **Step 1: 현재 테스트가 통과하는지 먼저 확인 (기준선)**

```bash
cd v4 && npm test
```
Expected: `# pass 117 / # fail 0`

- [ ] **Step 2: import 로 교체**

`v4/scripts/lib/sitemap.mjs` 맨 위 3줄을 지우고:

```js
// ORIGIN·PATH_PREFIX·HREFLANG_MAP 은 seo.mjs 가 정본. 예전엔 여기 복사본이 있었는데
// 대조 장치가 없어 언어를 추가하면 sitemap 만 조용히 옛 목록을 쓰게 된다(hreflang="undefined").
import { ORIGIN, PATH_PREFIX, HREFLANG_MAP } from './seo.mjs';
```

- [ ] **Step 3: 테스트 통과 확인 (무회귀)**

```bash
cd v4 && npm test
```
Expected: `# pass 117 / # fail 0` — 값이 동일했으므로 동작 변화 0.

★import 안전성은 검증됨: sitemap 의 사본은 export 되지 않아 쓰는 곳이 없고, `seo.mjs` 는 seo.yml 을 지연 로드해 import-time 부작용이 없으며(`sitemap.test.mjs` 가 env 없이 단독 import 해도 무사), 순환 참조도 없다.

- [ ] **Step 4: 빌드 산출물이 바이트 동일한지 확인**

```bash
cd v4 && npm run build:i18n && node -e "
const s=require('fs').readFileSync('public/sitemap.xml','utf8');
console.log('sitemap URL 수:', (s.match(/<loc>/g)||[]).length);
console.log('undefined 유출:', (s.match(/hreflang=\"undefined\"/g)||[]).length);
"
```
Expected: `sitemap URL 수: 263`, `undefined 유출: 0`

- [ ] **Step 5: 커밋**

```bash
git add v4/scripts/lib/sitemap.mjs
git commit -m "refactor(i18n): source sitemap constants from seo.mjs instead of copies"
```

---

### Task 2: 맵 커버리지 테스트 (지금 없는 안전망)

**이게 이 계획에서 제일 중요한 task.** `seo.test.mjs:16` 은 기대 문자열을 `hreflang="${HREFLANG_MAP[lang]}"` 로 **조립**한다 → 맵에 언어가 없으면 기대값도 `hreflang="undefined"` 가 되어 **그냥 통과한다.** 이 테스트가 있는 한 우리는 `hreflang="undefined"` 를 초록불과 함께 배포한다.

**Files:**
- Modify: `v4/scripts/test/seo.test.mjs`

- [ ] **Step 1: 실패하는 테스트를 먼저 쓴다**

`v4/scripts/test/seo.test.mjs` 에 추가:

```js
test('HREFLANG_MAP·OG_LOCALE_MAP 이 ACTIVE_LANGS 를 빠짐없이 덮는다', () => {
  // ★이 테스트가 없으면: ACTIVE_LANGS 에만 언어를 추가했을 때 맵 조회가 undefined 가 되고,
  //   기대값을 맵에서 조립하는 다른 테스트들은 undefined == undefined 로 통과해버린다.
  //   그 결과 전 페이지에 hreflang="undefined" 가 박힌 채 배포된다.
  for (const lang of ACTIVE_LANGS) {
    assert.ok(HREFLANG_MAP[lang], `HREFLANG_MAP 에 ${lang} 없음`);
    assert.ok(OG_LOCALE_MAP[lang], `OG_LOCALE_MAP 에 ${lang} 없음`);
  }
});

test('hreflang 출력에 리터럴 undefined 가 절대 없다', () => {
  // 위 테스트를 우회하는 경로(맵에 빈 문자열 등)까지 막는 최후 방어선.
  const tags = buildHreflang();
  assert.ok(!tags.includes('hreflang="undefined"'), 'hreflang="undefined" 유출');
  assert.ok(!tags.includes('hreflang=""'), '빈 hreflang 유출');
  for (const lang of ACTIVE_LANGS) {
    assert.ok(tags.includes(`href="${ORIGIN}${PATH_PREFIX}/${lang}/"`), `${lang} href 누락`);
  }
});
```

import 줄에 `OG_LOCALE_MAP, ORIGIN, PATH_PREFIX` 추가.

- [ ] **Step 2: 테스트가 통과하는 걸 확인 (지금은 맵이 맞으니 초록)**

```bash
cd v4 && npm test 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: `# pass 119 / # fail 0`

- [ ] **Step 3: ★뮤테이션으로 테스트가 공허하지 않은지 검증**

`seo.mjs:17` 의 `HREFLANG_MAP` 에서 `en: 'en',` 을 **임시로 지우고**:

```bash
cd v4 && npm test 2>&1 | grep -E "^# (pass|fail)|not ok"
```
Expected: **FAIL** — `HREFLANG_MAP 에 en 없음` + `hreflang="undefined" 유출`.
★만약 통과하면 테스트가 공허한 것이니 고칠 것. 확인 후 **반드시 되돌린다.**

- [ ] **Step 4: 되돌리고 재확인**

```bash
cd v4 && git checkout -- scripts/lib/seo.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"
```
Expected: `# pass 119 / # fail 0`

- [ ] **Step 5: 커밋**

```bash
git add v4/scripts/test/seo.test.mjs
git commit -m "test(i18n): assert hreflang maps cover every active lang

The existing test builds its expected string from the same map it checks,
so a missing lang compares hreflang=\"undefined\" to hreflang=\"undefined\"
and passes. These assert coverage directly and ban the literal."
```

---

### Task 3: `zh-tw` 잔재 정리

`zh-tw.yml`(301줄·2026-05-14·값 전부 `[NEEDS TRANSLATION]`)은 새 코드 체계(`zh-hant`)와 충돌하는 유령이다.

**Files:**
- Delete: `v4/i18n/locales/zh-tw.yml`
- Modify: `v4/scripts/lib/seo.mjs:16,17,18` · `v4/i18n/messenger.yml:58-63`

- [ ] **Step 1: 삭제해도 되는지 근거 재확인**

```bash
cd c:/projects/dflo_0.1/.claude/worktrees/sad-wiles-b823c3 && grep -rn "zh-tw" v4/scripts v4/src v4/public v4/i18n --include=* | grep -v node_modules
```
Expected: `seo.mjs`(맵 3곳) · `messenger.yml` · `zh-tw.yml` 자신뿐. **소비자 없음**(`loadLocale` 은 `ACTIVE_LANGS` 루프에서만 호출).

- [ ] **Step 2: 제거**

- `v4/i18n/locales/zh-tw.yml` 삭제
- `seo.mjs:16` `ALL_LANGS` 에서 `'zh-tw'` 제거 → `['ko','th','vi','en','ja','id']`
- `seo.mjs:17` `HREFLANG_MAP` 에서 `'zh-tw': 'zh-TW'` 제거
- `seo.mjs:18` `OG_LOCALE_MAP` 에서 `'zh-tw': 'zh_TW'` 제거
- `messenger.yml` 의 `zh-tw:` 블록(TBD url) 제거

- [ ] **Step 3: 테스트**

```bash
cd v4 && npm test 2>&1 | grep -E "^# (pass|fail)"
```
Expected: `# pass 119 / # fail 0` — `messenger.test.mjs:33`(TBD url 검사)은 `ja` 를 쓰므로 무관.

- [ ] **Step 4: 커밋**

```bash
git add -A && git commit -m "chore(i18n): drop the stale zh-tw stub"
```

---

## Chunk 2: 콘텐츠·자산 (아직 비활성)

### Task 4: 맵에 중국어 등록 (ACTIVE_LANGS 는 아직 건드리지 않는다)

**Files:** Modify `v4/scripts/lib/seo.mjs:16,17,18`

- [ ] **Step 1: 세 맵에 추가**

```js
export const ALL_LANGS = ['ko', 'th', 'vi', 'en', 'zh-hant', 'zh-hans', 'ja', 'id'];
export const HREFLANG_MAP = { ko: 'ko', th: 'th', vi: 'vi', en: 'en', 'zh-hant': 'zh-Hant', 'zh-hans': 'zh-Hans', ja: 'ja', id: 'id' };
export const OG_LOCALE_MAP = { ko: 'ko_KR', th: 'th_TH', vi: 'vi_VN', en: 'en_US', 'zh-hant': 'zh_TW', 'zh-hans': 'zh_CN', ja: 'ja_JP', id: 'id_ID' };
```

★`OG_LOCALE_MAP` 은 og:locale 규격상 `언어_지역` 이라 스크립트 코드를 못 쓴다 → 번체는 `zh_TW`(대만), 간체는 `zh_CN` 을 쓴다. **hreflang(`zh-Hant`/`zh-Hans`)과 다른 것이 정상이다** — hreflang 은 지역 중립이어야 하고(간체 타겟이 본토가 아님) og:locale 은 페이스북이 지역 코드만 받는다.

- [ ] **Step 2: 테스트 — 아직 비활성이라 hreflang 에 안 나와야 한다**

```bash
cd v4 && npm test 2>&1 | grep -E "^# (pass|fail)"
```
Expected: `# pass 119 / # fail 0` — `seo.test.mjs:23` 의 "미빌드 언어 누출 금지" 테스트가 `zh-hant` 를 **누출 금지 대상으로 자동 포함**한다(= 지금 유출되면 여기서 잡힌다).

- [ ] **Step 3: 커밋**

```bash
git add v4/scripts/lib/seo.mjs
git commit -m "feat(i18n): register zh-hant/zh-hans in the lang maps (still inactive)"
```

---

### Task 5: 로케일 카피 (`en.yml` → 번체·간체)

**★원본은 `en.yml`(567줄)이다. `ko.yml` 이 아니다** — ko 에는 `consult:` 블록이 없어서(ko 는 상담 페이지가 없다) ko 기반으로 만들면 `render.mjs:6` 이 `missing key: consult.h1` 로 빌드를 죽인다.

**Files:** Create `v4/i18n/locales/zh-hant.yml`, `v4/i18n/locales/zh-hans.yml`

- [ ] **Step 1: 번역**

`en.yml` 을 원본으로 두 파일 생성. 규칙:
- **번체(zh-hant)** = 대만 만다린. 길이 단위 `公分`. 대만식 어휘.
- **간체(zh-hans)** = 동남아·미국 화교. 길이 단위 `厘米`.
- **화자 = 남성 한국인 의사, 격식체.** 중국어는 성별 입자가 없어 태국어만큼 까다롭진 않다([[feedback_i18n_speaker_register]]).
- `meta.lang` / `meta.og_locale` 은 각 파일에 맞게.
- **키를 하나도 빼지 말 것** — 렌더러가 throw 한다.
- 원격 상담 카피(`clinic.remote_consult`, `consult.remote`)는 **vi/en 판 기준**(온라인 상담 중심 + 면책). 방콕 같은 현지 인프라가 없는 시장이라 th 판(사무소 4단계)이 아니다.

- [ ] **Step 2: 키 누락 검사 (렌더 전에)**

```bash
cd v4 && node -e "
const yaml=require('js-yaml'), fs=require('fs');
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?flat(v,p+k+'.'):[p+k]);
const en=new Set(flat(yaml.load(fs.readFileSync('i18n/locales/en.yml','utf8'))));
for(const l of ['zh-hant','zh-hans']){
  const t=new Set(flat(yaml.load(fs.readFileSync('i18n/locales/'+l+'.yml','utf8'))));
  const missing=[...en].filter(k=>!t.has(k));
  console.log(l+': en 대비 누락', missing.length, missing.slice(0,8).join(', '));
}
"
```
Expected: 두 언어 다 `누락 0`

- [ ] **Step 3: 한글 잔존 검사**

```bash
cd v4 && node -e "
const fs=require('fs');
for(const l of ['zh-hant','zh-hans']){
  const s=fs.readFileSync('i18n/locales/'+l+'.yml','utf8');
  const ko=s.match(/[가-힣]+/g)||[];
  console.log(l+': 한글 토큰', ko.length, ko.slice(0,5).join(','));
}
"
```
Expected: `한글 토큰 0` (주석에 한글이 있으면 그건 무방 — 값만 보려면 주석 제외)

- [ ] **Step 4: 커밋**

```bash
git add v4/i18n/locales/zh-hant.yml v4/i18n/locales/zh-hans.yml
git commit -m "feat(i18n): add Traditional/Simplified Chinese copy"
```

---

### Task 6: `seo.yml` 2언어

`seo.mjs:29` 는 `no seo config for lang` 으로 **throw** 한다. 선택이 아니라 빌드 게이트다. `og_image` 도 `buildHead` 가 무가드로 참조한다.

**Files:** Modify `v4/i18n/seo.yml`

- [ ] **Step 1:** `zh-hant`/`zh-hans` 블록 추가 (title/description/FAQ/og_image). og_image 는 Task 8 에서 만들 `og/zh-hant.jpg`·`og/zh-hans.jpg`.
- [ ] **Step 2:** `node -e "require('./scripts/lib/seo.mjs')"` 류로 throw 안 나는지 확인 (실빌드는 Task 9)
- [ ] **Step 3:** 커밋 `feat(i18n): SEO metadata for Chinese locales`

---

### Task 7: `messenger.yml` 2언어 + 관행 예외를 테스트로 고정

**Files:** Modify `v4/i18n/messenger.yml` · `v4/scripts/test/messenger.test.mjs`

- [ ] **Step 1: 채널 추가**

```yaml
zh-hant:
  channel: whatsapp
  url: "https://wa.me/821066932838?text=..."   # 번체 프리필
  label: "WhatsApp 諮詢"
  color_bg: "#25D366"
  color_fg: "#FFFFFF"
  # 대만·화교 시장엔 카카오가 무의미해 제외(3채널 관행의 첫 예외 — 아래 테스트가 지킨다)
  consult_channels: [*whatsapp, *line]
zh-hans:
  channel: whatsapp
  url: "https://wa.me/821066932838?text=..."   # 간체 프리필
  label: "WhatsApp 咨询"
  color_bg: "#25D366"
  color_fg: "#FFFFFF"
  consult_channels: [*whatsapp, *line]
```

- [ ] **Step 2: 의도를 테스트로 박는다**

```js
test('중국어는 카카오를 뺀 2채널 — 의도된 예외다', () => {
  // 대만·동남아/미국 화교에게 카카오는 쓸 이유가 없다. 3채널 관행에 맞춘다며
  // 되돌려 놓지 말 것. consult.html 은 채널 2개(>1)로도 정상 생성된다.
  for (const lang of ['zh-hant', 'zh-hans']) {
    const ch = getMessengerCTA(lang).consult_channels;
    assert.equal(ch.length, 2, `${lang} 채널 수`);
    assert.deepEqual(ch.map((c) => c.channel), ['whatsapp', 'line']);
    assert.ok(!ch.some((c) => c.channel === 'kakao'), `${lang} 에 카카오가 되돌아왔다`);
  }
});
```

- [ ] **Step 3:** `cd v4 && npm test` → 통과
- [ ] **Step 4:** 커밋 `feat(i18n): WhatsApp+LINE consult channels for Chinese`

---

### Task 8: 자산 (프로그램 이미지 · OG)

**Files:** Copy into `v4/public/programs/images/zh-hant/`, `zh-hans/` · Create `v4/public/og/zh-hant.jpg`, `zh-hans.jpg`

- [ ] **Step 1: 영어판 인포그래픽 복사**

```bash
cd v4/public/programs/images
for L in zh-hant zh-hans; do cp -r en "$L"; done
ls zh-hant zh-hans
```
★리졸버(`program-img.mjs:8`)가 `{lang}/{slug}/{file}` 를 먼저 보고 없으면 `_common`(한국어 원본)으로 폴백한다 → **복사만으로 한글 원본을 덮는다. 코드 변경 0.** 하이픈 언어코드도 안전(슬러그 정규식 `[a-z0-9-]+` 는 slug 만 잡는다).

- [ ] **Step 2: OG 이미지 2종** — 기존 `og/en.jpg` 제작 방식 재사용(1200×630).
- [ ] **Step 3: 로고 — 작업 없음.** `build-i18n.mjs:145`·`_shell.js:101` 이 `lang !== 'ko'` 분기라 중국어도 자동으로 `-en` 자산을 쓴다(`logo_en.png`·`saebom-logo-en.png`·`logo-187-inline-en.png` 셋 다 존재).
- [ ] **Step 4:** 커밋 `feat(i18n): Chinese program images (reuse en) and OG cards`

---

### Task 9: 🚦 활성화 + hreflang 전수 검증

**여기서 처음으로 사이트에 중국어가 나타난다.**

**Files:** Modify `v4/scripts/lib/seo.mjs:15`

- [ ] **Step 1:** `export const ACTIVE_LANGS = ['ko', 'th', 'vi', 'en', 'zh-hant', 'zh-hans'];`

- [ ] **Step 2: 빌드**

```bash
cd v4 && npm run build:i18n
```
Expected: 경고 없이 완료. `public/zh-hant/`, `public/zh-hans/` 생성.

- [ ] **Step 3: ★hreflang 전수 검사 — 값과 타겟 둘 다**

```bash
cd v4 && node -e "
const fs=require('fs'), path=require('path');
const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):(e.name.endsWith('.html')?[path.join(d,e.name)]:[]));
const files=['ko','th','vi','en','zh-hant','zh-hans'].flatMap(l=>walk('public/'+l));
let bad=0, undef=0, total=0;
for(const f of files){
  const html=fs.readFileSync(f,'utf8');
  for(const m of html.matchAll(/hreflang=\"([^\"]+)\" href=\"https:\/\/www\.dr187growup\.com([^\"]+)\"/g)){
    total++;
    if(m[1]==='undefined'||!m[1]){ undef++; continue; }
    const p='public'+m[2].replace(/\/\$/,'/index.html');
    const target=p.endsWith('/')?p+'index.html':p;
    if(!fs.existsSync(target)){ bad++; if(bad<4) console.log('허공:',f,'->',m[2]); }
  }
}
console.log('hreflang 총',total,'| undefined',undef,'| 허공(파일없음)',bad);
"
```
Expected: **`undefined 0` · `허공 0`** — 둘 중 하나라도 0 이 아니면 멈추고 원인부터 찾는다.
★우리 호스팅은 없는 경로를 404 가 아니라 **200 + 한국어 SPA 셸**로 준다(soft-404) → 브라우저로 열어서 "되네" 하면 못 잡는다. **파일 존재로만 판정.**

- [ ] **Step 4: sitemap 수 확인**

```bash
cd v4 && node -e "
const s=require('fs').readFileSync('public/sitemap.xml','utf8');
console.log('URL', (s.match(/<loc>/g)||[]).length, '| alternate undefined', (s.match(/hreflang=\"undefined\"/g)||[]).length);
"
```
Expected: 블로그 발행 전이므로 `URL 275`(홈6+서브18+상담5+블로그인덱스4+글240+... 실제값 확인) · `undefined 0`.
★블로그 120편 발행(Chunk 5) 후 **395** 가 된다.

- [ ] **Step 5:** `cd v4 && npm test` → 통과 (테스트 수가 늘어난 ACTIVE_LANGS 를 자동 반영)
- [ ] **Step 6:** 커밋 `feat(i18n): activate zh-hant/zh-hans`

---

## Chunk 3: 앱 표면 (조용히 한국어가 되는 곳들)

### Task 10: `_shell.js` — 스위처 · 경로판정 · GA4 게이트

**Files:** Modify `v4/public/_shell.js:55,145,153`

- [ ] **Step 1:** `__LANGS`(`:145`)에 2개 추가 — 라벨은 **자국어 표기**(`繁體中文` / `简体中文`), 기존 규칙.
- [ ] **Step 2:** `__PATH_LANG_RE`(`:153`) → `/^\/(ko|th|vi|en|zh-hant|zh-hans)(\/.*)?$/`
  ★**`zh-hans` 를 `zh-han` 뒤에 두지 말 것** 같은 접두 함정은 없지만, 정규식 교대는 **긴 것을 먼저** 두는 습관을 지킨다.
- [ ] **Step 3:** `allowed`(`:55`) 배열에 2개 추가 — calc 이벤트 locale 게이트.
- [ ] **Step 4: 좌표 히트테스트로 스위처 검증** — 스크린샷 말고 `document.elementFromPoint` 로(오버레이 P0 학습, [[shell_header_nav_2026_07]]). 드롭다운에서 `繁體中文` 클릭 → `/zh-hant/…` 로 가는지.
- [ ] **Step 5:** 커밋

### Task 11: 라우터 · 301

**Files:** Modify `v4/src/app/router.tsx:142` · `v4/vite.config.ts:46`

- [ ] **Step 1:** `I18N_LANGS` 에 2개 추가 → HardRedirect 자동 확장
- [ ] **Step 2:** `seoRedirects` 정규식 → `/^\/(ko|th|vi|en|zh-hant|zh-hans)$/` (슬래시 없는 `/zh-hant` → `/zh-hant/` 301). **안 하면 한국어 SPA 셸이 뜬다.**
- [ ] **Step 3:** `cd v4 && npx tsc -b --noEmit` → v4 오류 0 (`../remotion` 오류는 워크트리에 remotion/node_modules 가 없어서 나는 기존 것)
- [ ] **Step 4:** 커밋

### Task 12: 계산기 — CN 고정

**Files:** Modify `v4/src/features/website/components/calcLabels.ts` · `HeightCalculator.tsx:48`

- [ ] **Step 1:** `CalcLang` 에 `'zh-hant' | 'zh-hans'` 추가 + `calcLabels` 2 로케일(번체/간체 전체 라벨)
- [ ] **Step 2:** `HeightCalculator.tsx:48` 의 삼항을 CN 분기 포함으로:

```ts
const standard: GrowthStandard =
  lang === 'en' ? nationality
  : lang === 'th' ? 'TH'
  : (lang === 'zh-hant' || lang === 'zh-hans') ? 'CN'
  : 'KR';
```
★안 하면 **에러 없이 한국 표준으로 계산**된다(`calc-main.tsx:11` 이 `isCalcLang(x) ? x : 'ko'` 로 조용히 폴백).

- [ ] **Step 3:** `HeightCalculatorResult` 의 `MESSENGER` 맵에 2언어 → WhatsApp
- [ ] **Step 4: 실제 확인** — `/calc.html?lang=zh-hant` 열어 **중국어로 뜨는지 + 출처 문구가 CN 인지**. (라벨이 한국어면 Step 1 이 안 먹은 것)
- [ ] **Step 5:** 커밋

### Task 13: 🔴 Meta 픽셀 — 한국 광고 픽셀 오발사 차단

**Files:** Modify `v4/src/shared/lib/analytics.ts:50,122-127`

- [ ] **Step 1: 실패하는 테스트부터**

`getLocale('/zh-hant/index.html')` 이 `'ko'` 를 반환하는 걸 고정하는 테스트를 먼저 쓴다(현재 동작 = 버그).

- [ ] **Step 2: 정규식 수정**

`:123` 의 `/^\/([a-z]{2})(?:\/|$)/` 는 **2글자만** 잡아 `zh-hant` 를 놓치고 `'ko'` 로 떨어진다 → `VITE_META_PIXEL_ID_KO`(**한국 광고 전용 픽셀**)가 중국어 페이지에서 발사된다. 하이픈·다글자를 받도록 고치고 `SUPPORTED_LOCALES`(`:50`)에 2언어 추가.

- [ ] **Step 3:** 테스트 → `getLocale('/zh-hant/')` === `'zh-hant'`, `pixelIdsForLocale('zh-hant')` = **기본 픽셀**(KO 아님)
- [ ] **Step 4:** 커밋

★`analytics.ts:32` 는 Vite 가 `import.meta.env` 를 **정적 치환**해서 로케일마다 리터럴 한 줄이 필요하다. 지금은 중국어 전용 픽셀이 없으니 기본 폴백으로 충분하지만, 나중에 붙일 땐 env 만으론 안 된다.

### Task 14: 익명 예측 적재 — 영구 오염 차단

**Files:** Modify `v4/src/features/website/lib/anonymousName.ts:4,23,25`

- [ ] **Step 1:** `asLocale('zh-hant')` 가 `'en'` 으로 떨어져 **국적 `EN`·영어 이름("Emma")으로 DB 에 기록**된다. insert 시점에 굳어 영구다. 2언어 추가 + 국가 매핑(번체→`TW`, 간체→`CN`? — **간체 타겟이 본토가 아니므로 `SG`/`US` 도 아니고 단일 매핑이 애매하다. `CN` 대신 중립 값을 쓸지 결정 필요 → 구현자는 여기서 멈추고 사용자에게 물을 것**) + 중국어 이름 풀.
- [ ] **Step 2:** `PredictionsLogPage.tsx:14,133` 국가 필터에 추가
- [ ] **Step 3:** 커밋

---

## Chunk 4: 분석 서버 (조용히 한국어에 합산되는 곳)

### Task 15: 🔴 `classifyCountry` — 한국어 수치 오염 차단

**Files:** Modify `ai-server/src/services/ga4SiteBreakdown.ts:6,12-18,25` · `__tests__/siteBreakdown.test.mjs`

- [ ] **Step 1: 실패 테스트** — `classifyCountry('/zh-hant/index.html')` 이 지금 `'ko'` 를 반환하는 것 고정
- [ ] **Step 2:** `Country` 유니온에 2언어 추가 + 분기 추가. ★`return 'ko'` 폴백은 **루트(`/`)가 `/ko/` 301 이라 의도된 것**이니 유지하되, 중국어는 그 앞에서 잡는다.
- [ ] **Step 3:** `:25` 의 메인페이지 정규식 `/^\/[a-z]{2}\/?(index\.html)?$/` → 하이픈 7글자를 받도록. **안 고치면 메인 카드가 과소집계**된다.
- [ ] **Step 4:** `Record<CountryKey,…>` 리터럴(`:179,222,234,252`)은 **TS 컴파일 에러로 시끄럽게 잡힌다** — 유일하게 친절한 곳.
- [ ] **Step 5:** `cd ai-server && npm run build && npm test` ★**build 먼저**(테스트가 `dist/` 를 잰다)
- [ ] **Step 6:** 커밋

### Task 16: GSC 언어 필터

**Files:** Modify `ai-server/src/services/searchConsole.ts:41` · `routes/analytics.ts:10` · `v4/.../SearchQueryPanel.tsx:10`

- [ ] **Step 1:** `SearchLang` 유니온 + `LANGS` 화이트리스트에 2언어. ★지금은 `zh-hant` 가 `'all'` 로 강등되고 **응답이 그 값을 echo** 해서 **전체 사이트 수치가 중국어로 라벨링**된다(200·success:true 라 티가 안 난다).
- [ ] **Step 2:** `langFilter`(`:89`)는 문자열 보간이라 union 만 넓히면 동작 — 수정 불필요.
- [ ] **Step 3:** UI 탭 2개 추가
- [ ] **Step 4:** 커밋

### Task 17: 마케팅 탭

**Files:** `marketingAnalyticsService.ts:34` `CountryKey` · `CountrySiteBreakdownPanel.tsx:15`

- [ ] **Step 1~2:** 탭 추가 + `npx tsc -b --noEmit`
- [ ] **Step 3:** 커밋

---

## Chunk 5: 블로그 120편

### Task 18: `cn`/`ch` → `blog_published`

**Files:** Create `ai-server/scripts/publish-chinese-blog.mjs`

- [ ] **Step 1: 스크립트**

`marketing_articles.blog.cn` → `blog_published(language='zh-hans')`, `.ch` → `'zh-hant'`, `status='published'`.
- **매핑은 여기 한 곳** — 마케팅 DB 코드(`ch`/`cn`)를 사이트 코드로 바꾸는 유일한 지점. 함수 상단에 그 사실을 주석으로.
- 충돌 없음(스키마 보증): `039_blog_published.sql:18` 이 `unique (article_id, language)` 이고 slug 에 전역 유니크가 **없으며** `language` 에 CHECK 도 없다.
- `--dry` 플래그 필수.

- [ ] **Step 2:** `node scripts/publish-chinese-blog.mjs --dry` → 120건 예정 확인
- [ ] **Step 3:** 실행 → `blog_published` 언어별 집계가 `zh-hans/published 60`, `zh-hant/published 60`
- [ ] **Step 4:** 커밋

### Task 19: 최종 빌드 + 전수 검증

- [ ] **Step 1:** `cd v4 && npm run build:i18n -- --refetch`
- [ ] **Step 2: hreflang 전수 재검사** (Task 9 Step 3 스크립트 재사용) → **undefined 0 · 허공 0**
  ★블로그는 **`article_id` 클러스터**로 hreflang 을 만든다(slug 가 언어마다 달라서). 중국어가 자동 편입되며 기존 240편의 hreflang 도 6언어로 넓어진다 — **그래서 이 검사는 240편까지 다시 본다.**
- [ ] **Step 3: sitemap** → **URL 395** · undefined 0
- [ ] **Step 4:** `cd v4 && npm test` · `cd ai-server && npm run build && npm test`
- [ ] **Step 5:** 커밋 → main 머지·푸시

---

## 완료 기준

- [ ] `/zh-hant/`·`/zh-hans/` 4페이지 + 상담 페이지 + 블로그 60편씩 렌더
- [ ] hreflang **undefined 0 · 허공 0** (240편 기존 글 포함 전수)
- [ ] sitemap 395 URL
- [ ] 계산기가 중국어로 뜨고 **CN 표준** 사용
- [ ] 중국어 페이지에서 **한국 광고 픽셀이 발사되지 않음**
- [ ] GA4 언어 탭에 중국어가 **독립 버킷**으로 잡힘(한국어에 합산 안 됨)
- [ ] `npm test` v4 · ai-server 전부 통과

## 사용자 확인 필요

- **원격 상담 카피 원장 감수** (vi/en 판과 같은 성격 — 화상상담 실제 제공 범위)
- **Task 14 익명 예측의 간체 국적 매핑** — 간체 타겟이 본토가 아니라 단일 국가 코드가 애매함
