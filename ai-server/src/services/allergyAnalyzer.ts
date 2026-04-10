import { analyzeImage } from './gemini.js';

const PROMPT = `이 이미지는 음식 알러지(IgG4) 검사 결과지입니다.
이미지에서 음식 항목들을 추출하고, 수치 기준으로 분류해주세요.

분류 기준:
- 위험 (≥30): 해당 음식은 최소 3개월 섭취 금지
- 경계 (24~29): 해당 음식은 주 4회 미만으로 제한

정상 (≤23) 항목은 무시하고, 위험과 경계 항목만 추출해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
{
  "danger": ["음식1", "음식2", ...],
  "caution": ["음식1", "음식2", ...]
}

만약 이미지가 알러지 검사 결과가 아니거나 읽을 수 없으면:
{ "danger": [], "caution": [], "error": "이미지를 분석할 수 없습니다" }`;

export interface AllergyResult {
  danger: string[];
  caution: string[];
  error?: string;
}

export async function analyzeAllergyTest(
  imageBase64: string,
  mimeType: string,
): Promise<AllergyResult> {
  const raw = await analyzeImage(imageBase64, mimeType, PROMPT);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');

  const parsed = JSON.parse(jsonMatch[0]) as AllergyResult;

  if (!Array.isArray(parsed.danger)) parsed.danger = [];
  if (!Array.isArray(parsed.caution)) parsed.caution = [];

  return parsed;
}
