import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import { useAuthStore } from '@/stores/authStore';
import { fetchSections, saveSections } from '../services/websiteSectionService';
import type { WebsiteSection, BannerSlide, VideoSlide, Slide, SlideTemplate } from '../types/websiteSection';
import { extractVideoId } from '../components/SectionCarousel';

function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyBannerSlide(order: number): BannerSlide {
  return {
    template: 'banner',
    id: uid(), title: '', subtitle: '',
    ctaText: '', ctaAction: 'scroll', ctaTarget: '',
    order,
  };
}

function emptyVideoSlide(order: number): VideoSlide {
  return { template: 'video', id: uid(), videoUrl: '', title: '', description: '', order };
}

function emptySection(order: number): WebsiteSection {
  return {
    id: uid(), order_index: order,
    title: `섹션 ${order + 1}`,
    slides: [emptyBannerSlide(0)],
  };
}

// ============= Sortable Section Tab =============
function SortableSectionTab({ section, idx, isActive, onClick }: { section: WebsiteSection; idx: number; isActive: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}
      className={`shrink-0 flex items-center gap-0.5 rounded-t-xl text-sm font-semibold transition-all ${
        isActive
          ? 'border-b-2 border-[#0F6E56] text-[#0F6E56] bg-white'
          : 'text-gray-500 hover:text-gray-700'
      }`}>
      <span {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing px-1 py-2 select-none opacity-40 hover:opacity-100"
        style={{ touchAction: 'none' }}>
        ⠿
      </span>
      <button onClick={onClick} className="pr-3 py-2">
        섹션 {idx + 1}
      </button>
    </div>
  );
}

// ============= Sortable Slide Tab =============
function SortableSlideTab({ slide, idx, isActive, onClick }: { slide: Slide; idx: number; isActive: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}
      className={`shrink-0 flex items-center gap-0.5 rounded-xl text-sm font-semibold transition-all ${
        isActive
          ? 'bg-[#0F6E56] text-white shadow-md'
          : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0F6E56] hover:text-[#0F6E56]'
      }`}>
      {/* Drag handle */}
      <span {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing px-2 py-2 select-none opacity-40 hover:opacity-100"
        style={{ touchAction: 'none' }}>
        ⠿
      </span>
      {/* Click to select */}
      <button onClick={onClick} className="pr-3 py-2">
        {slide.template === 'video' ? '🎬' : '📸'} {idx + 1}
      </button>
    </div>
  );
}

const ADMIN_PIN = '8054';

