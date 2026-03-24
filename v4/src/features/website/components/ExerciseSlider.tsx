import { useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { InfoModal } from './InfoModal';
import { EXERCISES, type ExerciseItem } from '@/features/exercise/data/exercises';

export function ExerciseSlider() {
  const [selected, setSelected] = useState<ExerciseItem | null>(null);

  return (
    <>
      <WebsiteSlider id="exercises" title="🏃 바른 자세 · 키 성장 운동" desktopCards={3} bgClass="bg-[#F5F5F0]">
        {EXERCISES.map((ex) => {
          const isStretch = ex.category === '스트레칭';
          return (
            <button key={ex.id} onClick={() => setSelected(ex)}
              className="w-full text-left rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100
                         hover:shadow-md active:scale-[0.98] transition-all h-full group"
              style={{ borderTop: `3px solid ${isStretch ? '#0F6E56' : '#3B82F6'}` }}>
              <div className="relative">
                <img
                  src={`https://img.youtube.com/vi/${ex.videoId}/mqdefault.jpg`}
                  alt={ex.name}
                  className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg
                                  group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-[#0F6E56] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Category badge */}
                <span className={`absolute top-3 left-3 text-xs font-bold rounded-full px-3 py-1 shadow-sm ${
                  isStretch
                    ? 'bg-[#0F6E56] text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  {ex.category}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <p className="text-base font-bold text-gray-800">{ex.name}</p>
                <span className="text-xs text-gray-400">{ex.sets}세트×{ex.reps}</span>
              </div>
            </button>
          );
        })}
      </WebsiteSlider>

      {/* YouTube Video Modal */}
      <InfoModal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && (
          <div className="space-y-4">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${selected.videoId}?start=${selected.startSeconds}&autoplay=1`}
                title={selected.name}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block text-xs font-semibold rounded-full px-3 py-1 ${
                selected.category === '스트레칭'
                  ? 'bg-[#E8F5F0] text-[#0F6E56]'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {selected.category}
              </span>
              <span className="text-xs text-gray-400">
                {selected.sets}세트 × {selected.reps}
              </span>
            </div>
            {selected.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
            )}
          </div>
        )}
      </InfoModal>
    </>
  );
}
