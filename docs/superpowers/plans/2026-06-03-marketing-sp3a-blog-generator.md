# 마케팅 SP3a — 블로그 AI 생성 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SP1 설정 + 주제로 Gemini가 187 블로그 글을 생성하고(ai-server 신규 라우트), dflo `/marketing/articles`에서 편집·저장한다.

**Architecture:** ai-server(Express) 신규 라우트 `POST /api/marketing/generate-article`가 `marketing_config`(service-role)를 읽고 187 에디터 프롬프트를 조립해 Gemini `generateText`로 글을 반환(요청/응답). dflo는 `marketing_articles`(Supabase) 테이블에 client-direct로 저장하고 `/marketing/articles` UI로 목록·생성·편집한다. 외부 ContentFlow 의존 0.

**Tech Stack:** ai-server: TypeScript ESM, Express 5, `@google/generative-ai`, `@supabase/supabase-js`(service-role). v4: React 19, Vite, TS strict(`verbatimModuleSyntax`), Tailwind, React Router 7.

**Spec:** `docs/superpowers/specs/2026-06-03-marketing-sp3a-blog-generator-design.md`

---

## 검증/실행 전략 (읽고 시작)

- **ai-server에는 테스트 하니스가 없다**(`package.json`에 test 스크립트 X). Chunk 1 검증 = `npx tsc --noEmit`(ai-server) 통과. `buildArticlePrompt`는 순수 함수지만 TS 테스트 러너가 없어 tsc + (선택)수동 curl로 검증. 하니스 신설은 범위 밖.
- **v4에도 src 테스트 하니스 없음** — Chunk 2/3 검증 = `npx tsc --noEmit` + `npx vite build` + lint. preview 브라우저 자동검증은 사용자 선호상 미사용(사용자가 직접 확인).
- **migration은 코드가 적용 안 함** — `v4/scripts/migrations/017_marketing_articles.sql` 생성, 사용자가 Supabase Dashboard 적용. UI는 테이블 없어도 빈 목록으로 안전.
- strict 주의: 타입 전용 import는 `import type`. 미사용 변수 금지. `@/*`→`src/*`. 모든 `<button>`에 `type="button"`(폼 밖).
- **router.tsx WIP 점검**: Chunk 3에서 router.tsx 수정 전, 컨트롤러가 `git status`로 router.tsx가 dirty인지 확인하고 dirty면 `git stash push -- v4/src/app/router.tsx`로 격리 후 커밋, 끝나면 `git stash pop`. (현재는 clean.) 구현 서브에이전트는 자신의 파일만 `git add`.
- 커밋 trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- ai-server 명령은 `c:\projects\dflo_0.1\ai-server`에서, v4 명령은 `c:\projects\dflo_0.1\v4`에서. `git`은 `git -C c:/projects/dflo_0.1` + 경로 prefix.

---

## File Structure

```
ai-server/src/
  services/articleGenerator.ts     # CREATE buildArticlePrompt(pure) + 타입 + DEFAULT_RULES
  routes/marketing.ts              # CREATE marketingRouter: POST /generate-article
  index.ts                         # MODIFY: import + app.use('/api/marketing', ...middlewares, marketingRouter)

v4/scripts/migrations/017_marketing_articles.sql   # CREATE 테이블 + RLS (사용자 적용)
v4/src/features/marketing/
  types.ts                         # MODIFY: ArticleStatus, MarketingArticle 추가
  services/marketingArticleService.ts  # CREATE fetch/save/delete(client-direct) + generateArticle(ai-server)
  components/
    ArticleList.tsx                # CREATE 목록 카드 + 새 글/편집/삭제
    ArticleEditor.tsx              # CREATE 주제선택/직접입력 + 생성 + 편집 + 저장
    MarketingArticlesPage.tsx      # CREATE 컨테이너(목록 ↔ 에디터 상태)
    MarketingSidebar.tsx           # MODIFY: "글 생성" 6번째 항목
v4/src/app/router.tsx              # MODIFY: /marketing/articles lazy 라우트
```

