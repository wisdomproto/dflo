# i18n + Blog Infrastructure (Global SEO Foundation)

**Date**: 2026-05-13
**Status**: Draft
**Related**: `redesign_hp.md`, `marketing/`

## Context

187 성장클리닉 (`dr187growup.com`) is expanding from a Korea-only clinic to 7 language markets. The strategic goal is **organic SEO traffic → localized messenger consultation** (handed off to local partners). 187개국 키워드 분석 → 7개 언어축 (ko/en/ja/zh-tw/th/vi/id) 선정 완료.

The redesigned homepage at `/test/index.html` is a long-form static HTML page that wins decisively over the existing React carousel homepage on SEO indexability and conversion design (see comparison review 2026-05-13). It is now the foundation for global rollout.

This spec covers the **infrastructure layer** to localize that page into 7 languages, add the missing SEO surface (meta/schema/sitemap), wire per-country messenger CTAs, and extend the same build pipeline for a content blog at `/blog/{lang}/{slug}`.

Marketing strategy (positioning, channel mix, content calendar, ad budget) is a separate concern handled in a parallel session.

## Goals

1. Generate localized homepages at `/test/{lang}/index.html` for 7 languages from a single Korean source + per-locale YAML
2. Add complete SEO surface (meta description, canonical, hreflang, OG, JSON-LD MedicalClinic + Physician + FAQPage, sitemap.xml)
3. Per-locale messenger CTA routing (KakaoTalk / LINE / Zalo / WhatsApp) via central config
4. Blog infrastructure reusing the same i18n pipeline: `/blog/{lang}/{slug}/index.html` from Markdown source
5. GA4 analytics extended to track `(channel, source, locale, page_type)`
6. Build integrated into existing `vite build` so Railway deploy picks up output

## Non-goals

- **Content translation itself** — waits for Korean copy freeze (separate task)
- **Case data dynamic matching from `patient_analyses`** — deferred to spec B
- **React `/calc` and `/cases` route i18n** — separate spec; for now they remain Korean and global pages deep-link to them
- **Marketing strategy** — positioning, channel mix, ad budget, content calendar, KPI — separate parallel session
- **Promote `/test/` → root `/`** — happens after Korean copy freeze + 1차 launch validation
- **Patient app (`/app/*`) and admin (`/admin/*`)** — remain Korean-only
- **Backend patient data cleanup + consent flagging** — prerequisite for spec B

## 1차 Launch Scope

**Activated markets (2026-05-13 decision):**
- 🇰🇷 ko / 🇹🇭 th / 🇻🇳 vi / 🇺🇸 en (4개 언어)
- Infrastructure supports all 7; ko/th/vi/en locale files populated initially
- All 4 markets route messenger CTA to KakaoTalk (`https://pf.kakao.com/_ZxneSb`) until LINE/Zalo/WhatsApp accounts ready
- ja / zh-tw / id locale files created as stubs; activation TBD

⚠️ **Note for en**: WhatsApp이 영어권(미국/인도/필리핀/말레이) 표준이지만 1차는 Kakao로 시작. 영어 사용자에게 KakaoTalk은 낯설어 전환 저하 위험 있음 — WhatsApp 계정 받는 즉시 우선 교체 권장.

## Structure Freeze — `/test/index.html` Section Contract

The page is frozen at **13 sections**. Korean copy edits are free within sections; adding/removing/reordering is forbidden during i18n work.

| # | Section | DOM ID / class | Heading level |
|---|---|---|---|
| 1 | Hero | `header.t-hero` | h1 |
| 2 | Intro (philosophy) | `section.intro` (first) | h2 |
| 3 | Medal (6 case cards) | `section.medal` | h3 |
| 4 | Confirm-timing (golden time) | `section.medal` (second) | h3 |
| 5 | Hormone solution + 3-core | `section#hormone` | h3 ×2 |
| 6 | Intro2 (management types) | `section.intro` (second) | h2 |
| 7 | Obesity (5 subsections) | `section#obesity` | h3 ×6 |
| 8 | Precocious puberty (3 subsections) | `section#precocious` | h3 ×4 |
| 9 | Body proportion | `section#proportion` | h3 ×2 |
| 10 | Bodywork (posture/exercise) | `section#bodywork` | h3 |
| 11 | Late puberty (3 subsections) | `section#late` | h3 ×3 |
| 12 | Process (7-step) | `section#process` | h3 |
| 13 | Director | `section.director` | h3 |

