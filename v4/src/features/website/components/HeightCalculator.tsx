// ================================================
// HeightCalculator - 예상키 측정 입력 폼 모달
// ================================================

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { calculateHeightPercentileLMS, predictAdultHeightLMS, type GrowthStandard } from '@/shared/data/growthStandard';
import { InfoModal } from './InfoModal';
import type { HeightResult } from './HeightCalculatorResult';
import { CalcLangContext, getCalcLabels, type CalcLang } from './calcLabels';

// 결과 화면(Chart.js + react-chartjs-2 ~50KB gzip)은 "계산" 버튼을 누른 뒤에만 보인다.
// 입력 폼(=LCP)과 같은 청크에 묶이면 폼이 Chart.js 파싱을 기다리느라 늦게 뜬다 → lazy 로 분리.
const HeightCalculatorResult = lazy(() =>
  import('./HeightCalculatorResult').then((m) => ({ default: m.HeightCalculatorResult })),
);

// 국적(성장표준) 선택 목록 — 전 로케일 공통. WHO(세계 표준)를 맨 앞에, 나머지는 문의 순.
const NATIONALITIES = [
  ['WHO', 'natWHO'], ['CN', 'natCN'], ['US', 'natUS'], ['ID', 'natID'], ['KR', 'natKR'], ['TH', 'natTH'],
] as const satisfies readonly (readonly [GrowthStandard, keyof ReturnType<typeof getCalcLabels>])[];

// 로케일별 기본 성장표준 — 각 시장에 맞는 값에서 시작(사용자가 드롭다운으로 변경 가능).
// vi 는 자국 표준이 목록에 없어 KR, ar 은 WHO(아랍권 보건부 다수 채택), 화교(en/zh)는 CN.
const DEFAULT_STANDARD: Record<CalcLang, GrowthStandard> = {
  ko: 'KR', th: 'TH', vi: 'KR', en: 'CN', ar: 'WHO', 'zh-hant': 'CN', 'zh-hans': 'CN',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Render form/result inline as a page (no modal overlay). Used by /calc-embed iframe. */
  embedded?: boolean;
  /** Locale for the calculator UI labels. Default 'ko' keeps the main-site modal flow unchanged. */
  lang?: CalcLang;
}

