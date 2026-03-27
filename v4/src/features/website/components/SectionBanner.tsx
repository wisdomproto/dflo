import { useRef, useState, useCallback, useEffect } from 'react';

interface SectionItem {
  id: string;
  emoji: string;
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
}

interface WebsiteSection {
  id: string;
  order: number;
  sectionType: 'growthGuide' | 'recipe' | 'exercise' | 'case';
  title: string;
  subtitle?: string;
  items?: SectionItem[];
  bgColor?: string;
  titleColor?: string;
}

interface Props {
  section: WebsiteSection;
}

export function SectionBanner({ section }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const items = section.items || [];
  const total = items.length;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || total === 0) return;
    const firstChild = el.children[0] as HTMLElement | undefined;
    if (!firstChild) return;
    const gap = 16;
    const idx = Math.round(el.scrollLeft / (firstChild.offsetWidth + gap));
    setActiveIndex(Math.min(idx, total - 1));
  }, [total]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstChild = el.children[0] as HTMLElement | undefined;
    if (!firstChild) return;
    const gap = 16;
    el.scrollTo({ left: idx * (firstChild.offsetWidth + gap), behavior: 'smooth' });
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(activeIndex + dir, total - 1));
    scrollToIndex(next);
  };

  if (total === 0) return null;

  return (
    <section
      className="min-h-dvh w-full flex flex-col justify-center items-center px-4 py-8"
      style={{ backgroundColor: section.bgColor || '#fff' }}
    >
      <div className="max-w-5xl w-full h-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <h2
              className="text-3xl md:text-4xl font-bold mb-2"
              style={{ color: section.titleColor || '#111827' }}
            >
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="text-gray-500 text-sm md:text-base">{section.subtitle}</p>
            )}
          </div>
          
          {/* Arrow Navigation */}
          {total > 1 && (
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => scrollBy(-1)}
                disabled={activeIndex === 0}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center
                           text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => scrollBy(1)}
                disabled={activeIndex >= total - 1}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center
                           text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Carousel Container */}
        <div className="flex flex-col h-full w-full flex-1">
          {/* Scroll Container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="snap-start flex-shrink-0 w-[85vw] md:w-[calc((100%-16px)/2)] h-full"
              >
                <div className="bg-white rounded-2xl p-6 h-full shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  {item.imageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden h-40 flex-shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-3 flex-1 flex-col">
                    <div className="flex items-start gap-3 w-full">
                      <span className="text-3xl flex-shrink-0">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1 break-words">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 flex-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots Navigation */}
          {total > 1 && (
            <div className="flex justify-center gap-1.5 py-4 mt-4 flex-shrink-0">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToIndex(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? 'w-6 h-2 bg-[#0F6E56]'
                      : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
