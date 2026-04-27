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
      {/* PC 에서도 카드는 모바일 폭 그대로 — 인스타그램 데스크탑처럼 폰 크기
          카드를 화면 중앙에 세로 스택으로 배치한다. 텍스트:카드 비율이
          모바일과 정확히 일치하므로 별도 zoom 로직이 필요 없다. */}
      <div className="flex flex-col gap-3 md:gap-4 p-3 md:p-4 max-w-[460px] mx-auto w-full">
        {sections.map((section, idx) => (
          <div key={section.id || idx} className="rounded-2xl overflow-hidden shadow-md bg-white border-3 border-purple-300">
            <SectionCarousel slides={section.slides} showNav={section.showNav ?? true} />
          </div>
        ))}
      </div>
    </WebsiteLayout>
  );
}
