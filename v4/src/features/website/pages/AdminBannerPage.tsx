import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import { useAuthStore } from '@/stores/authStore';
import { fetchBanners, saveBanners } from '../services/bannerService';
import { fetchSections, saveSections } from '../services/websiteSectionService';
import type { BannerSlide } from '../components/HeroBanner';

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
  createdAt?: string;
  updatedAt?: string;
}

function generateId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptySlide(order: number): BannerSlide {
  return {
    id: generateId(),
    title: '',
    subtitle: '',
    ctaText: '자세히 보기',
    ctaAction: 'scroll',
    ctaTarget: 'calculator',
    bgGradient: 'linear-gradient(180deg, #EDE8E0 0%, #F5F0EA 100%)',
    order,
  };
}

function emptySection(order: number): WebsiteSection {
  return {
    id: generateId(),
    order,
    sectionType: 'growthGuide',
    title: `섹션 ${order + 1}`,
    subtitle: '',
    items: [],
  };
}

const ADMIN_PIN = '8054';
const SECTION_TYPE_LABELS: Record<string, string> = {
  growthGuide: '성장가이드',
  recipe: '레시피',
  exercise: '운동',
  case: '사례',
};

export default function AdminBannerPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = 섹션1 (배너), 1+ = 섹션2, 3, ...
  
  // Banner state
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [activeBannerTab, setActiveBannerTab] = useState(0);
  const [showFullPreview, setShowFullPreview] = useState(false);
  
  // Section state
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  
  // Common state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      setAuthed(true);
      return;
    }
    if (sessionStorage.getItem('website-admin-auth') === 'true') {
      setAuthed(true);
      return;
    }
    const input = prompt('관리자 비밀번호를 입력하세요');
    if (input === ADMIN_PIN) {
      sessionStorage.setItem('website-admin-auth', 'true');
      setAuthed(true);
    } else {
      navigate('/website');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!authed) return;
    Promise.all([
      fetchBanners().then(setSlides).catch(() => setSlides([])),
      fetchSections().then(setSections).catch(() => setSections([])),
    ]).finally(() => setLoading(false));
  }, [authed]);

  if (!authed) return null;

  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      if (activeTab === 0) {
        // 섹션 1: 배너
        const result = await saveBanners(slides);
        setSlides(result);
      } else {
        // 섹션 2, 3, ...: 컨텐츠 섹션
        const result = await saveSections(sections);
        setSections(result);
      }
      setSaveMsg('저장됨!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg(`저장 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
      setTimeout(() => setSaveMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Banner actions
  const addSlide = () => {
    const newSlides = [...slides, emptySlide(slides.length)];
    setSlides(newSlides);
    setActiveBannerTab(newSlides.length - 1);
  };

  const updateSlide = (id: string, updates: Partial<BannerSlide>) => {
    setSlides(slides.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSlide = (id: string) => {
    const newSlides = slides.filter((s) => s.id !== id);
    setSlides(newSlides);
    if (activeBannerTab >= newSlides.length) setActiveBannerTab(Math.max(0, newSlides.length - 1));
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    const arr = [...slides];
    [arr[from], arr[to]] = [arr[to], arr[from]];
    setSlides(arr);
    setActiveBannerTab(to);
  };

  // Section actions
  const addSection = () => {
    const newSections = [...sections, emptySection(sections.length)];
    setSections(newSections);
    setActiveTab(newSections.length); // 새 섹션 탭으로 이동
  };

  const updateSection = (id: string, updates: Partial<WebsiteSection>) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSection = (id: string) => {
    const newSections = sections.filter((s) => s.id !== id);
    setSections(newSections);
    // activeTab가 범위를 벗어나면 조정
    if (activeTab > newSections.length) {
      setActiveTab(Math.max(1, newSections.length));
    }
  };

  const addItem = (sectionId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            items: [
              ...(s.items || []),
              {
                id: generateId(),
                emoji: '✨',
                title: '제목',
                description: '설명',
              },
            ],
          };
        }
        return s;
      })
    );
  };

  const updateItem = (sectionId: string, itemId: string, updates: Partial<SectionItem>) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId && s.items) {
          return {
            ...s,
            items: s.items.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          };
        }
        return s;
      })
    );
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId && s.items) {
          return {
            ...s,
            items: s.items.filter((item) => item.id !== itemId),
          };
        }
        return s;
      })
    );
  };

  const currentSlide = slides[activeBannerTab] || null;
  const currentSection = sections[activeSectionTab] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link to="/website" className="text-sm text-gray-500 hover:text-[#0F6E56]">
              웹사이트
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-bold text-gray-800">관리</h1>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm font-bold text-white bg-[#0F6E56] px-5 py-2 rounded-xl hover:bg-[#0D5A47] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? '저장 중..' : saveMsg ? `✓ ${saveMsg}` : '저장'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Section Tabs: 섹션 1, 2, 3, ... */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-200">
          {/* 섹션 1: 배너 */}
          <button
            onClick={() => setActiveTab(0)}
            className={`shrink-0 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all ${
              activeTab === 0
                ? 'border-b-2 border-[#0F6E56] text-[#0F6E56] bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            섹션 1
          </button>
          
          {/* 섹션 2, 3, ... */}
          {sections.map((_, idx) => (
            <button
              key={idx + 1}
              onClick={() => setActiveTab(idx + 1)}
              className={`shrink-0 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all ${
                activeTab === idx + 1
                  ? 'border-b-2 border-[#0F6E56] text-[#0F6E56] bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              섹션 {idx + 2}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">불러오는 중...</p>
          </div>
        )}

        {/* 섹션 1: 배너 관리 */}
        {activeTab === 0 && !loading && (
          <BannersContent
            slides={slides}
            activeBannerTab={activeBannerTab}
            setActiveBannerTab={setActiveBannerTab}
            currentSlide={currentSlide}
            addSlide={addSlide}
            updateSlide={updateSlide}
            removeSlide={removeSlide}
            moveSlide={moveSlide}
            showFullPreview={showFullPreview}
            setShowFullPreview={setShowFullPreview}
          />
        )}

        {/* 섹션 2, 3, ... 관리 */}
        {activeTab > 0 && !loading && (
          <SectionsContent
            sections={sections}
            activeSectionTab={activeTab - 1}
            setActiveSectionTab={(idx) => setActiveTab(idx + 1)}
            currentSection={sections[activeTab - 1] || null}
            addSection={addSection}
            updateSection={updateSection}
            removeSection={removeSection}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
          />
        )}
      </div>
    </div>
  );
}

