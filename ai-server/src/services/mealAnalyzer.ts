import { analyzeImage } from './gemini.js';
import { MEAL_ANALYSIS_PROMPT } from '../prompts/meal.js';

export interface MealAnalysisResult {
  menu_name: string;
  ingredients: string[];
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  growth_score: number;
  advice: string;
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
 * Analyze a meal photo and return structured nutrition data.
 * @param imageBase64 - Base64-encoded image (without data URI prefix)
 * @param mimeType - MIME type (e.g. "image/jpeg")
 */
export async function analyzeMeal(
  imageBase64: string,
  mimeType: string,
): Promise<MealAnalysisResult> {
  const rawResponse = await analyzeImage(imageBase64, mimeType, MEAL_ANALYSIS_PROMPT);
  const jsonString = extractJSON(rawResponse);
  const parsed = JSON.parse(jsonString);

  // Validate required fields
  const result: MealAnalysisResult = {
    menu_name: String(parsed.menu_name || ''),
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map(String)
      : [],
    calories: Number(parsed.calories) || 0,
    carbs: Number(parsed.carbs) || 0,
    protein: Number(parsed.protein) || 0,
    fat: Number(parsed.fat) || 0,
    growth_score: Math.min(10, Math.max(1, Number(parsed.growth_score) || 1)),
    advice: String(parsed.advice || ''),
  };

  return result;
}
