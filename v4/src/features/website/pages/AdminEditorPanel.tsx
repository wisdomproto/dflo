import { useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { WebsiteSection, SlideTemplate, BannerSlide, VideoSlide, CasesSlide } from '../types/websiteSection';
import { BannerSlideEditor } from './BannerSlideEditor';
import { VideoSlideEditor } from './VideoSlideEditor';
import { CasesSlideEditor } from './CasesSlideEditor';
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
  onAddSection: () => void;
  onRemoveSection: (idx: number) => void;
  onAddSlide: (template: SlideTemplate) => void;
  onRemoveSlide: (idx: number) => void;
  onUpdateSlide: (slideIdx: number, updates: Record<string, unknown>) => void;
  onUpdateSectionTitle: (title: string) => void;
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
  onSectionDragEnd,
  onSlideDragEnd,
  onMoveSlide,
  imageHistory,
}: AdminEditorPanelProps) {
  const sec = sections[activeSection];
  const slide = sec?.slides[activeSlide] || null;

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const confirmDeleteSection = () => {
    const name = sec?.title || `섹션 ${activeSection + 1}`;
    setConfirmModal({
      message: `"${name}" 섹션을 삭제하시겠습니까?\n포함된 모든 슬라이드가 함께 삭제됩니다.`,
      onConfirm: () => { onRemoveSection(activeSection); setConfirmModal(null); },
    });
  };

  const confirmDeleteSlide = () => {
    const slideType = slide?.template === 'video' ? '영상' : '배너';
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
            <button onClick={onAddSection}
              className="shrink-0 ml-auto px-3 py-2 text-sm font-semibold text-[#0F6E56] hover:bg-[#E8F5F0] rounded-t-xl transition-all">
              + 추가
            </button>
          </div>
        </SortableContext>
      </DndContext>

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
            <div className="flex gap-1 mt-2">
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
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {sec && sec.slides.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-gray-500 mb-1">배너가 없습니다</p>
          <div className="flex justify-center gap-2 mt-4">
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
        </div>
      )}
    </div>
  );
}
