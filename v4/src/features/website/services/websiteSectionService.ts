// Website Section Service - unified section management
// All sections stored in website_sections table, slides column is JSONB
// Each slide has its own template field ('banner' | 'video')

import { supabase } from '@/shared/lib/supabase';
import type { WebsiteSection, Slide } from '../types/websiteSection';

const TABLE = 'website_sections';

// Ensure each slide has a template field (backward compat with old data)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateSlides(slides: any[], sectionTemplate?: string): Slide[] {
  const fallback = sectionTemplate || 'banner';
  return (slides || []).map((s) => ({
    ...s,
    template: s.template || fallback,
  }));
}

// ============= Default sections (fallback when DB is empty) =============
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
        imageUrl: '/images/slide1_bg.jpg',
        childImageUrl: '/images/slide1_child.png',
        order: 0,
      },
      {
        template: 'banner',
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
        template: 'banner',
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
  {
    id: 'default-section-3',
    order_index: 2,
    title: '성장 운동 영상',
    slides: [
      { template: 'video', id: 'vid-1', videoUrl: 'https://www.youtube.com/watch?v=-DULXNYk3Sg', title: '목 & 등 스트레칭', description: '목과 등의 긴장을 풀어주는 스트레칭으로\n바른 자세와 성장판 자극을 도와줍니다', order: 0 },
      { template: 'video', id: 'vid-2', videoUrl: 'https://www.youtube.com/watch?v=RzuXWJJf7bY', title: '복부 & 허벅지 뒤 스트레칭', description: '복부와 하체 유연성을 높여\n성장에 필요한 혈액순환을 촉진합니다', order: 1 },
      { template: 'video', id: 'vid-3', videoUrl: 'https://www.youtube.com/watch?v=cBYdbmVwB0E', title: '옆구리 & 허벅지 앞 스트레칭', description: '옆구리와 대퇴사두근을 충분히 늘려\n균형 잡힌 성장을 지원합니다', order: 2 },
      { template: 'video', id: 'vid-4', videoUrl: 'https://www.youtube.com/watch?v=U62yLjlBSE8', title: '등 근육운동', description: '등 근육을 강화하여 바른 자세를 유지하고\n척추 성장판에 적절한 자극을 줍니다', order: 3 },
      { template: 'video', id: 'vid-5', videoUrl: 'https://www.youtube.com/watch?v=kcgO4-ifJqE', title: '엉덩이 스트레칭', description: '고관절 유연성을 높여 하체 성장판을\n효과적으로 자극하는 스트레칭입니다', order: 4 },
      { template: 'video', id: 'vid-6', videoUrl: 'https://www.youtube.com/watch?v=bqjB7pRbIfw', title: '엉덩이 근육 운동', description: '하체 근력을 키워 성장 호르몬 분비를\n촉진하는 근육 운동입니다', order: 5 },
    ],
  },
];

// ============= Legacy migration: read from website_banners =============

async function fetchLegacyBanners(): Promise<Slide[]> {
  try {
    const { data, error } = await supabase
      .from('website_banners')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error || !data || data.length === 0) return [];

    return data.map((row) => ({
      template: 'banner' as const,
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
        title: row.title || '',
        slides: migrateSlides(row.slides, row.template),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    }

    // website_sections empty -> try legacy website_banners table
    const legacySlides = await fetchLegacyBanners();
    if (legacySlides.length > 0) {
      return [{
        id: 'legacy-section-1',
        order_index: 0,
        title: '메인 배너',
        slides: legacySlides,
      }];
    }

    return DEFAULT_SECTIONS;
  } catch {
    const legacySlides = await fetchLegacyBanners();
    if (legacySlides.length > 0) {
      return [{
        id: 'legacy-section-1',
        order_index: 0,
        title: '메인 배너',
        slides: legacySlides,
      }];
    }

    return DEFAULT_SECTIONS;
  }
}

export async function saveSections(sections: WebsiteSection[]): Promise<WebsiteSection[]> {
  const { error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) throw new Error(`섹션 삭제 실패: ${deleteError.message}`);

  if (sections.length === 0) return [];

  const rows = sections.map((s, idx) => ({
    order_index: idx,
    template: 'banner', // keep column populated for DB compat
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
    title: row.title || '',
    slides: migrateSlides(row.slides, row.template),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