---

## Chunk 1: ai-server 생성 라우트

### Task 1.1: 프롬프트 빌더 서비스

**Files:**
- Create: `ai-server/src/services/articleGenerator.ts`

- [ ] **Step 1: 작성** (EXACT content)

```ts
// ai-server/src/services/articleGenerator.ts
// Pure prompt builder for blog article generation. Ports generate-base-articles.mjs
// onto the SP1 marketing_config (DB snake_case row) instead of hardcoded values.

export interface ArticleConfig {
  brand_name?: string | null;
  brand_description?: string | null;
  usp?: string | null;
  brand_tone?: string | null;
  marketer_name?: string | null;
  marketer_expertise?: string | null;
  marketer_style?: string | null;
  blog_rules?: string | null;
  blog_categories?: Array<{ code: string; name: string; context: string }> | null;
}

export interface ArticleRequest {
  title: string;
  angle?: string;
  keywords?: string[];
  category?: string;
  language?: string;
}

const DEFAULT_RULES = `1. 순수 텍스트만 출력 (HTML 태그·마크다운·코드블록 금지)
2. 첫 줄에 검색에 잘 걸리는 매력적인 제목
3. 소제목은 ■ 기호 사용
4. 단락 구분은 빈 줄
5. 1500~2500자
6. 부모 눈높이에 맞는 쉬운 설명
7. 의학적 근거 + 실제 임상 경험 기반
8. 과장 금지, 의료 광고법 준수
9. 마지막에 "※ 본 글은 의학적 정보 제공을 목적으로 하며, 개인마다 차이가 있을 수 있습니다."
10. 네이버 SEO를 위해 핵심 키워드를 자연스럽게 3~5회 반복`;

export function buildArticlePrompt(config: ArticleConfig, req: ArticleRequest): string {
  const brand = config.brand_name?.trim() || '187 성장클리닉';
  const cat = (config.blog_categories ?? []).find((c) => c.code === req.category);
  const rules = config.blog_rules?.trim() || DEFAULT_RULES;
  const keywords = (req.keywords ?? []).filter(Boolean).join(', ');
  const langLine =
    req.language && req.language !== 'ko' ? `\n- 작성 언어: ${req.language}로 작성` : '';

  return `당신은 ${brand}의 블로그 에디터입니다. 아래 정보로 네이버 블로그용 글을 작성하세요.

## 브랜드
${config.brand_description?.trim() || ''}
${config.usp?.trim() ? `- 차별점: ${config.usp.trim()}` : ''}
${config.brand_tone?.trim() ? `- 톤: ${config.brand_tone.trim()}` : ''}

## 화자(마케터)
${[config.marketer_name, config.marketer_expertise, config.marketer_style].filter(Boolean).join(' · ')}

## 콘텐츠
- 주제: ${req.title}
${cat ? `- 카테고리: ${cat.name} — ${cat.context}` : ''}
${req.angle?.trim() ? `- 앵글: ${req.angle.trim()}` : ''}
${keywords ? `- 핵심 키워드: ${keywords}` : ''}${langLine}

## 작성 규칙
${rules}

순수 텍스트만 출력하세요.`;
}
```

- [ ] **Step 2: 타입 체크** — `c:\projects\dflo_0.1\ai-server`에서 `npx tsc --noEmit` 통과.

### Task 1.2: 라우트

**Files:**
- Create: `ai-server/src/routes/marketing.ts`

- [ ] **Step 1: 작성** (EXACT content) — patientAnalysis.ts의 service-role 클라이언트 패턴 차용.

