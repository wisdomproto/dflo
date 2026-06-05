# Marketing Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dflo's stub "콘텐츠 생성" page with a multi-channel content studio (기본글 + N블로그/SEO + 카드뉴스 + AI 이미지) ported faithfully from ContentFlow, adapted to dflo's Vite/React + ai-server architecture.

**Architecture:** dflo has no Zustand content store and no Next.js API routes. We keep dflo's established pattern: **client-direct Supabase services** (`features/marketing/services/*`) for all CRUD, **ai-server Express endpoints** (`/api/marketing/*`) for Gemini text + image generation, and the existing **R2 upload endpoint** (`/api/r2/upload`) for generated images. ContentFlow's SSE streaming is replaced by non-streaming `generateText` (dflo's gemini service is fixed-model, non-streaming). Channel content is stored in new Supabase tables mirroring ContentFlow's schema (`blog_contents`, `blog_cards`, `instagram_contents`, `instagram_cards`), one-master-to-many-channel via `marketing_articles.id` as the parent `content_id`.

**Tech Stack:** React 19 + Vite, Tailwind 4, `@tiptap/react` (NEW dep), `@dnd-kit/*` (already present), Supabase JS, ai-server Express + `@google/genai` (NEW dep, for image generation) alongside existing `@google/generative-ai`, Cloudflare R2.

---

## Scope & Phasing

This spec covers multiple independently-shippable subsystems. It is organized into **4 phases**, each producing working software:

- **Phase 0 — Foundations**: deps, DB migrations, shared types, channel service skeletons. (No user-visible feature alone, but unblocks all.)
- **Phase 1 — 기본글 (Base Article)**: TipTap rich editor, content list w/ categories + reorder, AI topic suggestion, AI generation, section rewrite, 컨펌 toggle. Ships a real editor over the imported 126 articles.
- **Phase 2 — N블로그 + SEO**: `blog_contents`/`blog_cards`, 4-step workflow bar, card editor, global style bar, SEO scoring, naver keyword density. Ships Naver-blog-ready output.
- **Phase 3 — 카드뉴스 + AI 이미지**: `instagram_contents`/`instagram_cards`, canvas editor (TextBlocks drag/resize), built-in templates, AI image generation endpoint + R2 upload + image editor.

**Recommendation:** Execute phases in order. Each phase can be a separate review/merge unit. Phase 1 alone is a large improvement; Phases 2–3 are additive.

---

## Architecture Decisions (read before any task)

1. **No Zustand store.** ContentFlow's 1,724-line `project-store.ts` is replaced by per-channel service modules that match dflo's existing `marketingArticleService.ts` style (`fetch*`, `save*`, `delete*` returning typed objects, snake_case ↔ camelCase mappers, `logger.warn` on read failure, `throw` on write failure). Component state is plain React `useState` (as in current `ArticleEditor.tsx`).

2. **`marketing_articles` is the master ("기본글").** Its existing `body` column holds the base-article HTML. The new channel tables reference `marketing_articles.id` via a `content_id uuid` column. The 126 already-imported rows become the base-article corpus.

3. **AI text generation is non-streaming.** Reuse `generateText(prompt)` from `ai-server/src/services/gemini.ts`. New prompt builders live in `ai-server/src/services/contentPrompts.ts` (ported from ContentFlow `src/lib/prompt-builder.ts`). New routes added to existing `ai-server/src/routes/marketing.ts`.

4. **AI image generation uses `@google/genai`.** dflo ai-server currently has only `@google/generative-ai` (no image-gen). Add `@google/genai` and port `image-generator.ts`. New route `POST /api/marketing/generate-image` returns `{ image: base64, mimeType }`. The client converts to a Blob and uploads via existing `POST /api/r2/upload` (PIN `8054`, FormData).

5. **WebP conversion is client-side** via Canvas (as in ContentFlow `useR2Upload`). No `sharp` on the server.

6. **Verification, not TDD-for-UI.** dflo has no component test harness. Per CLAUDE.md conventions (which override the skill), tests are written ONLY for pure functions (`seoScorer`, content mappers, prompt builders) using `node --test` (the pattern already used by `v4/scripts/test/*.mjs` and addable to ai-server). UI tasks verify with `cd v4 && npx tsc --noEmit` + Claude Preview (start server, navigate, snapshot, console check). Marketing PIN is `8054`; set `sessionStorage['marketing-admin-auth']='true'` to bypass the gate in preview.

7. **Styling:** marketing accent purple is `#4A2D6B` (see `MarketingSettings.tsx`). Reuse it. Tailwind only, mobile-first, ≤200 lines/component (split when larger).

---

## File Structure Map

```
v4/src/features/marketing/
  types.ts                       # MODIFY: add channel/card/canvas types
  data/
    cardnewsTemplates.ts         # NEW (Phase 3): port 9 built-in templates
  services/
    marketingArticleService.ts   # MODIFY: add base-article generate/rewrite/topic calls
    blogChannelService.ts        # NEW (Phase 2): blog_contents/blog_cards CRUD
    cardnewsService.ts           # NEW (Phase 3): instagram_contents/instagram_cards CRUD
    aiImageService.ts            # NEW (Phase 3): generate-image + R2 upload
  utils/
    seoScorer.ts                 # NEW (Phase 2): port calculateNaverSeoScore
    formatForMobile.ts           # NEW (Phase 2): rule-based mobile formatter
    canvasHtml.ts                # NEW (Phase 3): buildCardnewsHtml (export/preview)
  components/
    MarketingArticlesPage.tsx    # MODIFY: becomes channel-tab shell
    content/
      ContentListPanel.tsx       # NEW (Phase 1): left sidebar list + categories + dnd
      ContentTabs.tsx            # NEW (Phase 1→3): channel tab switcher
      BaseArticlePanel.tsx       # NEW (Phase 1): TipTap editor + AI + 컨펌
      RichTextEditor.tsx         # NEW (Phase 1): TipTap wrapper + toolbar + bubble rewrite
      TopicSuggestDialog.tsx     # NEW (Phase 1): AI topic suggestions
      BlogPanel.tsx              # NEW (Phase 2): 4-step + cards + SEO
      BlogCardItem.tsx           # NEW (Phase 2): per-card editor + global style
      WorkflowStepBar.tsx        # NEW (Phase 2): 키워드→구조→생성→SEO
      SeoScorePanel.tsx          # NEW (Phase 2): score breakdown
      CardNewsPanel.tsx          # NEW (Phase 3): 2-pane templates + slides
      CardCanvas.tsx             # NEW (Phase 3): TextBlock drag/resize canvas
      CardNewsCardItem.tsx       # NEW (Phase 3): per-slide bg/image/blocks
      ImageGenButton.tsx         # NEW (Phase 3): generate/regenerate + lightbox

ai-server/src/
  services/
    contentPrompts.ts            # NEW: port prompt-builder (base/blog/cardnews/topic/rewrite)
    imageGenerator.ts            # NEW (Phase 3): port @google/genai image generator
  routes/
    marketing.ts                 # MODIFY: add topic/base/rewrite/blog/cardnews/image routes
  __tests__/
    contentPrompts.test.mjs      # NEW: prompt builder unit tests
    seoScorer.test.mjs           # NEW (Phase 2): (or under v4) scorer tests

v4/scripts/migrations/
  029_marketing_blog_channel.sql      # NEW (Phase 2)
  030_marketing_cardnews_channel.sql  # NEW (Phase 3)
```

---

## DB Migrations (apply via Supabase Dashboard SQL Editor — MCP write is blocked)

Migrations are numbered after the existing 020–028 marketing set. RLS is enabled with the same permissive `anon, authenticated` policy used by `021_marketing_articles.sql` (dev convention).

---

# PHASE 0 — Foundations

### Task 0.1: Add TipTap dependency to v4

**Files:**
- Modify: `v4/package.json`

- [ ] **Step 1: Install**

Run:
```bash
cd v4 && npm install @tiptap/react@^2.11.5 @tiptap/starter-kit@^2.11.5 @tiptap/extension-placeholder@^2.11.5 @tiptap/extension-image@^2.11.5
```
Expected: packages added to `dependencies`, no peer-dep errors (React 19 compatible).

- [ ] **Step 2: Verify typecheck still passes**

Run: `cd v4 && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add v4/package.json v4/package-lock.json
git commit -m "chore(marketing): add TipTap for rich content editor"
```

### Task 0.2: Add channel + card types

**Files:**
- Modify: `v4/src/features/marketing/types.ts`

- [ ] **Step 1: Append types** (after existing `MarketingArticle`)

```typescript
// ── Channel content (Phase 2+) ──────────────────────────────────────────────
export type BlogChannel = 'naver_blog' | 'wordpress';
export type BlogCardType = 'text' | 'image' | 'divider' | 'quote' | 'list';

export interface GlobalCardStyle {
  align?: 'left' | 'center' | 'right' | 'justify';
  headingBold?: boolean;
  bodyBold?: boolean;
  headingFont?: string;
  bodyFont?: string;
  headingSize?: number;
  bodySize?: number;
}

export interface BlogCardContent {
  text?: string;
  url?: string;
  alt?: string;
  caption?: string;
  imagePrompt?: string;
  imageStyle?: string;
}

export interface BlogCard {
  id: string;
  blogContentId: string;
  cardType: BlogCardType;
  content: BlogCardContent;
  sortOrder: number;
}

export interface BlogContent {
  id: string;
  contentId: string; // → marketing_articles.id
  channel: BlogChannel;
  seoTitle: string;
  seoScore: number;
  globalStyle: GlobalCardStyle;
  primaryKeyword: string;
  secondaryKeywords: string[];
  cards: BlogCard[];
}

// ── Cardnews (Phase 3) ──────────────────────────────────────────────────────
export interface TextBlock {
  id: string;
  text: string;
  x: number; // % from left
  y: number; // % from top
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  width: number; // % of card width
  height?: number;
  hidden?: boolean;
  shadow?: boolean;
}

export interface CardCanvasData {
  bgColor: string;
  imageUrl: string | null;
  imageY: number; // object-position Y %
  textBlocks: TextBlock[];
}

export interface CardnewsSlide {
  id: string;
  cardnewsId: string;
  canvas: CardCanvasData;
  imagePrompt: string;
  sortOrder: number;
}

export interface Cardnews {
  id: string;
  contentId: string; // → marketing_articles.id
  caption: string;
  hashtags: string[];
  slides: CardnewsSlide[];
}

export interface CardnewsTemplate {
  id: string;
  name: string;
  bgColor: string;
  imageY: number;
  textBlocks: TextBlock[];
}
```

- [ ] **Step 2: Verify**

Run: `cd v4 && npx tsc --noEmit`
Expected: PASS (types only, unused so far — fine).

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/types.ts
git commit -m "feat(marketing): channel + card + canvas types"
```

### Task 0.3: Add `confirmed` flag + base-article columns to marketing_articles

**Files:**
- Create: `v4/scripts/migrations/029a_marketing_articles_confirmed.sql`

- [ ] **Step 1: Write migration**

```sql
-- 029a_marketing_articles_confirmed.sql
-- 기본글 컨펌(원장님 확인) 플래그 + sort_order. Dashboard SQL Editor에서 1회 적용.
alter table marketing_articles add column if not exists confirmed boolean default false;
alter table marketing_articles add column if not exists sort_order integer default 0;
```

- [ ] **Step 2: Apply** in Supabase Dashboard SQL Editor (project `txirmofdvuljkrjkpzdg`). Verify: `select confirmed, sort_order from marketing_articles limit 1;` returns columns.

- [ ] **Step 3: Extend types + mapper**

In `v4/src/features/marketing/types.ts`, add to `MarketingArticle`:
```typescript
  confirmed: boolean;
  sortOrder: number;
```
In `v4/src/features/marketing/services/marketingArticleService.ts` `rowToArticle`, add:
```typescript
    confirmed: (r.confirmed as boolean) ?? false,
    sortOrder: (r.sort_order as number) ?? 0,
```
and in `articleToRow`:
```typescript
    confirmed: a.confirmed ?? false,
    sort_order: a.sortOrder ?? 0,
```

- [ ] **Step 4: Verify + commit**

Run: `cd v4 && npx tsc --noEmit` → PASS
```bash
git add v4/scripts/migrations/029a_marketing_articles_confirmed.sql v4/src/features/marketing/types.ts v4/src/features/marketing/services/marketingArticleService.ts
git commit -m "feat(marketing): 기본글 confirmed flag + sort_order"
```

---

> **Phase 0 complete.** Remaining phases are detailed in companion sections below. Each phase begins with its migrations, then services (with unit tests), then UI (tsc + preview verification).

---

# PHASE 1 — 기본글 (Base Article)

See `## Phase 1 Tasks` section. Delivers: tabbed shell, left content list (category filter + dnd reorder + 컨펌 badge), TipTap base-article editor with AI topic-suggest / generate / "이 부분 다시쓰기" bubble menu / 컨펌 toggle.

# PHASE 2 — N블로그 + SEO

See `## Phase 2 Tasks`. Delivers: blog channel tables, 4-step workflow bar, blog card editor, global style bar, live SEO score (ported `calculateNaverSeoScore`), naver keyword density via existing `/api/marketing/naver-keywords`.

# PHASE 3 — 카드뉴스 + AI 이미지

See `## Phase 3 Tasks`. Delivers: cardnews tables, 2-pane template/slide editor, canvas TextBlock drag/resize, 9 built-in templates, `@google/genai` image generation endpoint + R2 upload + image lightbox.

---

## Phase 1 Tasks

### Task 1.1: Port base-article + topic + rewrite prompt builders (ai-server)

**Files:**
- Create: `ai-server/src/services/contentPrompts.ts`
- Create: `ai-server/__tests__/contentPrompts.test.mjs`
- Modify: `ai-server/package.json` (add `"test": "node --test"`)

**Source to port:** `contentflow/src/lib/prompt-builder.ts` functions `buildTopicSuggestionPrompt` (L50), `buildBaseArticlePrompt` (L85), `buildPartialRegenerationPrompt` (L145). Adapt: drop ContentFlow's `PromptContext` store shape; accept dflo's `ArticleConfig` (already in `articleGenerator.ts`) + a request object. Output plain HTML for base article (ContentFlow base article is HTML for TipTap).

- [ ] **Step 1: Write the failing test**

```js
// ai-server/__tests__/contentPrompts.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBasePrompt, buildTopicPrompt, buildRewritePrompt } from '../dist/services/contentPrompts.js';

const cfg = { brand_name: '187', brand_description: '소아 성장', blog_rules: 'R', blog_categories: [{ code: 'A', name: '성장과학', context: 'ctx' }] };

test('buildBasePrompt includes brand, title, category context, keywords', () => {
  const p = buildBasePrompt(cfg, { title: '키 크는 법', category: 'A', keywords: ['성장호르몬'], language: 'ko' });
  assert.match(p, /187/);
  assert.match(p, /키 크는 법/);
  assert.match(p, /성장과학/);
  assert.match(p, /성장호르몬/);
  assert.match(p, /HTML/);
});

test('buildBasePrompt switches language for non-ko', () => {
  const p = buildBasePrompt(cfg, { title: 't', language: 'th' });
  assert.match(p, /th/);
});

test('buildTopicPrompt asks for JSON array of N topics', () => {
  const p = buildTopicPrompt(cfg, { count: 5, category: 'A' });
  assert.match(p, /JSON/);
  assert.match(p, /5/);
});

test('buildRewritePrompt embeds the selected passage', () => {
  const p = buildRewritePrompt(cfg, { selection: '이 문장', instruction: '더 짧게' });
  assert.match(p, /이 문장/);
  assert.match(p, /더 짧게/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ai-server && npm run build && npm test`
Expected: FAIL — `dist/services/contentPrompts.js` not found / exports missing.

- [ ] **Step 3: Implement**

```ts
// ai-server/src/services/contentPrompts.ts
import type { ArticleConfig } from './articleGenerator.js';

function brandBlock(c: ArticleConfig): string {
  return [
    `브랜드: ${c.brand_name?.trim() || '187 성장클리닉'}`,
    c.brand_description?.trim() ? `소개: ${c.brand_description.trim()}` : '',
    c.usp?.trim() ? `차별점: ${c.usp.trim()}` : '',
    c.brand_tone?.trim() ? `톤: ${c.brand_tone.trim()}` : '',
    [c.marketer_name, c.marketer_expertise, c.marketer_style].filter(Boolean).join(' · '),
  ].filter(Boolean).join('\n');
}

export interface BaseReq { title: string; angle?: string; keywords?: string[]; category?: string; language?: string }
export function buildBasePrompt(c: ArticleConfig, r: BaseReq): string {
  const cat = (c.blog_categories ?? []).find((x) => x.code === r.category);
  const kw = (r.keywords ?? []).filter(Boolean).join(', ');
  const lang = r.language && r.language !== 'ko' ? `\n- 작성 언어: ${r.language}` : '';
  return `당신은 ${c.brand_name?.trim() || '187 성장클리닉'}의 블로그 에디터입니다.
${brandBlock(c)}

## 콘텐츠
- 주제: ${r.title}
${cat ? `- 카테고리: ${cat.name} — ${cat.context}` : ''}
${r.angle?.trim() ? `- 앵글: ${r.angle.trim()}` : ''}
${kw ? `- 핵심 키워드: ${kw}` : ''}${lang}

## 작성 규칙
${c.blog_rules?.trim() || '1500~2500자, 의료광고법 준수, 과장 금지'}

## 출력 형식
유효한 HTML 본문만 출력하세요. <h1> 제목 1개, <h2> 소제목, <p> 단락, 필요시 <ul><li>. 코드블록/마크다운 금지.`;
}

export interface TopicReq { count?: number; category?: string; seed?: string }
export function buildTopicPrompt(c: ArticleConfig, r: TopicReq): string {
  const n = r.count ?? 5;
  const cat = (c.blog_categories ?? []).find((x) => x.code === r.category);
  return `${brandBlock(c)}

${cat ? `카테고리 "${cat.name}"(${cat.context}) 에 맞는 ` : ''}블로그 주제 ${n}개를 제안하세요.
${r.seed?.trim() ? `시드 키워드: ${r.seed.trim()}` : ''}

다음 형식의 JSON 배열만 출력하세요 (다른 텍스트 금지):
[{"title":"제목","angle":"앵글 한 줄","keywords":["키워드1","키워드2"]}]`;
}

export interface RewriteReq { selection: string; instruction?: string; fullText?: string }
export function buildRewritePrompt(c: ArticleConfig, r: RewriteReq): string {
  return `${brandBlock(c)}

아래 [선택 구간] 을 ${r.instruction?.trim() || '더 자연스럽고 읽기 쉽게'} 다시 써주세요.
브랜드 톤 유지, 의료광고법 준수. 다시 쓴 HTML 조각만 출력 (설명 금지).

[선택 구간]
${r.selection}`;
}
```

Also add to `ai-server/package.json` scripts: `"test": "node --test"`.

- [ ] **Step 4: Run to verify pass**

Run: `cd ai-server && npm run build && npm test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add ai-server/src/services/contentPrompts.ts ai-server/__tests__/contentPrompts.test.mjs ai-server/package.json
git commit -m "feat(ai-server): content prompt builders (base/topic/rewrite) + tests"
```

### Task 1.2: Add base/topic/rewrite generation routes (ai-server)

**Files:**
- Modify: `ai-server/src/routes/marketing.ts`

- [ ] **Step 1: Add routes** (after existing `/generate-article`). Each reads `marketing_config` (id=1) like the existing route, builds the prompt, calls `generateText`, returns JSON.

```ts
import { buildBasePrompt, buildTopicPrompt, buildRewritePrompt } from '../services/contentPrompts.js';

async function readConfig() {
  const { data } = await sb.from('marketing_config').select('*').eq('id', 1).maybeSingle();
  return (data ?? {}) as ArticleConfig;
}

marketingRouter.post('/base-article', async (req, res) => {
  const { title } = req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ success: false, error: 'title required' });
  try {
    const html = (await generateText(buildBasePrompt(await readConfig(), req.body))).trim();
    if (html.length < 50) return res.status(502).json({ success: false, error: '생성 결과가 너무 짧습니다.' });
    res.json({ success: true, html });
  } catch (e) { res.status(500).json({ success: false, error: (e as Error).message }); }
});

marketingRouter.post('/topics', async (req, res) => {
  try {
    const raw = await generateText(buildTopicPrompt(await readConfig(), req.body ?? {}));
    const s = raw.indexOf('['), e = raw.lastIndexOf(']');
    const topics = s >= 0 && e > s ? JSON.parse(raw.slice(s, e + 1)) : [];
    res.json({ success: true, topics });
  } catch (e) { res.status(502).json({ success: false, error: (e as Error).message }); }
});

marketingRouter.post('/rewrite', async (req, res) => {
  const { selection } = req.body ?? {};
  if (!selection?.trim()) return res.status(400).json({ success: false, error: 'selection required' });
  try {
    const html = (await generateText(buildRewritePrompt(await readConfig(), req.body))).trim();
    res.json({ success: true, html });
  } catch (e) { res.status(500).json({ success: false, error: (e as Error).message }); }
});
```
(Import `ArticleConfig` type from `articleGenerator.js` at top.)

- [ ] **Step 2: Verify build + smoke**

Run: `cd ai-server && npm run build` → PASS. Restart server, then:
```bash
curl -s -X POST http://localhost:3001/api/marketing/topics -H "Content-Type: application/json" -d "{\"count\":3,\"category\":\"A\"}"
```
Expected: `{"success":true,"topics":[...3 items...]}` (requires valid GEMINI key).

- [ ] **Step 3: Commit**

```bash
git add ai-server/src/routes/marketing.ts
git commit -m "feat(ai-server): base-article/topics/rewrite marketing routes"
```

### Task 1.3: Extend marketingArticleService with base-article AI calls

**Files:**
- Modify: `v4/src/features/marketing/services/marketingArticleService.ts`

- [ ] **Step 1: Add functions**

```ts
export async function generateBaseArticle(req: GenerateArticleReq): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/base-article`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `생성 실패: ${res.status}`);
  return b.html as string;
}

