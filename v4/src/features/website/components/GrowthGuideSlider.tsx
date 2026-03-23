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
    <WebsiteSlider id="guides" tag="성장 가이드" title="전문가가 알려주는 키 성장 정보" desktopCards={3} bgClass="bg-gray-50">
      {guides.map((g) => (
        <div key={g.id} className="rounded-2xl p-5 h-full border border-gray-100"
          style={{ backgroundColor: g.banner_color ? g.banner_color + '12' : '#EDE9FE' }}>
          <span className="text-3xl block mb-3">{g.icon || '📖'}</span>
          <p className="text-base font-bold text-gray-800 mb-1">{g.title}</p>
          {g.subtitle && <p className="text-sm text-gray-500 leading-relaxed">{g.subtitle}</p>}
        </div>
      ))}
    </WebsiteSlider>
  );
}
