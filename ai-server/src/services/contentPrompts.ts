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

export interface BlogGenRequest {
  title: string;
  body?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  channel?: string;
}

export interface CardNewsRequest {
  title: string;
  body?: string;
  count?: number;
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

/** blog channel code → 한국어 채널 이름 */
function channelLabel(code?: string): string {
  if (code === 'wordpress') return '워드프레스';
  return '네이버 블로그';
}

/**
 * 블로그 카드 생성 프롬프트. 기본 글(또는 제목)을 채널 SEO 섹션 카드 배열(JSON)로
 * 재구성하도록 지시한다. 각 요소는 dflo `BlogCard` 로 매핑된다.
 * ContentFlow buildBlogPrompt 를 dflo BlogCard(JSON 배열) 출력에 맞게 적응.
 */
export function buildBlogPrompt(c: ArticleConfig, r: BlogGenRequest): string {
  const channel = channelLabel(r.channel);
  const primary = r.primaryKeyword?.trim();
  const secondary = (r.secondaryKeywords ?? []).map((k) => k?.trim()).filter(Boolean).join(', ');
  const source = r.body?.trim();

  return `당신은 ${channel} SEO 전문가이자 ${c.brand_name?.trim() || '187 성장클리닉'}의 마케팅 콘텐츠 작가입니다.
아래 주제로 ${channel} 게시글을 섹션 카드 배열로 작성하세요. SEO 최고점을 목표로 합니다.

${brandBlock(c)}

## 주제
- 제목: ${r.title}
- 채널: ${channel}
${primary ? `- 핵심 키워드: ${primary} (본문 전체에 3~5회 자연스럽게 반복)` : ''}
${secondary ? `- 보조 키워드: ${secondary} (각각 1~2회 포함)` : ''}
${source ? `\n## 원본 기본 글 (이 글을 ${channel} 형식으로 재구성하세요)\n${source.slice(0, 4000)}` : ''}

## ${channel} SEO 작성 규칙
- 제목(소제목)은 15~25자, 핵심 키워드를 앞쪽에 배치.
- 소제목은 h2 태그로 구조화 (3개 이상).
- 전체 본문 2,000~3,000자 분량.
- 리스트(ul/ol)를 적극 활용 — 나열 정보는 리스트로.
- 첫 단락 150자 안에 핵심 키워드 + 글의 요점 제시.
- 모바일 가독성: 한 단락 3~4줄(200~300자) 이내, 중요 정보는 <strong> 처리.
- 마지막 섹션에 "결론" 또는 "정리"를 포함.
- 의료 광고법 준수 — 과장·단정 표현 금지.

## 출력 형식 (매우 중요)
- 반드시 JSON 배열만 출력하세요. 다른 텍스트, 설명, 마크다운, 코드펜스(\`\`\`)는 절대 포함하지 마세요.
- 배열의 각 요소는 하나의 섹션 카드입니다. 6~10개의 카드로 구성하세요.
- 카드 형식:
[
  { "cardType": "text", "text": "<h2>소제목</h2><p>본문 HTML</p>" },
  { "cardType": "image", "imagePrompt": "English image generation prompt: style, subject, composition, mood" },
  { "cardType": "list", "text": "<h2>소제목</h2><ul><li>항목</li></ul>" },
  { "cardType": "quote", "text": "<blockquote>인용/강조 문구</blockquote>" },
  { "cardType": "divider" }
]
- cardType 은 "text" | "image" | "divider" | "quote" | "list" 중 하나입니다.
- text/quote/list 카드: \`text\` 필드에 HTML(h2/p/ul/li/blockquote)을 담습니다.
- image 카드: \`imagePrompt\` 필드에만 영어 이미지 생성 프롬프트를 담습니다 (text 없음). 섹션마다 1장 권장.
- divider 카드: 필드 없이 구분선 용도로만 사용.`;
}

/**
 * 인스타그램 카드뉴스 프롬프트. 주제(+선택 원본)를 N장의 카드 슬라이드 배열(JSON)로
 * 재구성하도록 지시한다. 각 슬라이드는 headline/body/imagePrompt 를 가진다.
 */
export function buildCardNewsPrompt(c: ArticleConfig, r: CardNewsRequest): string {
  const count = r.count ?? 6;
  const source = r.body?.trim();

  return `당신은 ${c.brand_name?.trim() || '187 성장클리닉'}의 인스타그램 콘텐츠 디자이너입니다.
아래 주제로 모바일에서 넘겨보는 인스타그램 카드뉴스 ${count}장을 기획하세요.

${brandBlock(c)}

## 주제
- 제목: ${r.title}
${source ? `\n## 원본 자료 (이 내용을 카드뉴스로 요약·재구성하세요)\n${source.slice(0, 4000)}` : ''}

## 카드뉴스 작성 규칙
- 정확히 ${count}장의 슬라이드로 구성하세요.
- 1번 슬라이드는 시선을 끄는 후크(hook)/표지 역할을 하세요.
- 마지막 슬라이드는 행동 유도(CTA, 예: 상담/문의 안내) 역할을 하세요.
- 본문은 모바일 화면에 맞게 짧고 간결하게 (한 슬라이드 1~2문장).
- 의학적 근거 기반, 과장·단정 표현 금지 (의료광고법 준수).
- imagePrompt 는 해당 슬라이드 분위기에 맞는 이미지 생성 프롬프트를 영문으로 작성하세요.

## 출력 형식 (매우 중요)
- 반드시 JSON 배열만 출력하세요. 다른 텍스트, 설명, 마크다운, 코드펜스(\`\`\`)는 절대 포함하지 마세요.
- 배열 길이는 정확히 ${count} 입니다.
- 각 슬라이드 형식:
[
  { "headline": "짧은 제목", "body": "1-2문장 본문", "imagePrompt": "이 슬라이드용 이미지 생성 프롬프트(영문)" }
]`;
}
