// src/features/marketing/services/aiImageService.ts
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const PIN = '8054';

/** Calls ai-server image generation; returns a data URL (data:<mime>;base64,<data>). */
export async function generateImage(prompt: string, aspectRatio = '4:5'): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `이미지 생성 실패: ${res.status}`);
  return `data:${b.mimeType};base64,${b.image}`;
}

async function toWebpBlob(dataUrl: string): Promise<Blob> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((bl) => (bl ? resolve(bl) : reject(new Error('webp 변환 실패'))), 'image/webp', 0.9),
  );
}

/** Uploads a data URL image to R2 (as WebP). Returns the public URL. */
export async function uploadGeneratedImage(dataUrl: string): Promise<string> {
  const blob = await toWebpBlob(dataUrl);
  const fd = new FormData();
  fd.append('file', new File([blob], `cardnews-${Date.now()}.webp`, { type: 'image/webp' }));
  fd.append('folder', 'marketing');
  const res = await fetch(`${BASE}/api/r2/upload`, {
    method: 'POST',
    headers: { 'x-admin-pin': PIN },
    body: fd,
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `이미지 업로드 실패: ${res.status}`);
  return b.url as string;
}

/** Convenience: generate + upload, returns the public R2 URL. */
export async function generateAndUpload(prompt: string, aspectRatio = '4:5'): Promise<string> {
  return uploadGeneratedImage(await generateImage(prompt, aspectRatio));
}

/** Uploads a user-selected image File to R2 as WebP. Returns the public URL. */
export async function uploadImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
  return uploadGeneratedImage(dataUrl);
}

/** Uploads a raw file (e.g. video mp4) to R2 without conversion. Returns the public URL. */
export async function uploadVideoFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', 'marketing/reels');
  const res = await fetch(`${BASE}/api/r2/upload`, {
    method: 'POST',
    headers: { 'x-admin-pin': PIN },
    body: fd,
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `영상 업로드 실패: ${res.status}`);
  return b.url as string;
}

/**
 * Uploads a reel COVER image to R2, preserving the original format (PNG/JPG —
 * NOT converted to WebP, since Instagram custom-cover upload rejects WebP).
 * Returns the public URL.
 */
export async function uploadCoverImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', 'marketing/reels/covers');
  const res = await fetch(`${BASE}/api/r2/upload`, {
    method: 'POST',
    headers: { 'x-admin-pin': PIN },
    body: fd,
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `커버 업로드 실패: ${res.status}`);
  return b.url as string;
}

/**
 * Uploads a reel INFOGRAPHIC image to R2, preserving the original format (PNG/JPG —
 * NOT WebP). 텍스트 없는 언어공용 인서트 이미지로, 렌더가 insertLabels 로 언어별 텍스트를 얹는다.
 * Returns the public URL.
 */
export async function uploadInfographicImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', 'marketing/reels/infographics');
  const res = await fetch(`${BASE}/api/r2/upload`, {
    method: 'POST',
    headers: { 'x-admin-pin': PIN },
    body: fd,
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || `인포그래픽 업로드 실패: ${res.status}`);
  return b.url as string;
}
