import { useEffect, useState } from 'react';
import { SwipeableSection } from '@/shared/components/SwipeableSection';
import { fetchGrowthGuides } from '@/features/content/services/contentService';
import type { GrowthGuide } from '@/shared/types';

export function GrowthGuideSlider() {
  const [guides, setGuides] = useState<GrowthGuide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrowthGuides()
      .then(setGuides)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="guides" className="py-8">
      <SwipeableSection title="성장 가이드" emoji="📚" isLoading={loading}>
        {guides.map((g) => (
          <div key={g.id} className="rounded-xl p-4 space-y-2"
            style={{ backgroundColor: g.banner_color ? g.banner_color + '15' : '#EDE9FE' }}>
            <span className="text-2xl">{g.icon || '📖'}</span>
            <p className="text-sm font-bold text-gray-800 leading-tight">{g.title}</p>
            {g.subtitle && <p className="text-xs text-gray-500">{g.subtitle}</p>}
          </div>
        ))}
      </SwipeableSection>
    </section>
  );
}
