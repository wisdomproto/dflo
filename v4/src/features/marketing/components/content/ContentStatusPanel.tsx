// 콘텐츠 자산/배포 현황 매트릭스 — 콘텐츠(행) × [블로그/카드뉴스/릴스] × 6언어.
//  - 자산: 텍스트·이미지 업로드 완료/일부/없음 (셀 1점).
//  - 배포: 발행 큐 상태를 **채널별 점**(IG/FB/Threads · 블로그=자체사이트)으로. "🚀 배포" 클릭 시 큐 1회 fetch.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { MarketingArticle } from '../../types';
import {
  fetchContentStatus, fetchPublishStatus, STATUS_LANGS, LANG_FLAG,
  CHANNELS_BY_KIND, CHAN_COLOR, CHAN_LABEL, PUB_RANK_EXPORT,
  type ContentStatus, type Readiness, type PublishReadiness,
} from '../../services/marketingStatusService';

const ACCENT = '#4A2D6B';
const TYPES = [
  { key: 'blog', label: '블로그', sub: '본문+이미지' },
  { key: 'cardnews', label: '카드뉴스', sub: '텍스트+이미지' },
  { key: 'reels', label: '릴스', sub: '영상+커버' },
] as const;
type Kind = (typeof TYPES)[number]['key'];

const ASSET_DOT: Record<Readiness, string> = { complete: 'bg-emerald-500', partial: 'bg-amber-400', none: 'bg-gray-200' };
const PUB_LABEL: Record<PublishReadiness, string> = { published: '발행됨', scheduled: '예약됨', queued: '큐 등록(미발행)', failed: '실패', none: '미등록' };

// 채널별 점 스타일: 색=채널, 채움=발행 / 흐림=예약 / 테두리=큐 / 빨강=실패 / 회색=미등록
function chanDotStyle(channel: string, st: PublishReadiness): CSSProperties {
  if (st === 'none') return { backgroundColor: '#e5e7eb' };
  if (st === 'failed') return { backgroundColor: '#ef4444' };
  const color = CHAN_COLOR[channel] ?? '#9ca3af';
  if (st === 'published') return { backgroundColor: color };
  if (st === 'scheduled') return { backgroundColor: color, opacity: 0.55 };
  return { backgroundColor: 'transparent', border: `2px solid ${color}` }; // queued
}

