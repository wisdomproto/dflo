import React, { useEffect, useRef } from 'react';
import type { WebsiteSection } from '../types/websiteSection';
import { SectionCarousel } from '../components/SectionCarousel';

// ============= Single Section Card with arrows =============
function PreviewSectionCard({
  section,
  isActive,
  activeSlideIndex,
  onClick,
  onSlideChange,
}: {
  section: WebsiteSection;
  isActive: boolean;
  activeSlideIndex: number;
  onClick: () => void;
  onSlideChange?: (slideIdx: number) => void;
}) {
  const [localSlide, setLocalSlide] = React.useState(0);
  const total = section.slides.length;

  // Sync with editor when this is the active section
  useEffect(() => {
    if (isActive) setLocalSlide(activeSlideIndex);
  }, [isActive, activeSlideIndex]);

  const changeSlide = (newIdx: number) => {
    setLocalSlide(newIdx);
    // Sync back to editor if this is the active section
    if (isActive && onSlideChange) onSlideChange(newIdx);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    changeSlide((localSlide - 1 + total) % total);
  };
  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    changeSlide((localSlide + 1) % total);
  };

  if (!section.slides.length) {
    return (
      <div
        onClick={onClick}
        className={`rounded-2xl overflow-hidden bg-white shadow-md cursor-pointer transition-all ${
          isActive ? 'ring-2 ring-[#0F6E56] ring-offset-2' : 'opacity-60 hover:opacity-80'
        }`}
      >
        <div className="aspect-[4/5] flex items-center justify-center bg-gray-100">
          <p className="text-gray-400 text-[10px]">빈 섹션</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl overflow-hidden bg-white shadow-md cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-[#0F6E56] ring-offset-1' : 'opacity-50 hover:opacity-75'
      }`}
    >
      {/* Section label */}
      {isActive && (
        <div className="absolute top-1.5 left-1.5 z-30 bg-[#0F6E56] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
          편집 중
        </div>
      )}

      {/* Carousel — use force-mobile CSS but respect inline styles */}
      <div className="force-mobile">
        <style>{`
          .force-mobile h1 { line-height: 1.2 !important; }
          .force-mobile .text-\\[36px\\] { font-size: 18px; }
          .force-mobile .md\\:text-\\[48px\\] { font-size: 18px; }
          .force-mobile .text-\\[15px\\] { font-size: 10px; }
          .force-mobile .md\\:text-lg { font-size: 10px; }
          .force-mobile .text-xl, .force-mobile .text-2xl { font-size: 14px !important; }
        `}</style>
        <SectionCarousel
          key={`preview-${section.id}`}
          slides={section.slides}
          initialIndex={localSlide}
          showNav={section.showNav ?? true}
        />
      </div>

      {/* Left/Right arrows */}
      {total > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] hover:bg-black/60"
          >
            ‹
          </button>
          <button
            onClick={goNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] hover:bg-black/60"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

// ============= Admin Preview Panel =============
interface AdminPreviewPanelProps {
  sections: WebsiteSection[];
  activeSectionIndex: number;
  activeSlideIndex: number;
  onSelectSection: (idx: number) => void;
  onSelectSlide: (slideIdx: number) => void;
}

export function AdminPreviewPanel({
  sections,
  activeSectionIndex,
  activeSlideIndex,
  onSelectSection,
  onSelectSlide,
}: AdminPreviewPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to active section
  useEffect(() => {
    const el = sectionRefs.current[activeSectionIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSectionIndex]);

  return (
    <div className="w-full lg:w-[35%] lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] bg-gray-50 lg:bg-slate-800 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 lg:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 lg:text-gray-400">미리보기</p>
        <p className="text-[10px] text-gray-400 lg:text-gray-500">
          {sections.length}개 섹션
        </p>
      </div>

      {/* Scrollable phone-style preview — 폭은 375px 고정 (실제 모바일과 동일).
          부모 패널이 좁으면 horizontal scroll 로 처리하여 비율을 유지한다. */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3">
        <div className="mx-auto" style={{ width: '375px' }}>
          {/* Phone frame top (notch) */}
          <div className="bg-gray-200 lg:bg-gray-700 rounded-t-[1.5rem] h-5 flex items-center justify-center">
            <div className="w-16 h-1.5 bg-gray-300 lg:bg-gray-600 rounded-full" />
          </div>

          {/* Phone body */}
          <div className="bg-gray-200 lg:bg-gray-700 px-1 pb-1">
            <div className="bg-gray-100 rounded-sm overflow-hidden">
              {/* Website-like content */}
              <div className="flex flex-col gap-2 p-2">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    ref={(el) => { sectionRefs.current[idx] = el; }}
                  >
                    <PreviewSectionCard
                      section={section}
                      isActive={idx === activeSectionIndex}
                      activeSlideIndex={activeSlideIndex}
                      onClick={() => onSelectSection(idx)}
                      onSlideChange={onSelectSlide}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Phone frame bottom */}
          <div className="bg-gray-200 lg:bg-gray-700 rounded-b-[1.5rem] h-4 flex items-center justify-center">
            <div className="w-10 h-1 bg-gray-300 lg:bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
