// ================================================
// AI Service - 187 성장케어 v4
// Gemini Vision API를 통한 식사/체형 분석
// ================================================

// AI 서버 URL: 모바일 접속 시 같은 호스트로 자동 전환
function getAIServerURL(): string {
  const envUrl = import.meta.env.VITE_AI_SERVER_URL;
  if (envUrl && !envUrl.includes('localhost')) return envUrl;
  // dev 모드: 현재 접속한 호스트와 같은 IP에 포트 3001
  const host = window.location.hostname;
  return `http://${host}:3001`;
}
const AI_SERVER_URL = getAIServerURL();

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

export interface BodyAnalysisResult {
  overall_score: number;
  items: { label: string; score: number; status: string; detail: string }[];
  summary: string;
}

async function imageFileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function postAnalysis<T>(endpoint: string, file: File): Promise<T> {
  const { base64, mimeType } = await imageFileToBase64(file);

  const res = await fetch(`${AI_SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mimeType }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `AI 서버 오류: ${res.status}`);
  }

  const json = await res.json();
  return json.data as T;
}

export async function analyzeMealPhoto(
  file: File,
): Promise<MealAnalysisResult> {
  return postAnalysis<MealAnalysisResult>('/api/analyze/meal', file);
}

export async function analyzeBodyPhoto(
  file: File,
): Promise<BodyAnalysisResult> {
  return postAnalysis<BodyAnalysisResult>('/api/analyze/body', file);
}