export interface TopicSuggestion { title: string; angle: string; keywords: string[] }
export async function suggestTopics(p: { count?: number; category?: string; seed?: string }): Promise<TopicSuggestion[]> {
  const res = await fetch(`${BASE}/api/marketing/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `추천 실패: ${res.status}`);
  return (b.topics ?? []) as TopicSuggestion[];
}

export async function rewriteSelection(p: { selection: string; instruction?: string }): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/rewrite`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `재작성 실패: ${res.status}`);
  return b.html as string;
}

export async function setConfirmed(id: string, confirmed: boolean): Promise<void> {
  const { error } = await supabase.from('marketing_articles').update({ confirmed }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderArticles(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id, i) =>
    supabase.from('marketing_articles').update({ sort_order: i }).eq('id', id)));
}
```

- [ ] **Step 2: Verify** `cd v4 && npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/services/marketingArticleService.ts
git commit -m "feat(marketing): base-article AI + confirm + reorder service calls"
```

### Task 1.4: RichTextEditor (TipTap wrapper + toolbar + rewrite bubble menu)

**Files:**
- Create: `v4/src/features/marketing/components/content/RichTextEditor.tsx`

**Source to port:** `contentflow/src/components/editor/base-article-editor.tsx` + `editor-toolbar.tsx`. Adapt: drop R2 presign image upload (Phase 3 handles images); keep StarterKit + Placeholder + Image; bubble menu calls `rewriteSelection` prop.

- [ ] **Step 1: Implement** (~150 lines). Props:
```ts
interface Props {
  value: string;                       // HTML
  onChange: (html: string) => void;
  onRewrite?: (selection: string) => Promise<string>; // returns replacement HTML
}
```
Use `useEditor({ extensions: [StarterKit, Placeholder.configure({ placeholder: '본문을 작성하거나 ✨ AI 생성을 누르세요' }), Image], content: value, onUpdate: ({editor}) => onChange(editor.getHTML()) })`. Sync external `value` changes via `useEffect` (`editor.commands.setContent` when `value !== editor.getHTML()`). Toolbar buttons: H1/H2/H3, Bold, Italic, bullet/ordered list, blockquote, HR. BubbleMenu shows "✨ 이 부분 다시쓰기" → grabs `editor.state.selection` text → `onRewrite(text)` → `editor.chain().focus().deleteSelection().insertContent(html).run()`.

- [ ] **Step 2: Verify** `cd v4 && npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/RichTextEditor.tsx
git commit -m "feat(marketing): TipTap RichTextEditor with rewrite bubble menu"
```

### Task 1.5: TopicSuggestDialog

**Files:**
- Create: `v4/src/features/marketing/components/content/TopicSuggestDialog.tsx`

- [ ] **Step 1: Implement** (~90 lines). Modal: category select (from config `blogCategories`), optional seed input, "추천 받기" → `suggestTopics(...)` → list of cards (title/angle/keywords) each with "이 주제로" button → `onPick(topic)`. Loading + error states matching `MarketingSettings.tsx` style.

- [ ] **Step 2: Verify + commit** `npx tsc --noEmit` → PASS.
```bash
git add v4/src/features/marketing/components/content/TopicSuggestDialog.tsx
git commit -m "feat(marketing): AI topic suggestion dialog"
```

### Task 1.6: BaseArticlePanel (replaces ArticleEditor body)

**Files:**
- Create: `v4/src/features/marketing/components/content/BaseArticlePanel.tsx`

- [ ] **Step 1: Implement** (~180 lines). Holds the selected article. Top bar: title input, category, language select, keywords input, "✨ AI 생성" (→ `generateBaseArticle`, fills editor), "🎯 주제 추천" (→ TopicSuggestDialog), 컨펌 toggle (→ `setConfirmed`), 저장 (→ `saveArticle` with `status: body.trim() ? 'done' : 'draft'`). Body: `<RichTextEditor value={body} onChange={setBody} onRewrite={(sel) => rewriteSelection({ selection: sel })} />`. Mirror existing `ArticleEditor.tsx` save/error patterns.

- [ ] **Step 2: Verify** `npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**
```bash
git add v4/src/features/marketing/components/content/BaseArticlePanel.tsx
git commit -m "feat(marketing): BaseArticlePanel (TipTap + AI generate/suggest/confirm)"
```

