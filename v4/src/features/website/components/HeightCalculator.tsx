// ================================================
// HeightCalculator - 예상키 측정 입력 폼 모달
// ================================================

import { useState, useEffect, useRef } from 'react';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { calculateHeightPercentileLMS, predictAdultHeightLMS, type GrowthStandard } from '@/shared/data/growthStandard';
import { InfoModal } from './InfoModal';
import { HeightCalculatorResult, type HeightResult } from './HeightCalculatorResult';
import { CalcLangContext, getCalcLabels, type CalcLang } from './calcLabels';

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
  // 태국어 계산기는 태국 성장도표(TSPE) 기준, 그 외(ko/vi/en)는 한국 기준
  const standard: GrowthStandard = lang === 'th' ? 'TH' : 'KR';

  // 생년월일 드롭다운 — 연도는 아이 나이대(만 2~19세)만 노출(타이핑 대신 탭 선택, 모바일 친화).
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 18 }, (_, i) => currentYear - 2 - i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

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
  const selectCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 focus:border-[#0F6E56]';

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

      {/* Birth date — 3 dropdowns (탭 선택, 키보드 불필요). 연도는 아이 나이대만. 옵션=숫자라 로케일 안전. */}
      <div>
        <label className={labelCls}>{t.fieldBirth}</label>
        <div className="grid grid-cols-3 gap-2">
          <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)}
            className={`${selectCls}${birthYear ? '' : ' text-gray-400'}`}>
            <option value="" disabled>{t.fieldBirthYear}</option>
            {yearOptions.map((y) => <option key={y} value={y} className="text-gray-900">{y}</option>)}
          </select>
          <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}
            className={`${selectCls}${birthMonth ? '' : ' text-gray-400'}`}>
            <option value="" disabled>{t.fieldBirthMonth}</option>
            {monthOptions.map((m) => <option key={m} value={m} className="text-gray-900">{m}</option>)}
          </select>
          <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)}
            className={`${selectCls}${birthDay ? '' : ' text-gray-400'}`}>
            <option value="" disabled>{t.fieldBirthDay}</option>
            {dayOptions.map((d) => <option key={d} value={d} className="text-gray-900">{d}</option>)}
          </select>
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
          <HeightCalculatorResult
            result={result}
            isOpen={true}
            onClose={() => setShowResult(false)}
            embedded
            lang={lang}
          />
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
        <HeightCalculatorResult result={result} isOpen={showResult} onClose={() => setShowResult(false)} lang={lang} />
      )}

      <InfoModal isOpen={showHelp} onClose={() => setShowHelp(false)} title={t.helpTitle}>
        {helpContent}
      </InfoModal>
    </CalcLangContext.Provider>
  );
}
