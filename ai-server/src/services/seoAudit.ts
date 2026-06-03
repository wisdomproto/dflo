// ai-server/src/services/seoAudit.ts
// Rule-based on-page SEO scorer ported from ContentFlow api/seo/audit/route.ts.
// 100% rule-based — NO external key. Fetches a URL, parses HTML with cheerio,
// extracts on-page signals, and computes 4 engine scores (google/naver/geo/tech)
// + a severity-ranked issue list. buildSuggestPrompt() is a pure Korean prompt
// builder for the (Gemini-gated) AI improvement endpoint.
import * as cheerio from 'cheerio';

export interface Scores {
  google: number;
  naver: number;
  geo: number;
  tech: number;
}

export interface AuditIssue {
  severity: 'critical' | 'warning';
  message: string;
  engine: 'google' | 'naver' | 'geo' | 'tech';
  fixAction?: string;
}

export interface AuditResult {
  url: string;
  title: string;
  metaDescription: string;
  scores: Scores;
  issues: AuditIssue[];
  meta: {
    h1Count: number;
    h2Count: number;
    imageCount: number;
    linkCount: number;
    textLength: number;
    hasSchema: boolean;
    isHttps: boolean;
    hasViewport: boolean;
    canonicalUrl?: string;
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Fetch a URL and run the rule-based on-page audit.
 * SSRF/hang guard: http(s) scheme only, custom User-Agent, 8s AbortController
 * timeout, reject non-text/html responses.
 */
export async function fetchAndAudit(rawUrl: string): Promise<AuditResult> {
  const url = String(rawUrl ?? '').trim();
  if (!url) throw new Error('URL을 입력해주세요.');

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('올바른 URL 형식이 아닙니다 (예: https://example.com).');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('http 또는 https URL만 분석할 수 있습니다.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'dflo SEO Bot/1.0' },
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('페이지 응답이 너무 느립니다 (8초 초과).');
    }
    throw new Error(`페이지를 불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
  }
  clearTimeout(timer);

  if (!res.ok) throw new Error(`페이지 응답 오류 (${res.status}).`);
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error('HTML 페이지가 아닙니다 (text/html 아님).');
  }

  const html = await res.text();
  return auditHtml(html, parsed);
}

/** Pure scorer over parsed HTML — separated for testability. */
function auditHtml(html: string, parsed: URL): AuditResult {
  const $ = cheerio.load(html);

  const title = ($('title').first().text() || '').trim();
  const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();
  const canonicalUrl = ($('link[rel="canonical"]').attr('href') || '').trim() || undefined;
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const isHttps = parsed.protocol === 'https:';

  const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2s = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h1Count = h1s.length;
  const h2Count = h2s.length;

  const images = $('img');
  const imageCount = images.length;
  const missingAlt = images.filter((_, el) => !($(el).attr('alt') || '').trim()).length;

  const linkCount = $('a[href]').length;

  // Schema.org structured data via JSON-LD.
  const hasSchema = $('script[type="application/ld+json"]').length > 0;
  const schemaText = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get()
    .join(' ');
  const hasFaqSchema = /"FAQPage"/i.test(schemaText);

  // robots: meta robots without noindex, or absent (default indexable).
  const robotsMeta = ($('meta[name="robots"]').attr('content') || '').toLowerCase();
  const robotsOk = !robotsMeta.includes('noindex');

  // Body text length (strip script/style).
  const bodyClone = cheerio.load(html);
  bodyClone('script, style, noscript').remove();
  const textLength = bodyClone('body').text().replace(/\s+/g, ' ').trim().length;

  const questionH2 = h2s.some((t) => t.includes('?') || t.includes('？'));

  const issues: AuditIssue[] = [];

  // ── GOOGLE engine ──────────────────────────────────────────────
  let google = 0;
  if (title.length >= 30 && title.length <= 60) google += 15;
  else
    issues.push({
      severity: title ? 'warning' : 'critical',
      engine: 'google',
      message: title
        ? `타이틀 길이가 권장 범위를 벗어남 (현재 ${title.length}자, 권장 30~60자)`
        : '타이틀(title 태그)이 없습니다',
      fixAction: '핵심 키워드를 포함해 30~60자 타이틀을 작성하세요.',
    });
  if (metaDescription.length >= 120) google += 15;
  else
    issues.push({
      severity: metaDescription ? 'warning' : 'critical',
      engine: 'google',
      message: metaDescription
        ? `메타 설명이 짧습니다 (현재 ${metaDescription.length}자, 권장 120자 이상)`
        : '메타 설명(meta description)이 없습니다',
      fixAction: '검색 결과에 노출될 120~160자 메타 설명을 추가하세요.',
    });
  if (h1Count === 1) google += 10;
  else
    issues.push({
      severity: 'warning',
      engine: 'google',
      message: h1Count === 0 ? 'H1 제목이 없습니다' : `H1이 ${h1Count}개입니다 (1개 권장)`,
      fixAction: '페이지 주제를 대표하는 H1을 정확히 1개만 사용하세요.',
    });
  if (h2Count >= 2) google += 10;
  else
    issues.push({
      severity: 'warning',
      engine: 'google',
      message: `H2 소제목이 부족합니다 (현재 ${h2Count}개, 2개 이상 권장)`,
      fixAction: '본문을 H2 소제목으로 구조화하세요.',
    });
  if (imageCount > 0 && missingAlt === 0) google += 10;
  else if (missingAlt > 0)
    issues.push({
      severity: 'warning',
      engine: 'google',
      message: `alt 속성이 없는 이미지 ${missingAlt}개`,
      fixAction: '모든 이미지에 설명적인 alt 텍스트를 추가하세요.',
    });
  if (isHttps) google += 10;
  else
    issues.push({
      severity: 'critical',
      engine: 'google',
      message: 'HTTPS가 적용되지 않았습니다',
      fixAction: 'SSL 인증서를 적용해 HTTPS로 서비스하세요.',
    });
  if (hasViewport) google += 10;
  else
    issues.push({
      severity: 'warning',
      engine: 'google',
      message: '모바일 viewport 메타 태그가 없습니다',
      fixAction: '<meta name="viewport" content="width=device-width, initial-scale=1"> 를 추가하세요.',
    });
  if (canonicalUrl) google += 10;
  else
    issues.push({
      severity: 'warning',
      engine: 'google',
      message: 'canonical 링크가 없습니다',
      fixAction: '중복 콘텐츠 방지를 위해 canonical 링크를 지정하세요.',
    });
  if (linkCount > 5) google += 10;
  else
    issues.push({
      severity: 'warning',
      engine: 'google',
      message: `내부/외부 링크가 부족합니다 (현재 ${linkCount}개)`,
      fixAction: '관련 페이지로의 링크를 늘려 탐색성을 높이세요.',
    });

  // ── NAVER engine (텍스트·이미지 양 선호) ────────────────────────
  let naver = 0;
  if (title.length >= 30 && title.length <= 60) naver += 15;
  if (imageCount >= 3) naver += 15;
  else
    issues.push({
      severity: 'warning',
      engine: 'naver',
      message: `이미지가 부족합니다 (현재 ${imageCount}개, 네이버는 3개 이상 권장)`,
      fixAction: '본문에 관련 이미지를 3개 이상 배치하세요.',
    });
  if (h2Count >= 2) naver += 10;
  if (textLength >= 2000) naver += 15;
  else
    issues.push({
      severity: 'warning',
      engine: 'naver',
      message: `본문이 짧습니다 (현재 약 ${textLength}자, 네이버는 2000자 이상 선호)`,
      fixAction: '본문 분량을 2000자 이상으로 충실하게 작성하세요.',
    });
  if (metaDescription) naver += 10;
  naver += Math.min(35, Math.floor(textLength / 200));

  // ── GEO engine (AI 답변 인용 적합성) ───────────────────────────
  let geo = 0;
  if (hasSchema) geo += 25;
  else
    issues.push({
      severity: 'warning',
      engine: 'geo',
      message: '구조화 데이터(JSON-LD)가 없습니다',
      fixAction: 'Schema.org 구조화 데이터(JSON-LD)를 추가해 AI 검색 인용 가능성을 높이세요.',
    });
  if (hasFaqSchema) geo += 20;
  else
    issues.push({
      severity: 'warning',
      engine: 'geo',
      message: 'FAQPage 구조화 데이터가 없습니다',
      fixAction: '자주 묻는 질문을 FAQPage 스키마로 마크업하세요.',
    });
  if (questionH2) geo += 15;
  else
    issues.push({
      severity: 'warning',
      engine: 'geo',
      message: '질문형 소제목(H2)이 없습니다',
      fixAction: '사용자 질문을 그대로 담은 질문형 H2를 추가하세요 (AI 답변 인용에 유리).',
    });
  geo += Math.min(40, Math.floor(textLength / 300));

  // ── TECH engine ────────────────────────────────────────────────
  let tech = 35; // base
  if (isHttps) tech += 20;
  if (hasViewport) tech += 15;
  if (canonicalUrl) tech += 15;
  if (robotsOk) tech += 15;
  else
    issues.push({
      severity: 'critical',
      engine: 'tech',
      message: 'robots 메타가 noindex로 설정되어 색인이 차단됩니다',
      fixAction: 'meta robots에서 noindex를 제거하세요.',
    });

  return {
    url: parsed.toString(),
    title,
    metaDescription,
    scores: {
      google: clamp(google),
      naver: clamp(naver),
      geo: clamp(geo),
      tech: clamp(tech),
    },
    issues,
    meta: {
      h1Count,
      h2Count,
      imageCount,
      linkCount,
      textLength,
      hasSchema,
      isHttps,
      hasViewport,
      canonicalUrl,
    },
  };
}

/** Pure Korean prompt builder for the (Gemini-gated) AI improvement endpoint. */
export function buildSuggestPrompt(audit: AuditResult): string {
  const issueLines = audit.issues
    .map((i) => `- [${i.engine}/${i.severity}] ${i.message}${i.fixAction ? ` → ${i.fixAction}` : ''}`)
    .join('\n');

  return `당신은 한국 의료/헬스케어 웹사이트 SEO 전문가입니다. 아래 페이지의 규칙 기반 감사 결과를 바탕으로, 가장 효과가 큰 개선 액션 3~5개를 우선순위 순으로 제안하세요.

## 페이지
- URL: ${audit.url}
- 타이틀: ${audit.title || '(없음)'}
- 메타 설명: ${audit.metaDescription || '(없음)'}

## 엔진 점수 (0~100)
- 구글: ${audit.scores.google}
- 네이버: ${audit.scores.naver}
- GEO(AI 검색): ${audit.scores.geo}
- 기술: ${audit.scores.tech}

## 온페이지 신호
- H1 ${audit.meta.h1Count}개 · H2 ${audit.meta.h2Count}개 · 이미지 ${audit.meta.imageCount}개 · 링크 ${audit.meta.linkCount}개
- 본문 길이 약 ${audit.meta.textLength}자 · 구조화데이터 ${audit.meta.hasSchema ? '있음' : '없음'} · HTTPS ${audit.meta.isHttps ? '예' : '아니오'}

## 발견된 이슈
${issueLines || '- (특이사항 없음)'}

## 출력 규칙
- 각 제안은 "무엇을 / 왜 / 어떻게"가 드러나게 한국어 1~2문장으로 작성
- 번호 목록(1. 2. 3. …)으로만 출력, 머리말/맺음말·마크다운·코드블록 금지
- 실행 가능한 구체적 액션 위주, 일반론 지양`;
}
