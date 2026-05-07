// CasesEmbedPage — Standalone page that fetches cases from R2 and renders via SectionCarousel.
// Designed to be iframed by /test/cases.html so the original CasesContent rendering
// (height change bar chart, growth chart, photos, intake info, allergy, memos, etc.)
// is reused without duplication.

import { useEffect, useState } from 'react';
import { fetchSections } from '../services/websiteSectionService';
import { SectionCarousel } from '../components/SectionCarousel';
import type { CasesSlide } from '../types/websiteSection';

export default function CasesEmbedPage() {
  const [cases, setCases] = useState<CasesSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '치료 사례';
    fetchSections().then((sections) => {
      const all = sections.flatMap((s) => s.slides || []);
      const filtered = all.filter((s): s is CasesSlide => s.template === 'cases');
      filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCases(filtered);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        사례 불러오는 중…
      </div>
    );
  }
  if (cases.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        등록된 치료 사례가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] mx-auto bg-white">
      <SectionCarousel slides={cases} showNav={true} />
    </div>
  );
}
