// ai-server/src/services/evidenceSummary.ts
// 논문 초록 → 한국어 요약/핵심결론 생성용 순수 프롬프트 빌더 + 응답 파서.

export interface EvidenceSummary {
  korean_summary: string;
  key_finding: string;
}

/** 제목+초록 → Gemini 에 JSON {korean_summary, key_finding} 요청하는 프롬프트. */
export function buildEvidenceSummaryPrompt(title: string, abstract: string): string {
  return `다음은 소아 성장·내분비 분야 국제 학술 논문이다. 소아 성장클리닉 원장이 빠르게 참고할 수 있게 한국어로 요약하라.

## 제목
${title}

## 초록
${abstract}

## 규칙
- 초록에 적힌 사실만. 없는 수치·결론을 지어내지 말 것(초록에 수치 없으면 정성적으로).
- korean_summary: 이 논문이 무엇을 보고 무엇을 밝혔는지 한국어 1~2문장(의사 관점).
- key_finding: 임상에 가장 중요한 결론 한 줄. 효과크기·수치(예 "+4.5cm", "OR 2.1")가 있으면 반드시 포함.

반드시 아래 JSON 만 반환(다른 말 금지):
{
  "korean_summary": "...",
  "key_finding": "..."
}`;
}

/** Gemini 응답(코드펜스/주변 텍스트 가능) → {korean_summary, key_finding}. 실패 시 throw. */
export function parseSummaryResponse(raw: string): EvidenceSummary {
  const cleaned = String(raw ?? '').trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('evidence summary: JSON parse 실패');
    parsed = JSON.parse(m[0]);
  }
  const o = parsed as Partial<EvidenceSummary>;
  if (!o.korean_summary || !o.key_finding) throw new Error('evidence summary: 필수 필드 누락');
  return { korean_summary: String(o.korean_summary), key_finding: String(o.key_finding) };
}
