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
  // 치료사례 메뉴 딥링크 — ?case=N (cases 슬라이드 중 N번째, 1-base)
  const caseParam = parseInt(searchParams.get('case') ?? '', 10);
  // ?only=3,4,6,7 — 메뉴에 노출한 케이스만 남김(인트로 배너·나머지 케이스 제외).
  // 나머지 사례는 메신저(LINE/카톡) 게이트 뒤 — 뷰어에서 스와이프로 못 보게.
  const onlyParam = searchParams.get('only') ?? '';
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
        // ?case=N 딥링크가 있으면 N번째 케이스(1-base, cases 슬라이드만 셈)를 바로 연다.
        const caseIndexes = ordered
          .map((s, i) => (s.template === 'cases' ? i : -1))
          .filter((i) => i >= 0);
        const deepIdx =
          Number.isFinite(caseParam) && caseParam >= 1 && caseParam <= caseIndexes.length
            ? caseIndexes[caseParam - 1]
            : -1;

        // ?only=… 필터: 노출 케이스만 남김(스와이프 범위 제한). 딥링크 케이스는 항상 포함.
        const wanted = onlyParam
          .split(',')
          .map((n) => parseInt(n, 10))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= caseIndexes.length);
        if (wanted.length > 0) {
          const keep = new Set(wanted.map((n) => caseIndexes[n - 1]));
          if (deepIdx >= 0) keep.add(deepIdx);
          const filtered = ordered.filter((_, i) => keep.has(i));
          const target = deepIdx >= 0 ? ordered[deepIdx] : filtered[0];
          setSlides(filtered);
          setShowNav(casesSection.showNav ?? true);
          setInitialIndex(Math.max(0, filtered.indexOf(target)));
          setLoading(false);
          return;
        }

        const firstCaseIdx = caseIndexes.length > 0 ? caseIndexes[0] : 0;
        setSlides(ordered);
        setShowNav(casesSection.showNav ?? true);
        setInitialIndex(deepIdx >= 0 ? deepIdx : firstCaseIdx > 0 ? firstCaseIdx : 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lang, caseParam, onlyParam]);

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
    <div className="w-full max-w-[460px] md:max-w-[720px] mx-auto bg-white h-screen overflow-hidden flex flex-col">
      <SectionCarousel slides={slides} showNav={showNav} initialIndex={initialIndex} lang={lang} embed />
    </div>
  );
}
