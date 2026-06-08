# 통합 블로그 워크플로우 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/marketing/content`의 블로그 두 탭(`블로그(SEO)`·네이버 `블로그`)을, 키워드→구조→본문→구글 SEO 점수→AI 수정의 단계형 위저드 하나로 통합한다.

**Architecture:** 단일 데이터 소스 `marketing_articles.blog`(`BlogSeoMap`, 언어별 `BlogSeoArticle`, migration 045) 위에서 동작하는 `BlogWizard`. 최상단 언어 셀렉터로 언어 일원화. AI 생성은 ai-server 신규 엔드포인트 2개(아웃라인/본문) + 기존 `/rewrite`(섹션 수정). 구글 SEO 점수기는 `docs/blog/lib/seo-check.mjs`를 순수 TS로 포팅. 네이버 카드 코드·점수기 폐기(테이블은 비파괴 방치).

**Tech Stack:** React 19 + TypeScript + Vite, Tailwind, Supabase(JSONB), Express(ai-server) + Gemini 2.5 Flash, `node:test`(`node --import tsx --test`).

> **커밋 주의:** 이 저장소는 사용자의 "업데이트" 키워드에서만 커밋/푸시한다. 아래 각 태스크의 커밋 스텝은 권장 단위일 뿐, 실제 커밋은 사용자가 "업데이트"라고 할 때 일괄 처리한다. 자동 커밋·푸시 금지.

---

## File Structure

**ai-server (생성/수정)**
- Modify `ai-server/src/services/contentPrompts.ts` — `buildBlogSeoOutlinePrompt`, `buildBlogSeoBodyPrompt` 추가.
- Modify `ai-server/src/routes/marketing.ts` — `POST /blog-seo-outline`, `POST /blog-seo-body` 핸들러 + import 추가.

**v4 frontend (생성)**
- Create `v4/src/features/marketing/utils/googleSeoScorer.ts` — 순수 점수기(포팅).
- Create `v4/scripts/test/google-seo-scorer.test.mjs` — 점수기 단위 테스트.
- Create `v4/src/features/marketing/components/content/BlogSeoEditor.tsx` — 메타+섹션+FAQ 편집 캔버스(언어탭 없음, `mode` prop).
- Create `v4/src/features/marketing/components/content/BlogSeoScorePanel.tsx` — 점수 표시 + 약한 항목 `AI 수정` 트리거.
- Create `v4/src/features/marketing/components/content/BlogWizard.tsx` — 스텝바 + 단계 오케스트레이션 + 상태/저장/생성.

**v4 frontend (수정)**
- Modify `v4/src/features/marketing/services/marketingArticleService.ts` — `generateBlogSeoOutline`, `generateBlogSeoBody` 추가.
- Modify `v4/src/features/marketing/components/content/ContentTabs.tsx` — 탭 3개, `blogseo` 제거, `BlogWizard` 연결.

**v4 frontend (삭제)**
- Delete `v4/src/features/marketing/components/content/BlogPanel.tsx`
- Delete `v4/src/features/marketing/components/content/BlogSeoPanel.tsx`
- Delete `v4/src/features/marketing/components/content/BlogCardItem.tsx`
- Delete `v4/src/features/marketing/components/content/SeoScorePanel.tsx`
- Delete `v4/src/features/marketing/components/content/WorkflowStepBar.tsx`
- Delete `v4/src/features/marketing/services/blogChannelService.ts`
- Delete `v4/src/features/marketing/utils/seoScorer.ts`
- Modify `v4/src/features/marketing/types.ts` — 네이버 전용 타입 제거(`BlogContent`/`BlogCard`/`BlogCardType`/`BlogCardContent`/`BlogChannel`/`GlobalCardStyle`).

---

## Task 1: 백엔드 프롬프트 — 아웃라인/본문 빌더

**Files:**
- Modify: `ai-server/src/services/contentPrompts.ts` (끝에 추가)

- [ ] **Step 1: 타입 + 프롬프트 빌더 추가**

`contentPrompts.ts` 맨 끝에 아래를 추가한다. `LANG_NAMES`(파일 상단에 이미 정의됨)와 `brandBlock`(이미 정의됨)을 재사용한다.

```ts
// ── SEO blog (통합 블로그 위저드, marketing_articles.blog) ────────────────────
export interface BlogSeoOutlineRequest {
  lang: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  topicTitle: string;
  baseBody?: string;
}

export interface BlogSeoBodyRequest {
  lang: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  seoTitle: string;
  h1: string;
  sectionHeadings: string[];
  faqQuestions: string[];
  baseBody?: string;
}

function langName(code: string): string {
  return code === 'ko' ? '한국어' : LANG_NAMES[code] || code;
}

/**
 * 아웃라인 프롬프트. 키워드+주제(+한국어 기본글 참고)로 언어별 네이티브 구조를
 * 제안한다. 직역이 아니라 해당 언어권 부모가 검색하는 방식의 transcreation.
 */
export function buildBlogSeoOutlinePrompt(c: ArticleConfig, r: BlogSeoOutlineRequest): string {
  const brand = c.brand_name?.trim() || '187 성장클리닉';
  const lang = langName(r.lang);
  const secondary = (r.secondaryKeywords ?? []).filter(Boolean).join(', ');
  const ref = r.baseBody?.trim();
  return `당신은 ${brand}의 구글 SEO 블로그 전략가입니다. 아래 주제로 ${lang} 블로그 글의 구조(아웃라인)를 설계하세요.
직역이 아니라 ${lang}권 부모가 실제 검색하는 방식의 네이티브 표현으로 작성합니다.

${brandBlock(c)}

## 주제
- 주제: ${r.topicTitle}
- 핵심 키워드(primary): ${r.primaryKeyword}
${secondary ? `- 보조 키워드(secondary): ${secondary}` : ''}
${ref ? `\n## 한국어 기본글 (의미 참고용 — 번역하지 말고 ${lang} 네이티브로 재구성)\n${ref.slice(0, 3000)}` : ''}

## 규칙
- seoTitle: 핵심 키워드를 앞쪽에 포함, ${r.lang === 'ko' || r.lang === 'th' ? '40자' : '60자'} 이내 권장.
- slug: 영문 소문자-하이픈(kebab-case), 3~6 단어.
- metaDescription: 핵심 키워드 포함, ${r.lang === 'ko' || r.lang === 'th' ? '50~120자' : '110~160자'}.
- h1: 핵심 키워드 포함.
- sectionHeadings: H2 소제목 4~7개(빈 본문). 첫 섹션은 도입/요점, 마지막은 정리/결론.
- faqQuestions: 2~4개, 실제로 검색되는 질문 형태.
- 의료광고법 준수(과장·단정 금지).

## 출력 형식 (매우 중요)
- 반드시 아래 JSON 객체만 출력하세요. 설명/마크다운/코드펜스 절대 금지.
{"seoTitle":"","slug":"","metaDescription":"","h1":"","sectionHeadings":["",""],"faqQuestions":["",""]}`;
}

/**
 * 본문 프롬프트. 확정된 아웃라인을 각 섹션 HTML + 이미지 프롬프트 + FAQ 답변으로 채운다.
 */
export function buildBlogSeoBodyPrompt(c: ArticleConfig, r: BlogSeoBodyRequest): string {
  const brand = c.brand_name?.trim() || '187 성장클리닉';
  const lang = langName(r.lang);
  const secondary = (r.secondaryKeywords ?? []).filter(Boolean).join(', ');
  const ref = r.baseBody?.trim();
  const headings = r.sectionHeadings.map((h, i) => `${i + 1}. ${h}`).join('\n');
  const faqs = r.faqQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  return `당신은 ${brand}의 구글 SEO 블로그 작가입니다. 아래 ${lang} 아웃라인의 각 섹션 본문과 FAQ 답변을 작성하세요.
