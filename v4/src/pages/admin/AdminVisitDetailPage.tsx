import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { HospitalMeasurement, Visit } from '@/shared/types';
import { fetchVisit, updateVisit } from '@/features/hospital/services/visitService';
import { fetchMeasurementsByVisit } from '@/features/hospital/services/hospitalMeasurementService';
import { MeasurementEditor } from '@/features/hospital/components/MeasurementEditor';
import { VisitForm } from '@/features/hospital/components/VisitForm';
import { LabTestsBlock } from '@/features/hospital/components/LabTestsBlock';
import { PrescriptionsBlock } from '@/features/hospital/components/PrescriptionsBlock';

export default function AdminVisitDetailPage() {
  const { id, visitId } = useParams<{ id: string; visitId: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [measurement, setMeasurement] = useState<HospitalMeasurement | null>(null);

  useEffect(() => {
    if (!visitId) return;
    let cancelled = false;
    (async () => {
      const v = await fetchVisit(visitId);
      if (cancelled) return;
      setVisit(v);
      const ms = await fetchMeasurementsByVisit(visitId);
      if (cancelled) return;
      setMeasurement(ms[0] ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [visitId]);

  if (!id || !visitId) return null;
  if (!visit) return <div className="p-6 text-sm text-gray-500">로딩…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내원 상세 · {visit.visit_date}</h1>
        <Link
          to={`/admin/patients/${id}`}
          className="text-sm text-gray-500 hover:underline"
        >
          ← 환자 차트
        </Link>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">내원 정보</h2>
        <VisitForm
          initial={{
            visit_date: visit.visit_date,
            chief_complaint: visit.chief_complaint ?? '',
            plan: visit.plan ?? '',
            notes: visit.notes ?? '',
          }}
          submitLabel="업데이트"
          onSubmit={async (values) => {
            const v = await updateVisit(visit.id, values);
            setVisit(v);
          }}
        />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">측정 (키 / 몸무게 / 뼈나이 / PAH)</h2>
        <MeasurementEditor
          visitId={visit.id}
          childId={id}
          measurement={measurement}
          onSaved={setMeasurement}
        />
      </section>

      <section className="rounded-lg border border-dashed bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">🦴 X-ray / 뼈나이</h2>
        <Link
          to={`/admin/patients/${id}/visits/${visit.id}/bone-age`}
          className="text-sm text-[#667eea] hover:underline"
        >
          판독 툴 열기 →
        </Link>
        <div className="mt-2 text-xs text-gray-400">(Phase C 에서 구현)</div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">🧪 Lab tests</h2>
        <LabTestsBlock visitId={visit.id} childId={id} />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">💊 처방</h2>
        <PrescriptionsBlock visitId={visit.id} childId={id} />
      </section>
    </div>
  );
}
