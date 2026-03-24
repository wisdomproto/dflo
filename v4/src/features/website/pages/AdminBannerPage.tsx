// ================================================
// AdminBannerPage - 웹사이트 배너 관리
// localStorage 기반 (Supabase 테이블 없이 동작)
// ================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import type { BannerSlide } from '../components/HeroBanner';

const STORAGE_KEY = 'website-banners';

function generateId() {
  return `banner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptySlide(order: number): BannerSlide {
  return {
    id: generateId(),
    title: '',
    subtitle: '',
    ctaText: '자세히 보기',
    ctaAction: 'scroll',
    ctaTarget: 'calculator',
    bgGradient: 'linear-gradient(135deg, #0F6E56 0%, #1A3A32 100%)',
    order,
  };
}

export default function AdminBannerPage() {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as BannerSlide[];
        setSlides(parsed.sort((a, b) => a.order - b.order));
      }
    } catch { /* ignore */ }
  }, []);

  const save = () => {
    const ordered = slides.map((s, i) => ({ ...s, order: i }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered));
    setSlides(ordered);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addSlide = () => {
    setSlides([...slides, emptySlide(slides.length)]);
  };

  const updateSlide = (id: string, updates: Partial<BannerSlide>) => {
    setSlides(slides.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSlide = (id: string) => {
    setSlides(slides.filter((s) => s.id !== id));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...slides];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setSlides(arr);
  };

  const moveDown = (idx: number) => {
    if (idx >= slides.length - 1) return;
    const arr = [...slides];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setSlides(arr);
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSlides([]);
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link to="/website" className="text-sm text-gray-500 hover:text-[#0F6E56]">
              ← 사이트로 돌아가기
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-bold text-gray-800">🖼️ 배너 관리</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetToDefaults}
              className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              기본값 복원
            </button>
            <button onClick={save}
              className="text-sm font-bold text-white bg-[#0F6E56] px-5 py-2 rounded-xl hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
              {saved ? '✓ 저장됨!' : '저장'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Info */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            <strong>💡 사용법:</strong> 배너 슬라이드를 추가/편집한 후 <strong>저장</strong> 버튼을 누르세요.
            저장하지 않으면 기본 배너 4장이 표시됩니다. 이미지를 업로드하면 배경으로 사용됩니다.
          </p>
        </div>

        {/* Empty state */}
        {slides.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="text-gray-500 mb-1">등록된 배너가 없습니다</p>
            <p className="text-sm text-gray-400 mb-6">기본 배너 4장이 표시됩니다</p>
            <button onClick={addSlide}
              className="text-sm font-bold text-[#0F6E56] bg-[#E8F5F0] px-6 py-2.5 rounded-xl hover:bg-[#D0EDE4] transition-colors">
              + 새 배너 추가
            </button>
          </div>
        )}

        {/* Slide list */}
        {slides.map((slide, idx) => (
          <SlideEditor
            key={slide.id}
            slide={slide}
            index={idx}
            total={slides.length}
            onChange={(updates) => updateSlide(slide.id, updates)}
            onRemove={() => removeSlide(slide.id)}
            onMoveUp={() => moveUp(idx)}
            onMoveDown={() => moveDown(idx)}
          />
        ))}

        {/* Add button */}
        {slides.length > 0 && (
          <button onClick={addSlide}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400
                       hover:border-[#0F6E56] hover:text-[#0F6E56] hover:bg-[#F0FAF7] transition-colors">
            + 새 배너 추가
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Slide Editor Component ----

interface SlideEditorProps {
  slide: BannerSlide;
  index: number;
  total: number;
  onChange: (updates: Partial<BannerSlide>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SlideEditor({ slide, index, total, onChange, onRemove, onMoveUp, onMoveDown }: SlideEditorProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#0F6E56] text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-gray-700">
            {slide.title ? slide.title.split('\n')[0] : '새 배너'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={index === 0}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-sm">
            ↑
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center text-sm">
            ↓
          </button>
          <button onClick={onRemove}
            className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-sm">
            🗑
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Preview */}
        <div
          className="relative rounded-xl overflow-hidden h-40 flex items-end p-4"
          style={{
            background: slide.imageUrl
              ? `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.2))`
              : slide.bgGradient || '#0F6E56',
          }}
        >
          {slide.imageUrl && (
            <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover -z-10" />
          )}
          <div className="text-white">
            <p className="text-lg font-bold whitespace-pre-line leading-tight">
              {slide.title || '제목을 입력하세요'}
            </p>
            <p className="text-xs text-white/60 mt-1">{slide.subtitle || '부제목'}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">제목 (줄바꿈: \n)</label>
            <textarea
              value={slide.title}
              onChange={(e) => onChange({ title: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56] resize-none"
              placeholder="우리 아이,\n얼마나 클까?"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">부제목</label>
            <input
              value={slide.subtitle}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
              placeholder="지금 바로 예상 키를 무료로 측정해보세요"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 텍스트</label>
            <input
              value={slide.ctaText}
              onChange={(e) => onChange({ ctaText: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
              placeholder="자세히 보기"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 동작</label>
            <div className="flex gap-2">
              <select
                value={slide.ctaAction}
                onChange={(e) => onChange({ ctaAction: e.target.value as 'scroll' | 'link' })}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
              >
                <option value="scroll">섹션 스크롤</option>
                <option value="link">외부 링크</option>
              </select>
              <input
                value={slide.ctaTarget}
                onChange={(e) => onChange({ ctaTarget: e.target.value })}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
                placeholder={slide.ctaAction === 'scroll' ? 'calculator' : 'https://...'}
              />
            </div>
          </div>
        </div>

        {/* Image upload */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">배경 이미지 (선택)</label>
          <ImageUploader
            folder="banners"
            currentUrl={slide.imageUrl}
            onUploaded={(url) => onChange({ imageUrl: url || undefined })}
          />
        </div>

        {/* Gradient (only if no image) */}
        {!slide.imageUrl && (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">배경 그라데이션 CSS</label>
            <input
              value={slide.bgGradient || ''}
              onChange={(e) => onChange({ bgGradient: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#0F6E56]"
              placeholder="linear-gradient(135deg, #0F6E56 0%, #1A3A32 100%)"
            />
          </div>
        )}
      </div>
    </div>
  );
}
