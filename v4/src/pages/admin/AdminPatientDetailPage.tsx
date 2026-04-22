import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPatientDetail } from '@/features/admin/services/adminService';
import { createVisit, fetchVisitsForChild } from '@/features/hospital/services/visitService';
import { logger } from '@/shared/lib/logger';
import { VisitList } from '@/features/hospital/components/VisitList';
import { VisitDetailPanel } from '@/features/hospital/components/VisitDetailPanel';
import { AdminPatientGrowthChart } from '@/features/hospital/components/AdminPatientGrowthChart';
import { IntakeSurveyPanel } from '@/features/hospital/components/intake/IntakeSurveyPanel';
import { FirstConsultPanel } from '@/features/hospital/components/intake/FirstConsultPanel';
import { updateChildField } from '@/features/hospital/services/intakeSurveyService';
import { GrowthComparisonDiagram } from '@/features/hospital/components/intake/GrowthComparisonDiagram';
import { ZoomModal } from '@/shared/components/ZoomModal';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import { calculateAge } from '@/shared/utils/age';
import type { Child, HospitalMeasurement, User, Visit } from '@/shared/types';

type ParentInfo = Pick<User, 'id' | 'name' | 'email' | 'phone'>;

export default function AdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const [measurements, setMeasurements] = useState<HospitalMeasurement[]>([]);
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [chartCollapsed, setChartCollapsed] = useState(false);
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  // 기본 정보는 진료 기록 상단에 접힌 채로 고정 — 필요할 때만 펼침
  const [intakeExpanded, setIntakeExpanded] = useState(false);
  // 첫 상담 프레젠테이션 덱도 접힌 채로 상주 — 펼치면 슬라이드 덱이 열림
  const [consultExpanded, setConsultExpanded] = useState(false);

  const refreshData = async (childId: string) => {
    const [detail, vs] = await Promise.all([
      fetchPatientDetail(childId),
      fetchVisitsForChild(childId),
    ]);
    setChild(detail.child);
    setMeasurements(detail.measurements as HospitalMeasurement[]);
    setParent(detail.parent);
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

  const age = calculateAge(child.birth_date);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Slim header */}
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-3">
          <img src="/images/logo.jpg" alt="187 성장클리닉" className="h-8 w-auto" />
          <div>
            <h1 className="flex items-center gap-2 text-base font-bold leading-tight text-slate-900">
              <span className="font-mono text-[12px] text-slate-500">#{child.chart_number}</span>
              <span>{child.name}</span>
            </h1>
            <div className="text-[11px] text-slate-500">
              {child.gender === 'male' ? '남' : '여'} · {child.birth_date} · 만 {age.years}세{age.months}개월
              {child.father_height ? ` · 父 ${child.father_height}cm` : ''}
              {child.mother_height ? ` · 母 ${child.mother_height}cm` : ''}
              {parent ? ` · 보호자 ${parent.name}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            />
          </div>
          <div className="shrink-0 border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={async () => {
                if (!id) return;
                try {
                  const v = await createVisit({
                    child_id: id,
                    visit_date: new Date().toISOString().slice(0, 10),
                    is_intake: false,
                  });
                  await refreshData(id);
                  setSelectedVisitId(v.id);
                } catch (e) {
                  logger.error('inline visit create failed', e);
                }
              }}
              className="flex w-full items-center justify-center rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
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
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  성장 그래프
                </div>
                <button
                  type="button"
                  onClick={() => setChartCollapsed(true)}
                  title="성장 그래프 접기"
                  aria-label="성장 그래프 접기"
                  className="h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ›
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <AdminPatientGrowthChart
                  child={child}
                  measurements={measurements}
                  selectedVisitId={selectedVisitId}
                  onNationalityChange={async (next) => {
                    try {
                      const updated = await updateChildField(child.id, { nationality: next });
                      setChild(updated);
                    } catch {
                      /* noop */
                    }
                  }}
                />
              </div>
            </>
          )}
        </section>
      </div>
      )}
    </div>
  );
}

