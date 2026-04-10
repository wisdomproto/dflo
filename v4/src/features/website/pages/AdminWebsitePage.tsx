import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useAuthStore } from '@/stores/authStore';
import { fetchSections, saveSections } from '../services/websiteSectionService';
import type { WebsiteSection, BannerSlide, VideoSlide, CasesSlide, Slide, SlideTemplate } from '../types/websiteSection';
import { AdminPreviewPanel } from './AdminPreviewPanel';
import { AdminEditorPanel } from './AdminEditorPanel';

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

function emptyCasesSlide(order: number): CasesSlide {
  return {
    template: 'cases', id: uid(),
    patientName: '', gender: 'male',
    initialMemo: '', finalMemo: '',
    measurements: [], showCta: true, fontScale: 100, order,
  };
}

function emptySection(order: number): WebsiteSection {
  return {
    id: uid(), order_index: order,
    title: `섹션 ${order + 1}`,
    slides: [emptyBannerSlide(0)],
  };
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
  const [imageHistory, setImageHistory] = useState<string[]>([]);

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
      .then((data) => {
        setSections(data);
        // Initialize image history from existing banner slides
        const urls = data.flatMap((s) =>
          s.slides.filter((sl): sl is BannerSlide => sl.template === 'banner' && !!sl.imageUrl)
            .map((sl) => sl.imageUrl!)
        );
        setImageHistory([...new Set(urls)]);
        setLoading(false);
      })
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
  const sec = sections[activeSection];

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

  // ---- Slide actions ----
  const updateSlides = (newSlides: Slide[]) => {
    setSections(sections.map((s, i) => i === activeSection ? { ...s, slides: newSlides } : s));
  };

  const addSlide = (template: SlideTemplate) => {
    if (!sec) return;
    const newSlide = template === 'video'
      ? emptyVideoSlide(sec.slides.length)
      : template === 'cases'
        ? emptyCasesSlide(sec.slides.length)
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

  const addToImageHistory = useCallback((url: string) => {
    if (!url) return;
    setImageHistory((prev) => prev.includes(url) ? prev : [url, ...prev]);
  }, []);

  const updateSlide = (slideIdx: number, updates: Record<string, unknown>) => {
    if (!sec) return;
    // Track image history when banner image changes
    if ('imageUrl' in updates) {
      const oldSlide = sec.slides[slideIdx];
      if (oldSlide?.template === 'banner') {
        const oldUrl = (oldSlide as BannerSlide).imageUrl;
        if (oldUrl) addToImageHistory(oldUrl);
      }
      const newUrl = updates.imageUrl as string | undefined;
      if (newUrl) addToImageHistory(newUrl);
    }
    updateSlides(sec.slides.map((s, i) => i === slideIdx ? { ...s, ...updates } : s));
  };

  const moveSlide = (fromIdx: number, toIdx: number) => {
    if (!sec) return;
    const ns = [...sec.slides];
    const [moved] = ns.splice(fromIdx, 1);
    ns.splice(toIdx, 0, moved);
    updateSlides(ns);
    setActiveSlide(toIdx);
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

  const updateSectionTitle = (title: string) => {
    setSections(sections.map((s, i) => i === activeSection ? { ...s, title } : s));
  };

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

  // ---- Main Admin (PC Split Layout) ----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — full width */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
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

      {/* Content area — split on lg */}
      {loading ? (
        <div className="text-center py-16"><p className="text-sm text-gray-400">불러오는 중...</p></div>
      ) : (
        <div className="flex flex-col lg:flex-row">
          {/* Left: Preview (sticky on PC) */}
          <AdminPreviewPanel
            sections={sections}
            activeSectionIndex={activeSection}
            activeSlideIndex={activeSlide}
            onSelectSection={(idx) => { setActiveSection(idx); setActiveSlide(0); }}
            onSelectSlide={setActiveSlide}
          />

          {/* Right: Editor (scrollable on PC) */}
          <AdminEditorPanel
            sections={sections}
            activeSection={activeSection}
            activeSlide={activeSlide}
            showAddMenu={showAddMenu}
            sensors={sensors}
            onSetActiveSection={setActiveSection}
            onSetActiveSlide={setActiveSlide}
            onSetShowAddMenu={setShowAddMenu}
            onAddSection={addSection}
            onRemoveSection={removeSection}
            onAddSlide={addSlide}
            onRemoveSlide={removeSlide}
            onUpdateSlide={updateSlide}
            onUpdateSectionTitle={updateSectionTitle}
            onSectionDragEnd={handleSectionDragEnd}
            onSlideDragEnd={handleSlideDragEnd}
            onMoveSlide={moveSlide}
            imageHistory={imageHistory}
          />
        </div>
      )}
    </div>
  );
}