export function HeightCalculator({ isOpen, onClose, embedded = false, lang = 'ko' }: Props) {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  // 국적(성장표준) — 전 로케일 드롭다운 노출. 초기값은 로케일 기본(계산기는 lang 고정 마운트라 1회 init 로 충분).
  const [nationality, setNationality] = useState<GrowthStandard>(DEFAULT_STANDARD[lang] ?? 'KR');
  const [natOpen, setNatOpen] = useState(false); // 국적 커스텀 드롭다운 열림
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const birthDate = birthYear && birthMonth && birthDay
    ? `${birthYear.padStart(4, '0')}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
    : '';
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<HeightResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const t = getCalcLabels(lang);
  // 성장표준 = 사용자가 드롭다운에서 고른 국적. 초기값만 로케일별 기본(DEFAULT_STANDARD).
  const standard: GrowthStandard = nationality;

  // 생년월일 = 숫자 입력칸(input). select 드롭다운은 페북 인앱(Android Webview)에서 안 열려
  // 측정 완료 0 회귀를 냈어서(광고 유입 36명 전원 0%) input 으로 되돌림. inputMode=numeric 으로 모바일 숫자 키패드.

  // 패널 열람(calc_open) — 폼이 사용자에게 보이면 1회 발사(열람→완료 퍼널 측정).
  // embedded(=/calc-embed iframe)면 부모(_shell.js)로 postMessage, SPA 모달이면 직접 발사.
  const openedRef = useRef(false);
  useEffect(() => {
    const visible = embedded || isOpen;
    if (!visible) { openedRef.current = false; return; }
    if (openedRef.current) return;
    openedRef.current = true;
    try {
      if (embedded && window.parent !== window) {
        window.parent.postMessage({ type: 'calc_open', locale: lang }, '*');
      } else {
        import('@/shared/lib/analytics').then((m) => m.trackCalcOpen('calc_modal'));
      }
    } catch { /* tracking must never break UX */ }
  }, [embedded, isOpen, lang]);

  const calculate = () => {
    const h = parseFloat(height);
    if (!birthDate || !h) return;
    const age = calculateAgeAtDate(birthDate, new Date());
    const pct = calculateHeightPercentileLMS(h, age.decimal, gender, standard);
    const pred = predictAdultHeightLMS(h, age.decimal, gender, standard);
    setResult({ predicted: pred, percentile: pct, age: age.decimal, currentHeight: h, gender, standard });
    setShowResult(true);
    // 측정 완료 알림 — iframe(embedded)이면 부모로 postMessage(부모 _shell.js 가 GA4 발사),
    // SPA 모달이면 직접 발사. 측정값(키/나이)은 보내지 않는다(익명 카운트).
    try {
      if (embedded && window.parent !== window) {
        window.parent.postMessage({ type: 'height_calc_complete', locale: lang }, '*');
      } else {
        import('@/shared/lib/analytics').then((m) => m.trackHeightCalcComplete('calc_modal'));
      }
    } catch { /* tracking must never break UX */ }

    // 익명 예측 적재 (공개 iframe 사용분만 — 어드민 미리보기·테스트 호출 제외). fire-and-forget.
    if (embedded) {
      import('../services/anonymousPredictionService')
        .then((m) => m.saveAnonymousPrediction({
          locale: lang, gender, birthDate, ageYears: age.decimal,
          currentHeight: h, predictedHeight: pred, percentile: pct, growthStandard: standard,
        }))
        .catch(() => { /* never break UX */ });
    }
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 focus:border-[#0F6E56]';
  const labelCls = 'text-xs md:text-sm font-medium text-gray-500 mb-1 block';

  const formContent = (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm font-semibold text-[#0F6E56] mb-1">{t.badge}</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 break-keep">{t.title}</h2>
        </div>
        <button onClick={() => setShowHelp(true)}
          aria-label={t.helpButtonAria}
          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:bg-gray-100 text-xs md:text-sm font-bold shrink-0">
          ?
        </button>
      </div>
      <p className="text-sm md:text-base text-gray-500 -mt-2 break-keep">{t.subtitle}</p>

      {/* Nationality (growth standard) — 전 로케일 노출, 로케일별 기본값에서 시작.
          ★네이티브 <select> 는 페북·인스타 인앱 webview(Android Webview)에서 안 열려 측정 0 회귀가
          있었어서, div/button 으로 만든 커스텀 드롭다운으로 구현(webview 안전). */}
      <div className="relative">
        <span className={labelCls}>{t.fieldNationality}</span>
        <button type="button" onClick={() => setNatOpen((o) => !o)} aria-expanded={natOpen}
          className="w-full flex items-center justify-between rounded-xl py-2.5 md:py-3 px-3.5 text-sm md:text-base font-semibold bg-gray-100 text-gray-700">
          <span>{t[NATIONALITIES.find(([n]) => n === nationality)?.[1] ?? 'natKR']}</span>
          <span className={`text-gray-400 text-xs transition-transform ${natOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {natOpen && (
          <>
            {/* 바깥 클릭 시 닫기(백드롭) — z 는 메뉴보다 낮게 */}
            <div className="fixed inset-0 z-10" onClick={() => setNatOpen(false)} />
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              {NATIONALITIES.map(([nat, key]) => (
                <button key={nat} type="button"
                  onClick={() => { setNationality(nat); setNatOpen(false); }}
                  className={`w-full text-start px-3.5 py-2.5 text-sm md:text-base font-medium transition-colors ${
                    nationality === nat ? 'bg-[#0F6E56] text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}>
                  {t[key]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Gender */}
      <div>
        <span className={labelCls}>{t.fieldGender}</span>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button key={g} onClick={() => setGender(g)}
              className={`flex-1 rounded-xl py-2.5 md:py-3 text-sm md:text-base font-semibold transition-colors ${
                gender === g ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-600'
              }`}>
              {g === 'male' ? t.genderMale : t.genderFemale}
            </button>
          ))}
        </div>
      </div>

      {/* Birth date — 숫자 입력칸(모바일 숫자 키패드). select 드롭다운이 페북 인앱(Android Webview)에서
          안 열려 측정 완료 0 회귀를 냈어서 input 으로 되돌림. */}
      <div>
        <label className={labelCls}>{t.fieldBirth}</label>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" inputMode="numeric" min={1900} max={2099} placeholder={t.fieldBirthYear}
            value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={inputCls} />
          <input type="number" inputMode="numeric" min={1} max={12} placeholder={t.fieldBirthMonth}
            value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} className={inputCls} />
          <input type="number" inputMode="numeric" min={1} max={31} placeholder={t.fieldBirthDay}
            value={birthDay} onChange={(e) => setBirthDay(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Height — 체중 필드는 계산에 미사용이라 제거(입력 마찰↓). 키만 풀폭. */}
      <div>
        <label className={labelCls}>{t.fieldHeight}</label>
        <input type="number" inputMode="decimal" step="0.1" placeholder="0.0"
          value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} />
      </div>

      {/* Calculate button + 비활성일 때 입력 안내 힌트 */}
      <div>
        <button onClick={calculate} disabled={!birthDate || !height}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0F6E56] text-white py-3.5 md:py-4
                     font-bold text-base md:text-lg disabled:opacity-40 hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
          <span>📊</span> {t.submit}
        </button>
        {(!birthDate || !height) && (
          <p className="mt-2 text-center text-xs text-gray-400">{t.submitHint}</p>
        )}
      </div>
    </div>
  );

  const helpContent = (
    <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
      <div>
        <h4 className="font-bold text-gray-900 mb-1">{t.helpPrincipleH}</h4>
        <p dangerouslySetInnerHTML={{ __html: t.helpPrincipleP }} />
      </div>
      <div>
        <h4 className="font-bold text-gray-900 mb-1">{t.helpAdultH}</h4>
        <p>{t.helpAdultP}</p>
      </div>
      <div>
        <h4 className="font-bold text-gray-900 mb-1">{t.helpNoteH}</h4>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li>{t.helpNote1}</li>
          <li>{t.helpNote2}</li>
          <li>{t.helpNote3}</li>
        </ul>
      </div>
    </div>
  );

  // Embedded mode: render form/result inline as a page (no modal overlay).
  if (embedded) {
    return (
      <CalcLangContext.Provider value={lang}>
        {showResult && result ? (
          <Suspense fallback={<div className="max-w-lg md:max-w-xl mx-auto p-5 md:p-8 text-center text-sm text-gray-400">···</div>}>
            <HeightCalculatorResult
              result={result}
              isOpen={true}
              onClose={() => setShowResult(false)}
              embedded
              lang={lang}
            />
          </Suspense>
        ) : (
          <div className="max-w-lg md:max-w-xl mx-auto p-5 md:p-8 bg-white">{formContent}</div>
        )}
        {/* Help still uses modal — short read, doesn't break embed flow */}
        <InfoModal isOpen={showHelp} onClose={() => setShowHelp(false)} title={t.helpTitle}>
          {helpContent}
        </InfoModal>
      </CalcLangContext.Provider>
    );
  }

  // Default modal mode (used by main site floating button etc.)
  return (
    <CalcLangContext.Provider value={lang}>
      <InfoModal isOpen={isOpen} onClose={onClose} title="">{formContent}</InfoModal>

      {result && (
        <Suspense fallback={null}>
          <HeightCalculatorResult result={result} isOpen={showResult} onClose={() => setShowResult(false)} lang={lang} />
        </Suspense>
      )}

      <InfoModal isOpen={showHelp} onClose={() => setShowHelp(false)} title={t.helpTitle}>
        {helpContent}
      </InfoModal>
    </CalcLangContext.Provider>
  );
}