export function ContentStatusPanel({ articles }: { articles: MarketingArticle[] }) {
  const [rows, setRows] = useState<ContentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'asset' | 'publish'>('asset');
  const [pub, setPub] = useState<Map<string, PublishReadiness> | null>(null);
  const [pubLoading, setPubLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchContentStatus(articles)
      .then((r) => { if (alive) { setRows(r); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [articles]);
  useEffect(() => { setPub(null); }, [articles]);

  const showPublish = () => {
    setMode('publish');
    if (!pub && !pubLoading) {
      setPubLoading(true);
      fetchPublishStatus().then((m) => setPub(m)).finally(() => setPubLoading(false));
    }
  };

  const pubAt = (articleId: string, kind: Kind, lang: string, ch: string): PublishReadiness =>
    pub?.get(`${articleId}|${kind}|${lang}|${ch}`) ?? 'none';

  // 요약: done(완료/발행) · mid(일부 / 예약·큐·실패) · none
  const summary = useMemo(() => {
    const s: Record<string, { done: number; mid: number; none: number }> = {};
    for (const t of TYPES) s[t.key] = { done: 0, mid: 0, none: 0 };
    for (const r of rows) for (const t of TYPES) for (const lang of STATUS_LANGS) {
      if (mode === 'asset') {
        const st = r[t.key][lang].status;
        if (st === 'complete') s[t.key].done++; else if (st === 'partial') s[t.key].mid++; else s[t.key].none++;
      } else {
        let best: PublishReadiness = 'none';
        for (const ch of CHANNELS_BY_KIND[t.key]) { const st = pubAt(r.articleId, t.key, lang, ch); if (PUB_RANK_EXPORT[st] > PUB_RANK_EXPORT[best]) best = st; }
        if (best === 'published') s[t.key].done++; else if (best === 'none') s[t.key].none++; else s[t.key].mid++;
      }
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, pub, mode]);

  const total = rows.length * STATUS_LANGS.length;
  const tab = (active: boolean) => `px-3 py-1 text-xs font-semibold rounded-md ${active ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`;
  const swatch = (style: CSSProperties) => <span className="inline-block h-3 w-3 rounded-[3px]" style={style} />;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">📊 콘텐츠 현황</h2>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
            <button type="button" onClick={() => setMode('asset')} className={tab(mode === 'asset')} style={mode === 'asset' ? { backgroundColor: ACCENT } : undefined}>📦 자산</button>
            <button type="button" onClick={showPublish} className={tab(mode === 'publish')} style={mode === 'publish' ? { backgroundColor: ACCENT } : undefined}>🚀 배포</button>
          </div>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {mode === 'asset'
            ? '콘텐츠 × 언어 × 채널(블로그·카드뉴스·릴스) — 텍스트·이미지 업로드 상태'
            : '발행 큐 기준 — 셀 안 점 = 채널(IG·FB·Threads / 블로그=자체사이트)별 발행 여부'}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {TYPES.map((t) => {
            const s = summary[t.key];
            const pct = total ? Math.round((s.done / total) * 100) : 0;
            return (
              <div key={t.key} className="rounded-lg border border-gray-200 p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-gray-700">{t.label}</span>
                  <span className="text-[10px] text-gray-400">{mode === 'asset' ? t.sub : '발행'}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px]">
                  <span className="font-bold text-emerald-600">{s.done}</span>
                  <span className="text-gray-400">·</span>
                  <span className="font-bold text-amber-500">{s.mid}</span>
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

        {mode === 'asset' ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${ASSET_DOT.complete}`} /> 완료</span>
            <span className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${ASSET_DOT.partial}`} /> 일부</span>
            <span className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${ASSET_DOT.none}`} /> 없음</span>
            <span className="text-gray-400">· 칸에 마우스 올리면 상세</span>
          </div>
        ) : (
          <div className="mt-2 space-y-1 text-[11px] text-gray-500">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-gray-400">채널:</span>
              <span className="flex items-center gap-1">{swatch({ backgroundColor: CHAN_COLOR.instagram })} IG</span>
              <span className="flex items-center gap-1">{swatch({ backgroundColor: CHAN_COLOR.facebook })} FB</span>
              <span className="flex items-center gap-1">{swatch({ backgroundColor: CHAN_COLOR.threads })} Threads</span>
              <span className="flex items-center gap-1">{swatch({ backgroundColor: CHAN_COLOR.website })} 자체사이트</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-gray-400">상태:</span>
              <span className="flex items-center gap-1">{swatch(chanDotStyle('instagram', 'published'))} 발행</span>
              <span className="flex items-center gap-1">{swatch(chanDotStyle('instagram', 'scheduled'))} 예약</span>
              <span className="flex items-center gap-1">{swatch(chanDotStyle('instagram', 'queued'))} 큐(미발행)</span>
              <span className="flex items-center gap-1">{swatch(chanDotStyle('x', 'failed'))} 실패</span>
              <span className="flex items-center gap-1">{swatch(chanDotStyle('x', 'none'))} 미등록</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">집계 중…</div>
        ) : mode === 'publish' && pubLoading && !pub ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">발행 큐 불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">콘텐츠가 없습니다.</div>
        ) : (
          <table className="border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr>
                <th rowSpan={2} className="px-2 py-1 text-left font-semibold text-gray-500">#</th>
                <th rowSpan={2} className="px-2 py-1 text-left font-semibold text-gray-500">콘텐츠</th>
                {TYPES.map((t) => (
                  <th key={t.key} colSpan={STATUS_LANGS.length} className="border-l border-gray-200 px-2 py-1 text-center font-semibold text-gray-700">{t.label}</th>
                ))}
              </tr>
              <tr>
                {TYPES.map((t) => STATUS_LANGS.map((lang, i) => (
                  <th key={t.key + lang} className={`px-1 pb-1 text-center text-[11px] font-normal text-gray-400 ${i === 0 ? 'border-l border-gray-200' : ''}`}>{LANG_FLAG[lang]}</th>
                )))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.articleId} className="border-t border-gray-100 hover:bg-gray-50/70">
                  <td className="px-2 py-1 text-right tabular-nums text-gray-400">{r.sortOrder}</td>
                  <td className="max-w-[200px] truncate px-2 py-1 text-gray-700" title={r.title}>{r.title}</td>
                  {TYPES.map((t) => STATUS_LANGS.map((lang, i) => (
                    <td key={t.key + lang} className={`px-1 py-1 text-center align-middle ${i === 0 ? 'border-l border-gray-200' : ''}`}>
                      {mode === 'asset' ? (
                        <span title={`${t.label} · ${LANG_FLAG[lang]} ${lang}: ${r[t.key][lang].detail}`} className={`inline-block h-3.5 w-3.5 rounded-sm ${ASSET_DOT[r[t.key][lang].status]}`} />
                      ) : (
                        <div className="flex items-center justify-center gap-[3px]">
                          {CHANNELS_BY_KIND[t.key].map((ch) => {
                            const st = pubAt(r.articleId, t.key, lang, ch);
                            return <span key={ch} title={`${CHAN_LABEL[ch]} · ${LANG_FLAG[lang]} ${lang}: ${PUB_LABEL[st]}`} className="inline-block h-2.5 w-2.5 rounded-[3px]" style={chanDotStyle(ch, st)} />;
                          })}
                        </div>
                      )}
                    </td>
                  )))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