직역이 아니라 ${lang}권 독자에게 자연스러운 네이티브 문장으로 씁니다.

${brandBlock(c)}

## 메타
- 제목: ${r.seoTitle}
- H1: ${r.h1}
- 핵심 키워드(primary): ${r.primaryKeyword} (본문 전체에 3~5회 자연스럽게 반복, 첫 섹션 도입부에 포함)
${secondary ? `- 보조 키워드(secondary): ${secondary} (각 1~2회)` : ''}

## 섹션 제목 (이 순서/개수 그대로)
${headings}

## FAQ 질문 (이 순서/개수 그대로)
${faqs}
${ref ? `\n## 한국어 기본글 (의미 참고용 — 번역 말고 ${lang} 네이티브로 재구성)\n${ref.slice(0, 4000)}` : ''}

## 규칙
- 각 섹션 html: <p>/<ul>/<li>/<strong>만 사용(섹션 제목 h2는 넣지 말 것 — heading 필드로 별도 관리). 한 단락 2~4문장.
- 최소 한 섹션에는 <ul> 리스트 포함.
- imagePrompt: 해당 섹션 분위기의 16:9 플랫 일러스트 영문 프롬프트(스타일/주제/구도/색).
- faq.a: 2~4문장 답변.
- 의료광고법 준수(과장·단정 금지).

## 출력 형식 (매우 중요)
- 반드시 아래 JSON 객체만 출력하세요. 설명/마크다운/코드펜스 절대 금지. 문자열 안 큰따옴표는 「」로 대체.
- sections 길이 = 섹션 제목 개수(${r.sectionHeadings.length}), faq 길이 = 질문 개수(${r.faqQuestions.length}). heading 은 위 제목 그대로.
{"sections":[{"heading":"","html":"","imagePrompt":""}],"faq":[{"q":"","a":""}]}`;
}
```

- [ ] **Step 2: 타입체크**

Run: `cd ai-server && npx tsc --noEmit`
Expected: 에러 없음(기존 `LANG_NAMES`/`brandBlock`/`ArticleConfig` 재사용).

- [ ] **Step 3: Commit**

```bash
git add ai-server/src/services/contentPrompts.ts
git commit -m "feat(marketing): SEO 블로그 아웃라인/본문 프롬프트 빌더 추가"
```

---

## Task 2: 백엔드 라우트 — 아웃라인/본문 엔드포인트

**Files:**
- Modify: `ai-server/src/routes/marketing.ts:16` (import 라인), `:353` 부근(`/blog-generate` 다음에 삽입)

- [ ] **Step 1: import 에 신규 빌더 추가**

`marketing.ts:16`의 contentPrompts import 에 두 빌더를 추가한다.

```ts
import { buildBasePrompt, buildTopicPrompt, buildRewritePrompt, buildBlogPrompt, buildCardNewsPrompt, buildTranslatePrompt, buildCardnewsI18nPrompt, buildCaptionHashtagPrompt, buildBlogSeoOutlinePrompt, buildBlogSeoBodyPrompt } from '../services/contentPrompts.js';
```

- [ ] **Step 2: 두 핸들러 추가**

`/blog-generate` 핸들러(끝나는 `});`) 바로 다음에 삽입한다. JSON 객체 파싱은 기존 `/translate` 패턴(`indexOf('{')`/`lastIndexOf('}')`)을 따른다.

```ts
// POST /blog-seo-outline : 키워드+주제 → 언어별 구조화 블로그 아웃라인 JSON (Gemini 게이트).
marketingRouter.post('/blog-seo-outline', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!body.primaryKeyword || !String(body.primaryKeyword).trim()) {
    return res.status(400).json({ success: false, error: 'primaryKeyword required' });
  }
  try {
    const raw = await generateText(buildBlogSeoOutlinePrompt(await readMarketingConfig(), {
      lang: String(body.lang ?? 'ko'),
      primaryKeyword: String(body.primaryKeyword),
      secondaryKeywords: Array.isArray(body.secondaryKeywords) ? body.secondaryKeywords : [],
      topicTitle: String(body.topicTitle ?? ''),
      baseBody: body.baseBody ? String(body.baseBody) : undefined,
    }));
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s < 0 || e <= s) return res.status(502).json({ success: false, error: '아웃라인 결과를 해석하지 못했습니다. 다시 시도해주세요.' });
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw.slice(s, e + 1)); }
    catch { return res.status(502).json({ success: false, error: '아웃라인 JSON 파싱 실패. 다시 시도해주세요.' }); }
    res.json({ success: true, outline: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] blog-seo-outline failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});

// POST /blog-seo-body : 아웃라인 → 섹션 본문 + FAQ 답변 + 이미지 프롬프트 JSON (Gemini 게이트).
marketingRouter.post('/blog-seo-body', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!Array.isArray(body.sectionHeadings) || body.sectionHeadings.length === 0) {
    return res.status(400).json({ success: false, error: 'sectionHeadings required' });
  }
  try {
    const raw = await generateText(buildBlogSeoBodyPrompt(await readMarketingConfig(), {
      lang: String(body.lang ?? 'ko'),
      primaryKeyword: String(body.primaryKeyword ?? ''),
      secondaryKeywords: Array.isArray(body.secondaryKeywords) ? body.secondaryKeywords : [],
      seoTitle: String(body.seoTitle ?? ''),
      h1: String(body.h1 ?? ''),
      sectionHeadings: body.sectionHeadings.map((h: unknown) => String(h)),
      faqQuestions: Array.isArray(body.faqQuestions) ? body.faqQuestions.map((q: unknown) => String(q)) : [],
      baseBody: body.baseBody ? String(body.baseBody) : undefined,
    }));
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s < 0 || e <= s) return res.status(502).json({ success: false, error: '본문 결과를 해석하지 못했습니다. 다시 시도해주세요.' });
    let parsed: { sections?: unknown; faq?: unknown };
    try { parsed = JSON.parse(raw.slice(s, e + 1)); }
    catch { return res.status(502).json({ success: false, error: '본문 JSON 파싱 실패. 다시 시도해주세요.' }); }
    res.json({ success: true, sections: parsed.sections ?? [], faq: parsed.faq ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[marketing] blog-seo-body failed', e);
    res.status(502).json({ success: false, error: msg });
  }
});
```

- [ ] **Step 3: 타입체크 + 부팅 확인**

Run: `cd ai-server && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add ai-server/src/routes/marketing.ts
git commit -m "feat(marketing): blog-seo-outline·blog-seo-body 엔드포인트 추가"
```

---

## Task 3: 구글 SEO 점수기 포팅 (TDD)

