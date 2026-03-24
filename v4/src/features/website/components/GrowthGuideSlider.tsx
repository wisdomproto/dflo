import { useEffect, useState } from 'react';
import { WebsiteSlider } from './WebsiteSlider';
import { fetchGrowthGuides } from '@/features/content/services/contentService';
import type { GrowthGuide } from '@/shared/types';

export function GrowthGuideSlider() {
  const [guides, setGuides] = useState<GrowthGuide[]>([]);

  useEffect(() => {
    fetchGrowthGuides().then(setGuides).catch(() => {});
  }, []);

  if (!guides.length) return null;

  return (
    <WebsiteSlider id="guides" title="📋 전문의가 알려주는 키 성장 가이드" desktopCards={3} bgClass="bg-gray-50">
      {guides.map((g) => (
        <div key={g.id} className="rounded-2xl overflow-hidden h-full border border-gray-100 bg-white shadow-sm
                                    hover:shadow-md hover:border-[#0F6E56]/20 transition-all">
          {/* Top accent bar */}
          <div className="h-1.5" style={{ background: g.banner_color || '#0F6E56' }} />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: (g.banner_color || '#0F6E56') + '15' }}>
                {g.icon || '📖'}
              </div>
              <p className="text-lg font-bold text-gray-800 line-clamp-2">{g.title}</p>
            </div>
            {g.subtitle && <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mt-2">{g.subtitle}</p>}
            <span className="inline-block mt-3 text-xs font-semibold text-[#0F6E56]">자세히 보기 →</span>
          </div>
        </div>
      ))}
    </WebsiteSlider>
  );
}
