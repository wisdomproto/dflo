// Left-column visit list for the admin patient detail page.
//   - full mode: inline height/weight inputs on each card + expandable scroll box
//   - rail mode: thin date-stamp strip (used when X-ray panel is open)

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLabTestsByVisit, createLabTest } from '@/features/hospital/services/labTestService';
import { fetchPrescriptionsByVisit } from '@/features/hospital/services/prescriptionService';
import { upsertMeasurementField } from '@/features/hospital/services/hospitalMeasurementService';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type {
  Gender,
  HospitalMeasurement,
  LabTest,
  Prescription,
  Visit,
} from '@/shared/types';

interface Props {
  childId: string;
  gender: Gender;
  birthDate: string;
  visits: Visit[];
  measurements: HospitalMeasurement[];
  selectedVisitId: string | null;
  onSelectVisit: (visitId: string | null) => void;
  onMeasurementChanged: (m: HospitalMeasurement) => void;
  collapsed?: boolean;
}

function aiPredictedHeight(
  m: HospitalMeasurement | undefined,
  gender: Gender,
): number | null {
  if (!m?.height || !m?.bone_age) return null;
  const v = predictAdultHeightByBonePercentile(
    m.height,
    m.bone_age,
    gender === 'male' ? 'M' : 'F',
  );
  return v > 0 ? Number(v.toFixed(1)) : null;
}

interface VisitExtras {
  loading: boolean;
  labs: LabTest[];
  prescriptions: Prescription[];
  error: string | null;
}

const emptyExtras: VisitExtras = {
  loading: false,
  labs: [],
  prescriptions: [],
  error: null,
};