### Task 1.7: ContentListPanel (left sidebar: categories + dnd reorder + confirm badge)

**Files:**
- Create: `v4/src/features/marketing/components/content/ContentListPanel.tsx`

**Source to port:** `contentflow/src/components/content/content-list-panel.tsx` (DnD via `@dnd-kit`, category A–E filter, collapse). Adapt to `MarketingArticle[]` + `reorderArticles`.

- [ ] **Step 1: Implement** (~180 lines). Props: `articles`, `selectedId`, `onSelect`, `onNew`, `onDelete`, `onReorder(ids)`. Category filter chips from distinct `article.category`. `DndContext` + `SortableContext` (verticalListSortingStrategy) over filtered list. Each row: drag handle, title (truncate), category badge, language pill, ✓ green check if `confirmed`, 🗑 delete. On drag end → `onReorder` with new id order.

- [ ] **Step 2: Verify** `npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**
```bash
git add v4/src/features/marketing/components/content/ContentListPanel.tsx
git commit -m "feat(marketing): content list sidebar (category filter + dnd + confirm)"
```

### Task 1.8: ContentTabs shell + wire MarketingArticlesPage

**Files:**
- Create: `v4/src/features/marketing/components/content/ContentTabs.tsx`
- Modify: `v4/src/features/marketing/components/MarketingArticlesPage.tsx`

- [ ] **Step 1: ContentTabs** (~60 lines). Tab bar: `기본글` (Phase 1), placeholders `N블로그`/`카드뉴스` (disabled until Phase 2/3, render "준비 중"). Renders `BaseArticlePanel` for selected article on the 기본글 tab. Hide `N블로그` tab when `article.language !== 'ko'` (ContentFlow rule).

- [ ] **Step 2: Rewrite MarketingArticlesPage** as 2-pane: left `ContentListPanel`, right `ContentTabs` (or empty-state when nothing selected). Keep `fetchArticles` load + reload. Replace the old `ArticleEditor` import. Delete `ArticleEditor.tsx` only after Phase 1 verified (keep for now to avoid breakage; remove in Step 4).

```tsx
// MarketingArticlesPage.tsx (shape)
const [articles, setArticles] = useState<MarketingArticle[]>([]);
const [selectedId, setSelectedId] = useState<string | null>(null);
const reload = () => fetchArticles().then(setArticles);
useEffect(reload, []);
const selected = articles.find((a) => a.id === selectedId) ?? null;
return (
  <div className="flex h-full">
    <ContentListPanel articles={articles} selectedId={selectedId}
      onSelect={setSelectedId}
      onNew={async () => { const a = await saveArticle({ title: '새 글', language: 'ko', status: 'draft' }); reload(); setSelectedId(a.id); }}
      onDelete={async (id) => { if (!confirm('삭제할까요?')) return; await deleteArticle(id); if (selectedId === id) setSelectedId(null); reload(); }}
      onReorder={async (ids) => { await reorderArticles(ids); reload(); }} />
    <div className="flex-1 overflow-y-auto">
      {selected ? <ContentTabs article={selected} onSaved={reload} /> : <EmptyState onNew={...} />}
    </div>
  </div>
);
```

- [ ] **Step 2: Verify (preview)**

Run: `npx tsc --noEmit` → PASS. Then via Claude Preview (port 5199): set `sessionStorage['marketing-admin-auth']='true'`, navigate `/marketing/content`. Snapshot: left list shows imported articles with category/language/✓ badges; selecting one opens TipTap editor with HTML body rendered; "✨ AI 생성" and "🎯 주제 추천" present. Console: no errors.

- [ ] **Step 3: Test interactions**

In preview: select an article → edit text → 저장 → reload → change persisted. Toggle 컨펌 → ✓ badge appears in list. Drag to reorder → order persists after reload.

- [ ] **Step 4: Remove dead ArticleEditor**

Delete `v4/src/features/marketing/components/ArticleEditor.tsx` and `ArticleList.tsx` (superseded). Run `npx tsc --noEmit` → PASS (no remaining imports).

- [ ] **Step 5: Commit**
```bash
git add -A v4/src/features/marketing/components/
git commit -m "feat(marketing): 2-pane content studio shell (기본글) — replaces stub editor"
```

**Phase 1 done:** real base-article studio over the 126 imported articles.

---

## Phase 2 Tasks

### Task 2.1: blog channel migration

**Files:**
- Create: `v4/scripts/migrations/029_marketing_blog_channel.sql`

- [ ] **Step 1: Write**

```sql
-- 029_marketing_blog_channel.sql — N블로그/WordPress 채널 콘텐츠.
create table if not exists marketing_blog_contents (
  id            uuid primary key default gen_random_uuid(),
  content_id    uuid not null references marketing_articles(id) on delete cascade,
  channel       text not null default 'naver_blog',
  seo_title     text default '',
  seo_score     integer default 0,
  global_style  jsonb default '{}'::jsonb,
  primary_keyword   text default '',
  secondary_keywords text[] default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create table if not exists marketing_blog_cards (
  id              uuid primary key default gen_random_uuid(),
  blog_content_id uuid not null references marketing_blog_contents(id) on delete cascade,
  card_type       text not null default 'text',
  content         jsonb default '{}'::jsonb,
  sort_order      integer default 0
);
create index if not exists idx_blog_contents_content on marketing_blog_contents(content_id);
create index if not exists idx_blog_cards_parent on marketing_blog_cards(blog_content_id);
alter table marketing_blog_contents enable row level security;
alter table marketing_blog_cards enable row level security;
drop policy if exists mbc_all on marketing_blog_contents;
create policy mbc_all on marketing_blog_contents for all to anon, authenticated using (true) with check (true);
drop policy if exists mbcd_all on marketing_blog_cards;
create policy mbcd_all on marketing_blog_cards for all to anon, authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply** in Dashboard. Verify both tables exist.

- [ ] **Step 3: Commit**
```bash
git add v4/scripts/migrations/029_marketing_blog_channel.sql
git commit -m "feat(marketing): blog channel tables migration (029)"
```

### Task 2.2: Port SEO scorer (pure function + tests)

**Files:**
- Create: `v4/src/features/marketing/utils/seoScorer.ts`
- Create: `v4/scripts/test/seoScorer.test.mjs`
- Modify: `v4/package.json` (`"test": "node --test scripts/test/*.mjs"` — broaden existing `test:i18n` or add `test`)

**Source to port:** `contentflow/src/lib/seo-scorer.ts` `calculateNaverSeoScore` verbatim, retyped to dflo `BlogCard`/`BlogCardContent` (camelCase `content.text`). Keep all 9 scoring sections identical.

- [ ] **Step 1: Write failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNaverSeoScore } from '../../src/features/marketing/utils/seoScorer.ts';
// NOTE: run with: node --experimental-strip-types --test  (Node 22+) OR compile.
test('empty content scores low', () => {
  const r = calculateNaverSeoScore('', [], null);
  assert.ok(r.score < 20);
  assert.equal(r.details.length, 9);
});
test('keyword in title + dense body scores higher', () => {
  const cards = [{ id:'1', blogContentId:'b', cardType:'text', sortOrder:0,
    content:{ text:'<h2>성장호르몬</h2><p>'+ '성장호르몬 치료는 키 성장에 도움. '.repeat(40) +'</p>' } }];
  const r = calculateNaverSeoScore('성장호르몬 치료 효과 총정리', cards, { primary:'성장호르몬', secondary:['키 성장'] });
  assert.ok(r.score > 40);
});
```
(If `--experimental-strip-types` unavailable, the scorer can be authored as `.mjs`-importable; simplest: keep `seoScorer.ts` and add a tiny `scripts/test/` that imports via tsx. Decide at implementation: prefer `node --import tsx --test`.)

- [ ] **Step 2: Run → FAIL** (module missing).

- [ ] **Step 3: Implement** — copy `calculateNaverSeoScore` from ContentFlow source, change `(c.content as SectionContent).text` → `c.content.text`, `.url`→`.content.url`, `.alt`→`.content.alt`; signature `(seoTitle: string, cards: BlogCard[], naverKeywords?: {primary?:string; secondary?:string[]}|null): SeoResult`. Export `SeoDetail`, `SeoResult`.

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**
```bash
git add v4/src/features/marketing/utils/seoScorer.ts v4/scripts/test/seoScorer.test.mjs v4/package.json
git commit -m "feat(marketing): port Naver SEO scorer + tests"
```

### Task 2.3: blogChannelService (CRUD + mappers)

**Files:**
- Create: `v4/src/features/marketing/services/blogChannelService.ts`

- [ ] **Step 1: Implement** — mirror `marketingArticleService` patterns. Functions: `fetchBlogContents(contentId): Promise<BlogContent[]>` (joins cards, ordered by `sort_order`), `createBlogContent(contentId, channel)`, `updateBlogContent(id, patch)` (seoTitle/seoScore/globalStyle/keywords), `deleteBlogContent(id)`, `addCard(blogContentId, type, sortOrder)`, `updateCard(id, content)`, `deleteCard(id)`, `reorderCards(blogContentId, ids)`. snake_case mappers for `global_style`, `primary_keyword`, `secondary_keywords`, `card_type`, `content`.

- [ ] **Step 2: Verify** `npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**
```bash
git add v4/src/features/marketing/services/blogChannelService.ts
git commit -m "feat(marketing): blog channel service (contents + cards CRUD)"
```

