import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPatientDetail } from '@/features/admin/services/adminService';
import { createVisit, fetchVisitsForChild } from '@/features/hospital/services/visitService';
import { logger } from '@/shared/lib/logger';
import { VisitList } from '@/features/hospital/components/VisitList';
import { VisitDetailPanel } from '@/features/hospital/components/VisitDetailPanel';
import { AdminPatientGrowthChart } from '@/features/hospital/components/AdminPatientGrowthChart';
import { PredictedHeightTrend } from '@/features/hospital/components/PredictedHeightTrend';
import { IntakeSurveyPanel } from '@/features/hospital/components/intake/IntakeSurveyPanel';
import { FirstConsultPanel } from '@/features/hospital/components/intake/FirstConsultPanel';
import { PatientAnalysisModal } from '@/features/hospital/components/PatientAnalysisModal';
import { SimilarCasesModal } from '@/features/hospital/components/SimilarCasesModal';
import { RxRecommendModal } from '@/features/hospital/components/RxRecommendModal';
import { updateChildField } from '@/features/hospital/services/intakeSurveyService';
import { TREATMENT_STAGES } from '@/shared/utils/treatmentStage';
import { GrowthComparisonDiagram } from '@/features/hospital/components/intake/GrowthComparisonDiagram';
import { ZoomModal } from '@/shared/components/ZoomModal';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import type { Child, HospitalMeasurement, Visit } from '@/shared/types';

