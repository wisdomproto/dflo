// ai-server/src/services/contentPrompts.ts
// Pure prompt builders for the Marketing Content Studio.
// Ported from ContentFlow's prompt-builder.ts (buildTopicSuggestionPrompt /
// buildBaseArticlePrompt / buildPartialRegenerationPrompt) and adapted onto
// dflo's ArticleConfig (DB snake_case marketing_config row).
//
// Base-article output is HTML so it can be loaded into a TipTap editor.
// All functions are pure (no I/O); they feed generateText(prompt) in gemini.ts.

import type { ArticleConfig } from './articleGenerator.js';

export interface BaseContentRequest {
  title: string;
  angle?: string;
  keywords?: string[];
  category?: string;
  language?: string;
}

export interface TopicRequest {
  count?: number;
  category?: string;
  seed?: string;
}

export interface RewriteRequest {
  selection: string;
  instruction?: string;
}

const DEFAULT_HTML_RULES = `1. 부모 눈높이에 맞는 쉽고 따뜻한 설명
2. 의학적 근거 + 실제 임상 경험 기반, 과장 금지 (의료 광고법 준수)
3. 1500~2500자 분량
4. 핵심 키워드를 본문에 3~5회 자연스럽게 반복 (SEO)
5. 소제목(h2)으로 3개 이상 구조화, 단락(p)은 모바일 가독성 위해 짧게
6. 마지막에 "본 글은 의학적 정보 제공을 목적으로 하며, 개인마다 차이가 있을 수 있습니다." 문구 포함`;

const DEFAULT_REWRITE_INSTRUCTION = '더 자연스럽고 읽기 쉽게';

/** 브랜드 + 화자(마케터) 컨텍스트 블록. base/topic 프롬프트가 공유. */
function brandBlock(c: ArticleConfig): string {
  const brand = c.brand_name?.trim() || '187 성장클리닉';
  const marketer = [c.marketer_name, c.marketer_expertise, c.marketer_style]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(' · ');

  return [
    `## 브랜드: ${brand}`,
    c.brand_description?.trim() || '',
    c.usp?.trim() ? `- 차별점: ${c.usp.trim()}` : '',
    c.brand_tone?.trim() ? `- 톤: ${c.brand_tone.trim()}` : '',
    marketer ? `## 화자(마케터)\n${marketer}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** code 로 카테고리를 찾아 "이름 — 컨텍스트" 문자열 반환 (없으면 null). */
function resolveCategory(c: ArticleConfig, code?: string): string | null {
  if (!code) return null;
  const cat = (c.blog_categories ?? []).find((x) => x.code === code);
  return cat ? `${cat.name} — ${cat.context}` : null;
}

/**
 * 기본 글(base article) 프롬프트. TipTap 에디터에 바로 들어갈 HTML 본문을 생성한다.
 */
export function buildBasePrompt(c: ArticleConfig, r: BaseContentRequest): string {
  const brand = c.brand_name?.trim() || '187 성장클리닉';
  const rules = c.blog_rules?.trim() || DEFAULT_HTML_RULES;
  const keywords = (r.keywords ?? []).filter(Boolean).join(', ');
  const category = resolveCategory(c, r.category);
  const langLine =
    r.language && r.language !== 'ko'
      ? `\n- 작성 언어: ${r.language} (모든 본문을 ${r.language} 언어로 작성)`
      : '';

  return `당신은 ${brand}의 블로그 에디터입니다. 아래 정보로 블로그 기본 글을 작성하세요.

${brandBlock(c)}

## 콘텐츠
- 제목: ${r.title}
${category ? `- 카테고리: ${category}` : ''}
${r.angle?.trim() ? `- 앵글: ${r.angle.trim()}` : ''}
${keywords ? `- 핵심 키워드: ${keywords}` : ''}${langLine}

## 작성 규칙
${rules}

## 출력 형식 (중요)
- 반드시 유효한 HTML 본문만 출력하세요.
- 제목은 <h1>, 소제목은 <h2>, 단락은 <p> 태그를 사용하세요. 나열이 필요하면 <ul><li>를 사용하세요.
- 마크다운, 코드펜스(\`\`\`), <html>/<body> 래퍼, 설명 문구는 절대 포함하지 마세요. 오직 본문 HTML만 출력합니다.`;
}

/**
 * 주제 제안(topic suggestion) 프롬프트. JSON 배열로 N개 주제를 반환하도록 지시.
 */
export function buildTopicPrompt(c: ArticleConfig, r: TopicRequest): string {
  const count = r.count ?? 5;
  const category = resolveCategory(c, r.category);

  return `당신은 ${c.brand_name?.trim() || '187 성장클리닉'}의 콘텐츠 기획자입니다. 아래 정보를 바탕으로 블로그 글 주제를 ${count}개 제안하세요.

${brandBlock(c)}
${category ? `\n## 카테고리\n${category}` : ''}
${r.seed?.trim() ? `\n## 사용자 요청 방향\n${r.seed.trim()}\n위 방향을 반영하세요.` : ''}

## 출력 형식 (중요)
- 반드시 아래 형태의 JSON 배열만 출력하세요. 다른 텍스트, 마크다운, 코드펜스는 절대 포함하지 마세요.
- 정확히 ${count}개의 주제를 담으세요.
[{"title": "글 제목", "angle": "핵심 앵글/관점 한 줄", "keywords": ["키워드1", "키워드2"]}]`;
}

/**
 * 부분 재작성(partial rewrite) 프롬프트. 선택 구간을 instruction 대로 다시 쓴
 * HTML 조각만 반환하도록 지시.
 */
export function buildRewritePrompt(c: ArticleConfig, r: RewriteRequest): string {
  const instruction = r.instruction?.trim() || DEFAULT_REWRITE_INSTRUCTION;
  const tone = c.brand_tone?.trim();
  const style = c.marketer_style?.trim();

  return `당신은 ${c.brand_name?.trim() || '187 성장클리닉'}의 콘텐츠 편집자입니다.
${tone ? `브랜드 톤: ${tone}` : ''}
${style ? `글쓰기 스타일: ${style}` : ''}

## 수정 지시
${instruction}

## [선택 구간]
${r.selection}

## 출력 형식 (중요)
- 위 [선택 구간]을 같은 맥락과 톤을 유지하면서 수정 지시에 맞게 다시 작성하세요.
- 다시 작성한 HTML 조각만 출력하세요. 설명, 마크다운, 코드펜스는 절대 포함하지 마세요.`;
}
