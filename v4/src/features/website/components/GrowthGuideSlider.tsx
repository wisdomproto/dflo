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
    <WebsiteSlider id="guides" title="전문의가 알려주는 키 성장 가이드" desktopCards={3} bgClass="bg-gray-50">
      {guides.map((g) => (
        <div key={g.id} className="rounded-2xl p-5 h-full border border-gray-100"
          style={{ backgroundColor: g.banner_color ? g.banner_color + '12' : '#EDE9FE' }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{g.icon || '📖'}</span>
            <p className="text-2xl font-bold text-gray-800">{g.title}</p>
          </div>
          {g.subtitle && <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{g.subtitle}</p>}
          <span className="inline-block mt-3 text-xs font-semibold text-[#0F6E56]">자세히 보기 →</span>
        </div>
      ))}
    </WebsiteSlider>
  );
}
