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

export interface TranslateRequest {
  title: string;
  body: string;
  targetLang: string;
}

const LANG_NAMES: Record<string, string> = {
  th: '태국어', vi: '베트남어', en: '영어', ja: '일본어',
  'zh-tw': '대만 중국어', zh: '중국어', id: '인도네시아어', ms: '말레이어',
};

/**
 * 번역 프롬프트. 한국어 master 글(제목+HTML 본문)을 대상 언어로 번역해
 * { "title", "body" } JSON 으로 반환하도록 지시한다. HTML 구조는 보존.
 */
export function buildTranslatePrompt(c: ArticleConfig, r: TranslateRequest): string {
  const lang = LANG_NAMES[r.targetLang] || r.targetLang;
  const tone = c.brand_tone?.trim();

  return `당신은 ${c.brand_name?.trim() || '187 성장클리닉'}의 전문 번역가입니다.
아래 한국어 블로그 글을 ${lang}로 번역하세요.
${tone ? `브랜드 톤(${tone})을 유지하되 ` : ''}현지 독자에게 자연스럽게 읽히도록, 의료 정보의 정확성을 지키며 번역합니다.
HTML 태그 구조(<h1>/<h2>/<p>/<ul>/<li> 등)는 그대로 두고 텍스트만 번역하세요.

## 출력 형식 (중요)
- 반드시 아래 JSON 객체만 출력하세요. 다른 텍스트, 마크다운, 코드펜스는 절대 포함하지 마세요.
{"title": "번역된 제목", "body": "번역된 HTML 본문"}

## [원문 제목]
${r.title}

## [원문 본문 HTML]
${r.body}`;
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

export interface CardnewsI18nRequest {
  title: string;
  body?: string;
}

const CN_LANGS = 'ko(한국어), en(영어), th(태국어), vi(베트남어), ch(중국어 번체)';

/**
 * 다국어 카드뉴스 슬라이드 — 언어공통 일러스트 + 5개 언어 텍스트. JSON 배열 반환.
 * 정보성 톤·가변 장수. dflo 카드뉴스 파이프라인(docs/cardnews) 규격과 동일.
 */
export function buildCardnewsI18nPrompt(c: ArticleConfig, r: CardnewsI18nRequest): string {
  const brand = c.brand_name?.trim() || '187 성장클리닉';
  const source = r.body?.trim();
  return `당신은 ${brand}의 인스타그램 카드뉴스 디자이너입니다. 아래 글을 "정보성" 카드뉴스로 만드세요.

## 주제
- 제목: ${r.title}${source ? `\n\n## 원본\n${source.slice(0, 4000)}` : ''}

## 규칙
- 정보성 톤만 (병원 홍보·"${brand}이 관리" 류·강한 상담유도 금지, 의료광고법 준수, 효과 단정·과장·공포 조장 금지)
- 장수 가변: 표지 1 + 본문 N(핵심 포인트 수) + CTA 1, 보통 5~9장. "N가지" 리스트형이면 항목당 1장
- illustration: 플랫 2D 벡터, 한국어로 [레이아웃][주체][디테일][배경][색] 정밀하게 (공통 스타일=플랫벡터/보라 #667eea→#764ba2/민트 #33D6B5/같은 7~9세 한국 아이 는 고정이니 그 장 고유 요소만)
- 텍스트는 5개 언어: ${CN_LANGS}. 헤드라인 짧게, 보조문구 한 줄(없으면 "")
- 마지막 CTA 슬라이드만 isCta=true (로고/도메인은 앱이 자동 추가)
- 숫자/통계는 원본에 있는 것만

## 출력 (JSON 배열만 — 코드펜스/마크다운/설명 절대 금지, 문자열 안 큰따옴표는 「」로 대체)
[{"role":"표지","illustration":"...","texts":{"ko":{"headline":"","subtext":""},"en":{"headline":"","subtext":""},"th":{"headline":"","subtext":""},"vi":{"headline":"","subtext":""},"ch":{"headline":"","subtext":""}},"isCta":false}]`;
}

/** 카드뉴스 캡션 + 해시태그 5개 언어. JSON {captions, hashtags} 반환. */
export function buildCaptionHashtagPrompt(c: ArticleConfig, r: CardnewsI18nRequest): string {
  const brand = c.brand_name?.trim() || '187 성장클리닉';
  const source = r.body?.trim();
  return `당신은 ${brand}의 인스타그램 콘텐츠 에디터입니다. 아래 글의 카드뉴스용 캡션과 해시태그를 5개 언어로 만드세요: ${CN_LANGS}.

## 주제
- 제목: ${r.title}${source ? `\n\n## 원본\n${source.slice(0, 4000)}` : ''}

## 규칙
- 캡션: 첫 줄 훅(질문/공감) + 핵심 2~4문장 + 부드러운 CTA. 줄바꿈/이모지 적절히. 정보성, 과장·효과 단정 금지
- 해시태그: 각 언어 10~15개, 공백으로 구분한 한 줄 문자열, 그 언어권 부모가 실제 쓰는 태그로 현지화

## 출력 (JSON 객체만 — 코드펜스/설명 금지, 줄바꿈은 \\n)
{"captions":{"ko":"","en":"","th":"","vi":"","ch":""},"hashtags":{"ko":"#태그 #태그","en":"","th":"","vi":"","ch":""}}`;
}

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
