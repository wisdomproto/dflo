// 발행 전 순수 헬퍼: 플랫폼-콘텐츠 호환 검증, 채널→타겟 id, HTML→텍스트.
export type Platform = 'facebook' | 'instagram' | 'threads';

export function validatePublish(platform: Platform, imageUrls: string[]): { ok: boolean; reason?: string } {
  if (platform === 'instagram' && imageUrls.length === 0) {
    return { ok: false, reason: 'Instagram은 이미지가 1장 이상 필요합니다(텍스트 전용 불가).' };
  }
  return { ok: true };
}

export function targetIdFor(
  ch: { platform: string; meta_page_id?: string | null; meta_ig_id?: string | null; meta_threads_id?: string | null },
  platform: Platform,
): string | null {
  if (platform === 'instagram') return ch.meta_ig_id ?? null;
  if (platform === 'facebook') return ch.meta_page_id ?? null;
  return ch.meta_threads_id ?? null;
}

export function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
