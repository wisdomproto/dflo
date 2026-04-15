// Full-featured X-ray judgment panel embedded in the admin patient page.
// Center = patient X-ray (drag&drop + paste + file picker), left = younger
// atlas ref, right = older atlas ref. Younger can be stepped ±1, older is
// auto-derived. Save stores xray_reading + syncs measurement.bone_age to
// the midpoint of the two atlas ages.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  byGenderSorted,
  formatLabel,
  loadAtlas,
  neighborInSorted,
} from '@/features/bone-age/lib/atlas';
import { computeAge, matchByAge } from '@/features/bone-age/lib/matcher';
import type { AtlasEntry, Gender } from '@/features/bone-age/lib/types';
import {
  createXrayReading,
  fetchXrayReadingsByVisit,
  getXrayImageSignedUrl,
  uploadXrayImage,
} from '@/features/bone-age/services/xrayReadingService';
import { logger } from '@/shared/lib/logger';
import type { Child, HospitalMeasurement, Visit, XrayReading } from '@/shared/types';

interface Props {
  child: Child;
  visit: Visit;
  visits: Visit[];
  measurements: HospitalMeasurement[];
  xrayVisitIds: Set<string>;
  onSelectVisit: (visitId: string) => void;
  onClose: () => void;
  onSaved: () => void;
}

