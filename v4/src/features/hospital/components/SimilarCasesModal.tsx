import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchSimilarCases,
  buildEmbedding,
  type SimilarMatch,
} from '@/features/hospital/services/similarCasesService';

interface Props {
  childId: string;
  childName: string;
  isOpen: boolean;
  onClose: () => void;
}

function ageOn(birth: string | null, today = new Date()): string {
  if (!birth) return '-';
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return '-';
  const yr = (today.getTime() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return `만 ${yr.toFixed(1)}세`;
}

export function SimilarCasesModal({ childId, childName, isOpen, onClose }: Props) {
  const [matches, setMatches] = useState<SimilarMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSimilarCases(childId, 5)
      .then((rows) => !cancelled && setMatches(rows))
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Unknown';
        setError(msg);
        setMatches(null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [childId, isOpen]);

  const rebuildAndRetry = async () => {
    setBuilding(true);
    setError(null);
    try {
      await buildEmbedding(childId);
      const rows = await fetchSimilarCases(childId, 5);
      setMatches(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown');
    } finally {
      setBuilding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">🔍 비슷한 케이스</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {childName} 와(과) lab·키·처방 패턴이 비슷한 환자 top-5
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 text-xl"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
          {loading ? (
            <div className="text-center py-12 text-sm text-slate-400">검색 중...</div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-red-700">⚠️ {error}</p>
              <p className="text-xs text-red-600">
                이 환자의 임베딩이 아직 없을 수 있어요. 임베딩을 만든 뒤 다시 시도해보세요.
              </p>
              <button
                onClick={rebuildAndRetry}
                disabled={building}
                className="rounded-lg bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50"
              >
                {building ? '임베딩 생성 중...' : '임베딩 만들고 다시 검색'}
              </button>
            </div>
          ) : !matches || matches.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-slate-500">비슷한 케이스가 아직 없어요</p>
              <p className="text-[11px] text-slate-400">
                다른 환자들의 임베딩이 만들어진 뒤에 결과가 채워집니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m, i) => (
                <article
                  key={m.child_id}
                  className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-mono">#{i + 1}</span>
                        <span className="font-mono text-xs text-slate-500">{m.chart_number ?? '-'}</span>
                        <h3 className="text-sm font-bold text-slate-900">{m.name ?? '?'}</h3>
                        <span className="text-[11px] text-slate-500">
                          {m.gender === 'male' ? '남' : m.gender === 'female' ? '여' : '-'} · {ageOn(m.birth_date)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        진료 {m.visits}회
                        {m.first_visit_date && m.last_visit_date && (
                          <> · {m.first_visit_date} ~ {m.last_visit_date}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400">유사도</p>
                      <p className="text-sm font-black text-emerald-700">
                        {Math.round(m.similarity * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* 키/PAH 변화 */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Stat
                      label="키 변화"
                      value={
                        m.first_height != null && m.last_height != null
                          ? `${m.first_height} → ${m.last_height}cm`
                          : '-'
                      }
                      delta={
                        m.first_height != null && m.last_height != null
                          ? `+${(m.last_height - m.first_height).toFixed(1)}`
                          : null
                      }
                      deltaPositive
                    />
                    <Stat
                      label="예측키 변화 (PAH)"
                      value={
                        m.first_pah != null && m.last_pah != null
                          ? `${m.first_pah} → ${m.last_pah}cm`
                          : '아직 BA 측정 적음'
                      }
                      delta={m.pah_delta != null ? (m.pah_delta >= 0 ? `+${m.pah_delta}` : `${m.pah_delta}`) : null}
                      deltaPositive={m.pah_delta != null && m.pah_delta > 0}
                    />
                  </div>

                  {/* top medications */}
                  {m.top_medications.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-slate-500 mb-1">주요 처방</p>
                      <div className="flex flex-wrap gap-1">
                        {m.top_medications.map((med) => (
                          <span
                            key={med.name}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
                          >
                            {med.name} <span className="text-emerald-500">×{med.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link
                    to={`/admin/patients/${m.child_id}`}
                    onClick={onClose}
                    className="inline-block text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    환자 상세 →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 bg-white text-[11px] text-slate-400 leading-relaxed">
          ※ 임상 의사 결정 보조용. lab·키·처방 패턴 기반 cosine 유사도, Gemini text-embedding-004
          (768d). 처방의 인과 추론은 아닙니다.
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  deltaPositive,
}: {
  label: string;
  value: string;
  delta: string | null;
  deltaPositive?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
      {delta && (
        <p className={`text-[10px] font-bold mt-0.5 ${deltaPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {delta}cm
        </p>
      )}
    </div>
  );
}
