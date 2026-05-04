import { useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { WebsiteSection, SlideTemplate, BannerSlide, VideoSlide, CasesSlide, IframeSlide, FaqSlide } from '../types/websiteSection';
import type { SectionType } from './AdminWebsitePage';
import { BannerSlideEditor } from './BannerSlideEditor';
import { VideoSlideEditor } from './VideoSlideEditor';
import { CasesSlideEditor } from './CasesSlideEditor';
import { IframeSlideEditor } from './IframeSlideEditor';
import { FaqSlideEditor } from './FaqSlideEditor';
import { SortableSectionTab, SortableSlideTab } from './SortableTabs';
import { ConfirmModal } from './ConfirmModal';

interface AdminEditorPanelProps {
  sections: WebsiteSection[];
  activeSection: number;
  activeSlide: number;
  showAddMenu: boolean;
  sensors: ReturnType<typeof import('@dnd-kit/core').useSensors>;
  onSetActiveSection: (idx: number) => void;
  onSetActiveSlide: (idx: number) => void;
  onSetShowAddMenu: (show: boolean) => void;
  onAddSection: (type?: SectionType) => void;
  onRemoveSection: (idx: number) => void;
  onAddSlide: (template: SlideTemplate) => void;
  onRemoveSlide: (idx: number) => void;
  onUpdateSlide: (slideIdx: number, updates: Record<string, unknown>) => void;
  onUpdateSectionTitle: (title: string) => void;
  onUpdateSection: (updates: Partial<WebsiteSection>) => void;
  onSectionDragEnd: (event: DragEndEvent) => void;
  onSlideDragEnd: (event: DragEndEvent) => void;
  onMoveSlide: (fromIdx: number, toIdx: number) => void;
  imageHistory: string[];
}

export function AdminEditorPanel({
  sections,
  activeSection,
  activeSlide,
  showAddMenu,
  sensors,
  onSetActiveSection,
  onSetActiveSlide,
  onSetShowAddMenu,
  onAddSection,
  onRemoveSection,
  onAddSlide,
  onRemoveSlide,
  onUpdateSlide,
  onUpdateSectionTitle,
  onUpdateSection,
  onSectionDragEnd,
  onSlideDragEnd,
  onMoveSlide,
  imageHistory,
}: AdminEditorPanelProps) {
  const sec = sections[activeSection];
  const slide = sec?.slides[activeSlide] || null;

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  // 섹션 추가 picker 토글
  const [showSectionTypeMenu, setShowSectionTypeMenu] = useState(false);

  const confirmDeleteSection = () => {
    const name = sec?.title || `섹션 ${activeSection + 1}`;
    setConfirmModal({
      message: `"${name}" 섹션을 삭제하시겠습니까?\n포함된 모든 슬라이드가 함께 삭제됩니다.`,
      onConfirm: () => { onRemoveSection(activeSection); setConfirmModal(null); },
    });
  };

  const confirmDeleteSlide = () => {
    const slideType =
      slide?.template === 'video' ? '영상'
      : slide?.template === 'cases' ? '사례'
      : slide?.template === 'iframe' ? '페이지'
      : slide?.template === 'faq' ? 'FAQ'
      : '배너';
    setConfirmModal({
      message: `${slideType} ${activeSlide + 1} 슬라이드를 삭제하시겠습니까?`,
      onConfirm: () => { onRemoveSlide(activeSlide); setConfirmModal(null); },
    });
  };

  return (
    <div className="w-full lg:w-[65%] lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto px-4 py-4 space-y-4">
      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Section Tabs — inline rename + delete */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-gray-200" style={{ touchAction: 'none' }}>
            {sections.map((s, idx) => (
              <SortableSectionTab
                key={s.id}
                section={s}
                idx={idx}
                isActive={activeSection === idx}
                canDelete={sections.length > 1}
                onClick={() => { onSetActiveSection(idx); onSetActiveSlide(0); }}
                onRename={(title) => onUpdateSectionTitle(title)}
                onDelete={confirmDeleteSection}
              />
            ))}
            <div className="shrink-0 ml-auto relative">
              <button onClick={() => setShowSectionTypeMenu((v) => !v)}
                className="px-3 py-2 text-sm font-semibold text-[#0F6E56] hover:bg-[#E8F5F0] rounded-t-xl transition-all">
                + 추가
              </button>
              {showSectionTypeMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden min-w-[200px]">
                  <SectionTypeMenuItem icon="📸" title="일반 카드 섹션" desc="배너·영상·사례 캐러셀"
                    onClick={() => { onAddSection('card'); setShowSectionTypeMenu(false); }} />
                  <SectionTypeMenuItem icon="🌐" title="페이지 섹션" desc="iframe full-bleed (info-stack)"
                    onClick={() => { onAddSection('iframe'); setShowSectionTypeMenu(false); }} />
                  <SectionTypeMenuItem icon="❓" title="FAQ 섹션" desc="아코디언 Q&A"
                    onClick={() => { onAddSection('faq'); setShowSectionTypeMenu(false); }} />
                </div>
              )}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      {/* Section-level options */}
      {sec && (
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <label
            className={`flex items-center gap-1.5 cursor-pointer select-none rounded-md px-2 py-1 border transition-colors ${
              sec.visible !== false
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-slate-200 bg-slate-100 text-slate-500'
            }`}
            title="체크 해제하면 환자 화면에서 이 섹션이 숨겨집니다"
          >
            <input
              type="checkbox"
              checked={sec.visible !== false}
              onChange={(e) => onUpdateSection({ visible: e.target.checked })}
              className="accent-emerald-500 w-3.5 h-3.5"
            />
            <span className="font-semibold">
              {sec.visible !== false ? '👁️ 노출 중' : '🙈 숨김'}
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sec.showNav ?? true}
              onChange={(e) => onUpdateSection({ showNav: e.target.checked })}
              className="accent-[#0F6E56] w-3.5 h-3.5"
            />
            <span className="text-gray-600">슬라이드 인디케이터 (하단 도트)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sec.fullBleed ?? false}
              onChange={(e) => onUpdateSection({ fullBleed: e.target.checked })}
              className="accent-[#0F6E56] w-3.5 h-3.5"
            />
            <span className="text-gray-600">카드 프레임 제거 (viewport 가득)</span>
          </label>
        </div>
      )}

      {/* Slide Tabs + Controls */}
      {sec && (
        <div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSlideDragEnd}>
            <SortableContext items={sec.slides.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex items-center gap-1.5 flex-wrap pb-1" style={{ touchAction: 'none' }}>
                {sec.slides.map((sl, idx) => (
                  <SortableSlideTab
                    key={sl.id}
                    slide={sl}
                    idx={idx}
                    isActive={idx === activeSlide}
                    canDelete={sec.slides.length > 1}
                    onClick={() => onSetActiveSlide(idx)}
                    onDelete={confirmDeleteSlide}
                  />
                ))}

                {/* Slide move controls */}
                {slide && (
                  <div className="flex items-center gap-0.5 ml-1">
                    <button onClick={() => { if (activeSlide > 0) onMoveSlide(activeSlide, activeSlide - 1); }}
                      disabled={activeSlide === 0}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-xs">←</button>
                    <button onClick={() => { if (activeSlide < sec.slides.length - 1) onMoveSlide(activeSlide, activeSlide + 1); }}
                      disabled={activeSlide === sec.slides.length - 1}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-xs">→</button>
                  </div>
                )}

                <button onClick={() => onSetShowAddMenu(!showAddMenu)}
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors">
                  +
                </button>
              </div>
            </SortableContext>
          </DndContext>
          {showAddMenu && (
            <div className="flex gap-1 mt-2 flex-wrap">
              <button onClick={() => onAddSlide('banner')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-[#E8F5F0] hover:text-[#0F6E56] hover:border-[#0F6E56] transition-colors">
                + 📸 배너
              </button>
              <button onClick={() => onAddSlide('video')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-[#E8F5F0] hover:text-[#0F6E56] hover:border-[#0F6E56] transition-colors">
                + 🎬 영상
              </button>
              <button onClick={() => onAddSlide('cases')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-[#E8F5F0] hover:text-[#0F6E56] hover:border-[#0F6E56] transition-colors">
                + 📊 사례
              </button>
              <button onClick={() => onAddSlide('iframe')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-[#E8F5F0] hover:text-[#0F6E56] hover:border-[#0F6E56] transition-colors">
                + 🌐 페이지
              </button>
              <button onClick={() => onAddSlide('faq')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-[#E8F5F0] hover:text-[#0F6E56] hover:border-[#0F6E56] transition-colors">
                + ❓ FAQ
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {sec && sec.slides.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-gray-500 mb-1">배너가 없습니다</p>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <button onClick={() => onAddSlide('banner')}
              className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-5 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors">
              + 📸 배너
            </button>
            <button onClick={() => onAddSlide('video')}
              className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-5 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors">
              + 🎬 영상
            </button>
            <button onClick={() => onAddSlide('cases')}
              className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-5 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors">
              + 📊 사례
            </button>
            <button onClick={() => onAddSlide('iframe')}
              className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-5 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors">
              + 🌐 페이지
            </button>
            <button onClick={() => onAddSlide('faq')}
              className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-5 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors">
              + ❓ FAQ
            </button>
          </div>
        </div>
      )}

      {/* Slide Editor */}
      {slide && (
        <div className="space-y-4">
          {slide.template === 'banner' && (
            <BannerSlideEditor
              slide={slide as BannerSlide}
              onUpdate={(updates) => onUpdateSlide(activeSlide, updates)}
              imageHistory={imageHistory}
            />
          )}
          {slide.template === 'video' && (
            <VideoSlideEditor
              slide={slide as VideoSlide}
              onUpdate={(updates) => onUpdateSlide(activeSlide, updates)}
            />
          )}
          {slide.template === 'cases' && (
            <CasesSlideEditor
              slide={slide as CasesSlide}
              onUpdate={(updates) => onUpdateSlide(activeSlide, updates)}
            />
          )}
          {slide.template === 'iframe' && (
            <IframeSlideEditor
              slide={slide as IframeSlide}
              onUpdate={(updates) => onUpdateSlide(activeSlide, updates)}
            />
          )}
          {slide.template === 'faq' && (
            <FaqSlideEditor
              slide={slide as FaqSlide}
              onUpdate={(updates) => onUpdateSlide(activeSlide, updates)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SectionTypeMenuItem({ icon, title, desc, onClick }: {
  icon: string; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-2.5 hover:bg-[#E8F5F0] transition-colors flex items-start gap-2 border-b border-gray-100 last:border-b-0">
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-700">{title}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
