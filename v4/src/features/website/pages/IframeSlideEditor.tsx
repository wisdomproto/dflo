import type { IframeSlide } from '../types/websiteSection';

interface IframeSlideEditorProps {
  slide: IframeSlide;
  onUpdate: (updates: Record<string, unknown>) => void;
}

const HTML_PRESETS: { label: string; src: string }[] = [
  { label: '병원 소개 (mockup)', src: '/mockups/clinic-intro.html' },
  { label: 'FAQ (mockup)', src: '/mockups/faq.html' },
];

export function IframeSlideEditor({ slide, onUpdate }: IframeSlideEditorProps) {
  const s = slide;
  const heightMode = typeof s.height === 'number' && s.height > 0 ? 'fixed' : 'flex';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
      {/* Source URL */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">HTML 페이지 URL</label>
        <input value={s.src}
          onChange={(e) => onUpdate({ src: e.target.value })}
          placeholder="/mockups/clinic-intro.html"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className="text-[10px] text-gray-400 self-center">프리셋:</span>
          {HTML_PRESETS.map((p) => (
            <button key={p.src} onClick={() => onUpdate({ src: p.src })}
              className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                s.src === p.src ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Height mode */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">높이</label>
        <div className="flex gap-2">
          <button onClick={() => onUpdate({ height: undefined })}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
              heightMode === 'flex' ? 'border-[#0F6E56] bg-[#0F6E56]/10 text-[#0F6E56]' : 'border-gray-200 text-gray-500'
            }`}>
            자연 높이 (info-stack)
          </button>
          <button onClick={() => onUpdate({ height: s.height || 800 })}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
              heightMode === 'fixed' ? 'border-[#0F6E56] bg-[#0F6E56]/10 text-[#0F6E56]' : 'border-gray-200 text-gray-500'
            }`}>
            고정 높이 (px)
          </button>
        </div>
        {heightMode === 'fixed' && (
          <div className="flex items-center gap-2 mt-2">
            <input type="range" min={300} max={2000} step={50}
              value={s.height ?? 800}
              onChange={(e) => onUpdate({ height: Number(e.target.value) })}
              className="flex-1 accent-[#0F6E56] h-1" />
            <input type="number" min={100} max={5000}
              value={s.height ?? 800}
              onChange={(e) => onUpdate({ height: Number(e.target.value) })}
              className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs text-right" />
            <span className="text-[10px] text-gray-400">px</span>
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-1">
          {heightMode === 'flex'
            ? '콘텐츠 자연 높이로 노출. Hero·병원소개·FAQ 같은 정보형 페이지에 적합.'
            : '고정 높이 박스 안에서 스크롤. 짧은 임베드(가격표·CTA 등)에 적합.'}
        </p>
      </div>

      {/* Zoom */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">콘텐츠 크기 ({s.zoom ?? 100}%)</label>
        <div className="flex items-center gap-2">
          <input type="range" min={50} max={150} step={5}
            value={s.zoom ?? 100}
            onChange={(e) => onUpdate({ zoom: Number(e.target.value) })}
            className="flex-1 accent-[#0F6E56] h-1" />
          {s.zoom != null && s.zoom !== 100 && (
            <button onClick={() => onUpdate({ zoom: undefined })}
              className="text-[10px] text-gray-400 hover:text-red-400">↩</button>
          )}
        </div>
      </div>

      {/* Frame toggle + bg color */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={s.showFrame ?? false}
            onChange={(e) => onUpdate({ showFrame: e.target.checked })}
            className="accent-[#0F6E56] w-4 h-4"
          />
          <span className="text-xs font-semibold text-gray-600">외곽 프레임 + 전체화면 버튼 표시</span>
        </label>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">배경</span>
          <input type="color" value={s.bgColor || '#ffffff'}
            onChange={(e) => onUpdate({ bgColor: e.target.value })}
            className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
          <span className="text-[10px] text-gray-400">{s.bgColor || '#ffffff'}</span>
          {s.bgColor && (
            <button onClick={() => onUpdate({ bgColor: undefined })}
              className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
          )}
        </div>
      </div>
    </div>
  );
}