export function VisitList({
  childId,
  gender,
  birthDate,
  visits,
  measurements,
  selectedVisitId,
  onSelectVisit,
  onMeasurementChanged,
  collapsed = false,
}: Props) {
  const [extras, setExtras] = useState<Record<string, VisitExtras>>({});
  const loadedRef = useRef<Set<string>>(new Set());

  const loadExtras = useCallback(async (visitId: string) => {
    if (loadedRef.current.has(visitId)) return;
    loadedRef.current.add(visitId);
    setExtras((prev) => ({ ...prev, [visitId]: { ...emptyExtras, loading: true } }));
    try {
      const [labs, prescriptions] = await Promise.all([
        fetchLabTestsByVisit(visitId),
        fetchPrescriptionsByVisit(visitId),
      ]);
      setExtras((prev) => ({
        ...prev,
        [visitId]: { loading: false, labs, prescriptions, error: null },
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

  if (collapsed) {
    return (
      <ul className="space-y-1">
        {visits.map((v, i) => {
          const idx = visits.length - i;
          const isSel = selectedVisitId === v.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onSelectVisit(v.id)}
                title={v.visit_date}
                className={`block w-full rounded px-1 py-1.5 text-center text-[10px] leading-tight transition-colors ${
                  isSel
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-semibold">#{idx}</div>
                <div className="mt-0.5 text-[9px] opacity-80">
                  {v.visit_date.slice(2, 10).replace(/-/g, '/')}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

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
            <div className="flex items-start gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={() => onSelectVisit(isOpen ? null : v.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">
                    #{idx}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {v.visit_date}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    CA {calculateAgeAtDate(birthDate, new Date(v.visit_date)).decimal.toFixed(1)}
                  </span>
                  {m?.bone_age != null && (
                    <span className="text-[11px] text-slate-500">
                      BA {m.bone_age.toFixed(1)}
                    </span>
                  )}
                </div>
                {(() => {
                  const pah = aiPredictedHeight(m, gender);
                  return pah != null ? (
                    <div className="mt-0.5 text-[11px]">
                      <span className="text-indigo-500">PAH</span>{' '}
                      <span className="font-medium text-indigo-700">{pah}</span>
                    </div>
                  ) : null;
                })()}
              </button>
              <NumberField
                value={m?.height ?? null}
                suffix="cm"
                placeholder="키"
                onSave={async (val) => {
                  try {
                    const next = await upsertMeasurementField({
                      visit_id: v.id,
                      child_id: childId,
                      measured_date: v.visit_date,
                      patch: { height: val ?? undefined },
                    });
                    onMeasurementChanged(next);
                  } catch (e) {
                    logger.error('save height failed', e);
                  }
                }}
              />
              <NumberField
                value={m?.weight ?? null}
                suffix="kg"
                placeholder="몸무게"
                onSave={async (val) => {
                  try {
                    const next = await upsertMeasurementField({
                      visit_id: v.id,
                      child_id: childId,
                      measured_date: v.visit_date,
                      patch: { weight: val ?? undefined },
                    });
                    onMeasurementChanged(next);
                  } catch (e) {
                    logger.error('save weight failed', e);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => onSelectVisit(isOpen ? null : v.id)}
                className="ml-1 self-center text-slate-400 hover:text-slate-600"
                aria-label={isOpen ? '접기' : '펼치기'}
              >
                {isOpen ? '▾' : '▸'}
              </button>
            </div>

            {isOpen && (
              <div className="max-h-96 overflow-y-auto border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                {/* Measurement summary */}
                {m && (
                  <div className="mb-2 grid grid-cols-4 gap-2 rounded bg-white p-2 ring-1 ring-slate-200">
                    <Stat label="키" value={m.height ? `${m.height}cm` : '—'} />
                    <Stat label="몸무게" value={m.weight ? `${m.weight}kg` : '—'} />
                    <Stat label="뼈나이" value={m.bone_age ? m.bone_age.toFixed(1) : '—'} />
                    <Stat
                      label="PAH"
                      value={(() => {
                        const p = aiPredictedHeight(m, gender);
                        return p ? `${p}` : '—';
                      })()}
                    />
                  </div>
                )}

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
                      <div className="space-y-1">
                        {extra.labs
                          .filter((l) => l.test_type !== 'attachment')
                          .map((l) => (
                            <span
                              key={l.id}
                              className="mr-1 inline-block rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200"
                            >
                              {labTypeLabel(l.test_type)}
                            </span>
                          ))}
                        {/* Attached files */}
                        {extra.labs
                          .filter((l) => l.test_type === 'attachment')
                          .map((l) => {
                            const files = (l.result_data as unknown as { files?: { name: string; url: string }[] })?.files ?? [];
                            return files.map((f, fi) => (
                              <a
                                key={`${l.id}-${fi}`}
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mr-1 inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                              >
                                📎 {f.name}
                              </a>
                            ));
                          })}
                        {extra.labs.length === 0 && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </Row>
                    {/* Lab file upload zone */}
                    <LabFileUpload
                      visitId={v.id}
                      childId={childId}
                      visitDate={v.visit_date}
                      onUploaded={() => {
                        loadedRef.current.delete(v.id);
                        loadExtras(v.id);
                      }}
                    />
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

                <div className="mt-2 flex items-center justify-end border-t border-slate-200 pt-2">
                  <Link
                    to={`/admin/patients/${childId}/visits/${v.id}`}
                    className="text-[11px] text-slate-600 underline-offset-2 hover:underline"
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

function NumberField({
  value,
  suffix,
  placeholder,
  onSave,
}: {
  value: number | null;
  suffix: string;
  placeholder: string;
  onSave: (val: number | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string>(value != null ? `${value}` : '');
  useEffect(() => {
    setDraft(value != null ? `${value}` : '');
  }, [value]);

  const commit = async () => {
    const parsed = draft.trim() === '' ? null : Number(draft);
    const nextVal = typeof parsed === 'number' && !Number.isNaN(parsed) ? parsed : null;
    if (nextVal === value) return;
    await onSave(nextVal);
  };

  return (
    <div className="relative">
      <input
        type="number"
        step="0.1"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="h-8 w-20 rounded border border-slate-200 bg-white pr-7 pl-2 text-right text-[12px] text-slate-900 outline-none focus:border-slate-400"
      />
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
        {suffix}
      </span>
    </div>
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
  if (t === 'attachment') return '첨부';
  return t;
}

function LabFileUpload({
  visitId,
  childId,
  visitDate,
  onUploaded,
}: {
  visitId: string;
  childId: string;
  visitDate: string;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `lab/${childId}/${visitId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('content-images')
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from('content-images').getPublicUrl(path);
      await createLabTest({
        visit_id: visitId,
        child_id: childId,
        test_type: 'attachment',
        collected_date: visitDate,
        result_data: { files: [{ name: file.name, url: publicUrl }] },
      });
      onUploaded();
    } catch (e) {
      logger.error('lab file upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null | undefined) => {
    const f = files?.[0];
    if (f) upload(f);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.items ?? [])
        .find((i) => i.type.startsWith('image/') || i.type === 'application/pdf')
        ?.getAsFile();
      if (f) upload(f);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId, childId]);

  return (
    <div className="py-1">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded border border-dashed px-3 py-2 text-center text-[11px] transition-colors ${
          drag
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-slate-300 text-slate-500 hover:border-slate-400'
        }`}
      >
        {uploading ? (
          '업로드 중…'
        ) : (
          <>📎 검사 파일 첨부 (드래그 · 붙여넣기 · 클릭)</>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