export function XrayPanel({
  child,
  visit,
  visits,
  measurements,
  xrayVisitIds,
  onSelectVisit,
  onClose,
  onSaved,
}: Props) {
  const gender: Gender = child.gender === 'male' ? 'M' : 'F';

  const [atlas, setAtlas] = useState<AtlasEntry[] | null>(null);
  const [existing, setExisting] = useState<XrayReading | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [manualYounger, setManualYounger] = useState<AtlasEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Load atlas once
  useEffect(() => {
    loadAtlas()
      .then((d) => setAtlas(d.entries))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Per-visit fetch: existing reading + image URL
  useEffect(() => {
    let cancelled = false;
    setExisting(null);
    setManualYounger(null);
    setError(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImageFile(null);
    setImageUrl(null);

    fetchXrayReadingsByVisit(visit.id)
      .then(async (rows) => {
        if (cancelled) return;
        const first = rows[0] ?? null;
        setExisting(first);
        if (first?.image_path) {
          try {
            const url = await getXrayImageSignedUrl(first.image_path);
            if (!cancelled) setImageUrl(url);
          } catch (e) {
            logger.error('signed url failed', e);
          }
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '불러오기 실패'));

    return () => {
      cancelled = true;
    };
  }, [visit.id]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const sortedAtlas = useMemo(
    () => (atlas ? byGenderSorted(atlas, gender) : []),
    [atlas, gender],
  );

  // Default younger age: existing reading's match → previous visit BA → chronological at visit date
  const defaultYoungerAge: number | null = useMemo(() => {
    if (existing?.bone_age_result != null) return existing.bone_age_result;
    const earlier = [...measurements]
      .filter(
        (m) =>
          m.visit_id !== visit.id &&
          typeof m.bone_age === 'number' &&
          new Date(m.measured_date).getTime() < new Date(visit.visit_date).getTime(),
      )
      .sort(
        (a, b) => new Date(b.measured_date).getTime() - new Date(a.measured_date).getTime(),
      )[0];
    if (earlier?.bone_age) return earlier.bone_age;
    return computeAge(child.birth_date, visit.visit_date);
  }, [existing, measurements, child.birth_date, visit.id, visit.visit_date]);

  const autoMatch = useMemo(() => {
    if (!atlas || defaultYoungerAge == null) return { younger: null, older: null };
    return matchByAge(atlas, gender, defaultYoungerAge);
  }, [atlas, gender, defaultYoungerAge]);

  // If existing reading saved atlas files, prefer those; otherwise auto-match
  const initialYounger: AtlasEntry | null = useMemo(() => {
    if (!sortedAtlas.length) return null;
    if (existing?.atlas_match_younger) {
      return sortedAtlas.find((a) => a.file === existing.atlas_match_younger) ?? null;
    }
    return autoMatch.younger ?? null;
  }, [sortedAtlas, existing, autoMatch.younger]);

  const effectiveYounger = manualYounger ?? initialYounger;
  const effectiveOlder = neighborInSorted(sortedAtlas, effectiveYounger, 1);

  const canStepUp =
    effectiveYounger !== null &&
    neighborInSorted(sortedAtlas, effectiveYounger, 1) !== null &&
    neighborInSorted(sortedAtlas, effectiveYounger, 2) !== null;
  const canStepDown =
    effectiveYounger !== null && neighborInSorted(sortedAtlas, effectiveYounger, -1) !== null;

  const handleStep = (offset: number) => {
    const next = neighborInSorted(sortedAtlas, effectiveYounger, offset);
    if (next) setManualYounger(next);
  };

  const acceptFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageFile(file);
    setImageUrl(url);
  }, []);

  // Paste listener
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((i) => i.type.startsWith('image/'))
        ?.getAsFile();
      if (file) acceptFile(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [acceptFile]);

  // Prev/Next navigation — skip visits without X-ray
  const { prevVisitId, nextVisitId } = useMemo(() => {
    const sorted = [...visits].sort(
      (a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime(),
    );
    const idx = sorted.findIndex((v) => v.id === visit.id);
    const prev = sorted.slice(0, idx).reverse().find((v) => xrayVisitIds.has(v.id)) ?? null;
    const next = sorted.slice(idx + 1).find((v) => xrayVisitIds.has(v.id)) ?? null;
    return { prevVisitId: prev?.id ?? null, nextVisitId: next?.id ?? null };
  }, [visits, visit.id, xrayVisitIds]);

  const midpoint = useMemo(() => {
    if (!effectiveYounger || !effectiveOlder) return null;
    return Number(((effectiveYounger.age + effectiveOlder.age) / 2).toFixed(2));
  }, [effectiveYounger, effectiveOlder]);

  const handleSave = async () => {
    if (!effectiveYounger || !effectiveOlder || midpoint == null) return;
    setSaving(true);
    setError(null);
    try {
      let image_path = existing?.image_path;
      if (imageFile) {
        image_path = await uploadXrayImage(child.id, imageFile);
      }
      await createXrayReading({
        visit_id: visit.id,
        child_id: child.id,
        xray_date: visit.visit_date,
        image_path,
        bone_age_result: midpoint,
        atlas_match_younger: effectiveYounger.file,
        atlas_match_older: effectiveOlder.file,
      });
      setImageFile(null);
      onSaved();
    } catch (e) {
      logger.error('XrayPanel save failed', e);
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const chronoAge = computeAge(child.birth_date, visit.visit_date);

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!prevVisitId}
            onClick={() => prevVisitId && onSelectVisit(prevVisitId)}
            className="h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            title="이전 X-ray"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={!nextVisitId}
            onClick={() => nextVisitId && onSelectVisit(nextVisitId)}
            className="h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            title="다음 X-ray"
          >
            ›
          </button>
          <div className="ml-1 text-sm font-semibold text-slate-900">
            X-ray · {visit.visit_date}
          </div>
          <div className="text-[11px] text-slate-500">
            역년령 {chronoAge != null ? chronoAge.toFixed(2) : '—'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {midpoint != null && (
            <span className="text-[12px] text-slate-700">
              판독값
              <span className="ml-1 font-semibold text-slate-900">{midpoint.toFixed(2)}</span>
            </span>
          )}
          <button
            type="button"
            disabled={saving || !effectiveYounger || !effectiveOlder}
            onClick={handleSave}
            className="rounded bg-slate-900 px-3 py-1 text-[12px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {saving ? '저장 중…' : existing ? '재저장' : '저장'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body — 3 panes */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!atlas ? (
          <div className="py-8 text-center text-sm text-slate-500">Atlas 로딩 중…</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Younger */}
            <Pane
              label="younger"
              color="text-blue-600"
              caption={effectiveYounger ? formatLabel(effectiveYounger) : '—'}
              hint="↑ 다음 / ↓ 이전"
            >
              {effectiveYounger ? (
                <AtlasImage file={effectiveYounger.file} alt={formatLabel(effectiveYounger)} />
              ) : (
                <Placeholder text="후보 없음" />
              )}
              <StepButtons canUp={canStepUp} canDown={canStepDown} onStep={handleStep} />
            </Pane>

            {/* Patient — drag & drop + paste */}
            <PatientPane imageUrl={imageUrl} onFile={acceptFile} />

            {/* Older — auto */}
            <Pane
              label="older"
              color="text-rose-600"
              caption={effectiveOlder ? formatLabel(effectiveOlder) : '—'}
              hint="왼쪽 기준 자동"
            >
              {effectiveOlder ? (
                <AtlasImage file={effectiveOlder.file} alt={formatLabel(effectiveOlder)} />
              ) : (
                <Placeholder text="더 큰 atlas 없음" />
              )}
            </Pane>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function Pane({
  label,
  color,
  caption,
  hint,
  children,
}: {
  label: string;
  color: string;
  caption: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>
        {label}
      </div>
      <div className="relative aspect-[800/1166] overflow-hidden rounded bg-slate-900 ring-1 ring-slate-200">
        {children}
      </div>
      <div className="text-center text-[12px] font-semibold text-slate-800">{caption}</div>
      {hint && <div className="text-center text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}

function StepButtons({
  canUp,
  canDown,
  onStep,
}: {
  canUp: boolean;
  canDown: boolean;
  onStep: (offset: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute right-1 top-1 flex flex-col gap-1">
      <button
        type="button"
        disabled={!canUp}
        onClick={() => onStep(+1)}
        className="pointer-events-auto h-7 w-7 rounded bg-white/90 text-sm font-bold text-slate-800 shadow hover:bg-white disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={!canDown}
        onClick={() => onStep(-1)}
        className="pointer-events-auto h-7 w-7 rounded bg-white/90 text-sm font-bold text-slate-800 shadow hover:bg-white disabled:opacity-30"
      >
        ↓
      </button>
    </div>
  );
}

function PatientPane({
  imageUrl,
  onFile,
}: {
  imageUrl: string | null;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = (files: FileList | null | undefined) => {
    const f = files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-700">
        patient
      </div>
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
        onClick={() => !imageUrl && inputRef.current?.click()}
        className={`relative aspect-[800/1166] overflow-hidden rounded bg-slate-900 ring-1 transition-colors ${
          drag ? 'ring-blue-500' : 'ring-slate-200'
        } ${imageUrl ? '' : 'cursor-pointer hover:ring-slate-400'}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="환자 X-ray" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-200">
            <div className="text-sm font-medium">이미지 끌어다 놓기</div>
            <div className="text-[11px] text-slate-400">또는 클릭해서 선택 · Ctrl+V 붙여넣기</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {imageUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-center text-[11px] text-slate-500 hover:text-slate-700 hover:underline"
        >
          다른 이미지로 교체
        </button>
      )}
    </div>
  );
}

function AtlasImage({ file, alt }: { file: string; alt: string }) {
  return <img src={`/atlas/${file}`} alt={alt} className="h-full w-full object-contain" />;
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
      {text}
    </div>
  );
}
