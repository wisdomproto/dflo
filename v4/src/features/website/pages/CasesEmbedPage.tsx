// CasesEmbedPage — /banner-admin 의 "키 성장 관리 사례" 섹션을 그대로 보여주는 standalone 페이지.
// /test/cases.html 가 iframe 으로 임베드해서 cases-only 뷰로 노출.
// 사용자가 어드민에서 cases 슬라이드를 만들면 자동 반영.
//
// 다국어: 부모 페이지 (`/test/{lang}/cases.html`) 가 iframe src 에 `?lang={lang}` 을
// 붙여서 들어오므로 useSearchParams 로 받아 SectionCarousel 에 전달.
// 환자 데이터 자체(이름·메모·카테고리)는 한국어 그대로, UI 라벨/헤더만 번역된다.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchSections } from '../services/websiteSectionService';
import { SectionCarousel } from '../components/SectionCarousel';
import { isCasesLang, type CasesLang } from '../components/casesLabels';
import type { Slide } from '../types/websiteSection';

const PAGE_TITLES: Record<CasesLang, string> = {
  ko: '치료 사례',
  en: 'Treatment Cases',
  th: 'เคสรักษา',
  vi: 'Ca điều trị',
};

const EMPTY_STATES: Record<CasesLang, { loading: string; empty: string }> = {
  ko: { loading: '사례 불러오는 중…', empty: '등록된 치료 사례가 없습니다.' },
  en: { loading: 'Loading cases…', empty: 'No treatment cases yet.' },
  th: { loading: 'กำลังโหลดเคส…', empty: 'ยังไม่มีเคสรักษา' },
  vi: { loading: 'Đang tải ca điều trị…', empty: 'Chưa có ca điều trị.' },
};

export default function CasesEmbedPage() {
  const [searchParams] = useSearchParams();
  const langParam = searchParams.get('lang');
  const lang: CasesLang = isCasesLang(langParam) ? langParam : 'ko';
  const [slides, setSlides] = useState<Slide[]>([]);
  const [showNav, setShowNav] = useState(true);
  const [initialIndex, setInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = PAGE_TITLES[lang];
    fetchSections()
      .then((sections) => {
        // cases 슬라이드를 포함한 첫 섹션 = "키 성장 관리 사례"
        const casesSection = sections.find((s) =>
          s.slides?.some((sl) => sl.template === 'cases'),
        );
        if (!casesSection) {
          setLoading(false);
          return;
        }
        // 섹션 자체를 그대로 — intro banner + cases 슬라이드 + 어드민에서 추가한 다른 슬라이드 포함.
        const ordered = (casesSection.slides || [])
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        // 첫 진입은 케이스 슬라이드부터 — intro banner 에서 이탈해도 실제 사례 0개 본 일이 없도록.
        // 사용자가 swipe 로 앞쪽 인트로/배너에 접근은 가능.
        const firstCaseIdx = ordered.findIndex((s) => s.template === 'cases');
        setSlides(ordered);
        setShowNav(casesSection.showNav ?? true);
        setInitialIndex(firstCaseIdx > 0 ? firstCaseIdx : 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        {EMPTY_STATES[lang].loading}
      </div>
    );
  }
  if (slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        {EMPTY_STATES[lang].empty}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] md:max-w-[720px] mx-auto bg-white">
      <SectionCarousel slides={slides} showNav={showNav} initialIndex={initialIndex} lang={lang} />
    </div>
  );
}
