# SEO 블로그 하루 1개 자동 발행 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `marketing_articles.blog[lang]`(SEO 위저드 블로그)을 그대로 `blog_published`로 변환해 발행하고, 준비된 토픽을 하루 1개씩(ko+th 동시) 자동 예약 → 발행 후 v4 정적 사이트를 Railway API로 자동 재배포한다.

**Architecture:** 미리보기(`BlogPreviewModal`)가 쓰던 HTML 조립 로직을 순수 모듈(`blogHtml.ts`)로 추출해 미리보기·발행이 단일 소스를 공유. `buildPublishedBlog`가 `blog[lang]`을 우선 사용하도록 교체(기본글 폴백 유지). 예약은 순수 선별/배정 로직(`blog-schedule.mjs`) + I/O 스크립트(`schedule-blog-publish.mjs`, tsx로 TS 재사용). 재배포는 `deployHook.ts`를 Railway GraphQL `serviceInstanceRedeploy`로 교체.

**Tech Stack:** TypeScript(v4/React, ai-server/Express), node:test + tsx, Supabase(txirmof, anon/service_role), Railway GraphQL API.

**Spec:** `docs/superpowers/specs/2026-06-15-seo-blog-daily-publish-design.md`

**테스트 명령 요약:**
- v4 단위 테스트(특정): `cd v4 && node --import tsx --test scripts/test/<name>.test.mjs`
- v4 전체 테스트: `cd v4 && npm test`
- v4 타입 체크: `cd v4 && npx tsc -b --noEmit` (⚠️ plain `tsc --noEmit`은 solution tsconfig라 no-op)
- ai-server 빌드+테스트: `cd ai-server && npm run build && node --test dist/services/__tests__/<name>.test.js`

**커밋 규칙:** 각 커밋 메시지 끝에 다음 트레일러를 붙인다:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
(메인 브랜치 직접 작업 회피 — 실행 시작 시 feature 브랜치에서 작업.)

---

## File Structure

| 파일 | 역할 |
|---|---|
| `v4/src/features/marketing/utils/blogHtml.ts` (Create) | 순수 HTML 조립: `esc`, `buildBlogBodyHtml`, `buildBlogReferencesHtml`, `buildBlogHtmlBody`. 미리보기·발행 공용 |
| `v4/scripts/test/blogHtml.test.mjs` (Create) | blogHtml 순수 함수 테스트 |
| `v4/src/features/marketing/components/content/BlogPreviewModal.tsx` (Modify) | 자체 `esc/buildBody/buildReferences` 제거 → blogHtml import |
| `v4/src/features/marketing/utils/blogPublish.ts` (Modify) | `buildPublishedBlog`가 `blog[lang]` 우선, 기본글 폴백 |
| `v4/scripts/test/blogPublish.test.mjs` (Modify) | 기존 4개 유지 + SEO 경로 테스트 추가 |
| `ai-server/src/services/deployHook.ts` (Modify) | `buildRedeployRequest`(순수) + Railway redeploy `triggerDeploy` |
| `ai-server/src/services/__tests__/deployHook.test.ts` (Create) | `buildRedeployRequest` 테스트 |
| `v4/scripts/lib/blog-schedule.mjs` (Create) | 순수: `isLangReady`, `selectReadyTopics`, `buildScheduledAtIso`, `planSchedule` |
| `v4/scripts/test/blog-schedule.test.mjs` (Create) | 순수 스케줄 로직 테스트 |
| `v4/scripts/schedule-blog-publish.mjs` (Create) | I/O: 조회·선별·draft upsert·queue insert. `--dry-run` 등 |

---

## Chunk 1: 공유 HTML 조립 모듈 + 미리보기 리팩터

### Task 1: blogHtml.ts 순수 모듈

**Files:**
- Create: `v4/src/features/marketing/utils/blogHtml.ts`
- Test: `v4/scripts/test/blogHtml.test.mjs`

- [ ] **Step 1: 사전 확인 — 타입 필드명**

Read `v4/src/features/marketing/types.ts` 에서 `BlogSeoArticle`(sections/faq/seoTitle/slug/metaDescription/h1), `BlogSeoSection`(heading/html/imageUrl), `BlogReference`(title/journal/year/doi/url) 필드명 확인. (spec 4.1 기준과 일치해야)

