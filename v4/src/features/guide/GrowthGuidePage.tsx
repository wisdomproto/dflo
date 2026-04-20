import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// WebsiteLayout removed - standalone page
import guideData from './data/growthGuide.json';
import type { GuideCategory, GuideCard } from './types';

const categories = (guideData as any).growth_guide.categories as GuideCategory[];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  basics: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: '#667eea' },
  nutrition: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: '#48bb78' },
  clinic: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', accent: '#38b2ac' },
  lifestyle: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: '#ed8936' },
};

export default function GrowthGuidePage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const allCards = categories.flatMap((cat) =>
    cat.cards.map((card) => ({ ...card, categoryId: cat.id, categoryName: cat.name }))
  );

  const filteredCards =
    activeCategory === 'all'
      ? allCards
      : allCards.filter((c) => c.categoryId === activeCategory);

  const handleCardClick = (card: GuideCard & { categoryId: string }) => {
    navigate(`/guide/${card.id}`, { state: { categoryId: card.categoryId } });
  };

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb]">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute bottom-2 left-4 w-24 h-24 rounded-full bg-white/20 blur-xl" />
        </div>
        <div className="relative px-5 pt-8 pb-6 text-white">
          <p className="text-xs font-medium tracking-widest uppercase opacity-80 mb-1">
            187 Growth Guide
          </p>
          <h1 className="text-2xl font-bold tracking-tight leading-tight mb-2">
            성장 가이드
          </h1>
          <p className="text-sm opacity-90 leading-relaxed max-w-xs">
            우리 아이 성장의 모든 것,{' '}
            <span className="font-semibold">14개 가이드</span>로 완벽 정리
          </p>
          <div className="flex gap-3 mt-4">
            {categories.map((cat) => (
              <div key={cat.id} className="text-center">
                <div className="text-lg">{cat.icon}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{cat.cards.length}편</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div
          ref={scrollRef}
          className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
        >
          <TabPill
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            label="전체"
            emoji="📚"
          />
          {categories.map((cat) => (
            <TabPill
              key={cat.id}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              label={cat.name}
              emoji={cat.icon}
            />
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 py-5 space-y-3 pb-24">
        {activeCategory !== 'all' && (
          <CategoryHeader
            category={categories.find((c) => c.id === activeCategory)!}
          />
        )}
        {filteredCards.map((card, i) => (
          <CardItem
            key={card.id}
            card={card}
            index={i}
            onClick={() => handleCardClick(card)}
          />
        ))}
      </div>
    </div>
  );
}

function TabPill({
  active,
  onClick,
  label,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 shrink-0 ${
        active
          ? 'bg-[#667eea] text-white shadow-md shadow-indigo-200'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className="text-base">{emoji}</span>
      {label}
    </button>
  );
}

function CategoryHeader({ category }: { category: GuideCategory }) {
  const colors = CATEGORY_COLORS[category.id] || CATEGORY_COLORS.basics;
  return (
    <div className={`rounded-2xl ${colors.bg} px-5 py-4 mb-2`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{category.icon}</span>
        <h2 className={`text-lg font-bold ${colors.text}`}>{category.name}</h2>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
    </div>
  );
}

function CardItem({
  card,
  index,
  onClick,
}: {
  card: GuideCard & { categoryId: string; categoryName: string };
  index: number;
  onClick: () => void;
}) {
  const colors = CATEGORY_COLORS[card.categoryId] || CATEGORY_COLORS.basics;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.98] transition-all duration-200"
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'fadeIn 0.4s ease-out both',
      }}
    >
      <div className="flex gap-0">
        {/* Thumbnail */}
        <div className="w-[110px] shrink-0 relative overflow-hidden">
          <img
            src={card.thumbnail}
            alt={card.title}
            className="w-full h-full object-cover min-h-[130px]"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = card.thumbnail_alt;
            }}
          />
          <div
            className="absolute top-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center text-sm backdrop-blur-sm"
            style={{ backgroundColor: colors.accent + '20' }}
          >
            {card.icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3.5 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: colors.accent + '15',
                color: colors.accent,
              }}
            >
              {card.categoryName}
            </span>
            <span className="text-[10px] text-gray-400">
              {card.reading_time}
            </span>
          </div>

          <h3 className="font-bold text-[15px] text-gray-900 leading-snug mb-1 line-clamp-2">
            {card.title}
          </h3>

          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
            {card.subtitle}
          </p>

          <div className="flex flex-wrap gap-1">
            {card.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-gray-400 bg-gray-50 rounded px-1.5 py-0.5"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center pr-3 text-gray-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
