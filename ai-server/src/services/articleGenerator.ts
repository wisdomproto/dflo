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