- [ ] **Step 2: 실패 테스트 작성** — `v4/scripts/test/blogHtml.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, buildBlogBodyHtml, buildBlogReferencesHtml, buildBlogHtmlBody } from '../../src/features/marketing/utils/blogHtml.ts';

test('esc: 정적 빌드와 동일하게 작은따옴표까지 이스케이프', () => {
  assert.equal(esc(`<b>"a"&'b'</b>`), '&lt;b&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/b&gt;');
});

test('buildBlogBodyHtml: 섹션 제목 h2 + 이미지(lazy) + 본문 순서', () => {
  const a = { sections: [{ heading: '잠', html: '<p>충분히</p>', imageUrl: 'https://x/i.png' }], faq: [] };
  const html = buildBlogBodyHtml(a, 'ko');
  assert.match(html, /<h2>잠<\/h2>/);
  assert.match(html, /<img src="https:\/\/x\/i\.png" alt="잠" loading="lazy">/);
  assert.match(html, /<p>충분히<\/p>/);
  assert.ok(html.indexOf('<h2>') < html.indexOf('<img'));
  assert.ok(html.indexOf('<img') < html.indexOf('<p>충분히'));
});

test('buildBlogBodyHtml: imageUrl 없으면 img 생략', () => {
  const a = { sections: [{ heading: '키', html: '<p>x</p>', imageUrl: null }], faq: [] };
  assert.doesNotMatch(buildBlogBodyHtml(a, 'ko'), /<img/);
});

test('buildBlogBodyHtml: FAQ 있으면 section.post-faq 렌더', () => {
  const a = { sections: [{ heading: 'h', html: '<p>b</p>', imageUrl: null }], faq: [{ q: '몇 살부터?', a: '8세' }] };
  const html = buildBlogBodyHtml(a, 'ko');
  assert.match(html, /post-faq/);
  assert.match(html, /<h3>몇 살부터\?<\/h3><p>8세<\/p>/);
});

test('buildBlogReferencesHtml: 빈 배열이면 빈 문자열(inert)', () => {
  assert.equal(buildBlogReferencesHtml([], 'ko'), '');
});

test('buildBlogReferencesHtml: 제목·저널·PubMed·DOI 링크', () => {
  const refs = [{ title: 'Sleep & growth', journal: 'Pediatrics', year: 2020, url: 'https://pubmed/1', doi: '10.1/x' }];
  const html = buildBlogReferencesHtml(refs, 'ko');
  assert.match(html, /참고문헌/);
  assert.match(html, /Sleep &amp; growth/);
  assert.match(html, /href="https:\/\/pubmed\/1"/);
  assert.match(html, /href="https:\/\/doi\.org\/10\.1\/x"/);
});

test('buildBlogHtmlBody: 본문 + 참고문헌 결합', () => {
  const a = { sections: [{ heading: 'h', html: '<p>b</p>', imageUrl: null }], faq: [] };
  const refs = [{ title: 'T', journal: 'J', year: 2021, url: 'https://p/1', doi: null }];
  const html = buildBlogHtmlBody(a, refs, 'ko');
  assert.ok(html.indexOf('<p>b</p>') < html.indexOf('post-references'));
});
```

- [ ] **Step 3: 실패 확인**

Run: `cd v4 && node --import tsx --test scripts/test/blogHtml.test.mjs`
Expected: FAIL (Cannot find module blogHtml.ts)

- [ ] **Step 4: 구현** — `v4/src/features/marketing/utils/blogHtml.ts`

```ts
// SEO 블로그(blog[lang])를 발행/미리보기 공용 본문 HTML로 조립하는 순수 함수.
// 결과는 blog_published.html_body 에 그대로 들어가는 "본문 조각"(페이지 <html> 래퍼 제외 —
// 래퍼·head·CSS·제목·CTA는 정적 빌드 blog-post.html 템플릿이 담당).
import type { BlogSeoArticle, BlogReference } from '../types';

const FAQ_HEADING: Record<string, string> = {
  ko: '자주 묻는 질문', en: 'FAQ', th: 'คำถามที่พบบ่อย', vi: 'Câu hỏi thường gặp', ch: '常見問題', cn: '常见问题',
};
// 발행 blog.mjs renderReferencesHtml 의 REF_HEADINGS 와 동일(6언어).
const REF_HEADING: Record<string, string> = {
  ko: '참고문헌', en: 'References', th: 'เอกสารอ้างอิง', vi: 'Tài liệu tham khảo', ch: '參考文獻', cn: '参考文献',
};

// 정적 빌드 blog.mjs 와 동일한 이스케이프(작은따옴표 포함) — 미리보기·발행·정적 렌더 마크업 일치.
export function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function buildBlogBodyHtml(a: BlogSeoArticle, lang: string): string {
  const sections = (a.sections ?? [])
    .map((s) => {
      const h = s.heading ? `<h2>${esc(s.heading)}</h2>` : '';
      const img = s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="${esc(s.heading)}" loading="lazy">` : '';
      const body = s.html && s.html.trim() ? s.html : '<p class="post-empty">(본문 비어 있음)</p>';
      return `${h}${img}${body}`;
    })
    .join('\n');
  const faqItems = (a.faq ?? []).filter((f) => f.q?.trim());
  const faq = faqItems.length
    ? `<section class="post-faq"><h2>${esc(FAQ_HEADING[lang] ?? 'FAQ')}</h2>${faqItems
        .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
        .join('')}</section>`
    : '';
  return (sections || '<p class="post-empty">아직 본문이 없습니다.</p>') + faq;
}

