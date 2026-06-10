import { useState } from 'react';
import { recommendRx, type RxRecommendation } from '@/features/hospital/services/clinicalRxService';

interface Props {
  childId: string;
  onClose: () => void;
}

const PRIMARY = '#667eea';

function popBadge(group?: string, confidence?: string) {
  const label = group && group !== 'unknown' ? group : '대상군 불명';
  const warn = !group || group === 'unknown' || confidence === 'low' || !confidence;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        warn
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {warn ? '⚠️' : '✓'} {label}
      {confidence ? ` · ${confidence}` : ''}
    </span>
  );
}

export function RxRecommendModal({ childId, onClose }: Props) {
  const [labText, setLabText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RxRecommendation | null>(null);

  const handleRecommend = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await recommendRx({ childId, labText: labText.trim() || undefined });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : '추천에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full rounded-xl bg-white p-5 max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">🧠 AI 처방 추천</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* 검사 입력 */}
        <div className="mb-3">
          <textarea
            value={labText}
            onChange={(e) => setLabText(e.target.value)}
            rows={4}
            placeholder="피검사 / 알러지 검사 결과를 붙여넣거나, 비워두면 차트의 검사 데이터를 사용합니다"
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            검사 결과를 직접 붙여넣으면 더 정확한 추천을 받을 수 있습니다. 비워두면 차트에 저장된 검사
            데이터를 활용합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRecommend}
          disabled={loading}
          style={{ backgroundColor: PRIMARY }}
          className="mb-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '추천 받는 중…' : '추천 받기'}
        </button>

        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                추천 처방
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {result.recommendation}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                근거 논문
              </div>
              {result.references.length === 0 ? (
                <div className="text-sm text-slate-400">관련 논문 없음</div>
              ) : (
                <ul className="space-y-2">
                  {result.references.map((ref, i) => (
                    <li
                      key={ref.pmid ?? `${ref.title}-${i}`}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="text-sm font-medium text-slate-800">
                        <span className="mr-1 text-slate-400">[{i + 1}]</span>
                        {ref.url ? (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {ref.title}
                          </a>
                        ) : (
                          ref.title
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        {(ref.journal || ref.year) && (
                          <span>
                            {ref.journal ?? ''}
                            {ref.journal && ref.year ? ' · ' : ''}
                            {ref.year ?? ''}
                          </span>
                        )}
                        {popBadge(ref.pop_group, ref.pop_confidence)}
                      </div>
                      {ref.key_finding && (
                        <div className="mt-1.5 text-[12px] font-semibold text-indigo-700">💡 {ref.key_finding}</div>
                      )}
                      {ref.korean_summary && (
                        <div className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{ref.korean_summary}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 면책 */}
        <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          본 추천은 원장 검토용 보조 정보이며, 최종 처방 결정은 의사가 합니다.
        </p>
      </div>
    </div>
  );
}