```ts
// ai-server/src/routes/marketing.ts
// POST /api/marketing/generate-article → read marketing_config (service-role),
// build the 187 editor prompt, call Gemini, return article text.
import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { generateText } from '../services/gemini.js';
import { buildArticlePrompt, type ArticleConfig, type ArticleRequest } from '../services/articleGenerator.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[marketing] Missing Supabase URL/KEY — generate-article will use empty config.');
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export const marketingRouter = Router();

marketingRouter.post('/generate-article', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as ArticleRequest;
  if (!body.title || !String(body.title).trim()) {
    return res.status(400).json({ success: false, error: 'title required' });
  }
  try {
    const { data: config } = await sb
      .from('marketing_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    const prompt = buildArticlePrompt((config ?? {}) as ArticleConfig, body);
    const content = await generateText(prompt);
    const clean = (content ?? '').trim();
    if (clean.length < 100) {
      return res.status(502).json({ success: false, error: '생성 결과가 너무 짧습니다. 다시 시도해주세요.' });
    }
    res.json({ success: true, content: clean });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] generate-article failed', e);
    res.status(500).json({ success: false, error: msg });
  }
});
```

- [ ] **Step 2: 타입 체크** — ai-server `npx tsc --noEmit` 통과.

### Task 1.3: 마운트

**Files:**
- Modify: `ai-server/src/index.ts`

- [ ] **Step 1: import 추가** — 다른 router import 옆:
```ts
import { marketingRouter } from './routes/marketing.js';
```

- [ ] **Step 2: 마운트 추가** — 다른 `app.use('/api/...', ...middlewares, ...)` 옆(예: coaching 다음):
```ts
app.use('/api/marketing', ...middlewares, marketingRouter);
```

- [ ] **Step 3: 타입 체크 + 빌드** — ai-server `npx tsc --noEmit` 통과, `npm run build` 성공.

- [ ] **Step 4: (선택) 수동 스모크** — ai-server `npm run dev` 후
  `curl -X POST localhost:3001/api/marketing/generate-article -H "Content-Type: application/json" -d '{"title":"성장호르몬 바로 알기","category":"A","keywords":["성장호르몬"]}'`
  → `{success:true, content:"..."}` (GEMINI_API_KEY 필요). 실패해도 코드 검증은 tsc로 충분 — 사용자가 환경에서 확인.

- [ ] **Step 5: Commit**
```bash
git add ai-server/src/services/articleGenerator.ts ai-server/src/routes/marketing.ts ai-server/src/index.ts
git commit -m "feat(ai-server): blog article generation endpoint (config-driven prompt + Gemini)"
```

---

## Chunk 2: dflo 데이터 계층 (migration + type + service)

### Task 2.1: migration

**Files:**
- Create: `v4/scripts/migrations/017_marketing_articles.sql`

- [ ] **Step 1: 작성** (EXACT content)
```sql
-- 017_marketing_articles.sql
-- 마케팅 SP3a: 생성·편집된 블로그 글 저장. Supabase Dashboard SQL Editor에서 1회 적용.
create table if not exists marketing_articles (
  id          uuid primary key default gen_random_uuid(),
  topic_id    text,
  title       text not null default '',
  body        text not null default '',
  category    text,
  keywords    text[] default '{}',
  language    text default 'ko',
  status      text default 'draft',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table marketing_articles enable row level security;
drop policy if exists marketing_articles_all on marketing_articles;
create policy marketing_articles_all on marketing_articles
  for all to anon, authenticated using (true) with check (true);
```

- [ ] **Step 2: Commit**
```bash
git add v4/scripts/migrations/017_marketing_articles.sql
git commit -m "feat(marketing): add marketing_articles table migration"
```
> ⚠️ 사용자가 Supabase Dashboard에서 적용해야 저장/목록 동작.

### Task 2.2: 타입

**Files:**
- Modify: `v4/src/features/marketing/types.ts`

- [ ] **Step 1: 끝에 추가**
```ts
export type ArticleStatus = 'draft' | 'done';

export interface MarketingArticle {
  id: string;
  topicId: string | null;
  title: string;
  body: string;
  category: string;
  keywords: string[];
  language: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}
```
- [ ] **Step 2:** `cd v4 && npx tsc --noEmit` 통과.

### Task 2.3: 서비스

**Files:**
- Create: `v4/src/features/marketing/services/marketingArticleService.ts`

