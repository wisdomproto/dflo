// ai-server/src/services/competitorAnalyzer.ts
// Pure prompt builder for the marketing competitor gap/strength analysis.
// Mirrors articleGenerator.ts: takes the SP1 marketing_config (DB snake_case row)
// + the registered competitors, returns a Korean prompt requesting strict JSON.
// The route calls generateText() with this prompt (do NOT import gemini here).

export interface CompetitorConfig {
  brand_name?: string | null;
  brand_description?: string | null;
  usp?: string | null;
  target_audience?: string | null;
}

export interface CompetitorInput {
  name: string;
  url?: string;
  kind?: string;
}

export function buildCompetitorPrompt(
  config: CompetitorConfig,
  competitors: CompetitorInput[],
): string {
  const brand = config.brand_name?.trim() || '187 성장클리닉';
  const list = competitors
    .map((c, i) => {
      const kindLabel = c.kind === 'indirect' ? '간접' : '직접';
      const url = c.url?.trim() ? ` (${c.url.trim()})` : '';
      return `${i + 1}. ${c.name}${url} — ${kindLabel} 경쟁사`;
    })
    .join('\n');

  return `당신은 ${brand}의 콘텐츠 마케팅 전략가입니다. 아래 우리 브랜드 정보와 경쟁사 목록을 비교 분석하세요.

## 우리 브랜드
- 이름: ${brand}
${config.brand_description?.trim() ? `- 설명: ${config.brand_description.trim()}` : ''}
${config.usp?.trim() ? `- 차별점(USP): ${config.usp.trim()}` : ''}
${config.target_audience?.trim() ? `- 타깃 고객: ${config.target_audience.trim()}` : ''}

## 경쟁사 목록
${list || '(등록된 경쟁사 없음)'}

## 분석 요청
1. 콘텐츠 갭(gaps): 경쟁사들은 다루지만 우리가 약하거나 안 다루는 소아 성장·키 관련 콘텐츠 주제. 각 갭마다 추정 월간 검색량, 그 주제를 다루는 경쟁사 이름들, 콘텐츠 난이도, 우선순위를 포함하세요.
2. 우리 강점(strengths): 우리만의 차별화된 콘텐츠 주제(경쟁사 대비 독점적이거나 우위). 각 강점마다 추정 월간 검색량과 짧은 코멘트를 포함하세요.

## 출력 형식
설명·코드블록·마크다운 없이 아래 JSON 객체 하나만 출력하세요.
{
  "gaps": [
    { "topic": "주제", "monthlySearch": 1200, "competitors": ["경쟁사명"], "difficulty": "쉬움|보통|어려움", "priority": "high|medium|low" }
  ],
  "strengths": [
    { "topic": "주제", "monthlySearch": 800, "note": "한 줄 코멘트" }
  ]
}

규칙:
- monthlySearch 는 숫자만(쉼표·단위 없이).
- gaps 는 priority "high" 인 항목을 우선 배치, 최대 8개.
- strengths 는 최대 6개.
- 모든 텍스트는 한국어, 의료 광고법을 고려해 과장·단정 표현 금지.
- JSON 외 다른 텍스트는 절대 출력하지 마세요.`;
}