Sticky nav anchors: `#obesity #precocious #proportion #bodywork #late` (5 case pills). These are part of the contract — IDs must not change.

## Architecture

**Choice**: Node script + YAML locale + HTML template. **Not** Astro/11ty/Next.js — overhead too high for a single page + thin blog.

### File Layout

```
dflo/v4/
├── i18n/
│   ├── template/
│   │   ├── index.html              # Frozen 13-section HTML with {{placeholders}}
│   │   ├── blog-post.html          # Blog post template
│   │   └── blog-index.html         # Blog listing template
│   ├── locales/
│   │   ├── ko.yml                  # ✅ populated (extracted from /test/index.html)
│   │   ├── th.yml                  # ✅ populated (translation)
│   │   ├── vi.yml                  # ✅ populated (translation)
│   │   ├── en.yml                  # ✅ populated (translation)
│   │   ├── ja.yml                  # stub
│   │   ├── zh-tw.yml               # stub
│   │   └── id.yml                  # stub
│   ├── messenger.yml               # per-locale messenger config
│   ├── seo.yml                     # per-locale meta/OG values
│   └── blog-cache/
│       └── {lang}/{slug}.json      # ContentFlow API fetch cache (build idempotency)
├── scripts/
│   ├── build-i18n.mjs              # Main build orchestrator
│   ├── lib/
│   │   ├── render.mjs              # Template + locale → HTML
│   │   ├── messenger.mjs           # getMessengerUrl(lang) resolver
│   │   ├── seo.mjs                 # meta/hreflang/JSON-LD generators
│   │   ├── sitemap.mjs             # sitemap.xml builder
│   │   ├── blog.mjs                # Blog renderer (cached JSON → HTML)
│   │   └── fetch-contentflow-posts.mjs   # ContentFlow API fetcher
│   └── i18n-validate.mjs           # Missing key checker
└── public/test/                    # Build output target (kept until promote-to-root phase)
    ├── index.html                  # Stays as ko polishing source (NOT overwritten)
    ├── _shell.css, _shell.js
    ├── {lang}/index.html           # ko/th/vi/en/ja/zh-tw/id × 7
    ├── {lang}/blog/index.html      # blog landing per locale
    ├── {lang}/blog/{slug}/index.html  # individual posts per locale
    ├── sitemap.xml                 # combined sitemap with hreflang alternates
    └── robots.txt                  # references sitemap
```

### Build Pipeline

`v4/package.json`:
```json
{
  "scripts": {
    "build:i18n": "node scripts/build-i18n.mjs",
    "build": "vite build && npm run build:i18n",
    "validate:i18n": "node scripts/i18n-validate.mjs"
  }
}
```

Railway picks up `vite build` output (`dist/`) which includes the `public/test/*` static files. The i18n script runs after Vite so the generated localized files are present in `dist/test/`.

## Locale File Schema

Each `locales/{lang}.yml` mirrors the 13-section structure. Keys use dotted paths; the template references them with `{{key.path}}`.

```yaml
# Example: ko.yml (abridged)
meta:
  lang: ko
  title: "187 성장클리닉 | 우리 아이 예상키 무료 측정"
  description: "..."

hero:
  title_line1: "우리 아이 키,"
  title_line2: "지금 어디쯤일까요?"

medal:
  heading_part1: "성장 검사를"
  heading_accent: "고려해볼 수 있는 경우"
  cards:
    - alt: "또래보다 키가 작은 아이"
      caption: "..."
    - alt: "..."

obesity:
  heading_part1: "성장기 아이들의 살은"
  heading_accent: "모두 키로 가지 않습니다"
  body: "..."
  cta_label: "우리 아이도 1:1 전문 상담 →"
  subsections:
    - heading: "..."
      body: "..."
    # ... 5 total

# ... 13 sections total

cta_global:
  bottom_nav_consult: "예상키 측정"
  header_consult: "1:1 상담"
```

