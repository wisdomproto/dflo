import { useState } from 'react';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import type { BannerSlide } from '../types/websiteSection';

interface BannerSlideEditorProps {
  slide: BannerSlide;
  onUpdate: (updates: Record<string, unknown>) => void;
  imageHistory: string[];
}

export function BannerSlideEditor({ slide, onUpdate, imageHistory }: BannerSlideEditorProps) {
  const bs = slide;
  const [showHistory, setShowHistory] = useState(false);

  // Filter out current image from history
  const historyItems = imageHistory.filter((url) => url !== bs.imageUrl);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
      {/* Image Upload */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-500">배경 이미지</label>
          {historyItems.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                showHistory
                  ? 'bg-[#0F6E56] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              📂 히스토리 ({historyItems.length})
            </button>
          )}
        </div>
        <ImageUploader
          key={bs.id}
          folder="banners"
          currentUrl={bs.imageUrl}
          onUploaded={(url) => onUpdate({ imageUrl: url || undefined })}
        />

        {/* Image History */}
        {showHistory && historyItems.length > 0 && (
          <div className="mt-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1.5">이전 이미지 (클릭하여 선택)</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {historyItems.map((url) => (
                <button
                  key={url}
                  onClick={() => { onUpdate({ imageUrl: url }); setShowHistory(false); }}
                  className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0F6E56] transition-colors group relative"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-lg opacity-0 group-hover:opacity-100 drop-shadow">↩</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Fit */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">이미지 맞춤</label>
        <select value={bs.imageFit || 'cover'}
          onChange={(e) => onUpdate({ imageFit: e.target.value as 'cover' | 'contain' })}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]">
          <option value="cover">채우기 (잘릴 수 있음)</option>
          <option value="contain">전체 표시 (여백 가능)</option>
        </select>
      </div>

      {/* Title + Subtitle in 2-col on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Title */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500">제목</label>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onUpdate({ titleShadow: !(bs.titleShadow ?? true) })}
                className={`text-[10px] px-1.5 py-0.5 rounded ${(bs.titleShadow ?? true) ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                그림자
              </button>
              <input type="color" value={bs.titleColor || '#ffffff'}
                onChange={(e) => onUpdate({ titleColor: e.target.value })}
                className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
              <span className="text-[10px] text-gray-400">{bs.titleColor || '#ffffff'}</span>
              {bs.titleColor && (
                <button onClick={() => onUpdate({ titleColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
              )}
            </div>
          </div>
          <textarea value={bs.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            rows={2} placeholder="우리 아이,&#10;얼마나 클까?"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#0F6E56] resize-none" />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400 shrink-0">크기</span>
            <input type="range" min={16} max={120} value={bs.titleSize || 96}
              onChange={(e) => onUpdate({ titleSize: Number(e.target.value) })}
              className="flex-1 accent-[#0F6E56] h-1" />
            <span className="text-[10px] text-gray-500 w-10 text-right">{bs.titleSize || 96}px</span>
            {bs.titleSize && (
              <button onClick={() => onUpdate({ titleSize: undefined })}
                className="text-[10px] text-gray-400 hover:text-red-400">↩</button>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-gray-400 shrink-0 mr-1">정렬</span>
            {(['left', 'center', 'right', 'justify'] as const).map((a) => (
              <button key={a} onClick={() => onUpdate({ titleAlign: a })}
                className={`text-[10px] px-2 py-0.5 rounded ${(bs.titleAlign ?? 'center') === a ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {a === 'left' ? '왼쪽' : a === 'center' ? '가운데' : a === 'right' ? '오른쪽' : '양쪽'}
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500">설명</label>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onUpdate({ subtitleShadow: !(bs.subtitleShadow ?? true) })}
                className={`text-[10px] px-1.5 py-0.5 rounded ${(bs.subtitleShadow ?? true) ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                그림자
              </button>
              <input type="color" value={bs.subtitleColor || '#ffffff'}
                onChange={(e) => onUpdate({ subtitleColor: e.target.value === '#ffffff' ? undefined : e.target.value })}
                className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
              <span className="text-[10px] text-gray-400">{bs.subtitleColor || '#ffffff'}</span>
              {bs.subtitleColor && (
                <button onClick={() => onUpdate({ subtitleColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
              )}
            </div>
          </div>
          <textarea value={bs.subtitle}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            rows={2} placeholder="설명 텍스트"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400 shrink-0">크기</span>
            <input type="range" min={10} max={80} value={bs.subtitleSize || 50}
              onChange={(e) => onUpdate({ subtitleSize: Number(e.target.value) })}
              className="flex-1 accent-[#0F6E56] h-1" />
            <span className="text-[10px] text-gray-500 w-10 text-right">{bs.subtitleSize || 50}px</span>
            {bs.subtitleSize && (
              <button onClick={() => onUpdate({ subtitleSize: undefined })}
                className="text-[10px] text-gray-400 hover:text-red-400">↩</button>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-gray-400 shrink-0 mr-1">정렬</span>
            {(['left', 'center', 'right', 'justify'] as const).map((a) => (
              <button key={a} onClick={() => onUpdate({ subtitleAlign: a })}
                className={`text-[10px] px-2 py-0.5 rounded ${(bs.subtitleAlign ?? 'center') === a ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {a === 'left' ? '왼쪽' : a === 'center' ? '가운데' : a === 'right' ? '오른쪽' : '양쪽'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Text Position */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">
          텍스트 위치 (하단에서 {bs.textPositionY ?? 12}%)
        </label>
        <input type="range" min={0} max={50} value={bs.textPositionY ?? 12}
          onChange={(e) => onUpdate({ textPositionY: Number(e.target.value) })}
          className="w-full accent-[#0F6E56]" />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>하단</span><span>중간</span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 텍스트</label>
          <input value={bs.ctaText}
            onChange={(e) => onUpdate({ ctaText: e.target.value })}
            placeholder="비우면 표시 안 함"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 크기</label>
          <div className="flex items-center gap-2">
            <input type="range" min={8} max={20} value={bs.ctaSizePx ?? (bs.ctaSize === 'sm' ? 12 : bs.ctaSize === 'lg' ? 18 : 14)}
              onChange={(e) => onUpdate({ ctaSizePx: Number(e.target.value) })}
              className="flex-1 accent-[#0F6E56] h-1" />
            <span className="text-[10px] text-gray-500 w-10 text-right">
              {bs.ctaSizePx ?? (bs.ctaSize === 'sm' ? 12 : bs.ctaSize === 'lg' ? 18 : 14)}px
            </span>
            {bs.ctaSizePx && (
              <button onClick={() => onUpdate({ ctaSizePx: undefined })}
                className="text-[10px] text-gray-400 hover:text-red-400">↩</button>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-gray-400 shrink-0 mr-1">정렬</span>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button key={a} onClick={() => onUpdate({ ctaAlign: a })}
                className={`text-[10px] px-2 py-0.5 rounded ${(bs.ctaAlign ?? 'center') === a ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {a === 'left' ? '왼쪽' : a === 'center' ? '가운데' : '오른쪽'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-gray-400 shrink-0">배경</span>
            <input type="color" value={bs.ctaBgColor || '#0F6E56'}
              onChange={(e) => onUpdate({ ctaBgColor: e.target.value })}
              className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
            <span className="text-[10px] text-gray-400">{bs.ctaBgColor || '#0F6E56'}</span>
            {bs.ctaBgColor && (
              <button onClick={() => onUpdate({ ctaBgColor: undefined })}
                className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
            )}
            <span className="text-[10px] text-gray-400 shrink-0 ml-2">글자</span>
            <input type="color" value={bs.ctaTextColor || '#ffffff'}
              onChange={(e) => onUpdate({ ctaTextColor: e.target.value })}
              className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
            <span className="text-[10px] text-gray-400">{bs.ctaTextColor || '#ffffff'}</span>
            {bs.ctaTextColor && (
              <button onClick={() => onUpdate({ ctaTextColor: undefined })}
                className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">버튼 동작</label>
          <select value={bs.ctaAction}
            onChange={(e) => onUpdate({ ctaAction: e.target.value as 'scroll' | 'link' | 'fulllink' | 'modal' | 'iframe' })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]">
            <option value="scroll">스크롤</option>
            <option value="link">링크</option>
            <option value="fulllink">전체 배너 링크</option>
            <option value="modal">모달 (전체화면 이미지)</option>
            <option value="iframe">HTML 페이지 임베드</option>
          </select>
        </div>
      </div>
      {bs.ctaAction === 'fulllink' && (
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">이동할 URL</label>
          <input value={bs.ctaTarget}
            onChange={(e) => onUpdate({ ctaTarget: e.target.value })}
            placeholder="https://... 또는 /programs/body-proportion.html"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
          <p className="text-[10px] text-gray-400 mt-1">배너 전체를 클릭하면 해당 URL로 이동합니다 (버튼 숨김)</p>
        </div>
      )}
      {bs.ctaAction === 'modal' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">모달 이미지 URL</label>
            <input value={bs.ctaTarget}
              onChange={(e) => onUpdate({ ctaTarget: e.target.value })}
              placeholder="이미지 URL (비우면 배너 이미지 사용)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">외각 비율</label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate({ modalRatio: '4:5' })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  bs.modalRatio === '4:5' ? 'border-[#0F6E56] bg-[#0F6E56]/10 text-[#0F6E56]' : 'border-gray-200 text-gray-500'
                }`}
              >
                4:5
              </button>
              <button
                onClick={() => onUpdate({ modalRatio: '9:16' })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  (!bs.modalRatio || bs.modalRatio === '9:16') ? 'border-[#0F6E56] bg-[#0F6E56]/10 text-[#0F6E56]' : 'border-gray-200 text-gray-500'
                }`}
              >
                9:16
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">검은 배경 위에 이미지 표시. 긴 이미지는 스크롤 가능.</p>
          </div>
        </div>
      )}
      {bs.ctaAction === 'iframe' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">HTML 페이지 URL</label>
            <input value={bs.ctaTarget}
              onChange={(e) => onUpdate({ ctaTarget: e.target.value })}
              placeholder="/programs/body-proportion.html"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">외각 비율</label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate({ modalRatio: '4:5' })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  bs.modalRatio === '4:5' ? 'border-[#0F6E56] bg-[#0F6E56]/10 text-[#0F6E56]' : 'border-gray-200 text-gray-500'
                }`}
              >
                4:5
              </button>
              <button
                onClick={() => onUpdate({ modalRatio: '9:16' })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  (!bs.modalRatio || bs.modalRatio === '9:16') ? 'border-[#0F6E56] bg-[#0F6E56]/10 text-[#0F6E56]' : 'border-gray-200 text-gray-500'
                }`}
              >
                9:16
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">배너 영역 안에 HTML 페이지가 iframe으로 표시됩니다. 스크롤 가능.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">콘텐츠 크기 ({bs.iframeZoom || 70}%)</label>
            <input type="range" min={50} max={150} step={5} value={bs.iframeZoom || 70}
              onChange={(e) => onUpdate({ iframeZoom: Number(e.target.value) })}
              className="w-full accent-[#0F6E56] h-1" />
          </div>
        </div>
      )}
      {!['fulllink', 'modal', 'iframe'].includes(bs.ctaAction) && bs.ctaText && (
        <input value={bs.ctaTarget}
          onChange={(e) => onUpdate({ ctaTarget: e.target.value })}
          placeholder={bs.ctaAction === 'scroll' ? 'calculator' : 'https://...'}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
      )}
    </div>
  );
}
