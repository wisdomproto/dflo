import { useEffect, useState } from 'react';
import { WebsiteLayout } from '../components/WebsiteLayout';
import { SectionCarousel } from '../components/SectionCarousel';
import { fetchSections } from '../services/websiteSectionService';
import type { WebsiteSection } from '../types/websiteSection';

export default function WebsiteHomePage() {
  const [sections, setSections] = useState<WebsiteSection[]>([]);

  useEffect(() => {
    document.title = '연세새봄의원 187 성장클리닉 | 우리 아이 예상키 무료 측정';
  }, []);

  useEffect(() => {
    fetchSections().then(setSections);
  }, []);

  // Full-page snap scroll
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    let isScrolling = false;
    const handleWheel = (e: WheelEvent) => {
      if (isScrolling) return;
      const delta = e.deltaY;
      if (Math.abs(delta) < 10) return;

      isScrolling = true;
      const vh = window.innerHeight;
      const next = Math.round((main.scrollTop + (delta > 0 ? vh : -vh)) / vh) * vh;
      main.scrollTo({ top: next, behavior: 'smooth' });

      setTimeout(() => { isScrolling = false; }, 800);
      e.preventDefault();
    };

    main.addEventListener('wheel', handleWheel, { passive: false });
    return () => main.removeEventListener('wheel', handleWheel);
  }, []);

  const snapStyle = { scrollSnapAlign: 'start' as const, scrollSnapStop: 'always' as const };

  return (
    <WebsiteLayout>
      {sections.map((section, idx) => (
        <div key={section.id || idx} style={snapStyle}>
          <SectionCarousel slides={section.slides} />
        </div>
      ))}
    </WebsiteLayout>
  );
}
