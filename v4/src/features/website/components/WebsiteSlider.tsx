import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface Props {
  id?: string;
  tag?: string;
  title: string;
  children: ReactNode[];
  /** Cards per view on desktop. Mobile always shows ~1.15 cards. Default 2. */
  desktopCards?: number;
  bgClass?: string;
  /** Show title as left sidebar instead of top header */
  sideHeader?: boolean;
}

export function WebsiteSlider({ id, tag, title, children, desktopCards = 2, bgClass = '', sideHeader = false }: Props) {

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

  const arrowNav = (
    <div className="flex items-center gap-2">
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
  );

  const scrollContent = (
    <>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
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
    </>
  );

  // Side header layout (title on left, cards on right)
  if (sideHeader) {
    return (
      <section id={id} className={`py-6 md:py-10 px-4 md:px-6 ${bgClass}`}>
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          {/* Mobile: top header */}
          <div className="md:hidden px-5 pt-6 pb-3">
            <h2 className="text-2xl font-extrabold text-[#0F6E56]">{title}</h2>
          </div>
          <div className="md:flex">
            {/* Desktop: side header */}
            <div className="hidden md:flex md:flex-col md:justify-between md:w-56 md:flex-shrink-0 md:p-8 md:border-r md:border-gray-100">
              <div>
                {tag && <p className="text-xs font-semibold text-[#0F6E56] mb-1">{tag}</p>}
                <h2 className="text-2xl font-extrabold text-[#0F6E56] leading-tight">{title}</h2>
              </div>
              <div className="mt-6">{arrowNav}</div>
            </div>
            {/* Cards */}
            <div className="flex-1 min-w-0 px-5 py-5 md:px-6 md:py-8">
              {scrollContent}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default: top header layout
  return (
    <section id={id} className={`py-6 md:py-10 px-4 md:px-6 ${bgClass}`}>
      <div className="max-w-5xl mx-auto px-5 py-8 md:px-8 md:py-10 bg-white rounded-2xl shadow-md border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            {tag && <p className="text-xs font-semibold text-[#0F6E56] mb-0.5">{tag}</p>}
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F6E56]">{title}</h2>
          </div>
          <div className="hidden md:flex">{arrowNav}</div>
        </div>
        {scrollContent}
      </div>
    </section>
  );
}
