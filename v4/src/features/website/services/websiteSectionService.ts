// Website Section Service - unified section management
// All sections (including hero banner) stored in website_sections table
// slides column is JSONB

import { supabase } from '@/shared/lib/supabase';
import type { WebsiteSection, BannerSlide } from '../types/websiteSection';

const TABLE = 'website_sections';

// ============= Default sections (fallback when DB is empty) =============
const DEFAULT_SECTIONS: WebsiteSection[] = [
  {
    id: 'default-section-1',
    order_index: 0,
    template: 'banner',
    title: '메인 배너',
    slides: [
      {
        id: 'default-1',
        title: '우리 아이,\n얼마나 클까?',
        subtitle: '지금 바로 예상 키를 무료로 측정해보세요',
        ctaText: '예측키 무료 측정하기',
        ctaAction: 'scroll',
        ctaTarget: 'calculator',
        imageUrl: '/images/slide1_bg.jpg',
        childImageUrl: '/images/slide1_child.png',
        order: 0,
      },
      {
        id: 'default-2',
        title: '성조숙증,\n골든타임을 놓치지 마세요',
        subtitle: '조기 발견과 맞춤 치료가 아이의 키를 바꿉니다',
        ctaText: '',
        ctaAction: 'scroll',
        ctaTarget: 'programs',
        imageUrl: '/images/slide3_bg.jpg',
        childImageUrl: '/images/slide3_child.png',
        order: 1,
      },
      {
        id: 'default-3',
        title: '187 성장\n통합 프로그램',
        subtitle: '체계적인 성장 관리로 아이의 가능성을 키웁니다',
        ctaText: '',
        ctaAction: 'scroll',
        ctaTarget: 'programs',
        imageUrl: '/images/slide5_bg.jpg',
        childImageUrl: '/images/slide5_child.png',
        order: 2,
      },
    ],
  },
];

// ============= Legacy migration: read from website_banners =============

async function fetchLegacyBanners(): Promise<BannerSlide[]> {
  try {
    const { data, error } = await supabase
      .from('website_banners')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error || !data || data.length === 0) return [];

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      ctaText: row.cta_text,
      ctaAction: row.cta_action as 'scroll' | 'link',
      ctaTarget: row.cta_target,
      imageUrl: row.image_url || undefined,
      bgGradient: row.bg_gradient || undefined,
      titleSize: row.title_size || undefined,
      titleColor: row.title_color || undefined,
      subtitleSize: row.subtitle_size || undefined,
      subtitleColor: row.subtitle_color || undefined,
      order: row.order_index,
    }));
  } catch {
    return [];
  }
}

// ============= CRUD =============

export async function fetchSections(): Promise<WebsiteSection[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        order_index: row.order_index,
        template: row.template || 'banner',
        title: row.title || '',
        slides: row.slides || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    }

    // website_sections empty → try legacy website_banners table
    const legacySlides = await fetchLegacyBanners();
    if (legacySlides.length > 0) {
      return [{
        id: 'legacy-section-1',
        order_index: 0,
        template: 'banner',
        title: '메인 배너',
        slides: legacySlides,
      }];
    }

    return DEFAULT_SECTIONS;
  } catch {
    // website_sections table doesn't exist yet → try legacy
    const legacySlides = await fetchLegacyBanners();
    if (legacySlides.length > 0) {
      return [{
        id: 'legacy-section-1',
        order_index: 0,
        template: 'banner',
        title: '메인 배너',
        slides: legacySlides,
      }];
    }

    return DEFAULT_SECTIONS;
  }
}

export async function saveSections(sections: WebsiteSection[]): Promise<WebsiteSection[]> {
  // Delete all existing sections, then insert new ones
  const { error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (deleteError) throw new Error(`섹션 삭제 실패: ${deleteError.message}`);

  if (sections.length === 0) return [];

  const rows = sections.map((s, idx) => ({
    order_index: idx,
    template: s.template,
    title: s.title || '',
    slides: s.slides || [],
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rows)
    .select();

  if (error) throw new Error(`섹션 저장 실패: ${error.message}`);

  return (data || []).map((row) => ({
    id: row.id,
    order_index: row.order_index,
    template: row.template || 'banner',
    title: row.title || '',
    slides: row.slides || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
