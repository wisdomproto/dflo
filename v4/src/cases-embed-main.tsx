// cases-embed-main — 경량 독립 엔트리. 공개 `cases.html` iframe 이 `/cases-embed.html` 로 로드.
// SPA(App/router/Supabase/admin)를 타지 않고 SectionCarousel 만 마운트해 부팅 번들을 최소화한다.
// (계산기 calc-main.tsx 와 동일 플레이북. 옛 /cases-embed React 라우트는 하위호환으로 유지.)
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { fetchCasesSectionsStatic } from '@/features/website/services/websiteSectionService';
import { selectCaseSlides } from '@/features/website/lib/selectCaseSlides';
import { SectionCarousel } from '@/features/website/components/SectionCarousel';
import { isCasesLang, type CasesLang } from '@/features/website/components/casesLabels';
import type { Slide } from '@/features/website/types/websiteSection';

const PAGE_TITLES: Record<CasesLang, string> = {
  ko: '치료 사례',
  en: 'Treatment Cases',
  th: 'เคสรักษา',
  vi: 'Ca điều trị',
  'zh-hant': '治療案例',
  'zh-hans': '治疗案例',
  ar: 'حالات العلاج',
};
const EMPTY_STATES: Record<CasesLang, { loading: string; empty: string }> = {
  ko: { loading: '사례 불러오는 중…', empty: '등록된 치료 사례가 없습니다.' },
  en: { loading: 'Loading cases…', empty: 'No treatment cases yet.' },
  th: { loading: 'กำลังโหลดเคส…', empty: 'ยังไม่มีเคสรักษา' },
  vi: { loading: 'Đang tải ca điều trị…', empty: 'Chưa có ca điều trị.' },
  'zh-hant': { loading: '正在載入案例…', empty: '目前沒有治療案例。' },
  'zh-hans': { loading: '正在加载案例…', empty: '目前没有治疗案例。' },
  ar: { loading: 'جارٍ تحميل الحالات…', empty: 'لا توجد حالات علاج بعد.' },
};

const params = new URLSearchParams(window.location.search);
const langParam = params.get('lang');
const lang: CasesLang = isCasesLang(langParam) ? langParam : 'ko';
const caseParam = parseInt(params.get('case') ?? '', 10);
const onlyParam = params.get('only') ?? '';

document.documentElement.lang = lang;
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
document.title = PAGE_TITLES[lang];

function CasesEmbedApp() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [showNav, setShowNav] = useState(true);
  const [initialIndex, setInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCasesSectionsStatic()
      .then((sections) => {
        const sel = selectCaseSlides(sections, { caseParam, onlyParam });
        setSlides(sel.slides);
        setShowNav(sel.showNav);
        setInitialIndex(sel.initialIndex);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

createRoot(document.getElementById('cases-root')!).render(
  <StrictMode>
    <CasesEmbedApp />
  </StrictMode>,
);
