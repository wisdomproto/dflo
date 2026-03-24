import { useEffect, useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { InfoModal } from './InfoModal';
import { GuideDetail } from '@/features/content/components/GuideDetail';
import { fetchGrowthGuides } from '@/features/content/services/contentService';
import type { GrowthGuide } from '@/shared/types';

export function GrowthGuideSlider() {
  const [guides, setGuides] = useState<GrowthGuide[]>([]);
  const [selected, setSelected] = useState<GrowthGuide | null>(null);

  useEffect(() => {
    fetchGrowthGuides().then(setGuides).catch(() => {});
  }, []);

  if (!guides.length) return null;

  return (
    <>
      <WebsiteSlider id="guides" title="📋 전문의가 알려주는 키 성장 가이드" desktopCards={3} sideHeader>
        {guides.map((g) => {
          const color = g.banner_color || '#0F6E56';
          return (
            <button key={g.id} onClick={() => setSelected(g)}
              className="w-full text-left rounded-2xl p-5 h-full border border-gray-100 hover:shadow-md transition-all active:scale-[0.98]"
              style={{ backgroundColor: color + '08', borderLeft: `4px solid ${color}` }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{g.icon || '📖'}</span>
                <p className="text-2xl font-bold text-gray-800 line-clamp-2">{g.title}</p>
              </div>
              {g.subtitle && <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{g.subtitle}</p>}
              <span className="inline-block mt-3 text-xs font-semibold text-[#0F6E56]">자세히 보기 →</span>
            </button>
          );
        })}
      </WebsiteSlider>

      <InfoModal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''}>
        {selected && <GuideDetail guide={selected} />}
      </InfoModal>
    </>
  );
}
