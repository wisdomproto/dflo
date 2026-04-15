// Left-column visit list. Two modes:
//   - full (default):  basic metrics in each row + expandable scroll box below
//   - rail  (xray on): thin collapsed rail showing just date + visit index
// Expanded row content lazy-loads labs/rx/xray and offers an "X-ray 보기" action.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLabTestsByVisit } from '@/features/hospital/services/labTestService';
import { fetchPrescriptionsByVisit } from '@/features/hospital/services/prescriptionService';
import { fetchXrayReadingsByVisit } from '@/features/bone-age/services/xrayReadingService';
import type {
  HospitalMeasurement,
  LabTest,
  Prescription,
  Visit,
  XrayReading,
} from '@/shared/types';

interface Props {
  childId: string;
  visits: Visit[];
  measurements: HospitalMeasurement[];
  mode: 'full' | 'rail';
  selectedVisitId: string | null;
  onSelectVisit: (visitId: string | null) => void;
  onOpenXray: (visitId: string) => void;
}

interface VisitExtras {
  loading: boolean;
  xrays: XrayReading[];
  labs: LabTest[];
  prescriptions: Prescription[];
  error: string | null;
}

const emptyExtras: VisitExtras = {
  loading: false,
  xrays: [],
  labs: [],
  prescriptions: [],
  error: null,
};

export function VisitList({
  childId,
  visits,
  measurements,
  mode,
  selectedVisitId,
  onSelectVisit,
  onOpenXray,
}: Props) {
  const [extras, setExtras] = useState<Record<string, VisitExtras>>({});
  const loadedRef = useRef<Set<string>>(new Set());

  const loadExtras = useCallback(async (visitId: string) => {
    if (loadedRef.current.has(visitId)) return;
    loadedRef.current.add(visitId);
    setExtras((prev) => ({ ...prev, [visitId]: { ...emptyExtras, loading: true } }));
    try {
      const [xrays, labs, prescriptions] = await Promise.all([
        fetchXrayReadingsByVisit(visitId),
        fetchLabTestsByVisit(visitId),
        fetchPrescriptionsByVisit(visitId),
      ]);
      setExtras((prev) => ({
        ...prev,
        [visitId]: { loading: false, xrays, labs, prescriptions, error: null },
      }));
    } catch (e) {
      setExtras((prev) => ({
        ...prev,
        [visitId]: {
          ...emptyExtras,
          error: e instanceof Error ? e.message : '불러오기 실패',
        },
      }));
      loadedRef.current.delete(visitId);
    }
  }, []);

  useEffect(() => {
    if (selectedVisitId) loadExtras(selectedVisitId);
  }, [selectedVisitId, loadExtras]);

  if (visits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        내원 기록이 없습니다.
      </div>
    );
  }

  // Rail mode — thin collapsed strip
  if (mode === 'rail') {
    return (
      <ul className="space-y-1">
        {visits.map((v, i) => {
          const idx = visits.length - i;
          const isSelected = selectedVisitId === v.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onSelectVisit(v.id)}
                className={`block w-full rounded px-1.5 py-2 text-left text-[11px] transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
                title={v.visit_date}
              >
                <div className="text-center font-semibold">{idx}</div>
                <div className="mt-0.5 text-center leading-tight">
                  {v.visit_date.slice(5).replace('-', '/')}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  // Full mode
  return (
    <ul className="space-y-2">
      {visits.map((v, i) => {
        const idx = visits.length - i;
        const isOpen = selectedVisitId === v.id;
        const m = measurements.find((x) => x.visit_id === v.id);
        const extra = extras[v.id] ?? emptyExtras;
        return (
          <li
            key={v.id}
            className={`overflow-hidden rounded-lg border bg-white transition-colors ${
              isOpen ? 'border-slate-400' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectVisit(isOpen ? null : v.id)}
              className="w-full text-left hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">
                      #{idx}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {v.visit_date}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[12px] text-slate-600">
                    <Metric label="키" value={m?.height ? `${m.height}cm` : '—'} />
                    <Metric
                      label="BA"
                      value={m?.bone_age ? m.bone_age.toFixed(1) : '—'}
                    />
                    <Metric label="예측" value={m?.pah ? `${m.pah}` : '—'} />
                  </div>
                </div>
                <span className="text-slate-400">{isOpen ? '▾' : '▸'}</span>
              </div>
            </button>

            {isOpen && (
              <div className="max-h-80 overflow-y-auto border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                {v.chief_complaint && (
                  <Row label="주호소">
                    <span className="whitespace-pre-wrap text-slate-700">
                      {v.chief_complaint}
                    </span>
                  </Row>
                )}
                {v.plan && (
                  <Row label="계획">
                    <span className="whitespace-pre-wrap text-slate-700">{v.plan}</span>
                  </Row>
                )}
                {v.notes && (
                  <Row label="메모">
                    <span className="whitespace-pre-wrap text-slate-700">{v.notes}</span>
                  </Row>
                )}

                {extra.loading ? (
                  <div className="py-1 text-slate-400">불러오는 중…</div>
                ) : extra.error ? (
                  <div className="py-1 text-red-500">{extra.error}</div>
                ) : (
                  <>
                    <Row label="검사">
                      {extra.labs.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        extra.labs.map((l) => (
                          <span
                            key={l.id}
                            className="mr-1 inline-block rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200"
                          >
                            {labTypeLabel(l.test_type)}
                          </span>
                        ))
                      )}
                    </Row>
                    <Row label="처방">
                      {extra.prescriptions.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        extra.prescriptions.map((p) => (
                          <div key={p.id} className="text-slate-700">
                            · {p.dose ?? '용량 미지정'}
                            {p.frequency ? ` · ${p.frequency}` : ''}
                            {p.duration_days ? ` · ${p.duration_days}일` : ''}
                          </div>
                        ))
                      )}
                    </Row>
                  </>
                )}

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenXray(v.id);
                    }}
                    className="rounded bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                  >
                    🩻 X-ray 보기
                    {extra.xrays.length > 0 ? ` (${extra.xrays.length})` : ''}
                  </button>
                  <Link
                    to={`/admin/patients/${childId}/visits/${v.id}`}
                    className="text-[11px] text-slate-600 underline-offset-2 hover:underline"
                  >
                    편집 →
                  </Link>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5">
      <div className="w-12 shrink-0 text-[11px] font-medium text-slate-500">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function labTypeLabel(t: string) {
  if (t === 'allergy') return '알러지';
  if (t === 'organic_acid') return '유기산';
  if (t === 'blood') return '혈액';
  return t;
}
