// src/features/marketing/components/ChannelTrafficTab.tsx
import { useEffect, useState } from 'react';
import type { ChannelBreakdown, ChannelRow } from '../services/marketingChannelService';
import { fetchChannelBreakdown } from '../services/marketingChannelService';

const PERIODS = [7, 30, 90] as const;

function BreakdownBlock({ title, rows }: { title: string; rows: ChannelRow[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-400">데이터 없음</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={`${r.label}-${i}`}>
              <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium text-gray-700">{r.label}</span>
                <span className="shrink-0 tabular-nums text-gray-500">
                  {r.sessions.toLocaleString()} 세션 · {r.percentage}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#4A2D6B]"
                  style={{ width: `${Math.min(100, r.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChannelTrafficTab() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<ChannelBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await fetchChannelBreakdown(days);
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '트래픽 데이터 불러오기 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [days]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">기간</span>
        {PERIODS.map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full px-3 py-1 text-xs ${
              days === d ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            최근 {d}일
          </button>
        ))}
        {loading && <span className="text-xs text-gray-400">불러오는 중…</span>}
      </div>

      {err && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {err}
          <p className="mt-1 text-xs text-red-400">GA4 연결을 확인해주세요 (OAuth refresh token).</p>
        </div>
      )}

      {data && !err && (
        <div className="grid gap-4 md:grid-cols-3">
          <BreakdownBlock title="채널 그룹" rows={data.channelGroups} />
          <BreakdownBlock title="소스 / 매체" rows={data.sourceMedium} />
          <BreakdownBlock title="국가" rows={data.countries} />
        </div>
      )}

      {!data && !err && !loading && (
        <p className="py-12 text-center text-sm text-gray-400">유입 데이터가 없습니다.</p>
      )}
    </div>
  );
}
