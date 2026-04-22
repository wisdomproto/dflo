// Section Service - Cloudflare R2 backed
// Reads: R2 public URL (GET <key>)
// Writes: ai-server /api/r2/website?key=<key> (PUT, PIN-protected)
//
// Two storage keys are supported:
//   - 'website.json'   : 병원 홈페이지(/) 섹션
//   - 'app-home.json'  : 환자 앱 홈(/app) 섹션
// 이미지 자체는 둘 다 같은 R2 버킷의 URL을 그대로 가리키므로 공유된다.
// 분리되는 것은 슬라이드 메타(텍스트, 순서, CTA, 카드 정보)뿐.

import type { WebsiteSection, Slide } from '../types/websiteSection';

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');
const AI_SERVER = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001';

export type SectionStorageKey = 'website.json' | 'app-home.json';

function getPin(): string {
  return sessionStorage.getItem('website_admin_pin') || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateSlides(slides: any[]): Slide[] {
  return (slides || []).map((s) => ({ ...s, template: s.template || 'banner' }));
}

const DEFAULT_SECTIONS: WebsiteSection[] = [
  {
    id: 'default-section-1',
    order_index: 0,
    title: '메인 배너',
    slides: [
      {
        template: 'banner',
        id: 'default-1',
        title: '우리 아이,\n얼마나 클까?',
        subtitle: '지금 바로 예상 키를 무료로 측정해보세요',
        ctaText: '예측키 무료 측정하기',
        ctaAction: 'scroll',
        ctaTarget: 'calculator',
        order: 0,
      },
    ],
  },
];

async function fetchSectionsFromKey(key: SectionStorageKey): Promise<WebsiteSection[] | null> {
  if (!R2_PUBLIC_URL) return null;
  try {
    const res = await fetch(`${R2_PUBLIC_URL}/${key}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    return data.map((row) => ({
      id: row.id,
      order_index: row.order_index,
      title: row.title || '',
      slides: migrateSlides(row.slides),
      showNav: row.showNav ?? true,
    }));
  } catch (e) {
    console.error(`[sections:${key}] fetch failed:`, e);
    return null;
  }
}

/**
 * Fetch sections JSON from R2.
 * - If `key` is missing in R2 and `fallbackKey` is provided, try fallback.
 * - If both fail, return DEFAULT_SECTIONS so UI never breaks.
 */
export async function fetchSections(
  key: SectionStorageKey = 'website.json',
  fallbackKey?: SectionStorageKey,
): Promise<WebsiteSection[]> {
  if (!R2_PUBLIC_URL) {
    console.warn('[sections] VITE_R2_PUBLIC_URL missing, using defaults');
    return DEFAULT_SECTIONS;
  }
  const primary = await fetchSectionsFromKey(key);
  if (primary && primary.length > 0) return primary;
  if (fallbackKey) {
    const fb = await fetchSectionsFromKey(fallbackKey);
    if (fb && fb.length > 0) return fb;
  }
  return DEFAULT_SECTIONS;
}

export async function saveSections(
  sections: WebsiteSection[],
  key: SectionStorageKey = 'website.json',
): Promise<WebsiteSection[]> {
  const payload = sections.map((s, idx) => ({
    id: s.id,
    order_index: idx,
    title: s.title || '',
    slides: s.slides || [],
    showNav: s.showNav ?? true,
  }));

  const res = await fetch(`${AI_SERVER}/api/r2/website?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': getPin(),
    },
    body: JSON.stringify({ data: payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`섹션 저장 실패: ${err.error || res.statusText}`);
  }

  return sections;
}
