import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface Props {
  id?: string;
  tag: string;
  title: string;
  children: ReactNode[];
  /** Cards per view on desktop. Mobile always shows ~1.15 cards. Default 2. */
  desktopCards?: number;
  bgClass?: string;
}

export function WebsiteSlider({ id, tag, title, children, desktopCards = 2, bgClass = '' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const total = children.length;

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

  // Dynamic card width class based on desktopCards
  const desktopWidthMap: Record<number, string> = {
    2: 'md:w-[calc((100%-16px)/2)]',
    3: 'md:w-[calc((100%-32px)/3)]',
    4: 'md:w-[calc((100%-48px)/4)]',
  };
  const desktopCardCls = desktopWidthMap[desktopCards] ?? desktopWidthMap[3];

  return (
    <section id={id} className={`py-8 md:py-12 ${bgClass}`}>
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-[#0F6E56] mb-0.5">{tag}</p>
            <h2 className="text-lg md:text-xl font-extrabold text-gray-900">{title}</h2>
          </div>
          {/* Arrow nav (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => scrollBy(-1)} disabled={activeIndex === 0}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center
                         text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => scrollBy(1)} disabled={activeIndex >= total - 1}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center
                         text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children.map((child, i) => (
            <div key={i}
              className={`snap-start flex-shrink-0 w-[85vw] ${desktopCardCls}`}>
              {child}
            </div>
          ))}
        </div>

        {/* Dots */}
        {total > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: total }).map((_, i) => (
              <button key={i} onClick={() => scrollToIndex(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-5 h-1.5 bg-[#0F6E56]' : 'w-1.5 h-1.5 bg-gray-200'
                }`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
