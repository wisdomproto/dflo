// CalcEmbedPage — Standalone page that reuses the main HeightCalculator React module
// in `embedded` mode (no InfoModal overlay — renders inline as a page).
// /test/calculator.html iframes this so the original Chart.js graph + animations are reused.
//
// 다국어: 부모 페이지 (`/test/{lang}/calculator.html`) 가 iframe src 에 `?lang={lang}` 을
// 붙여 들어오므로 useSearchParams 로 받아 HeightCalculator 에 전달.

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HeightCalculator } from '../components/HeightCalculator';
import { isCalcLang, getCalcLabels, type CalcLang } from '../components/calcLabels';

export default function CalcEmbedPage() {
  const [searchParams] = useSearchParams();
  const langParam = searchParams.get('lang');
  const lang: CalcLang = isCalcLang(langParam) ? langParam : 'ko';
  const t = getCalcLabels(lang);

  useEffect(() => {
    document.title = t.pageTitle;
  }, [t.pageTitle]);

  // embedded=true 면 InfoModal 우회 → 페이지 자체로 렌더.
  return (
    <div className="min-h-screen bg-white">
      <HeightCalculator
        isOpen={true}
        onClose={() => { /* no-op: page-level, nothing to close */ }}
        embedded
        lang={lang}
      />
    </div>
  );
}
