// Website Section Service - Cloudflare R2 backed
// Reads: R2 public URL (GET website.json)
// Writes: ai-server /api/r2/website (PUT, PIN-protected)

import type { WebsiteSection, Slide } from '../types/websiteSection';

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');
const AI_SERVER = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001';
const WEBSITE_KEY = 'website.json';

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

export async function fetchSections(): Promise<WebsiteSection[]> {
  if (!R2_PUBLIC_URL) {
    console.warn('[website] VITE_R2_PUBLIC_URL missing, using defaults');
    return DEFAULT_SECTIONS;
  }
  try {
    const res = await fetch(`${R2_PUBLIC_URL}/${WEBSITE_KEY}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`${res.status}`);
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
    console.error('[website] fetch failed:', e);
    return DEFAULT_SECTIONS;
  }
}

export async function saveSections(sections: WebsiteSection[]): Promise<WebsiteSection[]> {
  const payload = sections.map((s, idx) => ({
    id: s.id,
    order_index: idx,
    title: s.title || '',
    slides: s.slides || [],
    showNav: s.showNav ?? true,
  }));

  const res = await fetch(`${AI_SERVER}/api/r2/website`, {
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
