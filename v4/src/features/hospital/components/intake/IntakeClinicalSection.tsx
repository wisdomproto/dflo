import { useCallback, useEffect, useRef, useState } from 'react';
import type { Child, HospitalMeasurement, LabTest, Visit } from '@/shared/types';
import { getOrCreateIntakeVisit, updateVisit } from '@/features/hospital/services/visitService';
import {
  fetchMeasurementsByVisit,
  upsertMeasurementField,
} from '@/features/hospital/services/hospitalMeasurementService';
import {
  fetchLabTestsByVisit,
  createLabTest,
} from '@/features/hospital/services/labTestService';
import { fetchXrayReadingsByVisit } from '@/features/bone-age/services/xrayReadingService';
import { XrayPanel } from '@/features/hospital/components/XrayPanel';
import { usePasteTarget } from '@/shared/hooks/usePasteTarget';
import { AdminPatientGrowthChart } from '@/features/hospital/components/AdminPatientGrowthChart';
import { SectionCard } from './SectionCard';
import { GrowthChartOverlay } from './GrowthChartOverlay';
import { updateChildField } from '@/features/hospital/services/intakeSurveyService';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

interface Props {
  child: Child;
  onChildUpdated: (child: Child) => void;
}

/**
 * Section — 초진 임상 데이터 (기본 정보 탭 전용).
 * 환자당 단일 `is_intake=true` visit 를 lazy-create 하고, 그 위에
 * hospital_measurements / xray_readings / lab_tests 를 기존 테이블
 * 그대로 얹어 다른 병원에서 넘어온 환자의 초진 기록을 담는다.
 */
export function IntakeClinicalSection({ child, onChildUpdated }: Props) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [measurement, setMeasurement] = useState<HospitalMeasurement | null>(null);
  const [labs, setLabs] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveXray, setLiveXray] = useState<{ boneAge: number | null; predictedAdult: number | null }>({
    boneAge: null,
    predictedAdult: null,
  });

  const reloadLabs = useCallback(async (visitId: string) => {
    const xs = await fetchLabTestsByVisit(visitId);
    setLabs(xs);
  }, []);

  // Lazy create / fetch the single intake visit + measurements + labs.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const v = await getOrCreateIntakeVisit(child.id, today);
        if (cancelled) return;
        setVisit(v);
        const [ms, ls] = await Promise.all([
          fetchMeasurementsByVisit(v.id),
          fetchLabTestsByVisit(v.id),
        ]);
        if (cancelled) return;
        setMeasurement(ms[0] ?? null);
        setLabs(ls);
      } catch (e) {
        logger.error('intake clinical load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  const saveField = async (
    patch: Partial<Pick<HospitalMeasurement, 'height' | 'weight' | 'bone_age' | 'pah' | 'doctor_notes'>>,
  ) => {
    if (!visit) return;
    try {
      const next = await upsertMeasurementField({
        visit_id: visit.id,
        child_id: child.id,
        measured_date: visit.visit_date,
        patch,
      });
      setMeasurement(next);
    } catch (e) {
      logger.error('intake measurement save failed', e);
    }
  };

  const saveDate = async (newDate: string) => {
    if (!visit) return;
    try {
      const next = await updateVisit(visit.id, { visit_date: newDate });
      setVisit(next);
      // Keep measurement.measured_date in sync with the intake date.
      if (measurement) {
        const updated = await upsertMeasurementField({
          visit_id: next.id,
          child_id: child.id,
          measured_date: newDate,
          patch: {},
        });
        setMeasurement(updated);
      }
    } catch (e) {
      logger.error('intake date save failed', e);
    }
  };

  // After xray save, refresh measurement (bone_age may have been synced).
  const onXraySaved = useCallback(async () => {
    if (!visit) return;
    const [ms] = await Promise.all([fetchMeasurementsByVisit(visit.id)]);
    setMeasurement(ms[0] ?? null);
    // Touch readings to warm cache (non-fatal if fails).
    try {
      await fetchXrayReadingsByVisit(visit.id);
    } catch {
      /* noop */
    }
  }, [visit]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        초진 임상 데이터 로딩 중…
      </div>
    );
  }
  if (!visit) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
        초진 회차를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <>
      <SectionCard
        step="06"
        title="초진 측정"
        subtitle="다른 병원에서 치료 받던 환자 포함"
        accent="emerald"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DateField label="측정일" value={visit.visit_date} onSave={saveDate} />
          <NumberField
            label="현재 키 (cm)"
            value={measurement?.height ?? null}
            step={0.1}
            onSave={(v) => saveField({ height: v ?? undefined })}
          />
          <NumberField
            label="현재 몸무게 (kg)"
            value={measurement?.weight ?? null}
            step={0.1}
            onSave={(v) => saveField({ weight: v ?? undefined })}
          />
        </div>
      </SectionCard>

      <SectionCard step="07" title="X-ray 판독" subtitle="뼈나이 · 예측 성인키" accent="indigo">
        <XrayPanel
          child={child}
          visit={visit}
          measurements={measurement ? [measurement] : []}
          collapsed={false}
          onToggleCollapse={() => {
            /* no-op */
          }}
          onSaved={onXraySaved}
          embedded
          onLiveChange={setLiveXray}
          onNationalityChange={async (next) => {
            try {
              const updated = await updateChildField(child.id, { nationality: next });
              onChildUpdated(updated);
            } catch {
              /* noop */
            }
          }}
        />
      </SectionCard>

      <SectionCard
        step="08"
        title="성장 그래프"
        subtitle="KDCA 2017 · BA/CA 예측"
        accent="violet"
      >
        <div className="relative aspect-[2/1] w-full">
          <AdminPatientGrowthChart
            child={child}
            measurements={measurement ? [measurement] : []}
            selectedVisitId={visit.id}
            onNationalityChange={async (next) => {
              try {
                const updated = await updateChildField(child.id, { nationality: next });
                onChildUpdated(updated);
              } catch {
                /* error surfaces via toast elsewhere */
              }
            }}
          />
          <GrowthChartOverlay
            child={child}
            measurement={measurement}
            referenceDate={visit.visit_date}
            liveBoneAge={liveXray.boneAge}
            livePredictedAdult={liveXray.predictedAdult}
          />
        </div>
      </SectionCard>

      <SectionCard step="09" title="검사 기록" subtitle="검사 파일 · 결과 이미지" accent="sky">
        <LabList labs={labs} />
        <LabUpload
          visitId={visit.id}
          childId={child.id}
          visitDate={visit.visit_date}
          onUploaded={() => reloadLabs(visit.id)}
        />
      </SectionCard>
    </>
  );
}