### Task 2.4: Blog generation prompt + route + service

**Files:**
- Modify: `ai-server/src/services/contentPrompts.ts` (add `buildBlogPrompt`)
- Modify: `ai-server/src/routes/marketing.ts` (add `/blog-generate`)
- Modify: `v4/src/features/marketing/services/blogChannelService.ts` (add `generateBlog`)

**Source to port:** `prompt-builder.ts` `buildBlogPrompt` (L172). Output: JSON array of cards `[{cardType, text, imagePrompt?}]`. Route parses JSON, returns cards array; service maps into `BlogCard[]` and persists via `addCard`.

- [ ] **Step 1: Add `buildBlogPrompt(c, { title, body, primaryKeyword, secondaryKeywords, channel })`** returning a prompt that asks for a JSON array of section cards (text cards contain HTML with `<h2>`/`<p>`; image cards carry `imagePrompt`). Add unit test asserting prompt mentions keyword + "JSON".

- [ ] **Step 2: Add route `/blog-generate`** — read config, build prompt, `generateText`, extract `[...]`, `JSON.parse`, return `{ success, cards }`.

- [ ] **Step 3: Add `generateBlog(req)`** client call → returns parsed cards.

- [ ] **Step 4: Verify** ai-server `npm run build && npm test` → PASS; v4 `npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**
```bash
git add ai-server/src/services/contentPrompts.ts ai-server/src/routes/marketing.ts ai-server/__tests__/contentPrompts.test.mjs v4/src/features/marketing/services/blogChannelService.ts
git commit -m "feat(marketing): blog card generation prompt + route + service"
```

### Task 2.5: WorkflowStepBar + SeoScorePanel + BlogCardItem + GlobalStyleBar

**Files:**
- Create: `v4/src/features/marketing/components/content/WorkflowStepBar.tsx`
- Create: `v4/src/features/marketing/components/content/SeoScorePanel.tsx`
- Create: `v4/src/features/marketing/components/content/BlogCardItem.tsx`

- [ ] **Step 1: WorkflowStepBar** (~50 lines) — 4 steps (키워드/구조/생성/SEO), `current` prop, click to jump.

- [ ] **Step 2: SeoScorePanel** (~80 lines) — takes `SeoResult`, shows total (color: ≥80 green / ≥50 amber / red) + per-detail rows (label, score/max bar, message).

- [ ] **Step 3: BlogCardItem** (~150 lines) — per-card editor: text card uses `RichTextEditor` (reuse Phase 1) with inline style applied from `globalStyle`; image card shows imagePrompt + (Phase 3) image; reorder handle (dnd); delete/add. Global style bar (align/heading+body font/size/bold) inline at top of BlogPanel, persisted to `blogContent.globalStyle`.

- [ ] **Step 4: Verify** `npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**
```bash
git add v4/src/features/marketing/components/content/{WorkflowStepBar,SeoScorePanel,BlogCardItem}.tsx
git commit -m "feat(marketing): blog workflow bar + SEO panel + card item"
```

