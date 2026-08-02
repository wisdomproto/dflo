// 메신저 클릭(consult_click) 출처 × 랜딩페이지 패널. 전환 퍼널 대체.
// 질문: "메신저 누른 사람, 어디서(구글/메타/직접) 들어와 어떤 페이지(블로그·clinic)에서 눌렀나".
// 키워드는 GA4 에 없음("not provided") → SearchQueryPanel(GSC) 참고.
import { useEffect, useState } from 'react';
import { fetchConsultSources, type ConsultSources, type ConsultSourceRow } from '../services/marketingAnalyticsService';

// medium "(not set)" = data-source(bottom_nav 등) 가 source 로 잡힌 내부 자기참조 노이즈. 실제 외부유입 아님.
const isInternal = (sm: string) => /\(not set\)$/.test(sm.trim());

function Bars({ items, max }: { items: { label: string; n: number }[]; max: number }) {
  return (
    <div className="space-y-0.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <div className="w-44 shrink-0 truncate text-xs text-gray-600" title={it.label}>{it.label}</div>
          <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
            <div className="h-full rounded bg-[#667eea]" style={{ width: `${(it.n / max) * 100}%` }} />
          </div>
          <div className="w-10 text-right text-sm font-bold tabular-nums text-[#4A2D6B]">{it.n}</div>
        </div>
      ))}
    </div>
  );
}

export function ConsultSourcePanel({ days }: { days: number }) {
  const [data, setData] = useState<ConsultSources | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null); setErr(null);
    fetchConsultSources(days).then((d) => { if (alive) setData(d); }).catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [days]);

  const rows = data?.rows ?? [];
  const total = rows.reduce((s, r) => s + r.count, 0);
  const aggBy = (list: ConsultSourceRow[], pick: (r: ConsultSourceRow) => string) => {
    const m: Record<string, number> = {};
    for (const r of list) m[pick(r)] = (m[pick(r)] || 0) + r.count;
    return Object.entries(m).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  };
  const bySource = aggBy(rows, (r) => r.sourceMedium);
  const ext = bySource.filter((x) => !isInternal(x.label));
  const internal = bySource.filter((x) => isInternal(x.label));
  const landings = aggBy(rows, (r) => r.landing || '(직접/앱)').slice(0, 12);
  const googleLandings = aggBy(rows.filter((r) => /google \/ organic/i.test(r.sourceMedium)), (r) => r.landing || '(직접)').slice(0, 8);
  const maxExt = Math.max(1, ...ext.map((x) => x.n));
  const maxLand = Math.max(1, ...landings.map((x) => x.n));
  const maxG = Math.max(1, ...googleLandings.map((x) => x.n));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-bold text-gray-800">💬 메신저 클릭 출처 — 어디서 들어와 눌렀나</h3>
        <span className="text-xs text-gray-400">consult_click · 지난 {days}일 · 총 {total}회</span>
      </div>

      {err && <p className="text-xs text-rose-500">불러오기 실패: {err}</p>}
      {!data && !err && <p className="text-xs text-gray-400">불러오는 중…</p>}

      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">출처(source / medium)</h4>
            <Bars items={ext} max={maxExt} />
            {internal.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-gray-400">
                  내부 자기참조(노이즈) {internal.reduce((s, x) => s + x.n, 0)}회 — 실제 외부유입 아님 ▾
                </summary>
                <div className="mt-1 opacity-60"><Bars items={internal} max={maxExt} /></div>
                <p className="mt-1 text-[10px] text-gray-400">bottom_nav·cta_bottom·consult_page 등 내부 CTA 가 source 로 잡힌 것(GA4 추천 제외로 정리 가능).</p>
              </details>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold text-gray-500">랜딩페이지 — 어디로 들어왔나 (상위 12)</h4>
            <Bars items={landings} max={maxLand} />
          </div>

          <div className="md:col-span-2">
            <h4 className="mb-2 text-xs font-semibold text-gray-500">🔍 구글 오가닉만 — 랜딩페이지 (블로그가 전환하나?)</h4>
            {googleLandings.length ? <Bars items={googleLandings} max={maxG} />
              : <p className="text-xs text-gray-400">구글 오가닉 유입 클릭 없음</p>}
            <p className="mt-2 text-[11px] text-gray-400">
              키워드는 GA4 에 안 잡힘("not provided") → 위 <b>🔍 구글 검색 유입(GSC)</b> 패널에서 페이지별 검색어 확인.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