- [ ] **Step 1: 작성** (EXACT content)
```ts
// src/features/marketing/services/marketingArticleService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { MarketingArticle, ArticleStatus } from '../types';

const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

type Row = Record<string, unknown>;

function rowToArticle(r: Row): MarketingArticle {
  return {
    id: r.id as string,
    topicId: (r.topic_id as string | null) ?? null,
    title: (r.title as string) ?? '',
    body: (r.body as string) ?? '',
    category: (r.category as string) ?? '',
    keywords: (r.keywords as string[]) ?? [],
    language: (r.language as string) ?? 'ko',
    status: ((r.status as ArticleStatus) ?? 'draft'),
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  };
}

// id 제외(insert 시 DB 생성, update 시 eq로 지정). updated_at은 항상 now.
function articleToRow(a: Partial<MarketingArticle>): Row {
  return {
    topic_id: a.topicId ?? null,
    title: a.title ?? '',
    body: a.body ?? '',
    category: a.category ?? '',
    keywords: a.keywords ?? [],
    language: a.language ?? 'ko',
    status: a.status ?? 'draft',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchArticles(): Promise<MarketingArticle[]> {
  const { data, error } = await supabase
    .from('marketing_articles')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    logger.warn('[marketing] fetchArticles failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToArticle(r as Row));
}

export async function saveArticle(a: Partial<MarketingArticle> & { id?: string }): Promise<MarketingArticle> {
  const row = articleToRow(a);
  if (a.id) {
    const { data, error } = await supabase
      .from('marketing_articles')
      .update(row)
      .eq('id', a.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToArticle(data as Row);
  }
  const { data, error } = await supabase
    .from('marketing_articles')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToArticle(data as Row);
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_articles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface GenerateArticleReq {
  title: string;
  angle?: string;
  keywords?: string[];
  category?: string;
  topicId?: string;
  language?: string;
}

export async function generateArticle(req: GenerateArticleReq): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/generate-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.error || `생성 실패: ${res.status}`);
  return body.content as string;
}
```
- [ ] **Step 2:** `cd v4 && npx tsc --noEmit` 통과.

- [ ] **Step 3: Commit**
```bash
git add v4/src/features/marketing/types.ts v4/src/features/marketing/services/marketingArticleService.ts
git commit -m "feat(marketing): MarketingArticle type + article service (Supabase + ai-server)"
```

---

## Chunk 3: dflo UI (목록 + 에디터 + 사이드바/라우터)

### Task 3.1: ArticleEditor

**Files:**
- Create: `v4/src/features/marketing/components/ArticleEditor.tsx`