**Stub language behavior**: missing values fall back to ko + a `[NEEDS TRANSLATION]` marker visible in dev builds (stripped in prod).

## Messenger Routing

`i18n/messenger.yml`:
```yaml
ko:
  channel: kakao
  url: "https://pf.kakao.com/_ZxneSb"
  label: "1:1 카카오톡 상담"
  color_bg: "#FAE100"
  color_fg: "#3C1E1E"
th:
  channel: kakao   # 1차: Kakao fallback
  url: "https://pf.kakao.com/_ZxneSb"
  label: "ปรึกษาผ่าน KakaoTalk"   # 태국어로 카톡 라벨
  color_bg: "#FAE100"
  color_fg: "#3C1E1E"
  # TODO: LINE 계정 받으면 channel=line, url=line.me/ti/p/@..., label="ปรึกษาทาง LINE", color=#06C755
vi:
  channel: kakao   # 1차: Kakao fallback
  url: "https://pf.kakao.com/_ZxneSb"
  label: "Tư vấn qua KakaoTalk"
  color_bg: "#FAE100"
  color_fg: "#3C1E1E"
  # TODO: Zalo 계정 받으면 channel=zalo, url=zalo.me/..., label="Tư vấn qua Zalo", color=#0068FF
en:
  channel: kakao   # 1차: Kakao fallback
  url: "https://pf.kakao.com/_ZxneSb"
  label: "Consult via KakaoTalk"
  color_bg: "#FAE100"
  color_fg: "#3C1E1E"
  # TODO: WhatsApp 계정 받으면 channel=whatsapp, url=wa.me/..., label="Chat on WhatsApp", color=#25D366

# Stubs (infra supports, not activated)
ja: { channel: line,     url: "TBD", label: "LINEで相談",     color_bg: "#06C755", color_fg: "#FFFFFF" }
zh-tw: { channel: line,  url: "TBD", label: "LINE 諮詢",      color_bg: "#06C755", color_fg: "#FFFFFF" }
id: { channel: whatsapp, url: "TBD", label: "Konsultasi WhatsApp", color_bg: "#25D366", color_fg: "#FFFFFF" }
```

Build-time resolver `getMessengerCTA(lang)` returns `{href, label, bg, fg, channel}`. Template uses these for:
- Header CTA pill
- 5 inline `.case-cta-inline` buttons in case sections (obesity/precocious/proportion/bodywork/late)
- Floating bottom nav consult tab

When TBD URL detected for an activated language, build fails with explicit error.

## SEO Surface

`i18n/seo.yml` per locale:
```yaml
ko:
  title: "187 성장클리닉 | 우리 아이 예상키 무료 측정"
  description: "..."
  og_image: "/test/og/og-ko.jpg"
  faq:
    - q: "..."
      a: "..."
    # 5-7 entries
th: { ... }
vi: { ... }
```

`<head>` template additions (auto-injected per language):

```html
<html lang="{{meta.lang}}">
<head>
  <title>{{seo.title}}</title>
  <meta name="description" content="{{seo.description}}">
  <link rel="canonical" href="https://www.dr187growup.com/{{lang}}/">

  <!-- hreflang for all 7 + x-default -->
  <link rel="alternate" hreflang="ko" href="https://www.dr187growup.com/ko/">
  <link rel="alternate" hreflang="th" href="https://www.dr187growup.com/th/">
  <link rel="alternate" hreflang="vi" href="https://www.dr187growup.com/vi/">
  <link rel="alternate" hreflang="en" href="https://www.dr187growup.com/en/">
  <link rel="alternate" hreflang="ja" href="https://www.dr187growup.com/ja/">
  <link rel="alternate" hreflang="zh-TW" href="https://www.dr187growup.com/zh-tw/">
  <link rel="alternate" hreflang="id" href="https://www.dr187growup.com/id/">
  <link rel="alternate" hreflang="x-default" href="https://www.dr187growup.com/ko/">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="{{meta.og_locale}}">  <!-- ko_KR / th_TH / vi_VN etc -->
  <meta property="og:title" content="{{seo.title}}">
  <meta property="og:description" content="{{seo.description}}">
  <meta property="og:image" content="https://www.dr187growup.com{{seo.og_image}}">
  <meta property="og:url" content="https://www.dr187growup.com/{{lang}}/">

  <!-- JSON-LD: MedicalClinic + Physician + FAQPage -->
  <script type="application/ld+json">{...}</script>
  <script type="application/ld+json">{...}</script>
  <script type="application/ld+json">{...}</script>
</head>
```

