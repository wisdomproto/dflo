// 환자용 치료사례 페이지 (/cases) — 설문을 마친 환자에게 PIN 과 함께 안내하는 비공개 페이지.
// 데이터는 원장이 '환자공개' 승인한 케이스의 비식별 스냅샷만(treatment_cases, ai-server 경유). noindex.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTreatmentCases, PinError, type TreatmentCase } from './treatmentCaseService';
import { CaseCard } from './CaseCard';

const PIN_KEY = 'casePin';

export default function TreatmentCasesPage() {
  const [pin, setPin] = useState('');
  const [cases, setCases] = useState<TreatmentCase[] | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [tag, setTag] = useState('전체');

  useEffect(() => {
    document.title = '치료 사례 · 187 성장클리닉';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const load = useCallback(async (value: string, fromStorage = false) => {
    setLoading(true);
    setErr('');
    try {
      setCases(await fetchTreatmentCases(value));
      sessionStorage.setItem(PIN_KEY, value);
    } catch (e) {
      sessionStorage.removeItem(PIN_KEY);
      if (e instanceof PinError) setErr(fromStorage ? '' : '비밀번호가 올바르지 않습니다');
      else setErr(e instanceof Error ? e.message : '불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY);
    if (saved) void load(saved, true);
  }, [load]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    (cases ?? []).forEach((c) => c.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cases]);

  const shown = useMemo(
    () => (cases ?? []).filter((c) => tag === '전체' || c.tags.includes(tag)),
    [cases, tag],
  );

  if (!cases) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
        <div className="w-full max-w-[340px] rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-[22px]">🔒</div>
          <h1 className="mt-2 text-[17px] font-extrabold text-slate-900">치료 사례 보기</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
            실제 환자분들의 치료 기록입니다.
            <br />
            안내받으신 비밀번호를 입력해 주세요.
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load(pin.trim())}
            placeholder="비밀번호"
            className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-center text-[15px] tracking-widest outline-none focus:border-indigo-400"
          />
          {err && <p className="mt-2 text-[12px] font-semibold text-rose-500">{err}</p>}
          <button
            type="button"
            disabled={loading || !pin.trim()}
            onClick={() => void load(pin.trim())}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] py-2.5 text-[14px] font-bold text-white disabled:opacity-40"
          >
            {loading ? '확인 중…' : '입력'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="bg-gradient-to-r from-[#667eea] to-[#764ba2] px-5 py-7 text-white">
        <div className="mx-auto max-w-[680px]">
          <div className="text-[11px] font-bold tracking-[0.18em] opacity-80">187 GROWUP</div>
          <h1 className="mt-1 text-[22px] font-extrabold leading-snug">우리 아이와 비슷한 아이들의 치료 기록</h1>
          <p className="mt-2 text-[13px] leading-relaxed opacity-90">
            실제 진료 데이터를 기반으로 한 {cases.length}명의 치료 경과입니다. 이름은 가명이며, 개인을 알아볼 수 있는 정보는
            모두 제외했습니다.
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-[680px] gap-1.5 overflow-x-auto px-4 py-3">
          {[['전체', cases.length] as const, ...tags].map(([t, n]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${
                tag === t ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {t} {n}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-[680px] space-y-6 px-4 py-5">
        {shown.map((c, i) => (
          <CaseCard key={`${c.name}-${i}`} c={c} />
        ))}
        <p className="px-1 pt-4 text-[11px] leading-relaxed text-slate-400">
          · 치료 경과는 개인의 성장 단계·생활 습관·검사 결과에 따라 다르게 나타날 수 있으며, 특정 결과를 보장하지 않습니다.
          <br />· 예상 성인키는 뼈나이와 국가 표준 성장 데이터를 근거로 계산한 참고 수치입니다.
          <br />· 본 자료는 상담을 받으신 분께만 제공되는 참고 자료로, 외부 공유를 삼가 주세요.
        </p>
      </main>
    </div>
  );
}
