// ================================================
// Exercise Service - 187 성장케어 v4
// exercises 테이블 (운동 마스터) read-only fetch
// ================================================

import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { Exercise } from '@/shared/types';

/** 활성 상태인 운동 마스터를 order_index 오름차순으로 가져온다. */
export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  if (error) {
    logger.error('fetchExercises failed', error);
    throw new Error('운동 목록을 불러오지 못했습니다.');
  }
  return (data ?? []) as Exercise[];
}

/**
 * youtube_url 에서 videoId 와 start 초를 뽑는다.
 * 지원 형식:
 *   https://www.youtube.com/watch?v=VIDEO_ID&t=42s
 *   https://www.youtube.com/watch?v=VIDEO_ID&t=42
 *   https://youtu.be/VIDEO_ID?t=42s
 *   https://www.youtube.com/embed/VIDEO_ID?start=42
 */
export function parseYouTubeUrl(url: string | null | undefined): {
  videoId: string;
  startSeconds: number;
} | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.replace(/^\//, '') || null;
    } else if (u.pathname.startsWith('/embed/')) {
      videoId = u.pathname.split('/')[2] || null;
    } else {
      videoId = u.searchParams.get('v');
    }
    if (!videoId) return null;

    let startSeconds = 0;
    const t = u.searchParams.get('t') ?? u.searchParams.get('start');
    if (t) {
      const m = /^(\d+)s?$/.exec(t.trim());
      if (m) startSeconds = parseInt(m[1], 10);
    }
    return { videoId, startSeconds };
  } catch {
    return null;
  }
}
