import { useEffect, useState } from 'react';
import {
  fetchAnalysis,
  generateAnalysis,
  type CachedAnalysis,
  type PatientAnalysisData,
} from '@/features/hospital/services/patientAnalysisService';
import { ZoomModal } from '@/shared/components/ZoomModal';

interface Props {
  childId: string;
  patientName: string;
  onClose: () => void;
}

const RESPONSE_STYLE: Record<PatientAnalysisData['response_level'], { label: string; cls: string }> = {
  excellent: { label: '우수', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  good: { label: '양호', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  moderate: { label: '보통', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  poor: { label: '낮음', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  insufficient_data: { label: '데이터 부족', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const PHASE_STYLE: Record<PatientAnalysisData['treatment_phase'], string> = {
  초기: 'bg-blue-50 text-blue-700',
  유지: 'bg-indigo-50 text-indigo-700',
  마무리: 'bg-violet-50 text-violet-700',
  종료: 'bg-slate-100 text-slate-600',
  일회성: 'bg-gray-100 text-gray-500',
  불명: 'bg-gray-50 text-gray-500',
};

export function PatientAnalysisModal({ childId, patientName, onClose }: Props) {
  const [cached, setCached] = useState<CachedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAnalysis(childId)
      .then((r) => { if (!cancelled) setCached(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : '불러오기 실패'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [childId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fresh = await generateAnalysis(childId);
      setCached(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const d = cached?.data;

  return (
    <ZoomModal onClose={onClose} title={`🧠 환자 분석 · ${patientName}`} maxWidth="min(900px, 95vw)">
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-1 text-slate-800">
        {loading && <div className="py-12 text-center text-sm text-slate-500">불러오는 중…</div>}

        {!loading && !d && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-5xl">🧠</div>
            <div className="text-sm text-slate-600">
              아직 생성된 분석이 없습니다.
              <br />버튼을 눌러 AI 분석을 생성하세요. (Gemini 2.5 Flash, 10-20초)
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? '생성 중…' : '분석 생성하기'}
            </button>
            {error && <div className="text-xs text-rose-600">{error}</div>}
          </div>
        )}

        {d && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${RESPONSE_STYLE[d.response_level].cls}`}>
                반응도: {RESPONSE_STYLE[d.response_level].label}
              </span>
              <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${PHASE_STYLE[d.treatment_phase]}`}>
                치료 단계: {d.treatment_phase}
              </span>
              {cached?.generated_at && (
                <span className="ml-auto text-[11px] text-slate-400">
                  {new Date(cached.generated_at).toLocaleString('ko-KR')}
                </span>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="rounded border border-slate-300 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {generating ? '재생성 중…' : '🔄 재생성'}
              </button>
            </div>

            <section className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Summary</div>
              <div className="mt-1 text-sm leading-relaxed text-slate-800">{d.summary}</div>
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="rounded-lg border border-rose-200 bg-rose-50/40 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-700">문제</div>
                <div className="mt-1 text-sm text-slate-800">{d.problem}</div>
              </section>
              <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">결과</div>
                <div className="mt-1 text-sm text-slate-800">{d.outcome}</div>
              </section>
            </div>

            <section className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">치료 · 처치</div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {d.intervention.map((item, i) => (
                  <li key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{item}</li>
                ))}
              </ul>
            </section>

            {d.sub_categories?.length > 0 && (
              <section className="rounded-lg border border-violet-200 bg-violet-50/40 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-violet-700">세부 카테고리</div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {d.sub_categories.map((t, i) => (
                    <li key={i} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {d.risk_flags?.length > 0 && (
              <section className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">⚠️ 경고</div>
                <ul className="mt-2 space-y-1">
                  {d.risk_flags.map((r, i) => (
                    <li key={i} className="text-sm text-amber-900">• {r}</li>
                  ))}
                </ul>
              </section>
            )}

            {d.key_findings?.length > 0 && (
              <section className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">주요 지표 변화</div>
                <ol className="mt-2 space-y-1.5">
                  {d.key_findings.map((k, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="w-5 text-right text-xs text-slate-400">{i + 1}.</span>
                      <span>{k}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {d.growth_metrics && (
              <section className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 px-4 py-3 md:grid-cols-4">
                <Stat label="초기 키" value={fmtNum(d.growth_metrics.initial_height_cm)} unit="cm" />
                <Stat label="최신 키" value={fmtNum(d.growth_metrics.latest_height_cm)} unit="cm" />
                <Stat label="총 성장" value={fmtNum(d.growth_metrics.total_growth_cm)} unit="cm" tone="emerald" />
                <Stat label="추적 개월" value={fmtNum(d.growth_metrics.follow_up_months)} unit="개월" />
                <Stat label="초기 뼈나이" value={fmtNum(d.growth_metrics.initial_bone_age)} unit="세" />
                <Stat label="최신 뼈나이" value={fmtNum(d.growth_metrics.latest_bone_age)} unit="세" />
                <Stat
                  label="뼈나이 진행"
                  value={fmtNum(d.growth_metrics.bone_age_progression_years)}
                  unit="년"
                  tone="indigo"
                />
              </section>
            )}

            {error && (
              <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
            )}
          </>
        )}
      </div>
    </ZoomModal>
  );
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Number(n.toFixed(1)).toString();
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit: string; tone?: 'emerald' | 'indigo' }) {
  const color = tone === 'emerald'
    ? 'text-emerald-700'
    : tone === 'indigo'
      ? 'text-indigo-700'
      : 'text-slate-800';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-bold ${color}`}>
        {value}
        {value !== '—' && <span className="ml-0.5 text-[10px] font-normal text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}