### Task 2.6: BlogPanel + enable N블로그 tab

**Files:**
- Create: `v4/src/features/marketing/components/content/BlogPanel.tsx`
- Modify: `v4/src/features/marketing/components/content/ContentTabs.tsx`

- [ ] **Step 1: BlogPanel** (~190 lines) — for the selected article: load/create a `BlogContent` (default channel `naver_blog`). Step 1 키워드: primary/secondary inputs + "네이버 검색량" (existing `/api/marketing/naver-keywords` via keyword service) density hint. Step 3 생성: "✨ 블로그 카드 생성" → `generateBlog({ title, body: article.body, primaryKeyword, secondaryKeywords })` → persist cards. Cards list (dnd reorder) of `BlogCardItem`. Step 4 SEO: live `calculateNaverSeoScore(seoTitle, cards, {primary, secondary})` → SeoScorePanel; save score to `blogContent.seoScore` on change (debounce 800ms via simple `setTimeout` ref). Global style bar persisted.

- [ ] **Step 2: Enable tab** in ContentTabs — render `BlogPanel` on N블로그 tab (still hidden for non-ko).

- [ ] **Step 3: Verify (preview)** — select ko article → N블로그 tab → enter keyword → generate cards → SEO score updates live → reload persists. Console clean.

- [ ] **Step 4: Commit**
```bash
git add v4/src/features/marketing/components/content/BlogPanel.tsx v4/src/features/marketing/components/content/ContentTabs.tsx
git commit -m "feat(marketing): N블로그 panel — 4-step workflow + SEO scoring"
```