**Files:**
- Create: `v4/src/features/marketing/utils/googleSeoScorer.ts`
- Test: `v4/scripts/test/google-seo-scorer.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`v4/scripts/test/google-seo-scorer.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreArticle } from '../../src/features/marketing/utils/googleSeoScorer.ts';

const strong = {
  seoTitle: '소아 성장 키 크는 법 완벽 가이드',
  slug: 'child-growth-guide',
  metaDescription: '소아 성장과 키 크는 법을 의학적 근거로 정리했습니다. 성장판, 수면, 영양까지 부모가 알아야 할 핵심을 담았습니다. 지금 확인하세요.',
  h1: '소아 성장 키 크는 법',
  primaryKeyword: '소아 성장',
  secondaryKeywords: ['키 크는 법', '성장판'],
  sections: [
    { heading: '소아 성장이란', html: '<p>소아 성장은 중요합니다. 키 크는 법을 알아봅니다.</p>', imagePrompt: 'flat illustration', imageUrl: null },
    { heading: '성장판과 수면', html: '<ul><li>성장판 자극</li><li>충분한 수면</li></ul>', imagePrompt: 'flat illustration', imageUrl: null },
    { heading: '영양과 운동', html: '<p>소아 성장에 영양은 핵심입니다.</p>', imagePrompt: 'flat illustration', imageUrl: null },
  ],
  faq: [ { q: '키는 언제 크나요?', a: '사춘기 전후입니다.' }, { q: '성장판 검사는?', a: '엑스레이로 합니다.' } ],
};

test('strong article scores high (A/B)', () => {
  const r = scoreArticle(strong, 'ko');
  assert.equal(r.max, 100);
  assert.ok(r.score >= 80, `expected >=80, got ${r.score}`);
  assert.ok(['A', 'B'].includes(r.grade), `grade ${r.grade}`);
});

test('empty article scores low (F) and details cover 11 items', () => {
  const empty = { seoTitle: '', slug: '', metaDescription: '', h1: '', primaryKeyword: '', secondaryKeywords: [], sections: [], faq: [] };
  const r = scoreArticle(empty, 'ko');
  assert.equal(r.details.length, 11);
  assert.equal(r.grade, 'F');
});