// --- small local field primitives ---

function DateField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      <input
        type="date"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local && local !== value) onSave(local);
        }}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onSave,
}: {
  label: string;
  value: number | null;
  step?: number;
  onSave: (v: number | null) => void;
}) {
  const [local, setLocal] = useState<string>(value == null ? '' : String(value));
  useEffect(() => setLocal(value == null ? '' : String(value)), [value]);
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const trimmed = local.trim();
          const parsed = trimmed === '' ? null : Number(trimmed);
          if (parsed !== null && Number.isNaN(parsed)) return;
          const currentStr = value == null ? '' : String(value);
          if (trimmed !== currentStr) onSave(parsed);
        }}
      />
    </label>
  );
}

type LabFile = { name: string; url: string };

function isImageFile(f: LabFile): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(f.name);
}

function LabList({ labs }: { labs: LabTest[] }) {
  // Flatten all attachment files into a single gallery so the user can step
  // through every scanned page with ← / → in the lightbox.
  const allFiles: LabFile[] = [];
  const nonAttachmentChips: string[] = [];
  for (const l of labs) {
    if (l.test_type === 'attachment') {
      const files =
        (l.result_data as unknown as { files?: LabFile[] })?.files ?? [];
      for (const f of files) allFiles.push(f);
    } else {
      nonAttachmentChips.push(labTypeLabel(l.test_type));
    }
  }

  const imageFiles = allFiles.filter(isImageFile);
  const pdfFiles = allFiles.filter((f) => !isImageFile(f));
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (labs.length === 0) {
    return <div className="mb-2 text-xs text-slate-400">첨부된 검사 기록이 없습니다.</div>;
  }

  return (
    <div className="mb-2 flex flex-col gap-3">
      {/* Non-attachment test type tags */}
      {nonAttachmentChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {nonAttachmentChips.map((label, i) => (
            <span
              key={i}
              className="inline-block rounded bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Image gallery */}
      {imageFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {imageFiles.map((f, i) => (
            <button
              key={`${f.url}-${i}`}
              type="button"
              onClick={() => setLightboxIdx(i)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition hover:ring-2 hover:ring-sky-300"
              title={f.name}
            >
              <img
                src={f.url}
                alt={f.name}
                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                loading="lazy"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[10px] text-white">
                {f.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Non-image attachments (PDF 등) */}
      {pdfFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pdfFiles.map((f, i) => (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
            >
              📎 {f.name}
            </a>
          ))}
        </div>
      )}

      {lightboxIdx != null && (
        <LabLightbox
          files={imageFiles}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}

function LabLightbox({
  files,
  startIndex,
  onClose,
}: {
  files: LabFile[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx((i) => (i - 1 + files.length) % files.length);
  const next = () => setIdx((i) => (i + 1) % files.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  const file = files[idx];
  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="mb-2 flex w-full max-w-5xl items-center justify-between text-xs text-white/80"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate">
          {file.name}{' '}
          <span className="ml-2 opacity-70">
            {idx + 1} / {files.length}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
          >
            원본 열기 ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded bg-white/10 hover:bg-white/20"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="relative flex w-full max-w-5xl flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={file.url}
          src={file.url}
          alt={file.name}
          className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
        />
        {files.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="이전"
              className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-800 shadow hover:bg-white"
            >
              ←
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="다음"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-800 shadow hover:bg-white"
            >
              →
            </button>
          </>
        )}
      </div>
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

function LabUpload({
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
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { armed, wrapperProps } = usePasteTarget({
    onPaste: (f) => uploadAll([f]),
  });

  const uploadOne = async (file: File): Promise<void> => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;
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
  };

  const uploadAll = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const f of files) {
        try {
          await uploadOne(f);
        } catch (e) {
          logger.error('intake lab upload failed', e);
        }
      }
      onUploaded();
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null | undefined) => {
    if (!files || files.length === 0) return;
    uploadAll(Array.from(files));
  };

  return (
    <div
      {...wrapperProps}
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
      className={`relative mt-3 cursor-pointer rounded-xl border-2 border-dashed px-3 py-5 text-center text-xs font-medium transition ${
        armed
          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-4 ring-indigo-100'
          : drag
            ? 'border-sky-500 bg-sky-50 text-sky-700'
            : 'border-slate-300 bg-slate-50/50 text-slate-500 hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-600'
      }`}
    >
      {uploading
        ? '업로드 중…'
        : armed
          ? '📋 붙여넣기 대기 중 — Ctrl+V'
          : '📎 검사 파일 첨부 (드래그 · 클릭 후 붙여넣기)'}
    </div>
  );
}
