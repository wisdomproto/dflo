import { useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { InfoModal } from './InfoModal';
import { EXERCISES, type ExerciseItem } from '@/features/exercise/data/exercises';

export function ExerciseSlider() {
  const [selected, setSelected] = useState<ExerciseItem | null>(null);

  return (
    <>
      <WebsiteSlider id="exercises" title="바른 자세가 키 성장의 시작" desktopCards={3} bgClass="bg-gray-50">
        {EXERCISES.map((ex) => (
          <button key={ex.id} onClick={() => setSelected(ex)}
            className="w-full text-left rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100
                       hover:shadow-lg active:scale-[0.98] transition-all h-full">
            <div className="relative">
              <img
                src={`https://img.youtube.com/vi/${ex.videoId}/mqdefault.jpg`}
                alt={ex.name}
                className="w-full h-40 object-cover"
              />
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-[#0F6E56] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-base font-bold text-gray-800 mb-2">{ex.name}</p>
              <span className={`inline-block text-xs font-semibold rounded-full px-3 py-1 ${
                ex.category === '스트레칭'
                  ? 'bg-[#E8F5F0] text-[#0F6E56]'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {ex.category}
              </span>
            </div>
          </button>
        ))}
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
