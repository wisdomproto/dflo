// src/features/marketing/components/content/BlogSeoScorePanel.tsx
// 구글 SEO 점수 결과 표시 + 약한 항목 'AI 수정' 트리거.
import type { SeoResult, SeoDetail } from '../../utils/googleSeoScorer';

const ACCENT = '#4A2D6B';
const COLOR: Record<SeoDetail['status'], string> = {
  good: 'text-green-600 bg-green-50',
  warn: 'text-amber-700 bg-amber-50',
  bad: 'text-red-600 bg-red-50',
};

interface Props {
  result: SeoResult;
  onFix?: (detail: SeoDetail) => void;
  fixing?: string | null;
}

export function BlogSeoScorePanel({ result, onFix, fixing }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold" style={{ color: ACCENT }}>{result.score}<span className="text-sm text-gray-400">/{result.max}</span></div>
        <div className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-bold text-gray-700">등급 {result.grade}</div>
      </div>
      <div className="space-y-1.5">
        {result.details.map((dt) => (
          <div key={dt.label} className="flex items-center gap-2 text-xs">
            <span className={`w-16 shrink-0 rounded px-1.5 py-0.5 text-center font-semibold ${COLOR[dt.status]}`}>{dt.score}/{dt.max}</span>
            <span className="w-24 shrink-0 font-medium text-gray-700">{dt.label}</span>
            <span className="flex-1 text-gray-500">{dt.msg}</span>
            {onFix && dt.status !== 'good' && (
              <button
                type="button"
                onClick={() => onFix(dt)}
                disabled={!!fixing}
                className="shrink-0 rounded border border-gray-300 px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {fixing === dt.label ? '수정 중…' : 'AI 수정'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