test('thai partial keyword overlap is credited (no-space LCS)', () => {
  const th = {
    seoTitle: 'การเจริญเติบโตของเด็ก', slug: 'thai-growth', metaDescription: 'การเจริญเติบโตของเด็กและส่วนสูงสำหรับผู้ปกครองที่ต้องการทราบข้อมูลที่ถูกต้องและครบถ้วน',
    h1: 'การเจริญเติบโตของเด็ก', primaryKeyword: 'การเจริญเติบโต', secondaryKeywords: [],
    sections: [ { heading: 'a', html: '<p>การเจริญเติบโตของเด็กสำคัญมาก</p>', imagePrompt: 'x', imageUrl: null } ],
    faq: [],
  };
  const r = scoreArticle(th, 'th');
  const titleItem = r.details.find((d) => d.label === '제목 키워드');
  assert.ok(titleItem.score > 0, 'thai title keyword should be credited');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd v4 && node --import tsx --test scripts/test/google-seo-scorer.test.mjs`
Expected: FAIL — `Cannot find module .../googleSeoScorer.ts` (아직 미생성).

- [ ] **Step 3: 점수기 구현 (seo-check.mjs 포팅)**

`v4/src/features/marketing/utils/googleSeoScorer.ts`. `docs/blog/lib/seo-check.mjs`의 `scoreArticle`+헬퍼를 TS로 옮긴다(로직 동일, 타입만 부여). `findCannibalization`은 UI에서 안 쓰므로 제외.

```ts
// docs/blog/lib/seo-check.mjs 의 구글 기준 on-page SEO 점수기를 클라이언트 TS로 포팅.
// 입력은 BlogSeoArticle. 순수 함수(Node 의존 없음). 점수 영구 저장 안 함.
import type { BlogSeoArticle } from '../types';

export type SeoStatus = 'good' | 'warn' | 'bad';
export interface SeoDetail { label: string; score: number; max: number; status: SeoStatus; msg: string }
export interface SeoResult { score: number; max: number; grade: string; details: SeoDetail[] }

const stripHtml = (h: string) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const normalize = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const noSpace = (s: string) => normalize(s).replace(/\s+/g, '');
const isWide = (lang: string) => lang === 'ko' || lang === 'th';
const gradeOf = (r: number) => (r >= 0.9 ? 'A' : r >= 0.8 ? 'B' : r >= 0.7 ? 'C' : r >= 0.6 ? 'D' : 'F');

const STOP = new Set(['in', 'of', 'to', 'for', 'the', 'a', 'an', 'and', 'or', 'vs', 'your', 'my', 'do', 'does', 'is', 'are', 'how', 'what', 'with', 'on', '&', '에', '의', '을', '를', '이', '가', '은', '는']);

function tokenize(kw: string): string[] {
  const n = normalize(kw);
  if (!n) return [];
  const parts = n.split(' ').filter(Boolean);
  if (parts.length <= 1) return [noSpace(n)];
  const sig = parts.filter((w) => !STOP.has(w) && w.length >= 2);
  return sig.length ? sig : parts;
}
function lcsRatio(text: string, kw: string): number {
  const t = noSpace(text), k = noSpace(kw);
  if (!k) return 0;
  const min = Math.ceil(k.length * 0.5);
  for (let len = k.length; len >= min; len--)
    for (let i = 0; i + len <= k.length; i++)
      if (t.includes(k.slice(i, i + len))) return len / k.length;
  return 0;
}
function kwCoverage(text: string, kw: string): number {
  if (!kw) return 0;
  const ht = normalize(text);
  if (ht.includes(normalize(kw))) return 1;
  if (noSpace(text).includes(noSpace(kw))) return 1;
  const toks = tokenize(kw);
  const hns = noSpace(text);
  let cov = toks.length ? toks.filter((t) => ht.includes(t) || hns.includes(t)).length / toks.length : 0;
  if (toks.length <= 1) cov = Math.max(cov, lcsRatio(text, kw));
  return cov;
}
const kwPresent = (text: string, kw: string, th = 0.75) => kwCoverage(text, kw) >= th;
function exactCount(text: string, kw: string): number {
  const t = noSpace(text), k = noSpace(kw);
  if (!k) return 0;
  let c = 0, p = 0;
  while ((p = t.indexOf(k, p)) !== -1) { c++; p += k.length; }
  return c;
}

export function scoreArticle(a: BlogSeoArticle, lang: string): SeoResult {
  const wide = isWide(lang);
  const d: SeoDetail[] = [];
  const push = (label: string, score: number, max: number, msg: string) => {
    const r = max ? score / max : 0;
    d.push({ label, score, max, status: r >= 0.85 ? 'good' : r >= 0.5 ? 'warn' : 'bad', msg });
  };
  const bodyHtml = (a.sections || []).map((s) => s.html || '').join(' ');
  const body = stripHtml(bodyHtml);
  const headings = (a.sections || []).map((s) => s.heading || '').join(' ');
  const primary = a.primaryKeyword || '';
  const secondary = a.secondaryKeywords || [];

  // 1) 제목 키워드 + 앞쪽 배치 (12)
  {
    const t = a.seoTitle || '';
    let s = 0; const m: string[] = [];
    const cov = kwCoverage(t, primary);
    if (cov >= 0.75) {
      s += 8; m.push(cov === 1 ? 'primary 포함' : 'primary 어구 포함');
      const pos = noSpace(t).indexOf(noSpace(tokenize(primary)[0] || primary));
      if (pos >= 0 && pos <= Math.floor(noSpace(t).length / 3)) { s += 4; m[m.length - 1] = m[m.length - 1].replace('포함', '앞쪽 포함'); }
    } else m.push('제목에 primary 약함');
    push('제목 키워드', s, 12, m.join(', '));
  }
  // 2) 제목 길이 (8)
  {
    const t = a.seoTitle || '', good = wide ? 40 : 60, warn = wide ? 50 : 70;
    let s: number, msg: string;
    if (!t.length) { s = 0; msg = '제목 없음'; }
    else if (t.length <= good) { s = 8; msg = `${t.length}자 (≤${good} 양호)`; }
    else if (t.length <= warn) { s = 5; msg = `${t.length}자 (권장 ≤${good})`; }
    else { s = 1; msg = `${t.length}자 (김, ≤${good} 권장)`; }
    push('제목 길이', s, 8, msg);
  }
  // 3) 메타 설명 (14)
  {
    const md = a.metaDescription || '';
    if (!md) push('메타 설명', 0, 14, 'meta 없음');
    else {
      let s = 4; const m: string[] = [];
      if (kwPresent(md, primary)) { s += 5; m.push('primary 포함'); } else m.push('primary 약함');
      const lo = wide ? 50 : 110, hi = wide ? 120 : 160, hardHi = wide ? 135 : 175;
      if (md.length >= lo && md.length <= hi) { s += 5; m.push(`${md.length}자 OK`); }
      else if (md.length < lo) { s += 2; m.push(`${md.length}자 짧음(≥${lo})`); }
      else if (md.length <= hardHi) { s += 3; m.push(`${md.length}자 약간 김`); }
      else { s += 1; m.push(`${md.length}자 김(≤${hi})`); }
      push('메타 설명', s, 14, m.join(', '));
    }
  }
  // 4) Slug (6)
  {
    const sl = a.slug || '', ok = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sl), words = sl.split('-').length;
    let s: number, msg: string;
    if (!sl) { s = 0; msg = 'slug 없음'; }
    else if (ok && words <= 7) { s = 6; msg = sl; }
    else if (ok && words <= 10) { s = 5; msg = `${sl} (${words}단어, 약간 김)`; }
    else if (ok) { s = 3; msg = `${sl} (${words}단어, 김)`; }
    else { s = 2; msg = `${sl} (소문자-하이픈 권장)`; }
    push('Slug', s, 6, msg);
  }
  // 5) H1 키워드 (8)
  {
    const h1 = a.h1 || '';
    let s: number, msg: string;
    if (!h1) { s = 0; msg = 'H1 없음'; }
    else if (kwPresent(h1, primary)) { s = 8; msg = 'primary 포함'; }
    else { s = 3; msg = 'H1에 primary 약함'; }
    push('H1', s, 8, msg);
  }
  // 6) 첫 문단 키워드 (10)
  {
    const first = body.slice(0, 200);
    let s: number, msg: string;
    if (first.length < 50) { s = 0; msg = '도입부 짧음'; }
    else if (kwPresent(first, primary, 0.7)) { s = 10; msg = '첫 문단에 primary'; }
    else if (kwCoverage(first, primary) >= 0.4) { s = 6; msg = '첫 문단에 일부'; }
    else { s = 3; msg = '첫 문단에 primary 권장'; }
    push('첫 문단', s, 10, msg);
  }
  // 7) 키워드 사용 (12)
  {
    let s: number, msg: string;
    if (!primary) { s = 0; msg = 'primary 없음'; }
    else {
      const c = exactCount(body, primary), cov = kwCoverage(body, primary);
      if (c >= 2) { s = 12; msg = `정확 ${c}회`; }
      else if (c === 1) { s = 10; msg = '정확 1회 + 본문 사용'; }
      else if (cov >= 0.85) { s = 9; msg = '어구 분산 사용(변형 포함)'; }
      else if (cov >= 0.5) { s = 6; msg = '어구 일부만 사용'; }
      else { s = 0; msg = '본문에 primary 거의 없음'; }
    }
    push('키워드 사용', s, 12, msg);
  }
  // 8) 보조 키워드 (8)
  {
    let s: number, msg: string;
    if (!secondary.length) { s = 4; msg = '보조 키워드 없음'; }
    else {
      const used = secondary.filter((k) => kwPresent(body, k, 0.7) || kwPresent(headings, k, 0.7)).length;
      s = Math.round((used / secondary.length) * 8); msg = `${used}/${secondary.length} 사용`;
    }
    push('보조 키워드', s, 8, msg);
  }
  // 9) 구조화 (12)
  {
    const h2 = (a.sections || []).length, hasList = /<(ul|ol)[\s>]/i.test(bodyHtml);
    let s = 0; const m: string[] = [];
    if (h2 >= 3) { s += 8; m.push(`H2 ${h2}개`); } else if (h2 >= 2) { s += 5; m.push(`H2 ${h2}개(≥3 권장)`); } else { s += 2; m.push(`H2 ${h2}개`); }
    if (hasList) { s += 4; m.push('리스트'); } else m.push('리스트 없음');
    push('구조화', Math.min(12, s), 12, m.join(', '));
  }
  // 10) FAQ (5)
  {
    const f = (a.faq || []).length;
    push('FAQ', f >= 2 ? 5 : f === 1 ? 3 : 0, 5, `${f}개`);
  }
  // 11) 섹션 이미지 프롬프트 (5)
  {
    const secs = a.sections || [], withImg = secs.filter((s) => s.imagePrompt && s.imagePrompt.trim()).length;
    push('이미지 프롬프트', secs.length && withImg === secs.length ? 5 : Math.round((withImg / Math.max(1, secs.length)) * 5), 5, `${withImg}/${secs.length} 섹션`);
  }

  const score = d.reduce((x, y) => x + y.score, 0);
  const max = d.reduce((x, y) => x + y.max, 0);
  return { score, max, grade: gradeOf(max ? score / max : 0), details: d };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd v4 && node --import tsx --test scripts/test/google-seo-scorer.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add v4/src/features/marketing/utils/googleSeoScorer.ts v4/scripts/test/google-seo-scorer.test.mjs
git commit -m "feat(marketing): 구글 SEO 점수기 클라이언트 포팅 + 단위테스트"
```

---

## Task 4: 프론트 서비스 — 아웃라인/본문 생성 함수

**Files:**
- Modify: `v4/src/features/marketing/services/marketingArticleService.ts` (끝에 추가)

- [ ] **Step 1: 타입 + 함수 추가**

파일 끝에 추가. `BASE`(파일 상단에 이미 정의)와 fetch 패턴은 기존 `rewriteSelection`와 동일.

```ts
// ── 통합 블로그 위저드 (SEO blog) AI 생성 ─────────────────────────────────────
export interface BlogSeoOutline {
  seoTitle: string;
  slug: string;
  metaDescription: string;
  h1: string;
  sectionHeadings: string[];
  faqQuestions: string[];
}

export async function generateBlogSeoOutline(p: {
  lang: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  topicTitle: string;
  baseBody?: string;
}): Promise<BlogSeoOutline> {
  const res = await fetch(`${BASE}/api/marketing/blog-seo-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `아웃라인 생성 실패: ${res.status}`);
  const o = (b.outline ?? {}) as Partial<BlogSeoOutline>;
  return {
    seoTitle: o.seoTitle ?? '',
    slug: o.slug ?? '',
    metaDescription: o.metaDescription ?? '',
    h1: o.h1 ?? '',
    sectionHeadings: Array.isArray(o.sectionHeadings) ? o.sectionHeadings : [],
    faqQuestions: Array.isArray(o.faqQuestions) ? o.faqQuestions : [],
  };
}

export async function generateBlogSeoBody(p: {
  lang: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  h1: string;
  sectionHeadings: string[];
  faqQuestions: string[];
  baseBody?: string;
}): Promise<{ sections: { heading: string; html: string; imagePrompt: string }[]; faq: { q: string; a: string }[] }> {
  const res = await fetch(`${BASE}/api/marketing/blog-seo-body`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `본문 생성 실패: ${res.status}`);
  const sections = Array.isArray(b.sections) ? b.sections : [];
  const faq = Array.isArray(b.faq) ? b.faq : [];
  return {
    sections: sections.map((s: Record<string, unknown>) => ({
      heading: String(s.heading ?? ''), html: String(s.html ?? ''), imagePrompt: String(s.imagePrompt ?? ''),
    })),
    faq: faq.map((f: Record<string, unknown>) => ({ q: String(f.q ?? ''), a: String(f.a ?? '') })),
  };
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/services/marketingArticleService.ts
git commit -m "feat(marketing): SEO 블로그 아웃라인/본문 생성 서비스 함수"
```

---

## Task 5: 점수 패널 컴포넌트

**Files:**
- Create: `v4/src/features/marketing/components/content/BlogSeoScorePanel.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// src/features/marketing/components/content/BlogSeoScorePanel.tsx
// 구글 SEO 점수 결과 표시 + 약한 항목 'AI 수정' 트리거.
import type { SeoResult, SeoDetail } from '../../utils/googleSeoScorer';

const ACCENT = '#4A2D6B';
const COLOR: Record<SeoDetail['status'], string> = {
  good: 'text-green-600 bg-green-50',
  warn: 'text-amber-700 bg-amber-50',
  bad: 'text-red-600 bg-red-50',
};

interface Props {
  result: SeoResult;
  onFix?: (detail: SeoDetail) => void;
  fixing?: string | null;
}

export function BlogSeoScorePanel({ result, onFix, fixing }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold" style={{ color: ACCENT }}>{result.score}<span className="text-sm text-gray-400">/{result.max}</span></div>
        <div className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-bold text-gray-700">등급 {result.grade}</div>
      </div>
      <div className="space-y-1.5">
        {result.details.map((dt) => (
          <div key={dt.label} className="flex items-center gap-2 text-xs">
            <span className={`w-16 shrink-0 rounded px-1.5 py-0.5 text-center font-semibold ${COLOR[dt.status]}`}>{dt.score}/{dt.max}</span>
            <span className="w-24 shrink-0 font-medium text-gray-700">{dt.label}</span>
            <span className="flex-1 text-gray-500">{dt.msg}</span>
            {onFix && dt.status !== 'good' && (
              <button
                type="button"
                onClick={() => onFix(dt)}
                disabled={!!fixing}
                className="shrink-0 rounded border border-gray-300 px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {fixing === dt.label ? '수정 중…' : 'AI 수정'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/BlogSeoScorePanel.tsx
git commit -m "feat(marketing): SEO 점수 패널 컴포넌트"
```

---

## Task 6: 편집 캔버스 컴포넌트 (BlogSeoEditor)

기존 `BlogSeoPanel`의 편집 UI(메타/섹션/FAQ)를 언어탭 없는 순수 편집 컴포넌트로 분리한다. 상태/저장은 부모(BlogWizard)가 소유하고, 이 컴포넌트는 표시+콜백만 한다.

**Files:**
- Create: `v4/src/features/marketing/components/content/BlogSeoEditor.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`ImageDropzone`는 기존 컴포넌트(`./ImageDropzone`, props: `url/alt/onUploaded/onClear/aspectRatio`). `mode='structure'`면 섹션 본문 HTML·이미지·FAQ 답변을 숨기고 제목/메타/섹션제목/FAQ질문만 편집.

```tsx
// src/features/marketing/components/content/BlogSeoEditor.tsx
// 메타 + 섹션 + FAQ 편집 캔버스. 언어탭 없음(최상단 셀렉터가 언어 담당).
// 상태/저장은 부모가 소유 — 여기서는 값 표시 + 변경 콜백만.
import type { BlogSeoArticle, BlogSeoSection } from '../../types';
import { ImageDropzone } from './ImageDropzone';

const inputCls = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none';
const labelCls = 'text-xs font-semibold text-gray-500';

interface Props {
  data: BlogSeoArticle;
  mode: 'structure' | 'full';
  onPatch: (p: Partial<BlogSeoArticle>) => void;
  onPatchSection: (i: number, p: Partial<BlogSeoSection>) => void;
  onAddSection: () => void;
  onRemoveSection: (i: number) => void;
  onCopyPrompt?: (i: number, prompt: string) => void;
  copiedKey?: string | null;
}

export function BlogSeoEditor({ data, mode, onPatch, onPatchSection, onAddSection, onRemoveSection, onCopyPrompt, copiedKey }: Props) {
  const full = mode === 'full';
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* SEO 메타 */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-bold text-[#4A2D6B]">SEO 메타</div>
        <div>
          <span className={labelCls}>SEO 제목 <span className="text-gray-300">({data.seoTitle.length}자)</span></span>
          <input className={inputCls} value={data.seoTitle} onChange={(e) => onPatch({ seoTitle: e.target.value })} />
        </div>
        <div>
          <span className={labelCls}>Slug</span>
          <input className={`${inputCls} font-mono`} value={data.slug} onChange={(e) => onPatch({ slug: e.target.value })} />
        </div>
        <div>
          <span className={labelCls}>메타 설명 <span className="text-gray-300">({data.metaDescription.length}자)</span></span>
          <textarea className={inputCls} rows={2} value={data.metaDescription} onChange={(e) => onPatch({ metaDescription: e.target.value })} />
        </div>
        <div>
          <span className={labelCls}>H1</span>
          <input className={inputCls} value={data.h1} onChange={(e) => onPatch({ h1: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={labelCls}>Primary 키워드</span>
            <input className={inputCls} value={data.primaryKeyword} onChange={(e) => onPatch({ primaryKeyword: e.target.value })} />
          </div>
          <div>
            <span className={labelCls}>Secondary (쉼표 구분)</span>
            <input className={inputCls} value={data.secondaryKeywords.join(', ')}
              onChange={(e) => onPatch({ secondaryKeywords: e.target.value.split(',').map((s) => s.trim()) })} />
          </div>
        </div>
      </div>

      {/* 섹션 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-[#4A2D6B]">섹션 ({data.sections.length})</div>
        <button type="button" onClick={onAddSection} className="rounded border border-gray-300 px-2 py-0.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">+ 섹션</button>
      </div>
      {data.sections.map((s, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#4A2D6B] px-2 py-0.5 text-[11px] font-bold text-white">#{i + 1}</span>
            <input className={`${inputCls} font-semibold`} value={s.heading}
              onChange={(e) => onPatchSection(i, { heading: e.target.value })} placeholder="소제목 (H2)" />
            <button type="button" onClick={() => onRemoveSection(i)} className="shrink-0 rounded border border-gray-200 px-1.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500">삭제</button>
          </div>

          {full && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="sm:w-56 shrink-0">
                <ImageDropzone url={s.imageUrl} alt={s.heading}
                  onUploaded={(u) => onPatchSection(i, { imageUrl: u })}
                  onClear={() => onPatchSection(i, { imageUrl: null })} aspectRatio="16/9" />
                <div className="mt-1 flex items-start gap-1">
                  <p className="flex-1 text-[11px] leading-snug text-gray-400">🎨 {s.imagePrompt}</p>
                  {onCopyPrompt && (
                    <button type="button" onClick={() => onCopyPrompt(i, s.imagePrompt)}
                      className="shrink-0 rounded border border-gray-200 px-1.5 text-[10px] text-gray-500 hover:bg-gray-100">
                      {copiedKey === `p${i}` ? '✓' : '복사'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="prose prose-sm max-w-none rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: s.html }} />
                <textarea className={`${inputCls} font-mono text-xs`} rows={5} value={s.html}
                  onChange={(e) => onPatchSection(i, { html: e.target.value })} placeholder="본문 HTML" />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* FAQ */}
      {data.faq.length > 0 && (
        <>
          <div className="text-sm font-bold text-[#4A2D6B]">FAQ ({data.faq.length})</div>
          {data.faq.map((f, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
              <input className={`${inputCls} font-semibold`} value={f.q}
                onChange={(e) => onPatch({ faq: data.faq.map((x, idx) => (idx === i ? { ...x, q: e.target.value } : x)) })} placeholder="질문" />
              {full && (
                <textarea className={inputCls} rows={2} value={f.a}
                  onChange={(e) => onPatch({ faq: data.faq.map((x, idx) => (idx === i ? { ...x, a: e.target.value } : x)) })} placeholder="답변" />
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음(이 시점엔 아직 어디서도 import 안 해도 무방 — 컴포넌트 자체 타입만 검증).

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/BlogSeoEditor.tsx
git commit -m "feat(marketing): SEO 블로그 편집 캔버스(BlogSeoEditor)"
```

---

## Task 7: 통합 위저드 (BlogWizard)

**Files:**
- Create: `v4/src/features/marketing/components/content/BlogWizard.tsx`

- [ ] **Step 1: 컴포넌트 작성**

상태/저장(`saveBlogSeo`)·생성(`generateBlogSeoOutline`/`generateBlogSeoBody`)·수정(`rewriteSelection`)·점수(`scoreArticle`)를 모두 소유. 언어는 props `language`. 5단계 스텝바.

```tsx
// src/features/marketing/components/content/BlogWizard.tsx
// 통합 블로그 위저드: 키워드 → AI 아웃라인 → AI 본문 → 구글 SEO 점수 → AI 수정.
// 단일 소스 marketing_articles.blog[lang] (migration 045). 언어는 최상단 셀렉터(props).
import { useEffect, useRef, useState } from 'react';
import type { MarketingArticle, BlogSeoArticle, BlogSeoMap, BlogSeoSection } from '../../types';
import { saveBlogSeo, generateBlogSeoOutline, generateBlogSeoBody, rewriteSelection } from '../../services/marketingArticleService';
import { uploadImageFile } from '../../services/aiImageService';
import { scoreArticle, type SeoDetail } from '../../utils/googleSeoScorer';
import { BlogSeoEditor } from './BlogSeoEditor';
import { BlogSeoScorePanel } from './BlogSeoScorePanel';

const ACCENT = '#4A2D6B';
type Step = 1 | 2 | 3 | 4 | 5;
const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: '키워드' }, { n: 2, label: '구조' }, { n: 3, label: '글쓰기' }, { n: 4, label: 'SEO 점수' }, { n: 5, label: '수정' },
];

function emptyArticle(): BlogSeoArticle {
  return { seoTitle: '', slug: '', metaDescription: '', h1: '', primaryKeyword: '', secondaryKeywords: [], sections: [], faq: [] };
}
function emptySection(heading = ''): BlogSeoSection {
  return { heading, html: '', imagePrompt: '', imageUrl: null };
}

export function BlogWizard({ article, language }: { article: MarketingArticle; language: string }) {
  const [blog, setBlog] = useState<BlogSeoMap>(article.blog ?? {});
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [bulk, setBulk] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setBlog(article.blog ?? {}); setStep(1); }, [article.id, article.blog]);
  // language 전환 시 데이터 유효성만 유지(데이터는 blog[language]).
  const cur = blog[language];

  const queueSave = (next: BlogSeoMap) => {
    setBlog(next); setErr(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { await saveBlogSeo(article.id, next); setSavedAt(true); setTimeout(() => setSavedAt(false), 1500); }
      catch (e) { setErr(e instanceof Error ? e.message : '저장 실패'); }
    }, 700);
  };
  const patch = (p: Partial<BlogSeoArticle>) => queueSave({ ...blog, [language]: { ...(cur ?? emptyArticle()), ...p } });
  const patchSection = (i: number, p: Partial<BlogSeoSection>) => {
    if (!cur) return;
    patch({ sections: cur.sections.map((s, idx) => (idx === i ? { ...s, ...p } : s)) });
  };
  const addSection = () => patch({ sections: [...(cur?.sections ?? []), emptySection()] });
  const removeSection = (i: number) => cur && patch({ sections: cur.sections.filter((_, idx) => idx !== i) });

  const seedKeyword = (article.keywords ?? [])[0] ?? '';
  const seedSecondary = (article.keywords ?? []).slice(1);

  const runOutline = async () => {
    const base = cur ?? emptyArticle();
    if (!base.primaryKeyword.trim()) { setErr('먼저 primary 키워드를 입력하세요.'); return; }
    setBusy('outline'); setErr(null);
    try {
      const o = await generateBlogSeoOutline({
        lang: language, primaryKeyword: base.primaryKeyword, secondaryKeywords: base.secondaryKeywords,
        topicTitle: article.title, baseBody: article.body || undefined,
      });
      patch({
        seoTitle: o.seoTitle, slug: o.slug, metaDescription: o.metaDescription, h1: o.h1,
        sections: o.sectionHeadings.map((h) => emptySection(h)),
        faq: o.faqQuestions.map((q) => ({ q, a: '' })),
      });
      setStep(2);
    } catch (e) { setErr(e instanceof Error ? e.message : '아웃라인 생성 실패'); }
    finally { setBusy(null); }
  };

  const runBody = async () => {
    if (!cur || cur.sections.length === 0) { setErr('먼저 구조(섹션 제목)를 만드세요.'); return; }
    setBusy('body'); setErr(null);
    try {
      const r = await generateBlogSeoBody({
        lang: language, primaryKeyword: cur.primaryKeyword, secondaryKeywords: cur.secondaryKeywords,
        seoTitle: cur.seoTitle, h1: cur.h1,
        sectionHeadings: cur.sections.map((s) => s.heading),
        faqQuestions: cur.faq.map((f) => f.q),
        baseBody: article.body || undefined,
      });
      // 제목 매칭으로 본문 머지(개수가 어긋나도 안전).
      const sections = cur.sections.map((s, i) => {
        const g = r.sections[i];
        return g ? { ...s, html: g.html, imagePrompt: g.imagePrompt } : s;
      });
      const faq = cur.faq.map((f, i) => (r.faq[i] ? { q: f.q, a: r.faq[i].a } : f));
      patch({ sections, faq });
    } catch (e) { setErr(e instanceof Error ? e.message : '본문 생성 실패'); }
    finally { setBusy(null); }
  };

  const fixWeak = async (dt: SeoDetail) => {
    if (!cur) return;
    // 섹션 본문 약점은 첫 섹션을 재작성, 그 외(메타/제목)는 안내만.
    const weakSectionIdx = cur.sections.findIndex((s) => stripLen(s.html) > 0);
    if (['구조화', '키워드 사용', '첫 문단'].includes(dt.label) && weakSectionIdx >= 0) {
      setFixing(dt.label); setErr(null);
      try {
        const html = await rewriteSelection({
          selection: cur.sections[weakSectionIdx].html,
          instruction: `구글 SEO 개선: '${dt.label}' 항목. ${dt.msg}. 핵심 키워드 '${cur.primaryKeyword}'를 자연스럽게 본문에 포함하고 리스트(<ul>)를 활용. ${language}로.`,
        });
        patchSection(weakSectionIdx, { html });
      } catch (e) { setErr(e instanceof Error ? e.message : '수정 실패'); }
      finally { setFixing(null); }
    } else {
      setErr(`'${dt.label}'은(는) 위 메타 필드에서 직접 보완하세요: ${dt.msg}`);
    }
  };

  const onBulkUpload = async (files?: FileList | null) => {
    if (!files || !files.length || !cur) return;
    const arr = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const count = Math.min(arr.length, cur.sections.length);
    setErr(null); let sections = cur.sections;
    for (let i = 0; i < count; i++) {
      setBulk(`${i + 1}/${count}`);
      try { const url = await uploadImageFile(arr[i]); sections = sections.map((s, idx) => (idx === i ? { ...s, imageUrl: url } : s)); patch({ sections }); }
      catch (e) { setErr(`#${i + 1} 업로드 실패: ${e instanceof Error ? e.message : ''}`); }
    }
    setBulk(null);
  };

  const onCopyPrompt = (i: number, prompt: string) => {
    navigator.clipboard.writeText(prompt).then(() => { setCopied(`p${i}`); setTimeout(() => setCopied((c) => (c === `p${i}` ? null : c)), 1200); });
  };

  const result = cur ? scoreArticle(cur, language) : null;
  const btn = 'rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60';

  return (
    <div className="flex h-full flex-col">
      {/* 스텝바 */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-4 py-2">
        {STEPS.map((s) => (
          <button key={s.n} type="button" onClick={() => setStep(s.n)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${step === s.n ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            style={step === s.n ? { backgroundColor: ACCENT } : undefined}>
            {s.n}. {s.label}
          </button>
        ))}
        <div className="flex-1" />
        {savedAt && <span className="text-xs text-green-600">✓ 저장됨</span>}
        {cur && step >= 3 && (
          <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            🖼 이미지 일괄 업로드
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onBulkUpload(e.target.files)} />
          </label>
        )}
      </div>

      {err && <div className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-600">{err}</div>}
      {bulk && <div className="shrink-0 bg-blue-50 px-4 py-2 text-xs text-blue-700">업로드 중… {bulk}</div>}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Step 1: 키워드 */}
        {step === 1 && (
          <div className="mx-auto max-w-xl space-y-4">
            <div>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Primary 키워드</span>
              <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={cur?.primaryKeyword ?? ''}
                onChange={(e) => patch({ primaryKeyword: e.target.value })} placeholder={seedKeyword || '예: 소아 성장'} />
            </div>
            <div>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Secondary 키워드 (쉼표 구분)</span>
              <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={(cur?.secondaryKeywords ?? []).join(', ')}
                onChange={(e) => patch({ secondaryKeywords: e.target.value.split(',').map((s) => s.trim()) })} placeholder={seedSecondary.join(', ') || '예: 키 크는 법, 성장판'} />
            </div>
            {seedKeyword && !cur?.primaryKeyword && (
              <button type="button" onClick={() => patch({ primaryKeyword: seedKeyword, secondaryKeywords: seedSecondary })}
                className="text-xs text-[#4A2D6B] underline">기본글 키워드 가져오기</button>
            )}
            <div><button type="button" onClick={runOutline} disabled={busy === 'outline'} className={btn} style={{ backgroundColor: ACCENT }}>
              {busy === 'outline' ? '생성 중…' : '✨ AI 아웃라인 생성'}</button></div>
          </div>
        )}

        {/* Step 2: 구조 */}
        {step === 2 && (
          <div className="space-y-4">
            <button type="button" onClick={runOutline} disabled={busy === 'outline'} className={btn} style={{ backgroundColor: ACCENT }}>
              {busy === 'outline' ? '생성 중…' : '✨ AI 아웃라인 재생성'}</button>
            {cur ? <BlogSeoEditor data={cur} mode="structure" onPatch={patch} onPatchSection={patchSection} onAddSection={addSection} onRemoveSection={removeSection} />
              : <p className="text-sm text-gray-400">키워드 단계에서 아웃라인을 먼저 생성하세요.</p>}
          </div>
        )}

        {/* Step 3: 글쓰기 */}
        {step === 3 && (
          <div className="space-y-4">
            <button type="button" onClick={runBody} disabled={busy === 'body'} className={btn} style={{ backgroundColor: ACCENT }}>
              {busy === 'body' ? '생성 중… (수십 초)' : '✨ AI 본문 생성'}</button>
            {cur ? <BlogSeoEditor data={cur} mode="full" onPatch={patch} onPatchSection={patchSection} onAddSection={addSection} onRemoveSection={removeSection} onCopyPrompt={onCopyPrompt} copiedKey={copied} />
              : <p className="text-sm text-gray-400">구조를 먼저 만드세요.</p>}
          </div>
        )}

        {/* Step 4: 점수 */}
        {step === 4 && (
          <div className="mx-auto max-w-3xl space-y-4">
            {result ? <BlogSeoScorePanel result={result} /> : <p className="text-sm text-gray-400">글이 없습니다.</p>}
          </div>
        )}

        {/* Step 5: 수정 */}
        {step === 5 && (
          <div className="mx-auto max-w-3xl space-y-4">
            {result ? <BlogSeoScorePanel result={result} onFix={fixWeak} fixing={fixing} /> : <p className="text-sm text-gray-400">글이 없습니다.</p>}
            {cur && <BlogSeoEditor data={cur} mode="full" onPatch={patch} onPatchSection={patchSection} onAddSection={addSection} onRemoveSection={removeSection} onCopyPrompt={onCopyPrompt} copiedKey={copied} />}
          </div>
        )}
      </div>
    </div>
  );
}

function stripLen(html: string): number {
  return String(html || '').replace(/<[^>]*>/g, '').trim().length;
}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음. (`aiImageService`의 `uploadImageFile`는 기존 `BlogSeoPanel`이 쓰던 것과 동일 export.)

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/BlogWizard.tsx
git commit -m "feat(marketing): 통합 블로그 위저드(5단계)"
```

---

## Task 8: ContentTabs 연결 (탭 3개)

**Files:**
- Modify: `v4/src/features/marketing/components/content/ContentTabs.tsx`

- [ ] **Step 1: import·탭·렌더 교체**

`BlogSeoPanel`/`BlogPanel` import 를 제거하고 `BlogWizard` 추가. `Tab` 타입에서 `blogseo`·`blog` 중 `blog`만 남김. 탭 배열·렌더·`contentKind` 갱신.

`import` 라인(5~8):
```tsx
import { BaseArticlePanel } from './BaseArticlePanel';
import { BlogWizard } from './BlogWizard';
import { CardNewsPanel } from './CardNewsPanel';
import { PublishDialog } from './PublishDialog';
```

`Tab` 타입(14):
```tsx
type Tab = 'base' | 'blog' | 'cardnews';
```

`contentKind`(25):
```tsx
const contentKind: ContentKind = tab === 'blog' ? 'blog' : tab === 'cardnews' ? 'cardnews' : 'post';
```

탭 배열(33~38):
```tsx
const tabs: { key: Tab; label: string }[] = [
  { key: 'base', label: '기본글' },
  { key: 'blog', label: '블로그' },
  { key: 'cardnews', label: '카드뉴스' },
];
```

탭 본문(77~85):
```tsx
{tab === 'base' ? (
  <BaseArticlePanel article={article} language={language} onSaved={onSaved} />
) : tab === 'blog' ? (
  <BlogWizard article={article} language={language} />
) : (
  <CardNewsPanel article={article} />
)}
```

- [ ] **Step 2: 타입체크**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음. (이 시점에 `BlogPanel`/`BlogSeoPanel`은 아직 파일로 존재하지만 미import — 다음 태스크에서 삭제.)

- [ ] **Step 3: Commit**

```bash
git add v4/src/features/marketing/components/content/ContentTabs.tsx
git commit -m "feat(marketing): 콘텐츠 탭 3개로 통합(블로그 위저드 연결)"
```

---

## Task 9: 네이버 코드·타입 폐기

**Files:**
- Delete: `BlogPanel.tsx`, `BlogSeoPanel.tsx`, `BlogCardItem.tsx`, `SeoScorePanel.tsx`, `WorkflowStepBar.tsx`, `blogChannelService.ts`, `seoScorer.ts`
- Modify: `v4/src/features/marketing/types.ts` (네이버 전용 타입 제거)

- [ ] **Step 1: 파일 삭제**

```bash
cd v4
rm src/features/marketing/components/content/BlogPanel.tsx
rm src/features/marketing/components/content/BlogSeoPanel.tsx
rm src/features/marketing/components/content/BlogCardItem.tsx
rm src/features/marketing/components/content/SeoScorePanel.tsx
rm src/features/marketing/components/content/WorkflowStepBar.tsx
rm src/features/marketing/services/blogChannelService.ts
rm src/features/marketing/utils/seoScorer.ts
```

- [ ] **Step 2: types.ts 에서 네이버 전용 타입 제거**

`v4/src/features/marketing/types.ts:132~` 의 `// ── Channel content (Phase 2+) ──` 블록 전체(`BlogChannel`, `BlogCardType`, `GlobalCardStyle`, `BlogCardContent`, `BlogCard`, `BlogContent`)를 삭제한다. `BlogSeo*` 타입(87~109)은 유지.

- [ ] **Step 3: 잔존 참조 확인**

Run: `cd v4 && npx tsc --noEmit`
Expected: 에러 없음. 만약 `BlogContent`/`BlogCard`/`GlobalCardStyle` 등 미해결 참조가 뜨면 해당 import 를 찾아 제거(설계상 BlogPanel 계열 외 참조 없음 — Task 시작 전 grep으로 확인됨).

- [ ] **Step 4: 사용 안 하는 import 정리 확인**

Run: `cd v4 && npm run lint`
Expected: 신규/수정 파일에 unused import 경고 없음. (경고 있으면 제거.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(marketing): 네이버 블로그 카드 코드·점수기·타입 폐기"
```

---

## Task 10: 통합 검증 (타입·테스트·dev)

**Files:** (없음 — 검증/회귀)

- [ ] **Step 1: 전체 타입체크 + 단위테스트**

Run: `cd v4 && npx tsc --noEmit && node --import tsx --test scripts/test/google-seo-scorer.test.mjs`
Expected: 타입 에러 0, 테스트 PASS.

- [ ] **Step 2: ai-server 타입체크**

Run: `cd ai-server && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: dev 동작 확인 (preview 워크플로우)**

ai-server(`cd ai-server && npm run dev`) + v4(`cd v4 && npm run dev`) 기동 후 preview 도구로 `/marketing/content` 접속(PIN `8054`).
- 탭이 `기본글 / 블로그 / 카드뉴스` 3개인지 확인(`블로그(SEO)` 없음).
- 콘텐츠 1개 선택 → 최상단 언어 ko → **블로그** 탭:
  - 기존 248편 중 하나면: Step 3에서 섹션 본문이 보이고, Step 4 점수가 계산됨(생성 없이).
  - 빈 글이면: Step 1 키워드 입력 → `AI 아웃라인 생성`. **Gemini 키 만료 상태면** 빨간 에러 배너(graceful 게이트)까지 확인.
- 언어 탭을 th 로 바꾸면 `blog['th']` 데이터로 전환되는지 확인(블로그 탭 안에 중첩 언어탭 없음).
- 회귀: `기본글`·`카드뉴스` 탭 정상, `📥 발행 큐에 넣기` → PublishDialog 정상(contentKind 'blog').

console/네트워크 오류는 preview_console_logs / preview_network 로 확인. UI 증거는 preview_screenshot.

- [ ] **Step 4: Commit (필요 시)**

검증 중 수정이 있었다면 커밋. 없으면 skip.

---

## Self-Review (작성자 체크 결과)

- **Spec coverage:** 탭 통합(Task 8) · 언어 일원화(Task 7,8 — props language, 중첩탭 제거는 BlogSeoPanel 삭제로 달성) · 5단계 위저드(Task 7) · AI 생성 엔드포인트(Task 1,2) · 점수기 포팅(Task 3) · 서비스 함수(Task 4) · 점수 패널(Task 5) · 편집 캔버스(Task 6) · 네이버 폐기(Task 9) · 발행 무변경(Task 10 회귀) — 전부 매핑됨.
- **Placeholder scan:** 모든 코드 스텝에 완전한 코드 포함. "적절히 처리" 류 없음.
- **Type consistency:** `BlogSeoArticle`/`BlogSeoSection`/`BlogSeoMap`(types.ts 기존) · `SeoResult`/`SeoDetail`(Task 3) · `generateBlogSeoOutline`/`generateBlogSeoBody`(Task 4) · `BlogWizard({article, language})`/`BlogSeoEditor` props/`BlogSeoScorePanel` props — 태스크 간 시그니처 일치 확인.
- **개선 메모:** `fixWeak`의 약점→섹션 매핑은 휴리스틱(메타 약점은 안내). 추후 전용 improve 엔드포인트로 고도화 가능(스펙 "후속" 항목).
