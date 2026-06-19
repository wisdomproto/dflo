import { useState } from 'react';
import { fetchAdvice, type AdvisorResponse, type WeeklyGoals } from '../services/adAdvisorService';

const won = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`;
const TRACK_KO: Record<string, string> = { engagement: '참여(동영상조회)', homepage: '홈페이지(계산기)', conversion: '전환(LINE)' };

export default function AdAdvisorPage() {
  const [goals, setGoals] = useState<WeeklyGoals>({});
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AdvisorResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const num = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)));

  async function run() {
    setLoading(true); setErr(null); setRes(null);
    try { setRes(await fetchAdvice(goals)); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">🤖 광고 어드바이저</h1>
        <p className="text-sm text-gray-500">주간 목표를 넣으면 실측 데이터로 예산·소재·신규 스토리를 추천합니다. (측정: 직전 14일 · dev 전용)</p>
      </div>

      <div className="bg-white rounded-xl border p-4 grid grid-cols-3 gap-3">
        <Field label="주간 계산기 완료" onChange={(v) => setGoals((g) => ({ ...g, calcCompletions: num(v) }))} />
        <Field label="주간 LINE 리드" onChange={(v) => setGoals((g) => ({ ...g, lineLeads: num(v) }))} />
        <Field label="주간 시청자 풀 증가" onChange={(v) => setGoals((g) => ({ ...g, viewerPoolGrowth: num(v) }))} />
        <button onClick={run} disabled={loading}
          className="col-span-3 bg-indigo-600 text-white rounded-lg py-2 font-semibold disabled:opacity-50">
          {loading ? '분석 중…' : '지금 추천받기'}
        </button>
      </div>

      {err && <div className="text-red-600 text-sm">오류: {err}</div>}

      {res && !res.ready && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="font-bold text-red-700">데이터 부족 — 아직 추천할 수 없습니다</div>
          {!res.gate.global.ok && <div className="text-sm text-red-700">{res.gate.global.reason}</div>}
          <ul className="text-sm text-red-700 list-disc pl-5">
            {(['calcCompletions', 'lineLeads', 'viewerPool'] as const).map((k) => {
              const s = res.gate[k];
              return s.requested && !s.ok ? <li key={k}>{s.reason}</li> : null;
            })}
          </ul>
        </div>
      )}

      {res?.ready && res.budget && (
        <>
          <Section title="💰 예산 추천">
            <div className="text-lg font-bold">{won(res.budget.totalWeeklyWon)}/주 · {won(res.budget.totalDailyWon)}/일</div>
            <div className="text-xs text-gray-500 mb-2">단계: {res.budget.phase}</div>
            {res.budget.tracks.map((t) => (
              <div key={t.track} className="flex justify-between text-sm border-t py-1">
                <span>{TRACK_KO[t.track] ?? t.track} {t.basis === 'phase-suggested' && <em className="text-gray-400">(권장)</em>}</span>
                <span>{won(t.weeklyWon)}/주 {t.cpa ? `· CPA ${won(t.cpa)}` : ''}</span>
              </div>
            ))}
            {res.budget.estimatedRevenueWon != null &&
              <div className="text-xs text-gray-600 mt-2">예상 매출(가정): {won(res.budget.estimatedRevenueWon)}</div>}
            {res.budget.warnings.map((w, i) => <div key={i} className="text-amber-700 text-sm mt-1">⚠ {w}</div>)}
          </Section>

          {res.creatives && (
            <Section title="🎞 소재 추천">
              {res.creatives.running.map((c) => (
                <div key={c.reelId} className="text-sm border-t py-1">#{c.reelId} {c.title} — <b>{verdictKo(c.verdict)}</b> <span className="text-gray-500">{c.reason}</span></div>
              ))}
              <div className="font-semibold text-sm mt-2">🆕 다음 테스트 후보</div>
              {res.creatives.candidates.map((c) => (
                <div key={c.reelId} className="text-sm border-t py-1">#{c.reelId} {c.title} <span className="text-gray-500">[{c.source}] {c.reason}</span></div>
              ))}
            </Section>
          )}

          {res.stories && res.stories.length > 0 && (
            <Section title="✍️ 신규 소재 훅 스토리">
              {res.stories.map((s) => (
                <div key={s.reelId} className="border-t py-2">
                  <div className="font-semibold text-sm">#{s.reelId} {s.title}</div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 mt-1">{s.story}</pre>
                  <button onClick={() => navigator.clipboard.writeText(s.story)} className="text-xs text-indigo-600 mt-1">📋 복사</button>
                </div>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, onChange }: { label: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm">
      <span className="block text-gray-600 mb-1">{label}</span>
      <input type="number" min={0} onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-2 py-1" placeholder="목표" />
    </label>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border p-4"><div className="font-bold mb-2">{title}</div>{children}</div>;
}
function verdictKo(v: string) { return ({ keep: '유지', cut: '컷', refresh: '교체(피로)', hold: '보류' } as Record<string, string>)[v] ?? v; }
