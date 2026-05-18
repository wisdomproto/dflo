// ================================================
// HeightCalculator - 예상키 측정 입력 폼 모달
// ================================================

import { useState } from 'react';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { calculateHeightPercentileLMS, predictAdultHeightLMS } from '@/shared/data/growthStandard';
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
  const [weight, setWeight] = useState('');
  const [result, setResult] = useState<HeightResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const t = getCalcLabels(lang);

  const calculate = () => {
    const h = parseFloat(height);
    if (!birthDate || !h) return;
    const age = calculateAgeAtDate(birthDate, new Date());
    const pct = calculateHeightPercentileLMS(h, age.decimal, gender);
    const pred = predictAdultHeightLMS(h, age.decimal, gender);
    setResult({ predicted: pred, percentile: pct, age: age.decimal, currentHeight: h, gender });
    setShowResult(true);
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 focus:border-[#0F6E56]';
  const labelCls = 'text-xs font-medium text-gray-500 mb-1 block';

  const formContent = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#0F6E56] mb-1">{t.badge}</p>
          <h2 className="text-xl font-extrabold text-gray-900">{t.title}</h2>
        </div>
        <button onClick={() => setShowHelp(true)}
          aria-label={t.helpButtonAria}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:bg-gray-100 text-xs font-bold shrink-0">
          ?
        </button>
      </div>
      <p className="text-sm text-gray-500 -mt-2">{t.subtitle}</p>

      {/* Gender */}
      <div>
        <span className={labelCls}>{t.fieldGender}</span>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button key={g} onClick={() => setGender(g)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                gender === g ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-600'
              }`}>
              {g === 'male' ? t.genderMale : t.genderFemale}
            </button>
          ))}
        </div>
      </div>

      {/* Birth date — 3 separate fields so labels localize across all browsers */}
      <div>
        <label className={labelCls}>{t.fieldBirth}</label>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" inputMode="numeric" min={1900} max={2099}
            placeholder={t.fieldBirthYear}
            value={birthYear} onChange={(e) => setBirthYear(e.target.value)}
            className={inputCls} />
          <input type="number" inputMode="numeric" min={1} max={12}
            placeholder={t.fieldBirthMonth}
            value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}
            className={inputCls} />
          <input type="number" inputMode="numeric" min={1} max={31}
            placeholder={t.fieldBirthDay}
            value={birthDay} onChange={(e) => setBirthDay(e.target.value)}
            className={inputCls} />
        </div>
      </div>

      {/* Height / Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t.fieldHeight}</label>
          <input type="number" inputMode="decimal" step="0.1" placeholder="0.0"
            value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t.fieldWeight}</label>
          <input type="number" inputMode="decimal" step="0.1" placeholder="0.0"
            value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Calculate button */}
      <button onClick={calculate} disabled={!birthDate || !height}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0F6E56] text-white py-3.5
                   font-bold text-base disabled:opacity-40 hover:bg-[#0D5A47] active:scale-[0.98] transition-all">
        <span>📊</span> {t.submit}
      </button>
    </div>
  );

  const helpContent = (
    <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
      <div>
        <h4 className="font-bold text-gray-900 mb-1">{t.helpPrincipleH}</h4>
        <p dangerouslySetInnerHTML={{ __html: t.helpPrincipleP }} />
      </div>
      <div>
        <h4 className="font-bold text-gray-900 mb-1">{t.helpLmsH}</h4>
        <p>{t.helpLmsP}</p>
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
          <div className="max-w-lg mx-auto p-5 bg-white">{formContent}</div>
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
