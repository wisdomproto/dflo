import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPatientDetail } from '@/features/admin/services/adminService';
import { fetchVisitsForChild } from '@/features/hospital/services/visitService';
import { VisitList } from '@/features/hospital/components/VisitList';
import { XrayPanel } from '@/features/hospital/components/XrayPanel';
import { AdminPatientGrowthChart } from '@/features/hospital/components/AdminPatientGrowthChart';
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
  const [xrayCollapsed, setXrayCollapsed] = useState(false);
  const [visitsCollapsed, setVisitsCollapsed] = useState(false);

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
            <h1 className="text-base font-bold leading-tight text-slate-900">
              {child.name}
            </h1>
            <div className="text-[11px] text-slate-500">
              {child.gender === 'male' ? '남' : '여'} · {child.birth_date} · 만 {age.years}세{age.months}개월
              {child.father_height ? ` · 父 ${child.father_height}cm` : ''}
              {child.mother_height ? ` · 母 ${child.mother_height}cm` : ''}
              {parent ? ` · 보호자 ${parent.name}` : ''}
            </div>
          </div>
        </div>
        <Link
          to={`/admin/patients/${id}/visits/new`}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + 새 진료
        </Link>
      </div>

      {/* 3-column layout: chart + X-ray are fixed; the visit list is the only
          fluid 1fr column, so collapsing the X-ray rail expands visits — the
          chart keeps its current width. */}
      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:[grid-template-columns:var(--cols)]"
        style={
          {
            ['--cols' as string]: `${
              visitsCollapsed ? '60px' : 'minmax(280px,1fr)'
            } ${xrayCollapsed ? '44px' : '360px'} 800px`,
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
              gender={child.gender}
              birthDate={child.birth_date}
              visits={visits}
              measurements={measurements}
              selectedVisitId={selectedVisitId}
              onSelectVisit={setSelectedVisitId}
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
              collapsed={visitsCollapsed}
            />
          </div>
        </section>

        {/* Middle: X-ray panel (linked to selected visit, collapsible) */}
        <section className="min-h-0">
          {selectedVisit ? (
            <XrayPanel
              child={child}
              visit={selectedVisit}
              measurements={measurements}
              collapsed={xrayCollapsed}
              onToggleCollapse={() => setXrayCollapsed((c) => !c)}
              onSaved={() => {
                if (id) refreshData(id).catch(() => undefined);
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
          />
        </section>
      </div>
    </div>
  );
}