**Phase 2 done:** Naver-blog cards with live SEO scoring.

---

## Phase 3 Tasks

### Task 3.1: cardnews migration

**Files:**
- Create: `v4/scripts/migrations/030_marketing_cardnews_channel.sql`

- [ ] **Step 1: Write** — `marketing_cardnews(id, content_id→articles, caption, hashtags text[])` + `marketing_cardnews_slides(id, cardnews_id, canvas jsonb, image_prompt, sort_order)`. RLS permissive (same pattern as 029). Indexes on FKs.

- [ ] **Step 2: Apply** in Dashboard; verify.

- [ ] **Step 3: Commit**
```bash
git add v4/scripts/migrations/030_marketing_cardnews_channel.sql
git commit -m "feat(marketing): cardnews channel tables migration (030)"
```

### Task 3.2: Add @google/genai + port image generator (ai-server)

**Files:**
- Modify: `ai-server/package.json` (add `@google/genai`)
- Create: `ai-server/src/services/imageGenerator.ts`

**Source to port:** `contentflow/src/lib/ai/image-generator.ts` (Gemini + Imagen factory) + its `types`. Verbatim port; only change import paths.

- [ ] **Step 1: Install** `cd ai-server && npm install @google/genai` → build OK.

- [ ] **Step 2: Port** `imageGenerator.ts` exporting `createImageGenerator(model, apiKey)` and `generate({ prompt, referenceImage?, aspectRatio?, imageSize? }) → { base64, mimeType }`. Add `DEFAULT_IMAGE_MODEL = 'gemini-2.0-flash-exp'` constant (or current image-capable model).

