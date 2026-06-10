// 콘텐츠 자산 현황 매트릭스 — 콘텐츠(행) × [블로그/카드뉴스/릴스] × 6언어 의 업로드 완료/일부/없음.
import { useEffect, useMemo, useState } from 'react';
import type { MarketingArticle } from '../../types';
import {
  fetchContentStatus, STATUS_LANGS, LANG_FLAG,
  type ContentStatus, type Readiness,
} from '../../services/marketingStatusService';

const ACCENT = '#4A2D6B';
const DOT: Record<Readiness, string> = { complete: 'bg-emerald-500', partial: 'bg-amber-400', none: 'bg-gray-200' };
const TYPES = [
  { key: 'blog', label: '블로그', sub: '본문+이미지' },
  { key: 'cardnews', label: '카드뉴스', sub: '텍스트+이미지' },
  { key: 'reels', label: '릴스', sub: '영상+커버' },
] as const;

export function ContentStatusPanel({ articles }: { articles: MarketingArticle[] }) {
  const [rows, setRows] = useState<ContentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchContentStatus(articles)
      .then((r) => { if (alive) { setRows(r); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [articles]);

  const summary = useMemo(() => {
    const s: Record<string, Record<Readiness, number>> = {};
    for (const t of TYPES) s[t.key] = { complete: 0, partial: 0, none: 0 };
    for (const r of rows) for (const t of TYPES) for (const lang of STATUS_LANGS) s[t.key][r[t.key][lang].status]++;
    return s;
  }, [rows]);

  const total = rows.length * STATUS_LANGS.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header + 요약 */}
      <div className="shrink-0 border-b border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-800">📊 콘텐츠 자산 현황</h2>
        <p className="mt-0.5 text-xs text-gray-400">콘텐츠 × 언어 × 채널(블로그·카드뉴스·릴스) — 텍스트·이미지가 다 올라왔는지 한눈에</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {TYPES.map((t) => {
            const s = summary[t.key];
            const pct = total ? Math.round((s.complete / total) * 100) : 0;
            return (
              <div key={t.key} className="rounded-lg border border-gray-200 p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-gray-700">{t.label}</span>
                  <span className="text-[10px] text-gray-400">{t.sub}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px]">
                  <span className="font-bold text-emerald-600">{s.complete}</span>
                  <span className="text-gray-400">·</span>
                  <span className="font-bold text-amber-500">{s.partial}</span>
                  <span className="text-gray-400">·</span>
                  <span className="font-bold text-gray-400">{s.none}</span>
                  <span className="ml-auto font-bold" style={{ color: ACCENT }}>{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${DOT.complete}`} /> 완료</span>
          <span className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${DOT.partial}`} /> 일부</span>
          <span className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${DOT.none}`} /> 없음</span>
          <span className="text-gray-400">· 칸에 마우스 올리면 상세 (예: 이미지 3/8)</span>
        </div>
      </div>

      {/* 매트릭스 */}
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">집계 중…</div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">콘텐츠가 없습니다.</div>
        ) : (
          <table className="border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr>
                <th rowSpan={2} className="px-2 py-1 text-left font-semibold text-gray-500">#</th>
                <th rowSpan={2} className="px-2 py-1 text-left font-semibold text-gray-500">콘텐츠</th>
                {TYPES.map((t) => (
                  <th key={t.key} colSpan={STATUS_LANGS.length} className="border-l border-gray-200 px-2 py-1 text-center font-semibold text-gray-700">
                    {t.label}
                  </th>
                ))}
              </tr>
              <tr>
                {TYPES.map((t) => STATUS_LANGS.map((lang, i) => (
                  <th key={t.key + lang} className={`px-1 pb-1 text-center text-[11px] font-normal text-gray-400 ${i === 0 ? 'border-l border-gray-200' : ''}`}>
                    {LANG_FLAG[lang]}
                  </th>
                )))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.articleId} className="border-t border-gray-100 hover:bg-gray-50/70">
                  <td className="px-2 py-1 text-right tabular-nums text-gray-400">{r.sortOrder}</td>
                  <td className="max-w-[200px] truncate px-2 py-1 text-gray-700" title={r.title}>{r.title}</td>
                  {TYPES.map((t) => STATUS_LANGS.map((lang, i) => {
                    const c = r[t.key][lang];
                    return (
                      <td key={t.key + lang} className={`px-1 py-1 text-center ${i === 0 ? 'border-l border-gray-200' : ''}`}>
                        <span
                          title={`${t.label} · ${LANG_FLAG[lang]} ${lang}: ${c.detail}`}
                          className={`inline-block h-3.5 w-3.5 rounded-sm ${DOT[c.status]}`}
                        />
                      </td>
                    );
                  }))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
