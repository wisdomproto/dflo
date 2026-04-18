import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Child,
  HospitalMeasurement,
  LabTest,
  Visit,
} from '@/shared/types';
import { upsertMeasurementField } from '@/features/hospital/services/hospitalMeasurementService';
import {
  fetchLabTestsByVisit,
  createLabTest,
} from '@/features/hospital/services/labTestService';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { usePasteTarget } from '@/shared/hooks/usePasteTarget';
import { XrayPanel } from './XrayPanel';
import { PrescriptionsBlock } from './PrescriptionsBlock';
import { LifestylePanel } from './LifestylePanel';

interface Props {
  child: Child;
  visit: Visit;
  measurements: HospitalMeasurement[];
  onMeasurementChanged: (m: HospitalMeasurement) => void;
  /** Called after X-ray save so the parent can refresh measurements (bone_age sync). */
  onXraySaved: () => void;
  onNationalityChange?: (next: 'KR' | 'CN') => void;
}

/**
 * Middle-column visit workspace — shows the currently selected visit in
 * four sections: 측정 / X-ray / Lab / 처방. Each section edits its own slice
 * of clinical data and keeps the other sections untouched.
 */
export function VisitDetailPanel({
  child,
  visit,
  measurements,
  onMeasurementChanged,
  onXraySaved,
  onNationalityChange,
}: Props) {
  const m = measurements.find((x) => x.visit_id === visit.id) ?? null;
  const chronoAge = calculateAgeAtDate(child.birth_date, new Date(visit.visit_date)).decimal;
  const nationality = child.nationality ?? 'KR';

  // Live bone age + PAH from XrayPanel so the 측정 section shows the same
  // working values the clinician is editing in X-ray (no stale drift).
  const [liveXray, setLiveXray] = useState<{
    boneAge: number | null;
    predictedAdult: number | null;
  }>({ boneAge: null, predictedAdult: null });

  // Reset live state when switching to a different visit.
  useEffect(() => {
    setLiveXray({ boneAge: null, predictedAdult: null });
  }, [visit.id]);

  const effectiveBoneAge = liveXray.boneAge ?? m?.bone_age ?? null;
  const pah = useMemo(() => {
    if (liveXray.predictedAdult != null) return liveXray.predictedAdult;
    if (m?.height && m?.bone_age) {
      return predictAdultHeightByBonePercentile(
        m.height,
        m.bone_age,
        child.gender === 'male' ? 'M' : 'F',
        nationality,
      );
    }
    return null;
  }, [liveXray.predictedAdult, m?.height, m?.bone_age, child.gender, nationality]);

  const saveField = async (
    patch: Partial<Pick<HospitalMeasurement, 'height' | 'weight' | 'bone_age' | 'pah' | 'doctor_notes'>>,
  ) => {
    try {
      const next = await upsertMeasurementField({
        visit_id: visit.id,
        child_id: child.id,
        measured_date: visit.visit_date,
        patch,
      });
      onMeasurementChanged(next);
    } catch (e) {
      logger.error('measurement save failed', e);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pb-24">
      {/* Header */}
      <div className="flex shrink-0 items-baseline justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-900">{visit.visit_date}</span>
          <span className="text-[11px] text-slate-500">CA {chronoAge.toFixed(1)}</span>
          {effectiveBoneAge != null && (
            <span className="text-[11px] text-slate-500">BA {effectiveBoneAge.toFixed(1)}</span>
          )}
          {pah != null && (
            <span className="text-[11px] text-indigo-600">PAH {pah.toFixed(1)}</span>
          )}
        </div>
      </div>

      <Section title="측정" accent="emerald">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <NumberField
            label="키 (cm)"
            value={m?.height ?? null}
            step={0.1}
            onSave={(v) => saveField({ height: v ?? undefined })}
          />
          <NumberField
            label="몸무게 (kg)"
            value={m?.weight ?? null}
            step={0.1}
            onSave={(v) => saveField({ weight: v ?? undefined })}
          />
          {/* 뼈나이 + 예측 성인키: X-ray 섹션에서 계산한 값을 그대로 표시
              (read-only). 수정은 X-ray 섹션에서만 가능. */}
          <div className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            <div className="flex items-center gap-1">
              <span>뼈나이 (세)</span>
              <HelpTip text="X-ray 탭에서 자동 계산" />
            </div>
            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
              {effectiveBoneAge != null ? effectiveBoneAge.toFixed(1) : '—'}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            <div className="flex items-center gap-1">
              <span>예측 성인키</span>
              <HelpTip text="X-ray 탭에서 자동 계산" />
            </div>
            <div className="flex h-9 items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-bold text-indigo-900">
              {pah != null ? `${pah.toFixed(1)} cm` : '—'}
            </div>
          </div>
        </div>
      </Section>

      <Section title="X-ray" accent="indigo">
        <XrayPanel
          child={child}
          visit={visit}
          measurements={measurements}
          collapsed={false}
          onToggleCollapse={() => {
            /* no-op inside VisitDetailPanel; zoom button handles expansion */
          }}
          onSaved={onXraySaved}
          embedded
          onNationalityChange={onNationalityChange}
          onLiveChange={setLiveXray}
        />
      </Section>

      <Section title="검사 (Lab)" accent="sky">
        <LabSection
          visitId={visit.id}
          childId={child.id}
          visitDate={visit.visit_date}
        />
      </Section>

      <Section title="처방" accent="violet">
        <PrescriptionsBlock visitId={visit.id} childId={child.id} />
      </Section>

      <Section title="생활 습관 (진료 전 30일)" accent="emerald">
        <LifestylePanel childId={child.id} anchorDate={visit.visit_date} />
      </Section>
    </div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: 'emerald' | 'indigo' | 'sky' | 'violet';
  children: React.ReactNode;
}) {
  const bars: Record<typeof accent, string> = {
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    sky: 'bg-sky-500',
    violet: 'bg-violet-500',
  };
  // No overflow-hidden — each section must size to its content so nothing
  // is clipped. The accent bar is absolute-positioned and uses inset-y-0
  // so it still spans the full height.
  return (
    <section className="relative shrink-0 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-lg ${bars[accent]}`}
      />
      <div className="border-b border-slate-100 px-4 py-2 pl-5 text-[12px] font-semibold uppercase tracking-wide text-slate-700">
        {title}
      </div>
      <div className="px-4 py-3 pl-5">{children}</div>
    </section>
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
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
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

function HelpTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group">
      <span
        aria-label={text}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500 normal-case tracking-normal hover:border-slate-400 hover:text-slate-700"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium normal-case tracking-normal text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

// ========================= Lab section =========================

type LabFile = { name: string; url: string };

function isImageFile(f: LabFile): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(f.name);
}

function LabSection({
  visitId,
  childId,
  visitDate,
}: {
  visitId: string;
  childId: string;
  visitDate: string;
}) {
  const [labs, setLabs] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const xs = await fetchLabTestsByVisit(visitId);
      setLabs(xs);
    } catch (e) {
      logger.error('fetch labs failed', e);
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const uploadOne = async (file: File) => {
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
          logger.error('lab upload failed', e);
        }
      }
      await reload();
    } finally {
      setUploading(false);
    }
  };

  const { armed, wrapperProps } = usePasteTarget({
    onPaste: (f) => uploadAll([f]),
  });

  const allFiles: LabFile[] = labs.flatMap(
    (l) => (l.result_data as unknown as { files?: LabFile[] })?.files ?? [],
  );
  const imageFiles = allFiles.filter(isImageFile);
  const pdfFiles = allFiles.filter((f) => !isImageFile(f));

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="text-xs text-slate-400">불러오는 중…</div>
      ) : (
        <>
          {imageFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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
                </button>
              ))}
            </div>
          )}

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

          {imageFiles.length === 0 && pdfFiles.length === 0 && (
            <div className="text-xs text-slate-400">첨부된 검사 기록이 없습니다.</div>
          )}
        </>
      )}

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
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length > 0) uploadAll(files);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-3 py-4 text-center text-xs font-medium transition ${
          armed
            ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100'
            : drag
              ? 'border-sky-500 bg-sky-50 text-sky-700'
              : 'border-slate-300 bg-slate-50/50 text-slate-500 hover:border-sky-300 hover:bg-sky-50/50'
        }`}
      >
        {uploading
          ? '업로드 중…'
          : armed
            ? '📋 붙여넣기 대기 중 — Ctrl+V'
            : '📎 검사 파일 첨부 (드래그 · 클릭 후 붙여넣기)'}
      </div>

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
  const prevRef = useRef(prev);
  const nextRef = useRef(next);
  prevRef.current = prev;
  nextRef.current = next;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prevRef.current();
      else if (e.key === 'ArrowRight') nextRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
          {file.name}
          <span className="ml-2 opacity-70">
            {idx + 1} / {files.length}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded bg-white/10 hover:bg-white/20"
          aria-label="닫기"
        >
          ✕
        </button>
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