- [ ] **Step 1: 작성** (EXACT content) — 주제 백로그(topics.json) 선택 또는 직접입력 → 생성 → 편집 → 저장.
```tsx
// src/features/marketing/components/ArticleEditor.tsx
import { useState } from 'react';
import topicsRaw from '../data/topics.json';
import type { MarketingArticle, Topic } from '../types';
import { generateArticle, saveArticle } from '../services/marketingArticleService';

const TOPICS = topicsRaw as Topic[];
const LANGS = ['ko', 'th', 'vi', 'en'];

export function ArticleEditor({
  article,
  onSaved,
  onCancel,
}: {
  article: MarketingArticle | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(article?.title ?? '');
  const [angle, setAngle] = useState('');
  const [keywords, setKeywords] = useState<string[]>(article?.keywords ?? []);
  const [category, setCategory] = useState(article?.category ?? '');
  const [topicId, setTopicId] = useState<string | null>(article?.topicId ?? null);
  const [language, setLanguage] = useState(article?.language ?? 'ko');
  const [body, setBody] = useState(article?.body ?? '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickTopic = (id: string) => {
    if (!id) {
      setTopicId(null); // "직접 입력"으로 되돌릴 때 stale topicId 제거
      return;
    }
    const t = TOPICS.find((x) => x.id === id);
    if (!t) return;
    setTopicId(t.id);
    setTitle(t.title);
    setAngle(t.angle);
    setKeywords(t.keywords);
    setCategory(t.category);
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      setErr('제목(주제)을 입력하세요.');
      return;
    }
    setGenerating(true);
    setErr(null);
    try {
      const content = await generateArticle({ title, angle, keywords, category, topicId: topicId ?? undefined, language });
      setBody(content);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await saveArticle({
        id: article?.id,
        topicId,
        title,
        body,
        category,
        keywords,
        language,
        status: body.trim() ? 'done' : 'draft',
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{article ? '글 편집' : '새 글 생성'}</h1>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">
          ← 목록
        </button>
      </div>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">주제 백로그에서 선택</span>
          <select
            value={topicId ?? ''}
            onChange={(e) => pickTopic(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— 직접 입력 —</option>
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} · {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">제목(주제)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">앵글</span>
          <input value={angle} onChange={(e) => setAngle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">키워드 (쉼표 구분)</span>
          <input
            value={keywords.join(', ')}
            onChange={(e) => setKeywords(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">카테고리</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">언어</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-[#4A2D6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {generating ? '생성 중… (수십 초)' : '✨ AI 생성'}
        </button>
      </section>

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <span className="block text-xs font-medium text-gray-500">본문 (편집 가능)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
        <div className="flex items-center gap-2">
          {err && <span className="text-xs text-red-500">{err}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="ml-auto rounded-lg bg-[#4A2D6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </section>
    </div>
  );
}
```
- [ ] **Step 2:** `cd v4 && npx tsc --noEmit` 통과. (`Topic` 타입은 Phase1에서 `types.ts`에 이미 export됨 — 확인.)

### Task 3.2: ArticleList + MarketingArticlesPage

**Files:**
- Create: `v4/src/features/marketing/components/ArticleList.tsx`
- Create: `v4/src/features/marketing/components/MarketingArticlesPage.tsx`

- [ ] **Step 1: ArticleList.tsx** (EXACT content)
```tsx
// src/features/marketing/components/ArticleList.tsx
import type { MarketingArticle } from '../types';

export function ArticleList({
  articles,
  onNew,
  onEdit,
  onDelete,
}: {
  articles: MarketingArticle[];
  onNew: () => void;
  onEdit: (a: MarketingArticle) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">블로그 글</h1>
        <button type="button" onClick={onNew} className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white">
          + 새 글 생성
        </button>
      </div>
      {articles.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">아직 생성된 글이 없습니다.</p>
      ) : (
        articles.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
            <button type="button" onClick={() => onEdit(a)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium text-gray-800">{a.title || '(제목 없음)'}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                {a.category && <span className="rounded bg-gray-100 px-1.5 py-0.5">{a.category}</span>}
                <span>{a.language}</span>
                <span className={a.status === 'done' ? 'text-emerald-600' : 'text-amber-600'}>
                  {a.status === 'done' ? '완료' : '초안'}
                </span>
                <span>{a.updatedAt.slice(0, 10)}</span>
              </div>
            </button>
            <button type="button" onClick={() => onDelete(a.id)} className="px-2 text-gray-300 hover:text-red-500">
              🗑
            </button>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: MarketingArticlesPage.tsx** (EXACT content)
```tsx
// src/features/marketing/components/MarketingArticlesPage.tsx
import { useEffect, useState } from 'react';
import type { MarketingArticle } from '../types';
import { fetchArticles, deleteArticle } from '../services/marketingArticleService';
import { ArticleList } from './ArticleList';
import { ArticleEditor } from './ArticleEditor';

