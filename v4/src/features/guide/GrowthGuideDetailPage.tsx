import { useParams, useNavigate } from 'react-router-dom';
// WebsiteLayout removed - standalone page
import guideData from './data/growthGuide.json';
import type { GuideCategory, GuideCard, GuideSection } from './types';
import { SectionRenderer } from './components/SectionRenderer';
import { AnimatedGrowthChart } from './components/AnimatedGrowthChart';

const categories = (guideData as any).growth_guide.categories as GuideCategory[];

const CATEGORY_COLORS: Record<string, string> = {
  basics: '#667eea',
  nutrition: '#48bb78',
  clinic: '#38b2ac',
  lifestyle: '#ed8936',
};

function findCard(cardId: string): { card: GuideCard; category: GuideCategory } | null {
  for (const cat of categories) {
    const card = cat.cards.find((c) => c.id === cardId);
    if (card) return { card, category: cat };
  }
  return null;
}

export default function GrowthGuideDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();

  const result = cardId ? findCard(cardId) : null;
  if (!result) {
    return (
      <div className="min-h-dvh flex flex-col bg-white">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">가이드를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const { card, category } = result;
  const accent = CATEGORY_COLORS[category.id] || '#667eea';

  // Find adjacent cards for navigation
  const allCards = categories.flatMap((cat) =>
    cat.cards.map((c) => ({ ...c, categoryId: cat.id }))
  );
  const currentIndex = allCards.findIndex((c) => c.id === card.id);
  const prevCard = currentIndex > 0 ? allCards[currentIndex - 1] : null;
  const nextCard = currentIndex < allCards.length - 1 ? allCards[currentIndex + 1] : null;

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Top bar removed - standalone page */}

      {/* Hero header */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}08)` }}>
        <div className="px-5 pt-6 pb-5">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 leading-tight mb-1.5">
            <span className="text-2xl">{card.icon}</span>
            {card.title}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {card.subtitle}
          </p>

          {/* Key points */}
          <div className="mt-4 flex flex-col gap-1.5">
            {card.key_points.map((point, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-gray-700 shadow-sm"
              >
                <span style={{ color: accent }} className="shrink-0">●</span>
                {point}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="px-4 py-5 space-y-4 pb-8">
        {card.detail.sections
          .filter((s) => s.type !== 'cta')
          .map((section, i) => (
          <div key={i}>
            <SectionRenderer section={section} accent={accent} index={i} />
            {/* card_01: 백분위 설명 뒤에 성장 도표 삽입 */}
            {card.id === 'card_01' && section.type === 'explanation' && (
              <div className="mt-4">
                <AnimatedGrowthChart />
              </div>
            )}
            {/* card_13: intro 뒤에 스트레스 관리 이미지 삽입 */}
            {card.id === 'card_13' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/Edit_this_Korean_infographic_image_Remove_the_Kor-1775460393046.jpg"
                  alt="스트레스 관리"
                  className="w-full"
                />
              </div>
            )}
            {/* card_15: intro 뒤에 성조숙증 이미지 삽입 */}
            {card.id === 'card_15' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/Replace_the_bottom_left_child_figure_marked_as_Ma-1775459363989.jpg"
                  alt="우리 아이 혹시 성조숙증?"
                  className="w-full"
                />
              </div>
            )}
            {/* card_12: intro 뒤에 바른 자세 이미지 삽입 */}
            {card.id === 'card_12' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/Korean_pediatric_posture_infographic_showing_drama-1775456872817.jpg"
                  alt="바른 자세로 숨은 키 찾기"
                  className="w-full"
                />
              </div>
            )}
            {/* card_11: intro 뒤에 운동 가이드 이미지 삽입 */}
            {card.id === 'card_11' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/Korean_pediatric_exercise_infographic_for_child_gr-1775455549917.jpg"
                  alt="키 크는 운동 가이드"
                  className="w-full"
                />
              </div>
            )}
            {/* card_10: intro 뒤에 수면과 성장 이미지 삽입 */}
            {card.id === 'card_10' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/Korean_pediatric_sleep_and_growth_infographic_Nig-1775455083565.jpg"
                  alt="잠이 키를 키운다"
                  className="w-full"
                />
              </div>
            )}
            {/* card_09: intro 뒤에 성장 식단 피라미드 이미지 삽입 */}
            {card.id === 'card_09' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/Korean_child_growth_food_pyramid_infographic_with_-1775454764797.jpg"
                  alt="성장 식단 피라미드"
                  className="w-full"
                />
              </div>
            )}
            {/* card_08: intro 뒤에 핵심 영양소 이미지 삽입 */}
            {card.id === 'card_08' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/Korean_pediatric_nutrition_infographic_with_Korean-1775454162980.jpg"
                  alt="키 크는 핵심 영양소"
                  className="w-full"
                />
              </div>
            )}
            {/* card_05: intro 뒤에 나쁜 식습관 이미지 삽입 */}
            {card.id === 'card_05' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/Korean_pediatric_health_infographic_with_Korean_te-1775453541363.jpg"
                  alt="성장을 방해하는 나쁜 식습관"
                  className="w-full"
                />
              </div>
            )}
            {/* card_04: intro 뒤에 유전vs환경 이미지 삽입 */}
            {card.id === 'card_04' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/growth-infographic-korean-final.jpg"
                  alt="유전 80% vs 환경 20%"
                  className="w-full"
                />
              </div>
            )}
            {/* card_02: intro 뒤에 4단계 이미지 삽입 */}
            {card.id === 'card_02' && section.type === 'intro' && (
              <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/images/guide/growth-stages.jpg"
                  alt="아이 성장의 4단계"
                  className="w-full"
                />
              </div>
            )}
          </div>
        ))}

        {/* Bottom highlight */}
        {card.detail.highlight && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: accent + '10' }}
          >
            <p className="text-sm font-medium" style={{ color: accent }}>
              {card.detail.highlight}
            </p>
          </div>
        )}
      </div>

      {/* Prev/Next navigation removed */}
    </div>
  );
}