export function buildBlogReferencesHtml(references: BlogReference[], lang: string): string {
  if (!Array.isArray(references) || references.length === 0) return '';
  const heading = REF_HEADING[lang] ?? REF_HEADING.en;
  const items = references
    .map((r) => {
      const cite = [esc(r.title), [esc(r.journal), r.year ? esc(String(r.year)) : ''].filter(Boolean).join('. ')]
        .filter(Boolean)
        .join(' ');
      const links: string[] = [];
      if (r.url) links.push(`<a href="${esc(r.url)}" target="_blank" rel="noopener nofollow">PubMed</a>`);
      if (r.doi) links.push(`<a href="https://doi.org/${esc(r.doi)}" target="_blank" rel="noopener nofollow">DOI</a>`);
      const tail = links.length ? ` <span class="ref-links">${links.join(' · ')}</span>` : '';
      return `<li>${cite}.${tail}</li>`;
    })
    .join('');
  return `<section class="post-references"><h2 class="post-references-title">${esc(heading)}</h2><ol class="post-references-list">${items}</ol></section>`;
}

// blog_published.html_body 에 그대로 들어갈 본문(섹션+FAQ+참고문헌).
export function buildBlogHtmlBody(a: BlogSeoArticle, references: BlogReference[], lang: string): string {
  return buildBlogBodyHtml(a, lang) + buildBlogReferencesHtml(references, lang);
}
```

- [ ] **Step 5: 통과 확인**

Run: `cd v4 && node --import tsx --test scripts/test/blogHtml.test.mjs`
Expected: PASS (7 tests)

- [ ] **Step 6: 커밋**

```bash
git add v4/src/features/marketing/utils/blogHtml.ts v4/scripts/test/blogHtml.test.mjs
git commit -m "feat(marketing): blogHtml shared assembler for SEO blog (preview+publish single source)"
```

### Task 2: BlogPreviewModal이 공유 모듈 사용

**Files:**
- Modify: `v4/src/features/marketing/components/content/BlogPreviewModal.tsx`

- [ ] **Step 1: import 교체 + 자체 함수 제거**

`BlogPreviewModal.tsx` 에서:
- 추가: `import { buildBlogBodyHtml, buildBlogReferencesHtml } from '../../utils/blogHtml';`
- 제거: 파일 상단 로컬 `esc`(:13), `FAQ_HEADING`/`REF_HEADING` 상수(:9-11), `buildBody`(:44-60), `buildReferences`(:62-79). (PREVIEW_CSS·`buildHtml`·DEVICES·컴포넌트 본문은 유지)
- `buildHtml` 내부에서 `buildBody(a, lang)` → `buildBlogBodyHtml(a, lang)`, `buildReferences(references, lang)` → `buildBlogReferencesHtml(references, lang)` 로 교체.

`buildHtml` 결과는 동일 마크업이어야 한다(미리보기 회귀 0). 차이점: ① 빈 섹션 fallback 문구가 "아직 본문이 없습니다. 글쓰기 단계에서 작성하세요." → "아직 본문이 없습니다."(무해), ② FAQ heading 이 이제 `esc()` 적용(한/태국어엔 특수문자 없어 동일).

- [ ] **Step 2: 타입 체크**

Run: `cd v4 && npx tsc -b --noEmit`
Expected: PASS (에러 0)

- [ ] **Step 3: 미리보기 회귀 없음 수동 확인(선택)**

`buildHtml`이 참조하는 함수만 바뀌고 출력 구조 동일 — tsc 통과로 충분. (사용자 preview 검증은 생략: memory `preview_verification_preference`)

- [ ] **Step 4: 커밋**

```bash
git add v4/src/features/marketing/components/content/BlogPreviewModal.tsx
git commit -m "refactor(marketing): BlogPreviewModal uses shared blogHtml module"
```

---

## Chunk 2: 발행 어댑터

### Task 3: buildPublishedBlog — SEO 블로그 우선

**Files:**
- Modify: `v4/src/features/marketing/utils/blogPublish.ts`
- Test: `v4/scripts/test/blogPublish.test.mjs` (기존 4개 유지 + 추가)

- [ ] **Step 1: 실패 테스트 추가** — `blogPublish.test.mjs` 끝에 append

```js
test('SEO 블로그(blog[ko]) 있으면 그것으로 발행 — slug·메타·섹션·FAQ·참고문헌', () => {
  const a = {
    ...base, title: '폴백제목', body: '<p>fallback</p>', translations: {},
    blog: {
      ko: {
        seoTitle: '키 크는 수면 습관', slug: 'sleep-height-growth', metaDescription: '수면과 키',
        h1: '키와 수면', primaryKeyword: '수면', secondaryKeywords: [],
        sections: [{ heading: '깊은 잠', html: '<p>성장호르몬</p>', imagePrompt: '', imageUrl: 'https://x/s.png' }],
        faq: [{ q: '몇 시간?', a: '9시간' }],
      },
    },
    blogReferences: [{ pmid: '1', title: 'Sleep', journal: 'Peds', year: 2020, doi: null, url: 'https://p/1', similarity: 0.8 }],
  };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.slug, 'sleep-height-growth');           // SEO slug 그대로
  assert.equal(r.seoTitle, '키 크는 수면 습관');
  assert.equal(r.metaDescription, '수면과 키');
  assert.match(r.htmlBody, /<h2>깊은 잠<\/h2>/);
  assert.match(r.htmlBody, /성장호르몬/);
  assert.match(r.htmlBody, /post-faq/);
  assert.match(r.htmlBody, /post-references/);            // 참고문헌 포함
  assert.doesNotMatch(r.htmlBody, /fallback/);            // 기본글 본문 아님
});

