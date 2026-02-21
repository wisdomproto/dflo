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