JSON-LD generators:
- **MedicalClinic**: name, url, logo, address, telephone, openingHours, medicalSpecialty (Pediatrics), areaServed
- **Physician**: name (원장), medicalSpecialty, worksFor (clinic), image, alumniOf
- **FAQPage**: 5–7 Q&A pairs per locale from `seo.yml`

## Sitemap

`public/test/sitemap.xml` auto-generated, includes `xhtml:link rel="alternate"` per language for every URL:

```xml
<urlset xmlns="..." xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://www.dr187growup.com/ko/</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="https://www.dr187growup.com/ko/"/>
    <xhtml:link rel="alternate" hreflang="th" href="https://www.dr187growup.com/th/"/>
    <!-- ... all 7 + x-default -->
  </url>
  <url>
    <loc>https://www.dr187growup.com/ko/blog/</loc>
    <!-- ... -->
  </url>
  <!-- ... per blog post per locale -->
</urlset>
```

`robots.txt` references sitemap.

## Blog Infrastructure

### Content Source: ContentFlow API (not Markdown-in-repo)

Blog content for 187 성장클리닉 already lives in ContentFlow (`C:\project\contentflow1\contentflow`) — Korean blog posts authored there are currently published via WordPress REST API. dflo's new module pulls posts directly from ContentFlow at build time and renders to static HTML, bypassing WordPress.

**ContentFlow data model (existing, no migration)**:
- `contents` (root): `id`, `project_id`, `title`, `tags[]`, `status`
- `base_articles`: `body` (HTML), `body_plain_text`, `word_count` — AI-generated article body
- `blog_contents`: `seo_title`, `url_slug`, `meta_description`, `primary_keyword`, `secondary_keywords[]`, `seo_details` (JSONB with `globalStyle` for typography), `status` (draft/published), `published_at`
- `blog_cards[]`: ordered sections (text/image/divider/quote/list) with `content` JSONB
- `translations`: `(content_id, language, channel_type)` unique — per-language body/title/cards_json
- `projects`: 연세새봄의원 = specific UUID

