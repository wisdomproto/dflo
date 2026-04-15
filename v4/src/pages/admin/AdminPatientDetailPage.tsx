import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPatientDetail } from '@/features/admin/services/adminService';
import { fetchVisitsForChild } from '@/features/hospital/services/visitService';
import { VisitsTimeline } from '@/features/hospital/components/VisitsTimeline';
import { LifestyleSummary } from '@/features/hospital/components/LifestyleSummary';
import { GrowthChart, type GrowthPoint } from '@/shared/components/GrowthChart';
import { calculateAgeAtDate } from '@/shared/utils/age';
import type { Child, Measurement, User, Visit } from '@/shared/types';

type ParentInfo = Pick<User, 'id' | 'name' | 'email' | 'phone'>;

export default function AdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
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
        setMeasurements(detail.measurements);
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

  const points: GrowthPoint[] = useMemo(() => {
    if (!child) return [];
    return measurements
      .filter((m) => typeof m.height === 'number' && m.height > 0)
      .map((m) => ({
        age: calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal,
        height: m.height,
      }))
      .sort((a, b) => a.age - b.age);
  }, [child, measurements]);

  if (!id) return null;
  if (loading) return <div className="p-6 text-sm text-gray-500">로딩…</div>;
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;
  if (!child) return <div className="p-6 text-sm text-red-500">환자를 찾을 수 없습니다.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{child.name}</h1>
          <div className="text-sm text-gray-500">
            {child.gender === 'male' ? '남' : '여'} · {child.birth_date}
            {child.father_height ? ` · 父 ${child.father_height}cm` : ''}
            {child.mother_height ? ` · 母 ${child.mother_height}cm` : ''}
          </div>
          {parent && (
            <div className="text-xs text-gray-400">
              보호자: {parent.name}
              {parent.phone ? ` · ${parent.phone}` : ''}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <Link
            to={`/admin/patients/${id}/visits/new`}
            className="rounded bg-[#667eea] px-3 py-2 text-sm text-white"
          >
            + 새 내원 기록
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">내원 기록</h2>
          <VisitsTimeline childId={id} visits={visits} />
        </aside>
        <main className="space-y-4">
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">성장 곡선</h2>
            <GrowthChart gender={child.gender} points={points} zoomable />
          </section>
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">생활습관 요약 (최근 30일)</h2>
            <LifestyleSummary childId={id} />
          </section>
        </main>
      </div>
    </div>
  );
}
