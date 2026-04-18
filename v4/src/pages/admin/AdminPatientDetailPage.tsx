import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchPatientDetail } from '@/features/admin/services/adminService';
import { fetchVisitsForChild } from '@/features/hospital/services/visitService';
import { VisitList } from '@/features/hospital/components/VisitList';
import { VisitDetailPanel } from '@/features/hospital/components/VisitDetailPanel';
import { AdminPatientGrowthChart } from '@/features/hospital/components/AdminPatientGrowthChart';
import { IntakeSurveyPanel } from '@/features/hospital/components/intake/IntakeSurveyPanel';
import { updateChildField } from '@/features/hospital/services/intakeSurveyService';
import { GrowthComparisonDiagram } from '@/features/hospital/components/intake/GrowthComparisonDiagram';
import { ZoomModal } from '@/shared/components/ZoomModal';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import { calculateAge } from '@/shared/utils/age';
import type { Child, HospitalMeasurement, User, Visit } from '@/shared/types';

type TabKey = 'info' | 'visits';

type ParentInfo = Pick<User, 'id' | 'name' | 'email' | 'phone'>;

export default function AdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: TabKey = (searchParams.get('tab') as TabKey) === 'info' ? 'info' : 'visits';
  const setTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'visits') sp.delete('tab');
    else sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };
  const [child, setChild] = useState<Child | null>(null);
  const [measurements, setMeasurements] = useState<HospitalMeasurement[]>([]);
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [visitsCollapsed, setVisitsCollapsed] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

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
          <div className="inline-flex overflow-hidden rounded border border-slate-300">
            <button
              type="button"
              onClick={() => setTab('info')}
              className={
                'px-3 py-1.5 text-xs font-medium transition ' +
                (tab === 'info'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              기본 정보
            </button>
            <button
              type="button"
              onClick={() => setTab('visits')}
              className={
                'border-l border-slate-300 px-3 py-1.5 text-xs font-medium transition ' +
                (tab === 'visits'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50')
              }
            >
              진료 기록
            </button>
          </div>
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
          <Link
            to={`/admin/patients/${id}/visits/new`}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            + 새 진료
          </Link>
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

      {tab === 'info' && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <IntakeSurveyPanel child={child} onChildUpdated={setChild} />
        </div>
      )}

      {tab === 'visits' && (
      <>
      {/* 3-column layout: chart + X-ray fixed, visits is the only fluid 1fr.
          Chart locks at 60% of the grid width so its size never depends on
          the X-ray rail state — collapsing X-ray flows its 316px purely into
          the visits column. */}
      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:[grid-template-columns:var(--cols)]"
        style={
          {
            ['--cols' as string]: `${
              visitsCollapsed ? '60px' : '180px'
            } minmax(360px, 1fr) 52%`,
          } as React.CSSProperties
        }
      >
        {/* Left: visit list */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex shrink-0 items-center justify-between gap-1 border-b border-slate-200 px-2 py-2 text-sm font-semibold text-slate-700">
            {!visitsCollapsed && <span className="px-1">진료 기록</span>}
            <button
              type="button"
              onClick={() => setVisitsCollapsed((c) => !c)}
              title={visitsCollapsed ? '펼치기' : '접기'}
              aria-label={visitsCollapsed ? '펼치기' : '접기'}
              className="ml-auto h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              {visitsCollapsed ? '›' : '‹'}
            </button>
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto ${visitsCollapsed ? 'p-1' : 'p-3'}`}>
            <VisitList
              childId={id}
              visits={visits}
              selectedVisitId={selectedVisitId}
              onSelectVisit={setSelectedVisitId}
              onVisitDeleted={() => {
                if (id) refreshData(id).catch(() => undefined);
              }}
            />
          </div>
        </section>

        {/* Middle: selected visit detail — 측정 / X-ray / Lab / 처방 */}
        <section className="flex h-full min-h-0 flex-col overflow-hidden">
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
        </section>

        {/* Right: growth chart */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-3">
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
        </section>
      </div>
      </>
      )}
    </div>
  );
}
