import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import { useAuthStore } from '@/stores/authStore';
import { fetchSections, saveSections } from '../services/websiteSectionService';
import type { WebsiteSection, BannerSlide } from '../types/websiteSection';

function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptySlide(order: number): BannerSlide {
  return {
    id: uid(), title: '', subtitle: '',
    ctaText: '', ctaAction: 'scroll', ctaTarget: '',
    order,
  };
}

function emptySection(order: number): WebsiteSection {
  return {
    id: uid(), order_index: order, template: 'banner',
    title: `섹션 ${order + 1}`,
    slides: [emptySlide(0)],
  };
}

const ADMIN_PIN = '8054';

export default function AdminWebsitePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Auth
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Data
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // UI
  const [activeSection, setActiveSection] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auth check
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

  // Load data
  useEffect(() => {
    if (!authed) return;
    fetchSections()
      .then((data) => { setSections(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authed]);

  // Save
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

  const updateSlides = (newSlides: BannerSlide[]) => {
    setSections(sections.map((s, i) => i === activeSection ? { ...s, slides: newSlides } : s));
  };

  const addSlide = () => {
    if (!sec) return;
    const ns = [...sec.slides, emptySlide(sec.slides.length)];
    updateSlides(ns);
    setActiveSlide(ns.length - 1);
  };

  const removeSlide = (idx: number) => {
    if (!sec) return;
    const ns = sec.slides.filter((_, i) => i !== idx);
    updateSlides(ns);
    setActiveSlide(Math.min(activeSlide, Math.max(0, ns.length - 1)));
  };

  const updateSlide = (slideIdx: number, updates: Partial<BannerSlide>) => {
    if (!sec) return;
    updateSlides(sec.slides.map((s, i) => i === slideIdx ? { ...s, ...updates } : s));
  };

  const moveSlide = (from: number, to: number) => {
    if (!sec || to < 0 || to >= sec.slides.length) return;
    const ns = [...sec.slides];
    [ns[from], ns[to]] = [ns[to], ns[from]];
    updateSlides(ns);
    setActiveSlide(to);
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
      {/* Header */}
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
            {/* ===== Section Tabs ===== */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-200">
              {sections.map((s, idx) => (
                <button key={s.id} onClick={() => { setActiveSection(idx); setActiveSlide(0); }}
                  className={`shrink-0 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all ${
                    activeSection === idx
                      ? 'border-b-2 border-[#0F6E56] text-[#0F6E56] bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  섹션 {idx + 1}
                </button>
              ))}
              <button onClick={addSection}
                className="shrink-0 ml-auto px-3 py-2 text-sm font-semibold text-[#0F6E56] hover:bg-[#E8F5F0] rounded-t-xl transition-all">
                + 추가
              </button>
            </div>

            {/* ===== Section Header ===== */}
            {sec && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-800">섹션 {activeSection + 1} 설정</h2>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSection(activeSection, activeSection - 1)}
                      disabled={activeSection === 0}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-xs">
                      ←
                    </button>
                    <button onClick={() => moveSection(activeSection, activeSection + 1)}
                      disabled={activeSection === sections.length - 1}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-xs">
                      →
                    </button>
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

            {/* ===== Slide Tabs ===== */}
            {sec && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {sec.slides.map((_, idx) => (
                  <button key={idx} onClick={() => setActiveSlide(idx)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      idx === activeSlide
                        ? 'bg-[#0F6E56] text-white shadow-md'
                        : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0F6E56] hover:text-[#0F6E56]'
                    }`}>
                    배너 {idx + 1}
                  </button>
                ))}
                <button onClick={addSlide}
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors">
                  +
                </button>
              </div>
            )}

            {/* ===== Empty State ===== */}
            {sec && sec.slides.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">📸</p>
                <p className="text-gray-500 mb-1">배너가 없습니다</p>
                <button onClick={addSlide}
                  className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-6 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors mt-4">
                  + 첫 배너 추가
                </button>
              </div>
            )}

            {/* ===== Slide Editor ===== */}
            {slide && (
              <div className="space-y-4">
                {/* Preview */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500">미리보기</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveSlide(activeSlide, activeSlide - 1)} disabled={activeSlide === 0}
                        className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-xs">↑</button>
                      <button onClick={() => moveSlide(activeSlide, activeSlide + 1)} disabled={activeSlide === sec.slides.length - 1}
                        className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-xs">↓</button>
                      {sec.slides.length > 1 && (
                        <button onClick={() => removeSlide(activeSlide)}
                          className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center text-xs">✕</button>
                      )}
                    </div>
                  </div>
                  <SlidePreview slide={slide} />
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">배경 이미지</label>
                    <ImageUploader
                      key={slide.id}
                      folder="banners"
                      currentUrl={slide.imageUrl}
                      onUploaded={(url) => updateSlide(activeSlide, { imageUrl: url || undefined })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">제목</label>
                    <textarea value={slide.title}
                      onChange={(e) => updateSlide(activeSlide, { title: e.target.value })}
                      rows={2} placeholder="우리 아이,&#10;얼마나 클까?"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#0F6E56] resize-none" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">설명</label>
                    <textarea value={slide.subtitle}
                      onChange={(e) => updateSlide(activeSlide, { subtitle: e.target.value })}
                      rows={2} placeholder="설명 텍스트"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 텍스트</label>
                      <input value={slide.ctaText}
                        onChange={(e) => updateSlide(activeSlide, { ctaText: e.target.value })}
                        placeholder="비우면 표시 안 함"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 동작</label>
                      <select value={slide.ctaAction}
                        onChange={(e) => updateSlide(activeSlide, { ctaAction: e.target.value as 'scroll' | 'link' })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]">
                        <option value="scroll">스크롤</option>
                        <option value="link">링크</option>
                      </select>
                    </div>
                  </div>

                  {slide.ctaText && (
                    <input value={slide.ctaTarget}
                      onChange={(e) => updateSlide(activeSlide, { ctaTarget: e.target.value })}
                      placeholder={slide.ctaAction === 'scroll' ? 'calculator' : 'https://...'}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============= Slide Preview =============
function SlidePreview({ slide }: { slide: BannerSlide }) {
  return (
    <div className="aspect-[9/16] relative bg-[#F5F0EA] overflow-hidden">
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
      ) : (
        <div className="absolute inset-0 bg-[#F5F0EA]" />
      )}
      <div className="absolute bottom-[12%] left-0 right-0 z-10 px-5">
        <div className="text-center">
          <p className="font-extrabold leading-[1.15] whitespace-pre-line mb-1.5"
            style={{
              fontSize: slide.titleSize ? `${Math.round(slide.titleSize * 0.85)}px` : '36px',
              color: slide.titleColor || '#ffffff',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>
            {slide.title || '제목을 입력하세요'}
          </p>
          {slide.subtitle && (
            <p className="mb-2 whitespace-pre-line"
              style={{
                fontSize: slide.subtitleSize ? `${Math.round(slide.subtitleSize * 0.85)}px` : '14px',
                color: slide.subtitleColor || 'rgba(255,255,255,0.9)',
                textShadow: '0 1px 6px rgba(0,0,0,0.5)',
              }}>
              {slide.subtitle}
            </p>
          )}
          {slide.ctaText && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F6E56] px-5 py-2 text-white text-xs font-bold">
              {slide.ctaText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
