import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Analyze an image with a text prompt using Gemini Vision.
 * @param imageBase64 - Base64-encoded image data (without data URI prefix)
 * @param mimeType - MIME type of the image (e.g. "image/jpeg", "image/png")
 * @param prompt - Text prompt describing what to analyze
 * @returns The model's text response
 */
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    },
    { text: prompt },
  ]);

  const response = result.response;
  return response.text();
}

/**
 * Generate text using Gemini (text-only, no image).
 * @param prompt - Text prompt
 * @returns The model's text response
 */
export async function generateText(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Embed text using Gemini gemini-embedding-001, reduced to 768 dim
 * (matches vector(768) columns). text-embedding-004 is no longer available
 * on this key, so we use gemini-embedding-001 with outputDimensionality=768.
 * Direct REST call to avoid SDK version drift.
 */
export async function embedText(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const body = {
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini embed failed (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as { embedding?: { values?: number[] } };
  const values = json.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini embed returned empty vector');
  }
  return values;
}
