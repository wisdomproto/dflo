import { useEffect, useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { InfoModal } from './InfoModal';
import { fetchExercises, parseYouTubeUrl } from '@/features/exercise/services/exerciseService';
import type { Exercise } from '@/shared/types';

interface ExerciseDisplay {
  id: string;
  name: string;
  category: string;
  videoId: string;
  startSeconds: number;
}

function toDisplay(ex: Exercise): ExerciseDisplay | null {
  const parsed = parseYouTubeUrl(ex.youtube_url);
  if (!parsed) return null;
  return {
    id: ex.id,
    name: ex.name,
    category: ex.category,
    videoId: parsed.videoId,
    startSeconds: parsed.startSeconds,
  };
}

export function ExerciseSlider() {
  const [items, setItems] = useState<ExerciseDisplay[]>([]);
  const [selected, setSelected] = useState<ExerciseDisplay | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchExercises()
      .then((list) => {
        if (cancelled) return;
        setItems(list.map(toDisplay).filter((x): x is ExerciseDisplay => x !== null));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <>
      <div className="w-full h-full flex items-center justify-center">
        <WebsiteSlider id="exercises" title="🏃 바른 자세 · 키 성장 운동" desktopCards={3} sideHeader>
        {items.map((ex) => {
          const isStretch = ex.category === '스트레칭';
          return (
            <button key={ex.id} onClick={() => setSelected(ex)}
              className="w-full text-left rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100
                         hover:shadow-md active:scale-[0.98] transition-all h-full group flex flex-col"
              style={{ borderLeft: `4px solid ${isStretch ? '#0F6E56' : '#3B82F6'}` }}>
              <div className="relative flex-1">
                <img
                  src={`https://img.youtube.com/vi/${ex.videoId}/mqdefault.jpg`}
                  alt={ex.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
              <div className="p-4">
                <p className="text-base font-bold text-gray-800">{ex.name}</p>
              </div>
            </button>
          );
        })}
        </WebsiteSlider>
      </div>

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
            <span className={`inline-block text-xs font-semibold rounded-full px-3 py-1 ${
              selected.category === '스트레칭'
                ? 'bg-[#E8F5F0] text-[#0F6E56]'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {selected.category}
            </span>
          </div>
        )}
      </InfoModal>
    </>
  );
}
