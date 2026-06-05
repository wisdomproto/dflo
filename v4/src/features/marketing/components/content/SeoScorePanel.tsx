import type { SeoResult } from '../../utils/seoScorer';

interface Props {
  result: SeoResult;
}

function scoreColor(value: number): string {
  if (value >= 80) return 'text-emerald-600';
  if (value >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function ratioBarColor(ratio: number): string {
  if (ratio >= 0.8) return 'bg-emerald-500';
  if (ratio >= 0.5) return 'bg-amber-400';
  return 'bg-red-400';
}

export function SeoScorePanel({ result }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {/* Header total score */}
      <div className="mb-4 flex items-baseline gap-2 border-b border-gray-100 pb-3">
        <span className="text-sm font-medium text-gray-600">SEO 점수</span>
        <span className={`text-3xl font-extrabold leading-none ${scoreColor(result.score)}`}>
          {result.score}
        </span>
        <span className="text-sm text-gray-400">/ 100</span>
      </div>

      {/* Detail rows */}
      <div className="space-y-3">
        {result.details.map((d) => {
          const ratio = d.maxScore > 0 ? d.score / d.maxScore : 0;
          const pct = Math.round(ratio * 100);
          return (
            <div key={d.category}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">{d.label}</span>
                <span className="shrink-0 text-xs font-semibold text-gray-500">
                  {d.score}/{d.maxScore}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${ratioBarColor(ratio)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {d.message && <p className="mt-1 text-xs text-gray-500">{d.message}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