export default function AdminWebsitePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [activeSection, setActiveSection] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    if (user?.role === 'admin' || sessionStorage.getItem('website-admin-auth') === 'true') {
      setAuthed(true);
    }
  }, [user]);

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      sessionStorage.setItem('website-admin-auth', 'true');
      setAuthed(true);
    } else {
      setPinError('비밀번호가 틀렸습니다');
      setPinInput('');
    }
  };

  useEffect(() => {
    if (!authed) return;
    fetchSections()
      .then((data) => { setSections(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authed]);

  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const result = await saveSections(sections);
      setSections(result);
      setSaveMsg('저장됨!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg(`실패: ${err instanceof Error ? err.message : '오류'}`);
      setTimeout(() => setSaveMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // ---- Section actions ----
  const addSection = () => {
    const ns = [...sections, emptySection(sections.length)];
    setSections(ns);
    setActiveSection(ns.length - 1);
    setActiveSlide(0);
  };

  const removeSection = (idx: number) => {
    if (sections.length <= 1) return;
    const ns = sections.filter((_, i) => i !== idx);
    setSections(ns);
    setActiveSection(Math.min(activeSection, ns.length - 1));
    setActiveSlide(0);
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const ns = [...sections];
    [ns[from], ns[to]] = [ns[to], ns[from]];
    setSections(ns);
    setActiveSection(to);
  };

  // ---- Slide actions ----
  const sec = sections[activeSection];

  const updateSlides = (newSlides: Slide[]) => {
    setSections(sections.map((s, i) => i === activeSection ? { ...s, slides: newSlides } : s));
  };

  const addSlide = (template: SlideTemplate) => {
    if (!sec) return;
    const newSlide = template === 'video'
      ? emptyVideoSlide(sec.slides.length)
      : emptyBannerSlide(sec.slides.length);
    const ns = [...sec.slides, newSlide];
    updateSlides(ns);
    setActiveSlide(ns.length - 1);
    setShowAddMenu(false);
  };

  const removeSlide = (idx: number) => {
    if (!sec) return;
    const ns = sec.slides.filter((_, i) => i !== idx);
    updateSlides(ns);
    setActiveSlide(Math.min(activeSlide, Math.max(0, ns.length - 1)));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSlide = (slideIdx: number, updates: Record<string, any>) => {
    if (!sec) return;
    updateSlides(sec.slides.map((s, i) => i === slideIdx ? { ...s, ...updates } : s));
  };

  const handleSlideDragEnd = (event: DragEndEvent) => {
    if (!sec) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sec.slides.findIndex((s) => s.id === active.id);
    const newIdx = sec.slides.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    updateSlides(arrayMove(sec.slides, oldIdx, newIdx));
    setActiveSlide(newIdx);
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    setSections(arrayMove(sections, oldIdx, newIdx));
    setActiveSection(newIdx);
  };

  const slide = sec?.slides[activeSlide] || null;

  // ---- PIN Screen ----
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          <h1 className="text-2xl font-bold text-center mb-2">웹사이트 관리</h1>
          <p className="text-center text-gray-500 text-sm mb-6">관리자 비밀번호를 입력하세요</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            placeholder="비밀번호"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:border-[#0F6E56] text-center text-lg tracking-widest"
            maxLength={4}
            autoFocus
          />
          {pinError && <p className="text-red-500 text-sm text-center mb-4">{pinError}</p>}
          <button onClick={handlePinSubmit} disabled={!pinInput}
            className="w-full bg-[#0F6E56] text-white font-bold py-3 rounded-xl hover:bg-[#0D5A47] disabled:opacity-50 transition-all">
            확인
          </button>
          <button onClick={() => navigate('/website')}
            className="w-full mt-3 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ---- Main Admin ----
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link to="/website" className="text-sm text-gray-500 hover:text-[#0F6E56]">웹사이트</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-bold text-gray-800">섹션 관리</h1>
          </div>
          <button onClick={save} disabled={saving}
            className="text-sm font-bold text-white bg-[#0F6E56] px-5 py-2 rounded-xl hover:bg-[#0D5A47] active:scale-[0.98] transition-all disabled:opacity-50">
            {saving ? '저장 중..' : saveMsg || '저장'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="text-center py-16"><p className="text-sm text-gray-400">불러오는 중...</p></div>
        ) : (
          <>
            {/* Section Tabs */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-gray-200" style={{ touchAction: 'none' }}>
                  {sections.map((s, idx) => (
                    <SortableSectionTab key={s.id} section={s} idx={idx} isActive={activeSection === idx}
                      onClick={() => { setActiveSection(idx); setActiveSlide(0); }} />
                  ))}
                  <button onClick={addSection}
                    className="shrink-0 ml-auto px-3 py-2 text-sm font-semibold text-[#0F6E56] hover:bg-[#E8F5F0] rounded-t-xl transition-all">
                    + 추가
                  </button>
                </div>
              </SortableContext>
            </DndContext>

            {/* Section Header */}
            {sec && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-800">섹션 {activeSection + 1} 설정</h2>
                  <div className="flex items-center gap-1">
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(activeSection)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
                        삭제
                      </button>
                    )}
                  </div>
                </div>
                <input
                  value={sec.title || ''}
                  onChange={(e) => setSections(sections.map((s, i) => i === activeSection ? { ...s, title: e.target.value } : s))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
                  placeholder="섹션 제목 (관리용)"
                />
              </div>
            )}

            {/* Slide Tabs with drag-drop */}
            {sec && (
              <div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSlideDragEnd}>
                  <SortableContext items={sec.slides.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
                    <div className="flex items-center gap-1.5 flex-wrap pb-1" style={{ touchAction: 'none' }}>
                      {sec.slides.map((sl, idx) => (
                        <SortableSlideTab key={sl.id} slide={sl} idx={idx} isActive={idx === activeSlide} onClick={() => setActiveSlide(idx)} />
                      ))}
                      <button onClick={() => setShowAddMenu(!showAddMenu)}
                        className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors">
                        +
                      </button>
                    </div>
                  </SortableContext>
                </DndContext>
                {showAddMenu && (
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => addSlide('banner')}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-[#E8F5F0] hover:text-[#0F6E56] hover:border-[#0F6E56] transition-colors">
                      + 📸 배너
                    </button>
                    <button onClick={() => addSlide('video')}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-[#E8F5F0] hover:text-[#0F6E56] hover:border-[#0F6E56] transition-colors">
                      + 🎬 영상
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
                  <button onClick={() => addSlide('banner')}
                    className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-5 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors">
                    + 📸 배너
                  </button>
                  <button onClick={() => addSlide('video')}
                    className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-5 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors">
                    + 🎬 영상
                  </button>
                </div>
              </div>
            )}

            {/* Slide Editor */}
            {slide && (
              <div className="space-y-4">
                {/* Preview */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500">미리보기</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { if (activeSlide > 0) { const ns = [...sec.slides]; const [m] = ns.splice(activeSlide, 1); ns.splice(activeSlide - 1, 0, m); updateSlides(ns); setActiveSlide(activeSlide - 1); } }}
                        disabled={activeSlide === 0}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-sm">←</button>
                      <button onClick={() => { if (activeSlide < sec.slides.length - 1) { const ns = [...sec.slides]; const [m] = ns.splice(activeSlide, 1); ns.splice(activeSlide + 1, 0, m); updateSlides(ns); setActiveSlide(activeSlide + 1); } }}
                        disabled={activeSlide === sec.slides.length - 1}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-sm">→</button>
                      {sec.slides.length > 1 && (
                        <button onClick={() => removeSlide(activeSlide)}
                          className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center text-sm">✕</button>
                      )}
                    </div>
                  </div>
                  {slide.template === 'banner' && <BannerSlidePreview slide={slide as BannerSlide} />}
                  {slide.template === 'video' && <VideoSlidePreview slide={slide as VideoSlide} />}
                </div>

                {/* Banner Form */}
                {slide.template === 'banner' && (() => {
                  const bs = slide as BannerSlide;
                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">배경 이미지</label>
                        <ImageUploader
                          key={bs.id}
                          folder="banners"
                          currentUrl={bs.imageUrl}
                          onUploaded={(url) => updateSlide(activeSlide, { imageUrl: url || undefined })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">이미지 맞춤</label>
                        <select value={bs.imageFit || 'cover'}
                          onChange={(e) => updateSlide(activeSlide, { imageFit: e.target.value as 'cover' | 'contain' })}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]">
                          <option value="cover">채우기 (잘릴 수 있음)</option>
                          <option value="contain">전체 표시 (여백 가능)</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-500">제목</label>
                          <div className="flex items-center gap-1.5">
                            <input type="color" value={bs.titleColor || '#ffffff'}
                              onChange={(e) => updateSlide(activeSlide, { titleColor: e.target.value })}
                              className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                            <span className="text-[10px] text-gray-400">{bs.titleColor || '#ffffff'}</span>
                            {bs.titleColor && (
                              <button onClick={() => updateSlide(activeSlide, { titleColor: undefined })}
                                className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
                            )}
                          </div>
                        </div>
                        <textarea value={bs.title}
                          onChange={(e) => updateSlide(activeSlide, { title: e.target.value })}
                          rows={2} placeholder="우리 아이,&#10;얼마나 클까?"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#0F6E56] resize-none" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-500">설명</label>
                          <div className="flex items-center gap-1.5">
                            <input type="color" value={bs.subtitleColor || '#ffffff'}
                              onChange={(e) => updateSlide(activeSlide, { subtitleColor: e.target.value === '#ffffff' ? undefined : e.target.value })}
                              className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                            <span className="text-[10px] text-gray-400">{bs.subtitleColor || '#ffffff'}</span>
                            {bs.subtitleColor && (
                              <button onClick={() => updateSlide(activeSlide, { subtitleColor: undefined })}
                                className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
                            )}
                          </div>
                        </div>
                        <textarea value={bs.subtitle}
                          onChange={(e) => updateSlide(activeSlide, { subtitle: e.target.value })}
                          rows={2} placeholder="설명 텍스트"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">
                          텍스트 위치 (하단에서 {bs.textPositionY ?? 12}%)
                        </label>
                        <input type="range" min={0} max={50} value={bs.textPositionY ?? 12}
                          onChange={(e) => updateSlide(activeSlide, { textPositionY: Number(e.target.value) })}
                          className="w-full accent-[#0F6E56]" />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>하단</span><span>중간</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 텍스트</label>
                          <input value={bs.ctaText}
                            onChange={(e) => updateSlide(activeSlide, { ctaText: e.target.value })}
                            placeholder="비우면 표시 안 함"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 크기</label>
                          <select value={bs.ctaSize || 'md'}
                            onChange={(e) => updateSlide(activeSlide, { ctaSize: e.target.value as 'sm' | 'md' | 'lg' })}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]">
                            <option value="sm">작게</option>
                            <option value="md">보통</option>
                            <option value="lg">크게</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 동작</label>
                          <select value={bs.ctaAction}
                            onChange={(e) => updateSlide(activeSlide, { ctaAction: e.target.value as 'scroll' | 'link' })}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]">
                            <option value="scroll">스크롤</option>
                            <option value="link">링크</option>
                          </select>
                        </div>
                      </div>
                      {bs.ctaText && (
                        <input value={bs.ctaTarget}
                          onChange={(e) => updateSlide(activeSlide, { ctaTarget: e.target.value })}
                          placeholder={bs.ctaAction === 'scroll' ? 'calculator' : 'https://...'}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
                      )}
                    </div>
                  );
                })()}

                {/* Video Form */}
                {slide.template === 'video' && (() => {
                  const vs = slide as VideoSlide;
                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">YouTube URL</label>
                        <input value={vs.videoUrl}
                          onChange={(e) => updateSlide(activeSlide, { videoUrl: e.target.value })}
                          placeholder="https://www.youtube.com/watch?v=... 또는 영상 ID"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-500">제목</label>
                          <div className="flex items-center gap-1.5">
                            <input type="color" value={vs.titleColor || '#1a1a1a'}
                              onChange={(e) => updateSlide(activeSlide, { titleColor: e.target.value })}
                              className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                            <span className="text-[10px] text-gray-400">{vs.titleColor || '#1a1a1a'}</span>
                            {vs.titleColor && (
                              <button onClick={() => updateSlide(activeSlide, { titleColor: undefined })}
                                className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
                            )}
                          </div>
                        </div>
                        <textarea value={vs.title}
                          onChange={(e) => updateSlide(activeSlide, { title: e.target.value })}
                          rows={2} placeholder="영상 제목"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#0F6E56] resize-none" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-500">설명</label>
                          <div className="flex items-center gap-1.5">
                            <input type="color" value={vs.descriptionColor || '#666666'}
                              onChange={(e) => updateSlide(activeSlide, { descriptionColor: e.target.value })}
                              className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                            <span className="text-[10px] text-gray-400">{vs.descriptionColor || '#666666'}</span>
                            {vs.descriptionColor && (
                              <button onClick={() => updateSlide(activeSlide, { descriptionColor: undefined })}
                                className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
                            )}
                          </div>
                        </div>
                        <textarea value={vs.description}
                          onChange={(e) => updateSlide(activeSlide, { description: e.target.value })}
                          rows={3} placeholder="영상 설명 텍스트"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============= Mobile Browser Frame =============
// Pure geometric shapes — no text, scales to any size
// Proportions: address bar 6% + app header 7% + content 80% + bottom nav 7%
function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="aspect-[9/16] relative bg-gray-100 overflow-hidden flex flex-col">
      {/* Browser address bar — 6% */}
      <div className="flex-shrink-0 bg-gray-100 flex items-center px-[4%] gap-[3%]" style={{ height: '6%' }}>
        <div className="flex-1 bg-white rounded-full" style={{ height: '45%' }} />
      </div>
      {/* App header — 7% */}
      <div className="flex-shrink-0 bg-white flex items-center justify-between px-[4%] border-b border-gray-100" style={{ height: '7%' }}>
        <div className="bg-gray-300 rounded" style={{ width: '25%', height: '30%' }} />
        <div className="bg-gray-200 rounded" style={{ width: '6%', height: '30%' }} />
      </div>
      {/* Content area — flex-1 (≈80%) */}
      <div className="flex-1 relative overflow-hidden">
        {children}
      </div>
      {/* Browser bottom nav — 7% */}
      <div className="flex-shrink-0 bg-gray-100 flex items-center justify-around px-[12%]" style={{ height: '7%' }}>
        <div className="bg-gray-300 rounded-sm" style={{ width: '8%', height: '30%' }} />
        <div className="bg-gray-300 rounded-full" style={{ width: '8%', aspectRatio: '1' }} />
        <div className="bg-gray-300 rounded-sm" style={{ width: '8%', height: '30%' }} />
      </div>
    </div>
  );
}

// ============= Banner Slide Preview =============
function BannerSlidePreview({ slide }: { slide: BannerSlide }) {
  return (
    <MobileFrame>
      <div className="absolute inset-0 bg-[#F5F0EA]">
        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="" className={`absolute inset-0 w-full h-full object-center ${slide.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} />
        ) : (
          <div className="absolute inset-0 bg-[#F5F0EA]" />
        )}
        <div className="absolute left-0 right-0 z-10 px-5" style={{ bottom: `${slide.textPositionY ?? 12}%` }}>
          <div className="text-center">
            <p className="font-extrabold leading-[1.15] whitespace-pre-line mb-1.5"
              style={{
                fontSize: slide.titleSize ? `${Math.round(slide.titleSize * 0.7)}px` : '28px',
                color: slide.titleColor || '#ffffff',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}>
              {slide.title || '제목을 입력하세요'}
            </p>
            {slide.subtitle && (
              <p className="mb-2 whitespace-pre-line"
                style={{
                  fontSize: slide.subtitleSize ? `${Math.round(slide.subtitleSize * 0.7)}px` : '11px',
                  color: slide.subtitleColor || 'rgba(255,255,255,0.9)',
                  textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                }}>
                {slide.subtitle}
              </p>
            )}
            {slide.ctaText && (
              <span className={`inline-flex items-center gap-1 rounded-full bg-[#0F6E56] text-white font-bold ${
                slide.ctaSize === 'sm' ? 'px-2 py-1 text-[8px]' :
                slide.ctaSize === 'lg' ? 'px-5 py-2 text-[11px]' :
                'px-3 py-1.5 text-[9px]'
              }`}>
                {slide.ctaText}
              </span>
            )}
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}

// ============= Video Slide Preview =============
function VideoSlidePreview({ slide }: { slide: VideoSlide }) {
  const videoId = extractVideoId(slide.videoUrl);
  return (
    <MobileFrame>
      <div className="w-full h-full flex flex-col bg-white">
        <div className="w-full bg-black" style={{ height: '55%' }}>
          {videoId ? (
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt="썸네일"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-[9px]">
              YouTube URL을 입력하세요
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="font-extrabold text-sm leading-tight mb-1 whitespace-pre-line"
            style={{ color: slide.titleColor || '#1a1a1a' }}>
            {slide.title || '제목을 입력하세요'}
          </p>
          {slide.description && (
            <p className="text-[9px] whitespace-pre-line"
              style={{ color: slide.descriptionColor || '#666666' }}>
              {slide.description}
            </p>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
