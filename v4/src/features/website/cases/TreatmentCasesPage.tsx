// 환자용 치료사례 페이지 (/cases) — 설문을 마친 환자에게 PIN 과 함께 안내하는 비공개 페이지.
// 데이터는 원장이 '환자공개' 승인한 케이스의 비식별 스냅샷만(treatment_cases, ai-server 경유). noindex.
// 기본 언어 = 영어(해외 문의 유입이 주 타깃), 상단에서 한국어로 전환.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTreatmentCases, PinError, type TreatmentCase } from './treatmentCaseService';
import { CaseCard } from './CaseCard';
import { CASE_LANGS, TEXT, tagText, type CaseLang } from './casesText';

const PIN_KEY = 'casePin';
const LANG_KEY = 'caseLang';

export default function TreatmentCasesPage() {
  const [lang, setLang] = useState<CaseLang>(() => (localStorage.getItem(LANG_KEY) === 'ko' ? 'ko' : 'en'));
  const [pin, setPin] = useState('');
  const [cases, setCases] = useState<TreatmentCase[] | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [tag, setTag] = useState<string | null>(null); // null = 전체
  const t = TEXT[lang];

  const pickLang = (l: CaseLang) => {
    setLang(l);
    localStorage.setItem(LANG_KEY, l);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.docTitle;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [lang, t]);

  const load = useCallback(
    async (value: string, fromStorage = false) => {
      setLoading(true);
      setErr('');
      try {
        setCases(await fetchTreatmentCases(value));
        sessionStorage.setItem(PIN_KEY, value);
      } catch (e) {
        sessionStorage.removeItem(PIN_KEY);
        if (e instanceof PinError) setErr(fromStorage ? '' : t.gateWrong);
        else setErr(e instanceof Error ? e.message : t.gateFail);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY);
    if (saved) void load(saved, true);
    // 최초 1회만 — 언어 전환으로 다시 부르지 않는다(데이터는 언어 무관).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    (cases ?? []).forEach((c) => c.tags.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cases]);

  const shown = useMemo(() => (cases ?? []).filter((c) => !tag || c.tags.includes(tag)), [cases, tag]);

  const langSwitch = (
    <div className="flex gap-1 rounded-full bg-white/20 p-0.5">
      {CASE_LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => pickLang(l.id)}
          className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold transition ${
            lang === l.id ? 'bg-white text-slate-900' : 'text-white/80'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );

  if (!cases) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-5">
        <div className="w-full max-w-[340px] rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mb-3 flex justify-center gap-1 rounded-full bg-slate-100 p-0.5">
            {CASE_LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => pickLang(l.id)}
                className={`flex-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold transition ${
                  lang === l.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="text-[22px]">🔒</div>
          <h1 className="mt-2 text-[17px] font-extrabold text-slate-900">{t.gateTitle}</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
            {t.gateDesc[0]}
            <br />
            {t.gateDesc[1]}
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load(pin.trim())}
            placeholder={t.gatePlaceholder}
            className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-center text-[15px] tracking-widest outline-none focus:border-indigo-400"
          />
          {err && <p className="mt-2 text-[12px] font-semibold text-rose-500">{err}</p>}
          <button
            type="button"
            disabled={loading || !pin.trim()}
            onClick={() => void load(pin.trim())}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] py-2.5 text-[14px] font-bold text-white disabled:opacity-40"
          >
            {loading ? t.gateChecking : t.gateSubmit}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="bg-gradient-to-r from-[#667eea] to-[#764ba2] px-5 py-7 text-white">
        <div className="mx-auto max-w-[680px]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold tracking-[0.18em] opacity-80">{t.kicker}</div>
            {langSwitch}
          </div>
          <h1 className="mt-2 text-[22px] font-extrabold leading-snug">{t.heroTitle}</h1>
          <p className="mt-2 text-[13px] leading-relaxed opacity-90">{t.heroDesc(cases.length)}</p>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-[680px] gap-1.5 overflow-x-auto px-4 py-3">
          {[[null, t.all, cases.length] as const, ...tags.map(([x, n]) => [x, tagText(x, lang), n] as const)].map(
            ([id, label, n]) => (
              <button
                key={id ?? '__all'}
                type="button"
                onClick={() => setTag(id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${
                  tag === id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {label} {n}
              </button>
            ),
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[680px] space-y-6 px-4 py-5">
        {shown.map((c, i) => (
          <CaseCard key={`${c.name}-${i}`} c={c} lang={lang} />
        ))}
        <p className="px-1 pt-4 text-[11px] leading-relaxed text-slate-400">
          {t.disclaimer.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
      </main>
    </div>
  );
}