export function MarketingArticlesPage() {
  const [articles, setArticles] = useState<MarketingArticle[]>([]);
  const [view, setView] = useState<{ mode: 'list' } | { mode: 'edit'; article: MarketingArticle | null }>({
    mode: 'list',
  });

  const reload = () => {
    fetchArticles().then(setArticles);
  };
  useEffect(reload, []);

  if (view.mode === 'edit') {
    return (
      <ArticleEditor
        article={view.article}
        onSaved={() => {
          setView({ mode: 'list' });
          reload();
        }}
        onCancel={() => setView({ mode: 'list' })}
      />
    );
  }

  return (
    <ArticleList
      articles={articles}
      onNew={() => setView({ mode: 'edit', article: null })}
      onEdit={(a) => setView({ mode: 'edit', article: a })}
      onDelete={async (id) => {
        await deleteArticle(id);
        reload();
      }}
    />
  );
}
```
- [ ] **Step 3:** `cd v4 && npx tsc --noEmit` 통과.

### Task 3.3: 사이드바 + 라우터

> **컨트롤러 선행**: `git status`로 `v4/src/app/router.tsx`가 dirty면 `git stash push -- v4/src/app/router.tsx`. 이 청크 커밋 후 `git stash pop`. (현재 clean이면 불필요.)

**Files:**
- Modify: `v4/src/features/marketing/components/MarketingSidebar.tsx`
- Modify: `v4/src/app/router.tsx`

- [ ] **Step 1: 사이드바** — `NAV` 배열 끝(설정 뒤)에:
```tsx
  { to: '/marketing/articles', label: '글 생성', end: false },
```
> 순서: 대시보드 / 전략 문서 / 키워드 DB / 주제 백로그 / 설정 / 글 생성. (설정과 글 생성 순서는 취향 — 글 생성을 주제 백로그 뒤·설정 앞에 둬도 무방.)

- [ ] **Step 2: 라우터 lazy import** — 마케팅 lazy import 옆:
```tsx
const MarketingArticlesPage = lazy(() =>
  import('@/features/marketing/components/MarketingArticlesPage').then((m) => ({ default: m.MarketingArticlesPage })),
);
```

- [ ] **Step 3: 라우터 자식** — `/marketing` children 배열에(settings 뒤):
```tsx
      {
        path: 'articles',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <MarketingArticlesPage />
          </Suspense>
        ),
      },
```

- [ ] **Step 4: 검증** — `cd v4 && npx tsc --noEmit` 통과, `npx vite build` 성공(`MarketingArticlesPage-*.js` lazy chunk 확인), `npx eslint src/features/marketing` 클린.

- [ ] **Step 5: Commit** (Chunk 3의 5개 파일 한 번에 — ArticleEditor 포함)

Task 3.1/3.2/3.3은 커밋 없이 파일만 만들고/고치고, 여기서 5개를 한 번에 커밋한다. 스테이징은 이 5개 마케팅 파일만(병렬 WIP 제외).
```bash
git add v4/src/features/marketing/components/ArticleEditor.tsx v4/src/features/marketing/components/ArticleList.tsx v4/src/features/marketing/components/MarketingArticlesPage.tsx v4/src/features/marketing/components/MarketingSidebar.tsx v4/src/app/router.tsx
git commit -m "feat(marketing): /marketing/articles UI (list + generate/edit/save) + sidebar/route"
```
> 커밋 후 컨트롤러가 stash pop(했다면) + `npx tsc --noEmit`로 공존 확인.

---

## 완료 기준 (Definition of Done)

- ai-server `POST /api/marketing/generate-article`: config 읽어 187 프롬프트 조립 → Gemini → 글 반환(ai-server `npx tsc` 통과·`npm run build` 성공; 수동 curl 시 생성 확인).
- `017_marketing_articles.sql` 작성(사용자 Dashboard 적용).
- `/marketing/articles`(PIN `8054`): 백로그 선택/직접입력 → ✨AI 생성 → textarea 편집 → 저장 → 목록 → 재편집/삭제.
- `npx tsc --noEmit`(v4) 통과, `npx vite build` 성공, 마케팅 lint 클린.
- 런타임 외부 의존 0(dflo Supabase + dflo ai-server). 외부 키 미저장.
- SP1 설정 소비(생성 품질이 설정 편집에 반응). 발행은 SP3a 범위 밖.
