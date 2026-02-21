import { analyzeImage } from './gemini.js';
import { BODY_ANALYSIS_PROMPT } from '../prompts/body.js';

export interface BodyAnalysisItem {
  label: string;
  score: number;
  status: '정상' | '주의' | '경고';
  detail: string;
}

export interface BodyAnalysisResult {
  overall_score: number;
  items: BodyAnalysisItem[];
  summary: string;
}

/**
 * Strip markdown code block wrappers (```json ... ```) from a response string.
 */
function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return text.trim();
}

/**
 * Analyze a child's full-body posture photo and return structured evaluation.
 * @param imageBase64 - Base64-encoded image (without data URI prefix)
 * @param mimeType - MIME type (e.g. "image/jpeg")
 */
export async function analyzeBody(
  imageBase64: string,
  mimeType: string,
): Promise<BodyAnalysisResult> {
  const rawResponse = await analyzeImage(imageBase64, mimeType, BODY_ANALYSIS_PROMPT);
  const jsonString = extractJSON(rawResponse);
  const parsed = JSON.parse(jsonString);

  // Validate and normalize items
  const validStatuses = ['정상', '주의', '경고'] as const;

  const items: BodyAnalysisItem[] = Array.isArray(parsed.items)
    ? parsed.items.map((item: Record<string, unknown>) => ({
        label: String(item.label || ''),
        score: Math.min(100, Math.max(0, Number(item.score) || 0)),
        status: validStatuses.includes(item.status as typeof validStatuses[number])
          ? (item.status as '정상' | '주의' | '경고')
          : '주의',
        detail: String(item.detail || ''),
      }))
    : [];

  const result: BodyAnalysisResult = {
    overall_score: Math.min(100, Math.max(0, Number(parsed.overall_score) || 0)),
    items,
    summary: String(parsed.summary || ''),
  };

  return result;
}
