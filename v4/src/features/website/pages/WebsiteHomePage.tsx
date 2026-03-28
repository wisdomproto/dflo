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

  return (
    <WebsiteLayout>
      <div className="flex flex-col gap-3 p-3">
        {sections.map((section, idx) => (
          <div key={section.id || idx} className="rounded-2xl overflow-hidden shadow-md bg-white">
            <SectionCarousel slides={section.slides} />
          </div>
        ))}
      </div>
    </WebsiteLayout>
  );
}
