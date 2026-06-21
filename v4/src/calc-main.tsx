// calc-main — 경량 독립 엔트리. `/calc.html` 이 iframe(calculator.html)·팝업(_shell.js)에서 로드.
// SPA(App/router/Supabase/analytics)를 타지 않고 HeightCalculator 폼만 마운트해 부팅 번들을 최소화한다.
// 익명 예측 적재·GA 발사는 HeightCalculator 내부에서 dynamic import / postMessage 로 처리(폼 LCP 무영향).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { HeightCalculator } from '@/features/website/components/HeightCalculator';
import { isCalcLang, type CalcLang } from '@/features/website/components/calcLabels';

const langParam = new URLSearchParams(window.location.search).get('lang');
const lang: CalcLang = isCalcLang(langParam) ? langParam : 'ko';
document.documentElement.lang = lang;

createRoot(document.getElementById('calc-root')!).render(
  <StrictMode>
    <div className="min-h-screen bg-white">
      <HeightCalculator isOpen onClose={() => { /* page-level, nothing to close */ }} embedded lang={lang} />
    </div>
  </StrictMode>,
);
