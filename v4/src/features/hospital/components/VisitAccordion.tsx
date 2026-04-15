// Expandable per-visit accordion for the admin patient detail page.
// Header is always visible; expanding lazily loads xray/lab/rx for that visit.

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

export function VisitAccordion({ childId, visits, measurements }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
    // Auto-expand the most recent visit on mount
    if (visits.length > 0) {
      const first = visits[0];
      setExpanded((prev) => (prev[first.id] !== undefined ? prev : { [first.id]: true }));
      loadExtras(first.id);
    }
  }, [visits, loadExtras]);

  const toggle = (visitId: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [visitId]: !prev[visitId] };
      if (next[visitId]) loadExtras(visitId);
      return next;
    });
  };

  if (visits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
        내원 기록이 없습니다.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {visits.map((v) => {
        const isOpen = !!expanded[v.id];
        const m = measurements.find((x) => x.visit_id === v.id);
        const extra = extras[v.id] ?? emptyExtras;
        return (
          <li key={v.id} className="rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => toggle(v.id)}
              className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {v.visit_date}
                  </span>
                  {m?.height && (
                    <span className="text-[11px] text-slate-500">
                      {m.height}cm
                      {m.weight ? ` / ${m.weight}kg` : ''}
                      {m.bone_age ? ` · BA ${m.bone_age.toFixed(1)}` : ''}
                    </span>
                  )}
                </div>
                {v.chief_complaint && (
                  <div className="mt-0.5 truncate text-xs text-slate-600">
                    {v.chief_complaint}
                  </div>
                )}
              </div>
              <span className="mt-0.5 text-slate-400">{isOpen ? '▾' : '▸'}</span>
            </button>

            {isOpen && (
              <div className="space-y-2 border-t border-slate-100 px-3 py-2 text-xs">
                {m && (
                  <div className="grid grid-cols-4 gap-2 rounded bg-slate-50 p-2">
                    <Stat label="키" value={m.height ? `${m.height}cm` : '—'} />
                    <Stat label="몸무게" value={m.weight ? `${m.weight}kg` : '—'} />
                    <Stat
                      label="뼈나이"
                      value={m.bone_age ? `${m.bone_age.toFixed(1)}` : '—'}
                    />
                    <Stat label="PAH" value={m.pah ? `${m.pah}` : '—'} />
                  </div>
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
                  <div className="text-slate-400">불러오는 중…</div>
                ) : extra.error ? (
                  <div className="text-red-500">{extra.error}</div>
                ) : (
                  <>
                    <Row label="X-ray">
                      {extra.xrays.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        extra.xrays.map((x) => (
                          <div key={x.id} className="text-slate-700">
                            {x.xray_date}
                            {typeof x.bone_age_result === 'number'
                              ? ` · BA ${x.bone_age_result.toFixed(1)}`
                              : ''}
                          </div>
                        ))
                      )}
                    </Row>
                    <Row label="검사">
                      {extra.labs.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        extra.labs.map((l) => (
                          <span
                            key={l.id}
                            className="mr-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700"
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

                <div className="pt-1 text-right">
                  <Link
                    to={`/admin/patients/${childId}/visits/${v.id}`}
                    className="text-[11px] font-medium text-slate-700 underline-offset-2 hover:underline"
                  >
                    자세히 편집 →
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
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
