import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPatientDetail } from '@/features/admin/services/adminService';
import { fetchVisitsForChild } from '@/features/hospital/services/visitService';
import { VisitAccordion } from '@/features/hospital/components/VisitAccordion';
import { LifestyleSummary } from '@/features/hospital/components/LifestyleSummary';
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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [detail, vs] = await Promise.all([
          fetchPatientDetail(id),
          fetchVisitsForChild(id),
        ]);
        if (cancelled) return;
        setChild(detail.child);
        setMeasurements(detail.measurements as HospitalMeasurement[]);
        setParent(detail.parent);
        setVisits(vs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '환자 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return null;
  if (loading) return <div className="p-6 text-sm text-gray-500">로딩…</div>;
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;
  if (!child) return <div className="p-6 text-sm text-red-500">환자를 찾을 수 없습니다.</div>;

  const age = calculateAge(child.birth_date);

  return (
    <div className="space-y-4">
      {/* BoneAgeAI viewer-style header strip */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="h-[3px] bg-slate-900" />
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/images/logo.jpg" alt="187 성장클리닉" className="h-9 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">{child.name}</h1>
              <div className="text-xs text-slate-500">
                {child.gender === 'male' ? '남' : '여'} · {child.birth_date} · 만 {age.years}세{age.months}개월
                {child.father_height ? ` · 父 ${child.father_height}cm` : ''}
                {child.mother_height ? ` · 母 ${child.mother_height}cm` : ''}
                {parent ? ` · 보호자 ${parent.name}` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/admin/patients/${id}/visits/new`}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + 새 진료
            </Link>
          </div>
        </div>
      </div>

      {/* Left: visit accordion — Right: growth chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(0,720px)]">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">진료 기록</h2>
          <VisitAccordion childId={id} visits={visits} measurements={measurements} />
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <AdminPatientGrowthChart child={child} measurements={measurements} />
        </section>
      </div>

      <aside className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">생활습관 요약 (최근 30일)</h2>
        <LifestyleSummary childId={id} />
      </aside>
    </div>
  );
}
