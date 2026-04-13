// Storage 유틸 - Cloudflare R2 via ai-server /api/r2/upload
// (patient app 쪽 meal-photos 등은 여전히 supabase — 이 파일은 website 관리자용)

type Folder = 'recipes' | 'guides' | 'cases' | 'banners';

const AI_SERVER = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001';
const PIN_STORAGE_KEY = 'website_admin_pin';

function getPin(): string {
  return sessionStorage.getItem(PIN_STORAGE_KEY) || '';
}

export async function uploadImage(folder: Folder, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);

  const res = await fetch(`${AI_SERVER}/api/r2/upload`, {
    method: 'POST',
    headers: { 'x-admin-pin': getPin() },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`이미지 업로드 실패: ${err.error || res.statusText}`);
  }

  const { url } = await res.json();
  return url as string;
}

// Legacy no-op: 이미지 삭제는 히스토리 보존 정책으로 수행 안 함
export async function deleteImage(_publicUrl: string): Promise<void> {
  // no-op
}