**New endpoint to add in ContentFlow** (this spec's only ContentFlow side change):
```
GET /api/blog/by-project/{projectId}/posts?lang=ko&status=published
Returns: [{
  id, slug, title, meta_description, primary_keyword, secondary_keywords,
  tags, published_at, updated_at,
  body_html,           # base_articles.body OR translations.body if lang≠ko
  cards: [...],        # blog_cards OR translations.cards_json
  global_style: {...}  # seo_details.globalStyle for typography
}]
```
- Public read (no auth) for `status=published` only — bypasses RLS via service-role server route
- Cache headers: `s-maxage=300, stale-while-revalidate=600`
- Returns 404 if `lang` translation absent (caller decides fallback)

**dflo build-time fetcher** (`scripts/lib/fetch-contentflow-posts.mjs`):
1. Calls ContentFlow endpoint for each activated lang (ko/th/vi/en)
2. Writes fetched posts to `i18n/blog-cache/{lang}/{slug}.json` (build idempotency + offline rebuild)
3. Build script reads from cache, renders to `/test/{lang}/blog/{slug}/index.html`
4. `npm run build:i18n -- --refetch` forces fresh pull

**Translation fallback rule**: If `translations` table lacks a (post, lang) row, post is skipped for that lang's build (not auto-translated). UI for triggering translation lives in ContentFlow.

### URL Pattern
- Listing: `/test/{lang}/blog/index.html`
- Post: `/test/{lang}/blog/{slug}/index.html`
- Slug source: `blog_contents.url_slug` (Korean) + `translations.{lang}.url_slug` if present, else fallback to Korean slug

### Render Behavior
- `blog-post.html` template + cached JSON → static HTML
- Body HTML pasted in, `_shell.css` styles applied + `seo_details.globalStyle` for per-post typography
- Auto-inserted: messenger CTA at bottom (uses same `getMessengerCTA(lang)` helper as homepage) + related cases + related posts
- hreflang per post built from `translations` rows (which langs have this post)
- Per-post JSON-LD: `BlogPosting` with author, datePublished, image, headline
- Listing page lists by `published_at DESC`, paginated 10/page if >20 posts

### Related Cases Hook (Static, Spec A)
Each post optionally declares `related_sections: [obesity, precocious]` in `seo_details` JSONB. Build inserts inline cards at bottom linking to those homepage anchors. Dynamic matching from `patient_analyses` is **Spec B**.

### Webhook (Phase 2 — out of Spec A initial scope)
ContentFlow publish action → POST webhook to Railway → trigger redeploy. For Spec A, manual `npm run build:i18n -- --refetch` is fine.

## Analytics Extension

Current: `trackKakaoConsult(source)` in `v4/src/shared/lib/analytics.ts`.

New: `trackConsultClick({channel, source, locale, page_type})`. Add to `_shell.js` so static pages can fire events without React.

```js
// _shell.js
window.trackConsultClick = function (params) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'consult_click', {
      channel: params.channel,
      source: params.source,
      locale: params.locale,
      page_type: params.page_type, // 'home' | 'blog' | 'case'
    });
  }
};
```

All CTA buttons (header / 5 inline / bottom-nav / blog-post) bind onclick to fire this event with build-time-injected `channel`, `locale`, and section-derived `source`.

GA4 custom dimensions `channel` and `locale` are already registered.

## Migration Phases

| Phase | Deliverable | Validation |
|---|---|---|
| 0 | Build script renders ko/test/ identical to current `/test/index.html` (round-trip test) | Visual diff = 0 |
| 1 | Add th + vi + en locale files + 4 language builds | `npm run validate:i18n` clean |
| 2 | SEO injection (meta/hreflang/OG/JSON-LD/sitemap) | Google Rich Results Test pass |
| 3 | ContentFlow API endpoint + dflo fetcher + blog template + 1 sample post in ko | `/test/ko/blog/{real-slug}/` renders from ContentFlow data |
| 4 | Messenger routing wired to 4 langs (all Kakao) | Click events fire with correct channel/locale |
| 5 | ja/zh-tw/id stub locales (`[NEEDS TRANSLATION]` placeholder) | Pages build without error |
| 6 | (Future) `/test/{lang}/` → `/{lang}/` promotion | Separate deploy spec |

## Resolved Decisions (from 2026-05-13 review)

1. **OG image generation** — Defer detailed design. For Phase 0–3, use a single static placeholder per language (`/test/og/og-{lang}.jpg`). Per-post dynamic OG can be added later via Satori build-time generator.
2. **Translation workflow** — Korean copy freeze first, then translate. Translation method (manual / AI-assisted) decided in a separate parallel task after copy freeze. Build infra ships with stub `[NEEDS TRANSLATION]` placeholders for non-ko langs until copy arrives.
3. **Blog source** — Pull from ContentFlow Supabase (existing 연세새봄의원 project content). New `/api/blog/by-project/{projectId}/posts` endpoint added on ContentFlow side; dflo fetches at build time and caches to `i18n/blog-cache/`. Currently published via WordPress — this work replaces that pipeline for dflo (WordPress remains for ContentFlow's other channels).
4. **Deployment** — Deferred. Spec A delivers a local build that works (`npm run build` produces `dist/test/{lang}/...`). Railway pickup verification + production cutover is a separate later task.

## Self-Review

- [x] No placeholders left as TBD in the design itself (messenger URLs marked TBD only because they depend on user action — that's explicit, not vague)
- [x] Internal consistency: section count (13) matches structure freeze + build phases
- [x] Scope: focused on infrastructure only; marketing strategy/translation content/dynamic cases all explicitly excluded
- [x] Ambiguity check: stub language behavior, fallback rules, build failure conditions all specified