export default function AdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const [measurements, setMeasurements] = useState<HospitalMeasurement[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [chartCollapsed, setChartCollapsed] = useState(false);
  const [chartTab, setChartTab] = useState<'curve' | 'trend'>('curve');
  const [chartZoomed, setChartZoomed] = useState(false);
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  // 기본 정보는 진료 기록 상단에 접힌 채로 고정 — 필요할 때만 펼침
  const [intakeExpanded, setIntakeExpanded] = useState(false);
  // 첫 상담 프레젠테이션 덱도 접힌 채로 상주 — 펼치면 슬라이드 덱이 열림
  const [consultExpanded, setConsultExpanded] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [similarOpen, setSimilarOpen] = useState(false);
  const [showRx, setShowRx] = useState(false);
  // 새 진료 생성 시 사용할 날짜 (기본값 = 오늘, 로컬 시간 기준)
  const [newVisitDate, setNewVisitDate] = useState(() =>
    new Date().toLocaleDateString('sv-SE'),
  );

  const refreshData = async (childId: string) => {
    const [detail, vs] = await Promise.all([
      fetchPatientDetail(childId),
      fetchVisitsForChild(childId),
    ]);
    setChild(detail.child);
    setMeasurements(detail.measurements as HospitalMeasurement[]);
    setVisits(vs);
    return { visits: vs };
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { visits: vs } = await refreshData(id);
        if (cancelled) return;
        if (vs.length > 0) setSelectedVisitId(vs[0].id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '환자 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Growth comparison numbers for the header "성장 비교" button / modal.
  // Computed PER-PATIENT from every measurement we have:
  //   • initial         = earliest visit with a height measurement
  //   • firstPredicted  = BA-based PAH from the earliest visit that has
  //                       BOTH height and bone_age
  //   • latestPredicted = BA-based PAH from the LATEST visit that has both
  //
  // Robust to visits without bone_age or without height — those are skipped
  // so the diagram can still show a meaningful comparison whenever at least
  // two BA-complete visits exist.
  const comparisonHeights = useMemo(() => {
    if (!child || measurements.length === 0) return null;
    const byDate = [...measurements].sort(
      (a, b) => new Date(a.measured_date).getTime() - new Date(b.measured_date).getTime(),
    );

    const firstWithHeight = byDate.find((m) => m.height && m.height > 0);
    const withBA = byDate.filter(
      (m) => m.height && m.height > 0 && m.bone_age != null && m.bone_age > 0,
    );
    if (!firstWithHeight || withBA.length === 0) return null;

    const firstBA = withBA[0];
    const lastBA = withBA[withBA.length - 1];

    const pah = (m: HospitalMeasurement) =>
      predictAdultHeightByBonePercentile(
        m.height,
        m.bone_age!,
        child.gender === 'male' ? 'M' : 'F',
        child.nationality ?? 'KR',
      );

    return {
      initial: firstWithHeight.height,
      firstPredicted: pah(firstBA),
      latestPredicted: pah(lastBA),
    };
  }, [child, measurements]);

  const selectedVisit = useMemo(
    () => (selectedVisitId ? visits.find((v) => v.id === selectedVisitId) ?? null : null),
    [selectedVisitId, visits],
  );

  if (!id) return null;
  if (loading) return <div className="p-6 text-sm text-gray-500">로딩…</div>;
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;
  if (!child) return <div className="p-6 text-sm text-red-500">환자를 찾을 수 없습니다.</div>;


  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Slim header */}
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="flex items-baseline gap-2 text-base font-bold leading-tight text-slate-900">
              <span className="font-mono text-[12px] text-slate-500">#{child.chart_number}</span>
              <span>{child.name}</span>
              <span className="text-[12px] font-normal text-slate-500">
                {child.gender === 'male' ? '남' : '여'} · {child.birth_date}
              </span>
            </h1>
            {(child.father_height || child.mother_height) && (
              <div className="text-[11px] text-slate-500">
                {child.father_height ? `父 ${child.father_height}cm` : ''}
                {child.father_height && child.mother_height ? ' · ' : ''}
                {child.mother_height ? `母 ${child.mother_height}cm` : ''}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 상담 / 치료 중 / 완료 단계 토글 — 의사 수동 분류 */}
          <div className="inline-flex h-8 overflow-hidden rounded border border-slate-300">
            {TREATMENT_STAGES.map((stage) => {
              const cur = child.treatment_status ?? 'consultation';
              const active = cur === stage.value;
              return (
                <button
                  key={stage.value}
                  type="button"
                  onClick={async () => {
                    if (active) return;
                    try {
                      const updated = await updateChildField(child.id, {
                        treatment_status: stage.value,
                      });
                      setChild(updated);
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : 'Unknown';
                      alert('단계 변경 실패: ' + msg);
                    }
                  }}
                  className={`px-3 text-xs font-semibold transition ${
                    active ? stage.active : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setConsultExpanded(true)}
            className="inline-flex h-8 items-center rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            첫 상담
          </button>
          <button
            type="button"
            onClick={() => setIntakeExpanded(true)}
            className="inline-flex h-8 items-center rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            기본 정보
          </button>
          <button
            type="button"
            onClick={() => setComparisonOpen(true)}
            disabled={!comparisonHeights}
            title="성장 비교"
            aria-label="성장 비교"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            📊
          </button>
        </div>
      </div>

      {comparisonOpen && comparisonHeights && (
        <ZoomModal
          onClose={() => setComparisonOpen(false)}
          title={`성장 비교 · ${child.name}`}
          maxWidth="1400px"
        >
          <div className="flex h-full flex-col">
            <div className="flex-1 min-h-0">
              <GrowthComparisonDiagram
                initialHeight={comparisonHeights.initial ?? 0}
                predictedAdultHeight={comparisonHeights.firstPredicted ?? 0}
                finalHeight={comparisonHeights.latestPredicted ?? 0}
                lang="ko"
                className="h-full w-full"
              />
            </div>
            <div className="mt-3 text-center text-xs text-slate-500">
              초기 키 = 최초 방문 실측 키 · 최초 예측 성인키 = 최초 방문 BA 기반 PAH · 최종 예측 성인키 = 최근 BA 기반 PAH
            </div>
          </div>
        </ZoomModal>
      )}

      {/* 첫 상담 + 기본 정보는 헤더 버튼으로 열리는 full-screen 모달. 평소엔
          페이지 세로 공간을 전혀 차지하지 않아 3단 레이아웃이 항상 보인다.
          저장 내용은 onChildUpdated→setChild 로 즉시 반영되고, 닫을 때
          refreshData 로 그래프/visits/VisitDetailPanel 도 최신화한다. */}
      {consultExpanded && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2">
            <h2 className="text-sm font-semibold text-slate-900">
              첫 상담 · #{child.chart_number} {child.name}
            </h2>
            <button
              type="button"
              onClick={() => {
                setConsultExpanded(false);
                if (id) refreshData(id).catch(() => undefined);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          {/* flex column so FirstConsultPanel's inner `flex-1` actually
              takes the remaining height — the DeckNav bar gets squeezed out
              of view otherwise and every slide looks a different size. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <FirstConsultPanel
              expanded={true}
              onToggle={() => {
                setConsultExpanded(false);
                if (id) refreshData(id).catch(() => undefined);
              }}
              child={child}
              onChildUpdated={setChild}
            />
          </div>
        </div>
      )}

      {intakeExpanded && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2">
            <h2 className="text-sm font-semibold text-slate-900">
              기본 정보 · #{child.chart_number} {child.name}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIntakeExpanded(false);
                if (id) refreshData(id).catch(() => undefined);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <IntakeSurveyPanel child={child} onChildUpdated={setChild} />
          </div>
        </div>
      )}

      {/* 3-column layout: chart + X-ray fixed, visits is the only fluid 1fr.
          Chart locks at 60% of the grid width so its size never depends on
          the X-ray rail state. 접힘 섹션이 제거돼 항상 표시된다. */}
      {true && (
      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:[grid-template-columns:var(--cols)]"
        style={
          {
            ['--cols' as string]: `180px ${
              detailCollapsed ? '44px' : 'minmax(360px, 1fr)'
            } ${chartCollapsed ? '44px' : '52%'}`,
          } as React.CSSProperties
        }
      >
        {/* Left: visit list (always expanded) */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="shrink-0 border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            진료 기록
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <VisitList
              childId={id}
              visits={visits}
              measurements={measurements}
              selectedVisitId={selectedVisitId}
              onSelectVisit={setSelectedVisitId}
              onVisitDeleted={() => {
                if (id) refreshData(id).catch(() => undefined);
              }}
              onVisitUpdated={() => {
                if (id) refreshData(id).catch(() => undefined);
              }}
            />
          </div>
          <div className="shrink-0 space-y-1.5 border-t border-slate-200 p-2">
            <input
              type="date"
              value={newVisitDate}
              onChange={(e) => setNewVisitDate(e.target.value)}
              aria-label="새 진료 날짜"
              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700"
            />
            <button
              type="button"
              disabled={!newVisitDate}
              onClick={async () => {
                if (!id || !newVisitDate) return;
                try {
                  const v = await createVisit({
                    child_id: id,
                    visit_date: newVisitDate,
                    is_intake: false,
                  });
                  await refreshData(id);
                  setSelectedVisitId(v.id);
                  setNewVisitDate(new Date().toLocaleDateString('sv-SE'));
                } catch (e) {
                  logger.error('inline visit create failed', e);
                }
              }}
              className="flex w-full items-center justify-center rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              + 새 진료
            </button>
          </div>
        </section>

        {/* Middle: selected visit detail — 측정 / X-ray / Lab / 처방 (collapsible to 44px rail) */}
        <section
          className={`flex h-full min-h-0 flex-col overflow-hidden ${
            detailCollapsed ? 'items-center rounded-lg border border-slate-200 bg-white py-2' : ''
          }`}
        >
          {detailCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setDetailCollapsed(false)}
                title="진료 내역 펼치기"
                aria-label="진료 내역 펼치기"
                className="mb-2 h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                ›
              </button>
              <div
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                style={{ writingMode: 'vertical-rl' }}
              >
                진료 내역
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  진료 내역
                </div>
                <button
                  type="button"
                  onClick={() => setDetailCollapsed(true)}
                  title="진료 내역 접기"
                  aria-label="진료 내역 접기"
                  className="h-7 w-7 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  ‹
                </button>
              </div>
              {selectedVisit ? (
                <VisitDetailPanel
                  child={child}
                  visit={selectedVisit}
                  measurements={measurements}
                  onMeasurementChanged={(m) =>
                    setMeasurements((prev) => {
                      const rest = prev.filter((x) => x.id !== m.id);
                      return [...rest, m].sort(
                        (a, b) =>
                          new Date(a.measured_date).getTime() -
                          new Date(b.measured_date).getTime(),
                      );
                    })
                  }
                  onXraySaved={() => {
                    if (id) refreshData(id).catch(() => undefined);
                  }}
                  onNationalityChange={async (next) => {
                    try {
                      const updated = await updateChildField(child.id, { nationality: next });
                      setChild(updated);
                    } catch {
                      /* noop */
                    }
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-xs text-slate-400">
                  회차를 선택하세요
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right: growth chart (collapsible to 44px rail) */}
        <section
          className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white ${
            chartCollapsed ? 'items-center py-2' : 'p-3'
          }`}
        >
          {chartCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setChartCollapsed(false)}
                title="성장 그래프 펼치기"
                aria-label="성장 그래프 펼치기"
                className="mb-2 h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                ‹
              </button>
              <div
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                style={{ writingMode: 'vertical-rl' }}
              >
                성장 그래프
              </div>
            </>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setChartTab('curve')}
                    className={`rounded px-2 py-1 text-[11px] font-semibold ${chartTab === 'curve' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    성장 곡선
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartTab('trend')}
                    className={`rounded px-2 py-1 text-[11px] font-semibold ${chartTab === 'trend' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    예측키 추세
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setChartZoomed(true)}
                    title="크게 보기"
                    aria-label="크게 보기"
                    className="h-7 w-7 shrink-0 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    ⤢
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartCollapsed(true)}
                    title="성장 그래프 접기"
                    aria-label="성장 그래프 접기"
                    className="h-7 w-7 shrink-0 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                {chartTab === 'curve' ? (
                  <AdminPatientGrowthChart
                    child={child}
                    measurements={measurements}
                    selectedVisitId={selectedVisitId}
                    defaultHidePrediction
                    onNationalityChange={async (next) => {
                      try {
                        const updated = await updateChildField(child.id, { nationality: next });
                        setChild(updated);
                      } catch {
                        /* noop */
                      }
                    }}
                  />
                ) : (
                  <PredictedHeightTrend child={child} measurements={measurements} />
                )}
              </div>
            </>
          )}
        </section>

        {/* 성장 그래프 크게 보기 — 현재 선택된 탭(곡선/추세)을 모달로 확대 */}
        {chartZoomed && (
          <ZoomModal
            onClose={() => setChartZoomed(false)}
            title="성장 그래프"
            maxWidth="min(1400px, 96vw)"
          >
            <div className="flex h-[82vh] w-full flex-col">
              {/* 모달 안에서도 탭으로 곡선/추세 전환 */}
              <div className="mb-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setChartTab('curve')}
                  className={`rounded px-3 py-1.5 text-sm font-semibold ${chartTab === 'curve' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  성장 곡선
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab('trend')}
                  className={`rounded px-3 py-1.5 text-sm font-semibold ${chartTab === 'trend' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  예측키 추세
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {chartTab === 'curve' ? (
                  <AdminPatientGrowthChart
                    child={child}
                    measurements={measurements}
                    selectedVisitId={selectedVisitId}
                    defaultHidePrediction
                    enlarged
                    onNationalityChange={async (next) => {
                      try {
                        const updated = await updateChildField(child.id, { nationality: next });
                        setChild(updated);
                      } catch {
                        /* noop */
                      }
                    }}
                  />
                ) : (
                  <PredictedHeightTrend child={child} measurements={measurements} enlarged />
                )}
              </div>
            </div>
          </ZoomModal>
        )}
      </div>
      )}

      {/* Floating buttons (🔍 비슷한 케이스 · 🧠 환자 분석) — 숨김 처리. 되살리려면 아래 블록 주석 해제.
      <div className="fixed bottom-4 left-4 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSimilarOpen(true)}
          title="비슷한 케이스 검색 (RAG)"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
        >
          <span>🔍</span>
          <span>비슷한 케이스</span>
        </button>
        <button
          type="button"
          onClick={() => setAnalysisOpen(true)}
          title="AI 환자 분석"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
        >
          <span>🧠</span>
          <span>환자 분석</span>
        </button>
      </div>
      */}

      {/* Floating action button — AI 처방 추천 */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowRx(true)}
          title="AI 처방 추천 (논문 근거)"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90"
          style={{ backgroundColor: '#667eea' }}
        >
          <span>🧠</span>
          <span>AI 처방 추천</span>
        </button>
      </div>

      {showRx && <RxRecommendModal childId={child.id} onClose={() => setShowRx(false)} />}

      {analysisOpen && child && (
        <PatientAnalysisModal
          childId={child.id}
          patientName={child.name}
          onClose={() => setAnalysisOpen(false)}
        />
      )}

      {child && (
        <SimilarCasesModal
          childId={child.id}
          childName={child.name}
          isOpen={similarOpen}
          onClose={() => setSimilarOpen(false)}
        />
      )}
    </div>
  );
}