// ============= BANNERS CONTENT =============
function BannersContent({
  slides,
  activeBannerTab,
  setActiveBannerTab,
  currentSlide,
  addSlide,
  updateSlide,
  removeSlide,
  moveSlide,
  showFullPreview,
  setShowFullPreview,
}: {
  slides: BannerSlide[];
  activeBannerTab: number;
  setActiveBannerTab: (n: number) => void;
  currentSlide: BannerSlide | null;
  addSlide: () => void;
  updateSlide: (id: string, updates: Partial<BannerSlide>) => void;
  removeSlide: (id: string) => void;
  moveSlide: (from: number, to: number) => void;
  showFullPreview: boolean;
  setShowFullPreview: (b: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => setActiveBannerTab(idx)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              idx === activeBannerTab
                ? 'bg-[#0F6E56] text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0F6E56] hover:text-[#0F6E56]'
            }`}
          >
            배너 {idx + 1}
          </button>
        ))}
        <button
          onClick={addSlide}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors"
        >
          +
        </button>
      </div>

      {slides.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-gray-500 mb-1">등록된 배너가 없습니다</p>
          <button
            onClick={addSlide}
            className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-6 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors mt-6"
          >
            + 첫 배너 추가
          </button>
        </div>
      )}

      {currentSlide && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500">슬라이드 미리보기</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveSlide(activeBannerTab, activeBannerTab - 1)}
                  disabled={activeBannerTab === 0}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-xs"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveSlide(activeBannerTab, activeBannerTab + 1)}
                  disabled={activeBannerTab === slides.length - 1}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-xs"
                >
                  ↓
                </button>
                <button
                  onClick={() => setShowFullPreview(true)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#0F6E56] hover:bg-[#E8F5F0] transition-colors"
                >
                  전체보기
                </button>
                <button
                  onClick={() => removeSlide(currentSlide.id)}
                  className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
            <BannerPreview slide={currentSlide} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">배너 이미지</label>
              <ImageUploader
                key={currentSlide.id}
                folder="banners"
                currentUrl={currentSlide.imageUrl}
                onUploaded={(url) => updateSlide(currentSlide.id, { imageUrl: url || undefined })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">헤더 텍스트</label>
              <textarea
                value={currentSlide.title}
                onChange={(e) => updateSlide(currentSlide.id, { title: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#0F6E56] resize-none"
                placeholder="우리 아이,&#10;얼마나 클까?"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">설명 텍스트</label>
              <textarea
                value={currentSlide.subtitle}
                onChange={(e) => updateSlide(currentSlide.id, { subtitle: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none"
                placeholder="지금 바로 예상키를 무료로 측정해보세요"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 텍스트</label>
                <input
                  value={currentSlide.ctaText}
                  onChange={(e) => updateSlide(currentSlide.id, { ctaText: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
                  placeholder="비우면 표시 안 함"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 동작</label>
                <select
                  value={currentSlide.ctaAction}
                  onChange={(e) => updateSlide(currentSlide.id, { ctaAction: e.target.value as 'scroll' | 'link' })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
                >
                  <option value="scroll">스크롤</option>
                  <option value="link">링크</option>
                </select>
              </div>
            </div>

            <input
              value={currentSlide.ctaTarget}
              onChange={(e) => updateSlide(currentSlide.id, { ctaTarget: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
              placeholder={currentSlide.ctaAction === 'scroll' ? 'calculator' : 'https://...'}
            />
          </div>
        </div>
      )}

      {showFullPreview && currentSlide && (
        <FullPreviewModal slide={currentSlide} onClose={() => setShowFullPreview(false)} />
      )}
    </div>
  );
}

// ============= SECTIONS CONTENT =============
function SectionsContent({
  sections,
  activeSectionTab,
  setActiveSectionTab,
  currentSection,
  addSection,
  updateSection,
  removeSection,
  addItem,
  updateItem,
  removeItem,
}: {
  sections: WebsiteSection[];
  activeSectionTab: number;
  setActiveSectionTab: (n: number) => void;
  currentSection: WebsiteSection | null;
  addSection: () => void;
  updateSection: (id: string, updates: Partial<WebsiteSection>) => void;
  removeSection: (id: string) => void;
  addItem: (sectionId: string) => void;
  updateItem: (sectionId: string, itemId: string, updates: Partial<SectionItem>) => void;
  removeItem: (sectionId: string, itemId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {sections.map((section, idx) => (
          <button
            key={section.id}
            onClick={() => setActiveSectionTab(idx)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              idx === activeSectionTab
                ? 'bg-[#0F6E56] text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0F6E56] hover:text-[#0F6E56]'
            }`}
          >
            섹션 {idx + 1}
          </button>
        ))}
        <button
          onClick={addSection}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors"
        >
          +
        </button>
      </div>

      {sections.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-500 mb-1">관리할 섹션이 없습니다</p>
          <button
            onClick={addSection}
            className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-6 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors mt-6"
          >
            + 첫 섹션 추가
          </button>
        </div>
      )}

      {currentSection && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">섹션 제목</label>
              <input
                value={currentSection.title}
                onChange={(e) => updateSection(currentSection.id, { title: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#0F6E56]"
                placeholder="섹션 제목"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">섹션 유형</label>
              <select
                value={currentSection.sectionType}
                onChange={(e) =>
                  updateSection(currentSection.id, {
                    sectionType: e.target.value as any,
                  })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
              >
                {Object.entries(SECTION_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">부제목 (선택)</label>
              <input
                value={currentSection.subtitle || ''}
                onChange={(e) => updateSection(currentSection.id, { subtitle: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
                placeholder="부제목"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => removeSection(currentSection.id)}
                className="flex-1 text-sm font-bold text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
              >
                이 섹션 삭제
              </button>
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">컨텐츠</h3>
              <button
                onClick={() => addItem(currentSection.id)}
                className="text-xs font-bold text-[#0F6E56] bg-[#E8F5F0] px-4 py-1.5 rounded-lg hover:bg-[#D0EDE4] transition-colors"
              >
                + 아이템 추가
              </button>
            </div>

            {(!currentSection.items || currentSection.items.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-4">아이템이 없습니다</p>
            )}

            {currentSection.items?.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={item.emoji}
                    onChange={(e) =>
                      updateItem(currentSection.id, item.id, {
                        emoji: e.target.value,
                      })
                    }
                    maxLength={2}
                    className="w-10 text-center rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-[#0F6E56]"
                  />
                  <input
                    value={item.title}
                    onChange={(e) =>
                      updateItem(currentSection.id, item.id, {
                        title: e.target.value,
                      })
                    }
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1 text-sm font-semibold focus:outline-none focus:border-[#0F6E56]"
                    placeholder="제목"
                  />
                  <button
                    onClick={() => removeItem(currentSection.id, item.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  value={item.description}
                  onChange={(e) =>
                    updateItem(currentSection.id, item.id, {
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56] resize-none"
                  placeholder="설명"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= BANNER PREVIEW =============
function BannerPreview({ slide }: { slide: BannerSlide }) {
  return (
    <div className="aspect-[9/16] relative bg-white overflow-hidden">
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: slide.bgGradient || '#EDE8E0' }} />
      )}

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0.95) 80%, #fff 100%)' }}
      />

      <div className="absolute bottom-[12%] left-0 right-0 z-10 px-5">
        <div className="text-center">
          <p
            className="font-extrabold leading-[1.15] whitespace-pre-line mb-1.5"
            style={{
              fontSize: slide.titleSize ? `${Math.round(slide.titleSize * 0.85)}px` : '36px',
              color: slide.titleColor || '#111827',
            }}
          >
            {slide.title || '제목을 입력하세요'}
          </p>
          {slide.subtitle && (
            <p
              className="mb-2 whitespace-pre-line"
              style={{
                fontSize: slide.subtitleSize ? `${Math.round(slide.subtitleSize * 0.85)}px` : '14px',
                color: slide.subtitleColor || '#6b7280',
              }}
            >
              {slide.subtitle}
            </p>
          )}
          {slide.ctaText && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F6E56] px-5 py-2 text-white text-xs font-bold">
              → {slide.ctaText}
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        <span className="w-4 h-1 rounded-full bg-[#0F6E56]" />
        <span className="w-1 h-1 rounded-full bg-gray-300" />
        <span className="w-1 h-1 rounded-full bg-gray-300" />
      </div>
    </div>
  );
}

// ============= FULL PREVIEW MODAL =============
function FullPreviewModal({ slide, onClose }: { slide: BannerSlide; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-[375px] bg-white rounded-3xl overflow-hidden shadow-2xl"
        style={{ height: 'min(90vh, 700px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center text-sm hover:bg-black/50">
          ✕
        </button>

        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: slide.bgGradient || '#EDE8E0' }} />
        )}

        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0.95) 80%, #fff 100%)' }} />

        <div className="absolute bottom-[12%] left-0 right-0 z-10 px-6">
          <div className="text-center">
            <h2
              className="font-extrabold leading-[1.15] whitespace-pre-line mb-2"
              style={{ fontSize: slide.titleSize ? `${slide.titleSize}px` : '36px', color: slide.titleColor || '#111827' }}
            >
              {slide.title || '제목을 입력하세요'}
            </h2>
            {slide.subtitle && (
              <p className="mb-4 whitespace-pre-line"
                style={{ fontSize: slide.subtitleSize ? `${slide.subtitleSize}px` : '16px', color: slide.subtitleColor || '#6b7280' }}>
                {slide.subtitle}
              </p>
            )}
            {slide.ctaText && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#0F6E56] px-7 py-3 text-white text-sm font-bold shadow-lg">
                → {slide.ctaText}
              </span>
            )}
          </div>
        </div>

        <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <span className="w-6 h-2 rounded-full bg-[#0F6E56]" />
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="w-2 h-2 rounded-full bg-gray-300" />
        </div>
      </div>
    </div>
  );
}