test('SEO 블로그(blog[th]) 언어 분기', () => {
  const a = { ...base, title: 't', body: '', translations: {}, blog: {
    th: { seoTitle: 'TH', slug: 'th-slug', metaDescription: 'm', h1: 'H', primaryKeyword: '', secondaryKeywords: [],
      sections: [{ heading: 'H', html: '<p>เนื้อหา</p>', imagePrompt: '', imageUrl: 'https://x/t.png' }], faq: [] } },
    blogReferences: [] };
  const r = buildPublishedBlog(a, 'th');
  assert.equal(r.slug, 'th-slug');
  assert.match(r.htmlBody, /เนื้อหา/);
});

test('blog[lang] 없으면 기본글 폴백(회귀 없음)', () => {
  const a = { ...base, title: '키 크는 법', body: '<p>잘 자기</p>', translations: {}, blog: {} };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.htmlBody, '<p>잘 자기</p>');
  assert.equal(r.slug, '키-크는-법-abcdef12');
});

test('blog[lang].slug 비어있으면 slugify(title)-id 폴백', () => {
  const a = { ...base, title: 't', body: '', translations: {}, blog: {
    ko: { seoTitle: '제목있음', slug: '', metaDescription: 'm', h1: '', primaryKeyword: '', secondaryKeywords: [],
      sections: [{ heading: 'h', html: '<p>x</p>', imagePrompt: '', imageUrl: 'https://x/a.png' }], faq: [] } } };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.slug, '제목있음-abcdef12');
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd v4 && node --import tsx --test scripts/test/blogPublish.test.mjs`
Expected: FAIL (새 테스트들 — blog 무시하고 폴백 타서 slug/htmlBody 불일치)

- [ ] **Step 3: 구현** — `blogPublish.ts` 의 `buildPublishedBlog` 교체 (slugify/htmlToText 유지)

```ts
import type { MarketingArticle } from '../types';
import { buildBlogHtmlBody, buildBlogBodyHtml } from './blogHtml';

export interface PublishedBlogDraft {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  htmlBody: string;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildPublishedBlog(article: MarketingArticle, language: string): PublishedBlogDraft {
  const seo = article.blog?.[language as keyof NonNullable<typeof article.blog>];
  // SEO 블로그(섹션 또는 h1 존재) → 그것으로 발행
  if (seo && ((seo.sections?.length ?? 0) > 0 || seo.h1)) {
    const title = (seo.seoTitle || seo.h1 || article.title || '').trim();
    const slug = seo.slug?.trim() ? seo.slug.trim() : `${slugify(title) || 'post'}-${article.id.slice(0, 8)}`;
    const htmlBody = buildBlogHtmlBody(seo, article.blogReferences ?? [], language);
    const metaDescription = (seo.metaDescription?.trim() || htmlToText(buildBlogBodyHtml(seo, language))).slice(0, 155);
    return { slug, seoTitle: title, metaDescription, htmlBody };
  }
  // 폴백: 기존 기본글 본문(translations.body / master body)
  const isMaster = language === 'ko';
  const t = isMaster ? { title: article.title, body: article.body } : article.translations?.[language];
  const title = (t?.title || article.title || '').trim();
  const body = (t?.body || '').trim();
  if (!body) throw new Error(`${language} 본문이 비어 있어 발행할 수 없습니다.`);
  const slug = `${slugify(title) || 'post'}-${article.id.slice(0, 8)}`;
  return { slug, seoTitle: title, metaDescription: htmlToText(body).slice(0, 155), htmlBody: body };
}
```

- [ ] **Step 4: 통과 확인 (신규 + 기존 4개 모두)**

Run: `cd v4 && node --import tsx --test scripts/test/blogPublish.test.mjs`
Expected: PASS (기존 4 + 신규 4 = 8 tests). 특히 기존 "마스터(ko) 본문", "번역(th) 본문", "본문 비어있으면 throw"가 그대로 통과해야(blog 미존재 → 폴백).

- [ ] **Step 5: 타입 체크**

Run: `cd v4 && npx tsc -b --noEmit`
Expected: PASS. (만약 `article.blog` 인덱싱 타입 에러면 `BlogSeoMap` 키 타입에 맞춰 `language as BlogSeoLangCode` 캐스팅으로 조정 — 단 런타임은 임의 lang 허용해야 하니 `as keyof ...` 유지하고 옵셔널 체이닝)

- [ ] **Step 6: 커밋**

```bash
git add v4/src/features/marketing/utils/blogPublish.ts v4/scripts/test/blogPublish.test.mjs
git commit -m "feat(marketing): publish SEO blog (blog[lang]) with sections/images/FAQ/references, keep plain-body fallback"
```

---

## Chunk 3: Railway 재배포 (ai-server)

### Task 4: deployHook — Railway API redeploy

**Files:**
- Modify: `ai-server/src/services/deployHook.ts`
- Test: `ai-server/src/services/__tests__/deployHook.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `ai-server/src/services/__tests__/deployHook.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRedeployRequest } from '../deployHook.js';

test('buildRedeployRequest: Railway GraphQL endpoint + bearer + variables', () => {
  const r = buildRedeployRequest('tok123', 'svc-1', 'env-1');
  assert.equal(r.url, 'https://backboard.railway.com/graphql/v2');
  assert.equal(r.method, 'POST');
  assert.equal(r.headers.Authorization, 'Bearer tok123');
  assert.equal(r.headers['Content-Type'], 'application/json');
  const parsed = JSON.parse(r.body);
  assert.match(parsed.query, /serviceInstanceRedeploy/);
  assert.deepEqual(parsed.variables, { serviceId: 'svc-1', environmentId: 'env-1' });
});
```

- [ ] **Step 2: 실패 확인 (빌드 후)**

Run: `cd ai-server && npm run build && node --test dist/services/__tests__/deployHook.test.js`
Expected: FAIL (buildRedeployRequest export 없음 — 컴파일 또는 import 에러)

- [ ] **Step 3: 구현** — `ai-server/src/services/deployHook.ts` 전체 교체

```ts
// 블로그(자체 사이트) 발행 후 v4 정적 사이트 재배포 트리거.
// 1순위: Railway GraphQL serviceInstanceRedeploy (RAILWAY_API_TOKEN + V4_SERVICE_ID + V4_ENVIRONMENT_ID).
// 2순위(폴백): RAILWAY_DEPLOY_HOOK_URL 단순 POST. 둘 다 없으면 no-op(경고).
const RAILWAY_GRAPHQL = 'https://backboard.railway.com/graphql/v2';

export interface RedeployRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}

// 순수: Railway 재배포 GraphQL 요청 빌더.
export function buildRedeployRequest(token: string, serviceId: string, environmentId: string): RedeployRequest {
  const query =
    'mutation Redeploy($serviceId: String!, $environmentId: String!) { serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId) }';
  return {
    url: RAILWAY_GRAPHQL,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables: { serviceId, environmentId } }),
  };
}

export async function triggerDeploy(): Promise<void> {
  const token = process.env.RAILWAY_API_TOKEN;
  const serviceId = process.env.RAILWAY_V4_SERVICE_ID;
  const environmentId = process.env.RAILWAY_V4_ENVIRONMENT_ID;

  if (token && serviceId && environmentId) {
    try {
      const req = buildRedeployRequest(token, serviceId, environmentId);
      const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
      const json = (await res.json().catch(() => null)) as { errors?: unknown } | null;
      if (!res.ok || json?.errors) {
        console.warn('[deploy] Railway redeploy 실패:', res.status, JSON.stringify(json?.errors ?? ''));
      } else {
        console.log('[deploy] Railway v4 재배포 트리거됨');
      }
    } catch (e) {
      console.warn('[deploy] redeploy 오류:', e instanceof Error ? e.message : String(e));
    }
    return;
  }

  // 폴백: 단순 POST 훅
  const url = process.env.RAILWAY_DEPLOY_HOOK_URL;
  if (!url) {
    console.warn('[deploy] RAILWAY_API_TOKEN/V4_SERVICE_ID/V4_ENVIRONMENT_ID 또는 RAILWAY_DEPLOY_HOOK_URL 미설정 — 배포 트리거 skip');
    return;
  }
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) console.warn(`[deploy] hook 실패: ${res.status}`);
    else console.log('[deploy] 배포 훅 트리거됨');
  } catch (e) {
    console.warn('[deploy] hook 오류:', e instanceof Error ? e.message : String(e));
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd ai-server && npm run build && node --test dist/services/__tests__/deployHook.test.js`
Expected: PASS (1 test). 회귀 확인: `cd ai-server && npm run build && node --test dist/services/__tests__/scheduler.test.js` PASS (scheduler는 triggerDeploy를 동적 import만 하므로 영향 없음).

- [ ] **Step 5: 커밋**

```bash
git add ai-server/src/services/deployHook.ts ai-server/src/services/__tests__/deployHook.test.ts
git commit -m "feat(ai-server): deployHook triggers Railway serviceInstanceRedeploy (hook-url fallback)"
```

---

## Chunk 4: 하루 1개 예약 스크립트

### Task 5: blog-schedule.mjs 순수 로직

**Files:**
- Create: `v4/scripts/lib/blog-schedule.mjs`
- Test: `v4/scripts/test/blog-schedule.test.mjs`

- [ ] **Step 1: 실패 테스트 작성** — `v4/scripts/test/blog-schedule.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLangReady, selectReadyTopics, buildScheduledAtIso, planSchedule } from '../lib/blog-schedule.mjs';

const ready = { sections: [{ html: '<p>a</p>', imageUrl: 'u1' }, { html: '<p>b</p>', imageUrl: 'u2' }] };
const noImg = { sections: [{ html: '<p>a</p>', imageUrl: null }] };
const noHtml = { sections: [{ html: '  ', imageUrl: 'u' }] };
const empty = { sections: [] };

test('isLangReady: 모든 섹션 이미지+본문이면 true', () => {
  assert.equal(isLangReady(ready), true);
  assert.equal(isLangReady(noImg), false);
  assert.equal(isLangReady(noHtml), false);
  assert.equal(isLangReady(empty), false);
  assert.equal(isLangReady(undefined), false);
});

test('selectReadyTopics: 모든 대상 언어 준비된 토픽만, sortOrder 정렬', () => {
  const arts = [
    { id: 'b', sortOrder: 2, blog: { ko: ready, th: ready } },
    { id: 'a', sortOrder: 1, blog: { ko: ready, th: ready } },
    { id: 'c', sortOrder: 3, blog: { ko: ready, th: noImg } },   // th 미준비 → 제외
    { id: 'd', sortOrder: 4, blog: { ko: ready } },               // th 없음 → 제외
  ];
  assert.deepEqual(selectReadyTopics(arts, ['ko', 'th']).map((a) => a.id), ['a', 'b']);
});

test('buildScheduledAtIso: 09:00 KST(+540) = 00:00Z 같은 날', () => {
  assert.equal(buildScheduledAtIso('2026-06-16', '09:00', 540), '2026-06-16T00:00:00.000Z');
});

test('buildScheduledAtIso: 자정 KST 넘는 시각 처리', () => {
  // 00:30 KST = 전날 15:30 UTC
  assert.equal(buildScheduledAtIso('2026-06-16', '00:30', 540), '2026-06-15T15:30:00.000Z');
});

test('planSchedule: 하루 1토픽, skip 제외, 시작일부터 순차', () => {
  const topics = [{ id: 'a', sortOrder: 1 }, { id: 'b', sortOrder: 2 }, { id: 'c', sortOrder: 3 }];
  const plan = planSchedule(topics, { startDate: '2026-06-16', time: '09:00', tzOffsetMin: 540, skipArticleIds: new Set(['b']) });
  assert.deepEqual(plan, [
    { articleId: 'a', sortOrder: 1, scheduledAtIso: '2026-06-16T00:00:00.000Z' },
    { articleId: 'c', sortOrder: 3, scheduledAtIso: '2026-06-17T00:00:00.000Z' },
  ]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd v4 && node --import tsx --test scripts/test/blog-schedule.test.mjs`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현** — `v4/scripts/lib/blog-schedule.mjs`

```js
// 순수: 발행 준비 토픽 선별 + 하루 1개 날짜 배정. DB I/O 없음.

// blog[lang] 한 언어가 본문+이미지 모두 완료인지(blogCell 'complete' + 본문 공란 가드).
export function isLangReady(blogForLang) {
  if (!blogForLang) return false;
  const sections = blogForLang.sections ?? [];
  if (sections.length === 0) return false;
  return sections.every((s) => s.imageUrl && s.html && String(s.html).trim());
}

// 대상 언어 전부 준비된 토픽만, sortOrder asc.
export function selectReadyTopics(articles, langs) {
  return articles
    .filter((a) => langs.every((l) => isLangReady(a.blog?.[l])))
    .slice()
    .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0));
}

// 'YYYY-MM-DD' + 'HH:mm' (tz 분 오프셋, KST=540) → UTC ISO.
export function buildScheduledAtIso(dateStr, time, tzOffsetMin) {
  const [Y, Mo, D] = dateStr.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  const utcMs = Date.UTC(Y, Mo - 1, D, h, m) - tzOffsetMin * 60000;
  return new Date(utcMs).toISOString();
}

// 'YYYY-MM-DD' + n일 → 'YYYY-MM-DD'.
function addDays(dateStr, n) {
  const [Y, Mo, D] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(Y, Mo - 1, D + n));
  return d.toISOString().slice(0, 10);
}

// 준비 토픽에 하루 1개(기본) scheduled_at 배정. skipArticleIds 는 이미 예약/발행된 토픽.
export function planSchedule(readyTopics, { startDate, time = '09:00', tzOffsetMin = 540, perDay = 1, skipArticleIds = new Set() }) {
  const pending = readyTopics.filter((a) => !skipArticleIds.has(a.id));
  return pending.map((a, i) => ({
    articleId: a.id,
    sortOrder: a.sortOrder,
    scheduledAtIso: buildScheduledAtIso(addDays(startDate, Math.floor(i / perDay)), time, tzOffsetMin),
  }));
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd v4 && node --import tsx --test scripts/test/blog-schedule.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add v4/scripts/lib/blog-schedule.mjs v4/scripts/test/blog-schedule.test.mjs
git commit -m "feat(marketing): pure blog scheduling helpers (ready-topic select, daily date assignment)"
```

### Task 6: schedule-blog-publish.mjs (I/O 오케스트레이터)

**Files:**
- Create: `v4/scripts/schedule-blog-publish.mjs`

> 순수 로직(Task 5)·발행본 빌더(`buildPublishedBlog`, Task 3)는 import 재사용. 이 스크립트는 DB I/O·CLI·로그만. **단위 테스트 없음** — `--dry-run` 으로 수동 검증(Step 4).

- [ ] **Step 1: 사전 확인 — supabase row → article 매핑**

`v4/src/features/marketing/services/marketingArticleService.ts` 의 `rowToArticle` 을 Read 하여 snake→camel 매핑(특히 `blog`, `blog_references`→`blogReferences`, `sort_order`→`sortOrder`) 확인. 스크립트는 동일 매핑을 최소 필드로 재현(id, title, body, translations, blog, blogReferences, sortOrder).

- [ ] **Step 2: 구현** — `v4/scripts/schedule-blog-publish.mjs`

```js
// 준비된 SEO 블로그 토픽을 하루 1개(ko+th 동시)로 예약하는 스크립트.
// 실행: cd v4 && node --import tsx scripts/schedule-blog-publish.mjs [--dry-run] [--start YYYY-MM-DD] [--time HH:mm] [--langs ko,th] [--limit N] [--only 1,2,3]
//
// 동작: marketing_articles(kind='regular') 조회 → 준비 토픽 선별 → 이미 예약/발행된 토픽 skip
//   → 남은 토픽을 시작일부터 하루 1개씩 → 각 토픽 × 언어: blog_published(draft) upsert + marketing_publish_queue(scheduled) insert.
import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectReadyTopics, planSchedule } from './lib/blog-schedule.mjs';
import { buildPublishedBlog } from '../src/features/marketing/utils/blogPublish.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
if (typeof process.loadEnvFile === 'function') {
  for (const f of ['.env.local', '.env.production']) {
    try { process.loadEnvFile(join(ROOT, f)); } catch { /* optional */ }
  }
}

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const DRY = process.argv.includes('--dry-run');
const LANGS = arg('langs', 'ko,th').split(',').map((s) => s.trim()).filter(Boolean);
const TIME = arg('time', '09:00');
const LIMIT = arg('limit', null);
const ONLY = arg('only', null);
// 시작일 기본 = 내일(KST). process.argv 로만 결정(결정성). 미지정 시 today+1 (UTC 기준 날짜).
const START = arg('start', null);

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('SUPABASE URL/KEY 없음 (.env.local 확인)'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

function rowToArticle(r) {
  return {
    id: r.id, title: r.title ?? '', body: r.body ?? '',
    translations: r.translations ?? {}, blog: r.blog ?? {},
    blogReferences: r.blog_references ?? [], sortOrder: r.sort_order ?? 0,
  };
}

function defaultStart() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const startDate = START || defaultStart();
  // 1) articles
  const { data: rows, error } = await sb
    .from('marketing_articles')
    .select('id, title, body, translations, blog, blog_references, sort_order, kind')
    .eq('kind', 'regular')
    .order('sort_order', { ascending: true });
  if (error) { console.error('articles 조회 실패:', error.message); process.exit(1); }
  let articles = (rows ?? []).map(rowToArticle);
  if (ONLY) {
    const set = new Set(ONLY.split(',').map((s) => Number(s.trim())));
    articles = articles.filter((a) => set.has(a.sortOrder));
  }

  // 2) 준비 토픽
  let ready = selectReadyTopics(articles, LANGS);

  // 3) 이미 예약/발행된 토픽 skip (website 큐에 scheduled/publishing/published 가 있는 article)
  const { data: q } = await sb
    .from('marketing_publish_queue')
    .select('article_id, status')
    .eq('channel', 'website').eq('content_kind', 'blog')
    .in('status', ['scheduled', 'publishing', 'published']);
  const skip = new Set((q ?? []).map((x) => x.article_id));

  // 4) slug 충돌 검사 (대상 토픽 간, 언어별)
  const slugSeen = {};
  for (const a of ready) {
    if (skip.has(a.id)) continue;
    for (const l of LANGS) {
      try {
        const slug = buildPublishedBlog(a, l).slug;
        const k = `${l}:${slug}`;
        if (slugSeen[k]) { console.warn(`⚠ slug 충돌: ${k} (#${a.sortOrder} & #${slugSeen[k]})`); }
        else slugSeen[k] = a.sortOrder;
      } catch (e) { console.warn(`⚠ #${a.sortOrder} ${l} 빌드 실패: ${e.message}`); }
    }
  }

  // 5) 스케줄 배정
  let plan = planSchedule(ready, { startDate, time: TIME, skipArticleIds: skip });
  if (LIMIT) plan = plan.slice(0, Number(LIMIT));

  // 요약
  console.log(`\n시작일 ${startDate}, 매일 ${TIME} KST, 언어 [${LANGS.join(', ')}]`);
  console.log(`준비 토픽 ${ready.length} / 이미 처리 skip ${skip.size} / 예약 대상 ${plan.length}`);
  const byId = new Map(ready.map((a) => [a.id, a]));
  for (const p of plan) console.log(`  #${p.sortOrder} → ${p.scheduledAtIso}`);
  const notReady = articles.filter((a) => !ready.find((r) => r.id === a.id) && !skip.has(a.id));
  if (notReady.length) console.log(`  (이미지/본문 미완 ${notReady.length}: ${notReady.map((a) => '#' + a.sortOrder).join(', ')})`);

  if (DRY) { console.log('\n[dry-run] 쓰기 없음.'); return; }

  // 6) 실제 쓰기: 토픽 × 언어 → blog_published(draft) upsert + queue(scheduled) insert
  const now = new Date().toISOString();
  let okCount = 0;
  for (const p of plan) {
    const a = byId.get(p.articleId);
    for (const lang of LANGS) {
      let draft;
      try { draft = buildPublishedBlog(a, lang); }
      catch (e) { console.warn(`  skip #${p.sortOrder} ${lang}: ${e.message}`); continue; }
      const { error: e1 } = await sb.from('blog_published').upsert({
        article_id: a.id, language: lang, slug: draft.slug, seo_title: draft.seoTitle,
        meta_description: draft.metaDescription, html_body: draft.htmlBody, status: 'draft', updated_at: now,
      }, { onConflict: 'article_id,language' });
      if (e1) { console.warn(`  blog_published 실패 #${p.sortOrder} ${lang}: ${e1.message}`); continue; }
      const { error: e2 } = await sb.from('marketing_publish_queue').insert({
        article_id: a.id, channel: 'website', channel_id: null, language: lang,
        content_kind: 'blog', status: 'scheduled', scheduled_at: p.scheduledAtIso, updated_at: now,
      });
      if (e2) { console.warn(`  queue 실패 #${p.sortOrder} ${lang}: ${e2.message}`); continue; }
      okCount++;
    }
  }
  console.log(`\n완료: ${okCount}건 예약 (토픽 ${plan.length} × 언어 ${LANGS.length}).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: 사전 점검 — 실제 데이터 dry-run (검증의 일부, 안전)**

Run: `cd v4 && node --import tsx scripts/schedule-blog-publish.mjs --dry-run`
Expected: 준비 토픽 수(사용자 진술 "22번까지"와 대조)·예약 날짜 목록·미완 토픽 목록 출력. **쓰기 없음.** slug 충돌 경고 0 확인.

- [ ] **Step 4: 커밋**

```bash
git add v4/scripts/schedule-blog-publish.mjs
git commit -m "feat(marketing): schedule-blog-publish script — daily ko+th SEO blog scheduling (idempotent, --dry-run)"
```

---

## 통합 검증 (구현 후, 별도 — 실행 가이드)

> 코드 완료 후 실제 발행/배포를 켜기 전 점검. 이 plan의 task 외 운영 절차.

1. **전체 테스트·타입**: `cd v4 && npm test && npx tsc -b --noEmit` / `cd ai-server && npm run build && npm test` 모두 통과.
2. **데이터 실측**(dry-run): 준비 토픽 수가 기대(≈22)와 맞는지, slug 충돌 0.
3. **인프라(사용자 협조)**:
   - ai-server `/health` 라이브(프로덕션 URL).
   - ai-server 환경변수: `RAILWAY_API_TOKEN`/`RAILWAY_V4_SERVICE_ID`/`RAILWAY_V4_ENVIRONMENT_ID`, `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, `SCHEDULER_ENABLED`≠false.
   - v4 환경변수: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
4. **스모크 1건**: 가까운 시각으로 토픽 1개만 예약(`--only <n> --start <오늘> --time <곧>` 또는 DB에서 scheduled_at 임박 조정) → 스케줄러 발행 → `blog_published.status='published'` → Railway v4 재배포 로그 → `/{lang}/blog/{slug}/` 노출 + 미리보기와 동일 HTML 확인.
5. 정상 확인 후 본 예약(22토픽) 실행.

---

## Notes
- **DRY**: 미리보기·발행이 `blogHtml.ts` 단일 소스. 정적 빌드 `blog.mjs renderReferencesHtml` 와 마크업 동일(이스케이프 포함).
- **YAGNI**: vi/en·소셜·UI 버튼·unschedule(`--cancel`)은 비범위. 어댑터는 언어 무관이라 추후 `--langs vi,en` 만으로 확장.
- **idempotency**: 이미 website 큐에 scheduled/publishing/published 있는 토픽은 재실행 시 skip → 중복 예약/발행 없음. (draft-only 큐 행은 대상에 없으므로 영향 없음 — 큐는 항상 scheduled 로 새로 insert)
- **결정성**: 시작일 미지정 시 `today+1`(UTC 날짜) 자동 — 재현 필요 시 `--start` 명시.