- [ ] **Step 3: Verify** `npm run build` → PASS.

- [ ] **Step 4: Commit**
```bash
git add ai-server/package.json ai-server/package-lock.json ai-server/src/services/imageGenerator.ts
git commit -m "feat(ai-server): port Gemini/Imagen image generator (@google/genai)"
```

### Task 3.3: generate-image route + cardnews/image prompt builders

**Files:**
- Modify: `ai-server/src/routes/marketing.ts` (add `/generate-image`, `/cardnews-generate`)
- Modify: `ai-server/src/services/contentPrompts.ts` (add `buildCardNewsPrompt`, `buildCardNewsImagePromptsPrompt`)

**Source:** `prompt-builder.ts` `buildCardNewsPrompt` (L281), `buildCardNewsImagePromptsPrompt` (L341).

- [ ] **Step 1: `/generate-image`** — body `{ prompt, aspectRatio? }`; guard `GEMINI_API_KEY`; `createImageGenerator(DEFAULT_IMAGE_MODEL, key).generate(...)`; return `{ success, image, mimeType }`. (Default aspectRatio `'4:5'` for cardnews.)

- [ ] **Step 2: `/cardnews-generate`** — read config, `buildCardNewsPrompt({ title, body, count })`, generateText, parse JSON slides `[{textBlocks-ish or copy lines, imagePrompt}]`, return slides. Add prompt unit test (mentions "JSON", slide count).

- [ ] **Step 3: Verify** `npm run build && npm test` → PASS. Smoke: `curl /api/marketing/generate-image` returns base64 (valid key).

- [ ] **Step 4: Commit**
```bash
git add ai-server/src/routes/marketing.ts ai-server/src/services/contentPrompts.ts ai-server/__tests__/contentPrompts.test.mjs
git commit -m "feat(ai-server): image generation route + cardnews prompts"
```

### Task 3.4: aiImageService (client: generate → WebP → R2 upload)

**Files:**
- Create: `v4/src/features/marketing/services/aiImageService.ts`

**Source pattern:** ContentFlow `useR2Upload` Canvas WebP conversion. Adapt to dflo `/api/r2/upload` (FormData, header `x-admin-pin: 8054`, field `folder=marketing`).

- [ ] **Step 1: Implement**

```ts
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:3001';
const PIN = '8054';

export async function generateImage(prompt: string, aspectRatio = '4:5'): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/generate-image`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '이미지 생성 실패');
  return `data:${b.mimeType};base64,${b.image}`; // data URL
}

async function toWebpBlob(dataUrl: string): Promise<Blob> {
  const img = new Image(); img.src = dataUrl;
  await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return await new Promise((r) => c.toBlob((bl) => r(bl!), 'image/webp', 0.9));
}

export async function uploadGeneratedImage(dataUrl: string): Promise<string> {
  const blob = await toWebpBlob(dataUrl);
  const fd = new FormData();
  fd.append('file', new File([blob], `cardnews-${Date.now()}.webp`, { type: 'image/webp' }));
  fd.append('folder', 'marketing');
  const res = await fetch(`${BASE}/api/r2/upload`, { method: 'POST', headers: { 'x-admin-pin': PIN }, body: fd });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '이미지 업로드 실패');
  return b.url as string;
}

