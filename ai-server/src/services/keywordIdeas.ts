// ai-server/src/services/keywordIdeas.ts
// Pure prompt builder + parser for channel content ideas. Ports ContentFlow
// api/ideas/generate onto the SP1 marketing_config (DB snake_case row).
// NOTE: this file is pure — it does NOT import gemini.js (which throws at import
// time when GEMINI_API_KEY is unset). The route imports generateText and calls it.

export interface IdeasConfig {
  brand_name?: string | null;
  brand_description?: string | null;
  target_audience?: string | null;
  usp?: string | null;
  blog_categories?: Array<{ code: string; name: string; context: string }> | null;
}

export interface IdeasRequest {
  seed: string;
  channels?: string[];
}

export interface KeywordIdea {
  channel: string;
  title: string;
  structure: string;
  hook: string;
  outline: string[];
}

const CHANNEL_LABEL: Record<string, string> = {
  blog: '네이버 블로그 (정보형 장문 글)',
  cardnews: '인스타 카드뉴스 (8~10장 슬라이드)',
  youtube: '유튜브 (3~8분 영상 스크립트)',
};

const DEFAULT_CHANNELS = ['blog', 'cardnews', 'youtube'];

export function buildKeywordIdeasPrompt(config: IdeasConfig, req: IdeasRequest): string {
  const brand = config.brand_name?.trim() || '187 성장클리닉';
  const channels = (req.channels && req.channels.length ? req.channels : DEFAULT_CHANNELS).filter(Boolean);
  const channelLines = channels
    .map((c) => `- ${c}: ${CHANNEL_LABEL[c] ?? c}`)
    .join('\n');
  const cats = (config.blog_categories ?? [])
    .map((c) => `${c.name}`)
    .filter(Boolean)
    .join(', ');

  return `당신은 ${brand}의 콘텐츠 기획자입니다. 아래 시드 키워드/주제로 채널별 콘텐츠 아이디어를 1개씩 기획하세요.

## 브랜드
${config.brand_description?.trim() || ''}
${config.usp?.trim() ? `- 차별점: ${config.usp.trim()}` : ''}
${config.target_audience?.trim() ? `- 타깃 독자: ${config.target_audience.trim()}` : ''}
${cats ? `- 콘텐츠 카테고리: ${cats}` : ''}

## 시드 키워드/주제
${req.seed.trim()}

## 채널 (각 채널마다 정확히 1개 아이디어)
${channelLines}

## 출력 형식 (반드시 이 형식의 JSON 배열만 출력, 코드블록·설명·주석 금지)
[
  {
    "channel": "<위 채널 코드 그대로>",
    "title": "검색·클릭을 부르는 콘텐츠 제목",
    "structure": "콘텐츠 구성 형식 한 줄 (예: Q&A형 정보글, 비포애프터 스토리)",
    "hook": "도입부 1~2문장 후킹 카피",
    "outline": ["섹션1", "섹션2", "섹션3", "섹션4"]
  }
]

## 규칙
1. 채널마다 정확히 1개, 위 채널 코드를 channel 값으로 그대로 사용
2. 부모 눈높이의 쉬운 표현, 과장·확정적 효과 보장 금지(의료 광고법 준수)
3. outline 은 3~6개 항목의 문자열 배열
4. JSON 배열 외 다른 텍스트(코드펜스 포함)는 절대 출력하지 말 것`;
}

// Gemini 2.5 Flash 응답은 ```json 코드펜스나 잡텍스트가 붙을 수 있음 →
// 펜스 strip 후 첫 '[' ~ 마지막 ']' 부분 추출해 파싱. 실패 시 [].
export function parseIdeas(text: string): KeywordIdea[] {
  const stripped = (text ?? '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = stripped.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x) => ({
        channel: String(x.channel ?? ''),
        title: String(x.title ?? ''),
        structure: String(x.structure ?? ''),
        hook: String(x.hook ?? ''),
        outline: Array.isArray(x.outline) ? x.outline.map((o) => String(o)) : [],
      }))
      .filter((idea) => idea.title.trim().length > 0);
  } catch {
    return [];
  }
}
