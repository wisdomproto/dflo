import { GoogleGenAI } from '@google/genai';

// ── Self-contained types (ported from ContentFlow ai/types.ts) ──────────────
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '3:4' | '4:3';
export type ImageSize = '512' | '1K' | '2K';

export interface ImageGenerationRequest {
  prompt: string;
  referenceImage?: string; // base64 data URL or http(s) URL
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
}

export interface ImageGenerationResult {
  base64: string;
  mimeType: string;
}

/**
 * Strategy 인터페이스: 이미지 생성 모델을 추상화
 * 새로운 이미지 생성 모델 추가 시 이 인터페이스만 구현하면 됨
 */
export interface ImageGenerator {
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

/**
 * Gemini image-capable 모델 기본값.
 * NOTE: 모델 id 는 자주 바뀝니다. API 가 이 id 를 거부하면 갱신 필요
 * (컨트롤러가 런타임에 실제 모델을 검증).
 */
export const DEFAULT_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';

/**
 * Gemini 네이티브 이미지 생성 (gemini-*-image-* 모델)
 * responseModalities: ['IMAGE'] 로 이미지 직접 생성
 */
class GeminiImageGenerator implements ImageGenerator {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  private async resolveImageData(ref: string): Promise<{ mimeType: string; data: string } | null> {
    // data:image/... 형식
    const dataMatch = ref.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (dataMatch) return { mimeType: dataMatch[1], data: dataMatch[2] };

    // URL 형식 → fetch → base64
    if (ref.startsWith('http://') || ref.startsWith('https://')) {
      try {
        const res = await fetch(ref);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const mimeType = res.headers.get('content-type') || 'image/png';
        const data = Buffer.from(buf).toString('base64');
        return { mimeType, data };
      } catch {
        return null;
      }
    }

    return null;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    // 참조 이미지가 있으면 multimodal input으로 전달
    let contents: string | Array<{ inlineData?: { mimeType: string; data: string }; text?: string }>;
    if (request.referenceImage) {
      const imageData = await this.resolveImageData(request.referenceImage);
      if (imageData) {
        contents = [
          { inlineData: imageData },
          { text: `Use the visual style, frame, and composition of this reference image as a guide. Generate a new image with this prompt: ${request.prompt}` },
        ];
      } else {
        contents = request.prompt;
      }
    } else {
      contents = request.prompt;
    }

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents,
      config: {
        responseModalities: ['IMAGE'],
        ...(request.aspectRatio || request.imageSize
          ? {
              imageConfig: {
                ...(request.aspectRatio && { aspectRatio: request.aspectRatio }),
                ...(request.imageSize && { imageSize: request.imageSize }),
              },
            }
          : {}),
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error('이미지 생성 응답에 데이터가 없습니다.');
    }

    for (const part of parts) {
      if (part.inlineData) {
        return {
          base64: part.inlineData.data!,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }

    throw new Error('응답에서 이미지 데이터를 찾을 수 없습니다.');
  }
}

/**
 * Imagen 전용 이미지 생성 (imagen-4.0-generate-001 등)
 * generateImages API 사용
 */
class ImagenGenerator implements ImageGenerator {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const response = await this.ai.models.generateImages({
      model: this.model,
      prompt: request.prompt,
      config: {
        numberOfImages: 1,
        ...(request.aspectRatio && { aspectRatio: request.aspectRatio }),
      },
    });

    const image = response.generatedImages?.[0];
    if (!image?.image?.imageBytes) {
      throw new Error('Imagen 응답에서 이미지 데이터를 찾을 수 없습니다.');
    }

    return {
      base64: image.image.imageBytes,
      mimeType: 'image/png',
    };
  }
}

/**
 * 팩토리 함수: 모델명에 따라 적절한 ImageGenerator 구현체 반환
 * - imagen-* → ImagenGenerator
 * - 나머지 (gemini-*) → GeminiImageGenerator
 */
export function createImageGenerator(model: string, apiKey: string): ImageGenerator {
  if (model.startsWith('imagen')) {
    return new ImagenGenerator(apiKey, model);
  }
  return new GeminiImageGenerator(apiKey, model);
}