export async function generateAndUpload(prompt: string, aspectRatio = '4:5'): Promise<string> {
  return uploadGeneratedImage(await generateImage(prompt, aspectRatio));
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**
```bash
git add v4/src/features/marketing/services/aiImageService.ts
git commit -m "feat(marketing): AI image gen → WebP → R2 upload service"
```

### Task 3.5: cardnewsService + built-in templates

**Files:**
- Create: `v4/src/features/marketing/services/cardnewsService.ts`
- Create: `v4/src/features/marketing/data/cardnewsTemplates.ts`

- [ ] **Step 1: cardnewsService** — `fetchCardnews(contentId)`, `createCardnews(contentId)`, `updateCardnews(id, {caption, hashtags})`, `addSlide(cardnewsId, canvas, sortOrder)`, `updateSlide(id, {canvas, imagePrompt})`, `deleteSlide(id)`, `reorderSlides(ids)`. Mappers for `canvas` jsonb ↔ `CardCanvasData`.

- [ ] **Step 2: templates** — port the 9 built-in `CardnewsTemplate` definitions from `contentflow/src/components/content/cardnews-templates.ts` (bgColor, imageY, textBlocks). Trim to ~5 if any depend on missing assets.

- [ ] **Step 3: Verify + commit** `npx tsc --noEmit` → PASS.
```bash
git add v4/src/features/marketing/services/cardnewsService.ts v4/src/features/marketing/data/cardnewsTemplates.ts
git commit -m "feat(marketing): cardnews service + built-in templates"
```

### Task 3.6: CardCanvas (TextBlock drag/resize)

**Files:**
- Create: `v4/src/features/marketing/components/content/CardCanvas.tsx`

**Source to port:** `contentflow/src/components/content/cardnews-card-item.tsx` canvas logic (TextBlock absolute positioning %, drag, resize, snap-to-grid). Render a 4:5 box; each visible `TextBlock` is absolutely positioned (`left:x% top:y% width:w%`), draggable (pointer events updating x/y %), editable text on double-click. Selected block → side controls for fontSize/color/align/bold.

- [ ] **Step 1: Implement** (~190 lines). Props: `canvas: CardCanvasData`, `onChange(next)`. Background = `bgColor`; if `imageUrl`, render as cover with `object-position: 50% imageY%`.

- [ ] **Step 2: Verify** `npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**
```bash
git add v4/src/features/marketing/components/content/CardCanvas.tsx
git commit -m "feat(marketing): cardnews canvas with TextBlock drag/resize"
```

### Task 3.7: CardNewsPanel + ImageGenButton + enable 카드뉴스 tab

**Files:**
- Create: `v4/src/features/marketing/components/content/CardNewsPanel.tsx`
- Create: `v4/src/features/marketing/components/content/ImageGenButton.tsx`
- Modify: `v4/src/features/marketing/components/content/ContentTabs.tsx`

- [ ] **Step 1: ImageGenButton** (~70 lines) — props `prompt`, `onGenerated(url)`. Click → `generateAndUpload(prompt)` → `onGenerated`. Loading/err; thumbnail + lightbox on existing image.

- [ ] **Step 2: CardNewsPanel** (~190 lines) — 2-pane: left = template picker (`cardnewsTemplates` → apply to current slide), caption + hashtags inputs; right = slide strip + selected `CardCanvas`. "✨ 슬라이드 생성" → `/cardnews-generate` → create slides; per-slide `ImageGenButton` (uses slide `imagePrompt`, sets `canvas.imageUrl`). Persist via cardnewsService (debounced).

- [ ] **Step 3: Enable tab** in ContentTabs (카드뉴스 → CardNewsPanel).

- [ ] **Step 4: Verify (preview)** — select article → 카드뉴스 tab → 슬라이드 생성 → apply template → drag a text block → generate image (real Gemini) → image fills card → reload persists. Console clean; network shows `/generate-image` 200 + `/r2/upload` 200.

- [ ] **Step 5: Commit**
```bash
git add v4/src/features/marketing/components/content/{CardNewsPanel,ImageGenButton,ContentTabs}.tsx
git commit -m "feat(marketing): 카드뉴스 panel — canvas + templates + AI images"
```

**Phase 3 done:** full cardnews studio with AI image generation.

---

## Self-Review

**Spec coverage** (against user-selected scope 기본글 + N블로그 + 카드뉴스 + 이미지):
- 기본글 TipTap + AI 주제추천 + 부분 다시쓰기 + 컨펌 + 번역 → Phase 1 (Tasks 1.1–1.8). **번역 탭 NOT included** — descoped from "카드뉴+이미지까지" selection; add as follow-up if needed (would reuse `/api/ai/translate` pattern → new `/api/marketing/translate` + language tabs). Flagged here as the one explicit gap vs ContentFlow's BaseArticlePanel.
- N블로그 4-step + cards + global style + SEO + naver keywords → Phase 2 (2.1–2.6). ✓
- 카드뉴스 canvas + templates + AI image gen/upload → Phase 3 (3.1–3.7). ✓ (Image *editor* with draw tools = ContentFlow `ImageEditorDialog` is descoped; generation+placement covered. Flagged.)
- 스레드/롱폼/숏폼 → intentionally excluded per scope. ✓

**Placeholder scan:** Large verbatim ports (seoScorer, imageGenerator, canvas logic, blog/cardnews prompts) cite exact ContentFlow source paths + line numbers and the specific adaptations — the code exists in-repo, so these are precise port instructions, not TODOs. dflo-glue (services, routes, migrations, aiImageService) has full code.

**Type consistency:** `BlogContent.cards: BlogCard[]`, `BlogCard.content: BlogCardContent`, `CardCanvasData` shared by `CardnewsSlide.canvas` and `CardnewsTemplate`-derived blocks. `content_id` (DB) ↔ `contentId` (TS) consistent across blog + cardnews services. `generateText` (non-streaming) used everywhere. Image flow: server returns `{image, mimeType}` → client builds data URL → WebP → `/r2/upload` returns `{url}`.

**Known risks to confirm during execution:**
1. Image model id (`DEFAULT_IMAGE_MODEL`) — verify a current Gemini image-capable model is available to the key; adjust in Task 3.2.
2. `node --test` importing `.ts` — confirm Node version supports `--import tsx`/type-strip; otherwise compile first (ai-server already builds to `dist`).
3. Migrations 029/030 must be applied in Dashboard before the corresponding phase's preview verification.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-05-marketing-content-studio.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best given the size (Phases run task-by-task).

**2. Inline Execution** — Execute tasks in this session with checkpoints for review.

**Which approach?** (And confirm starting phase — recommend Phase 0 → 1 first, then decide on 2/3.)

