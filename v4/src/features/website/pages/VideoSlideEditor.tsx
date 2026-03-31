import type { VideoSlide } from '../types/websiteSection';

interface VideoSlideEditorProps {
  slide: VideoSlide;
  onUpdate: (updates: Record<string, unknown>) => void;
}

export function VideoSlideEditor({ slide, onUpdate }: VideoSlideEditorProps) {
  const vs = slide;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
      {/* YouTube URL */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">YouTube URL</label>
        <input value={vs.videoUrl}
          onChange={(e) => onUpdate({ videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=... 또는 영상 ID"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
      </div>

      {/* Title + Description in 2-col on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Title */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500">제목</label>
            <div className="flex items-center gap-1.5">
              <input type="color" value={vs.titleColor || '#1a1a1a'}
                onChange={(e) => onUpdate({ titleColor: e.target.value })}
                className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
              <span className="text-[10px] text-gray-400">{vs.titleColor || '#1a1a1a'}</span>
              {vs.titleColor && (
                <button onClick={() => onUpdate({ titleColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
              )}
            </div>
          </div>
          <textarea value={vs.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            rows={2} placeholder="영상 제목"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#0F6E56] resize-none" />
        </div>

        {/* Description */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500">설명</label>
            <div className="flex items-center gap-1.5">
              <input type="color" value={vs.descriptionColor || '#666666'}
                onChange={(e) => onUpdate({ descriptionColor: e.target.value })}
                className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
              <span className="text-[10px] text-gray-400">{vs.descriptionColor || '#666666'}</span>
              {vs.descriptionColor && (
                <button onClick={() => onUpdate({ descriptionColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-400">✕</button>
              )}
            </div>
          </div>
          <textarea value={vs.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2} placeholder="영상 설명 텍스트"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
        </div>
      </div>
    </div>
  );
}
