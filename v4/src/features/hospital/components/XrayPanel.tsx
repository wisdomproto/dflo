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
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import type { AtlasEntry, Gender } from '@/features/bone-age/lib/types';
import {
  createXrayReading,
  fetchXrayReadingsByVisit,
  getXrayImageSignedUrl,
  uploadXrayImage,
} from '@/features/bone-age/services/xrayReadingService';
import { logger } from '@/shared/lib/logger';
import { ZoomModal } from '@/shared/components/ZoomModal';
import { ZoomableImg } from '@/shared/components/ZoomableImg';
import { usePasteTarget } from '@/shared/hooks/usePasteTarget';
import type { Child, HospitalMeasurement, Visit, XrayReading } from '@/shared/types';

interface Props {
  child: Child;
  visit: Visit;
  measurements: HospitalMeasurement[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSaved: () => void;
  /** When true, hides the outer collapse button + internal scroll so the
   *  panel fits exactly into its container (used by 기본 정보 탭). */
  embedded?: boolean;
  /** Live bone age + PAH updates (before save) so other widgets (e.g. the
   *  chart overlay) can reflect the current working values immediately. */
  onLiveChange?: (next: { boneAge: number | null; predictedAdult: number | null }) => void;
  /** Optional callback for the KR/CN toggle. Shares the same source
   *  (children.nationality) as the growth-chart toggle — updating here
   *  propagates to the chart, and vice versa. */
  onNationalityChange?: (next: 'KR' | 'CN') => void;
}

export function XrayPanel({
  child,
  visit,
  measurements,
  collapsed,
  onToggleCollapse,
  onSaved,
  embedded = false,
  onLiveChange,
  onNationalityChange,
}: Props) {
  const gender: Gender = child.gender === 'male' ? 'M' : 'F';

  const [atlas, setAtlas] = useState<AtlasEntry[] | null>(null);
  const [existing, setExisting] = useState<XrayReading | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [manualYounger, setManualYounger] = useState<AtlasEntry | null>(null);
  const [manualBoneAge, setManualBoneAge] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
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
    setManualBoneAge(null);
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
        // eslint-disable-next-line no-console
        console.debug('[XrayPanel] fetched readings', {
          visitId: visit.id,
          count: rows.length,
          firstImagePath: first?.image_path,
        });
        setExisting(first);
        if (first?.bone_age_result != null) setManualBoneAge(first.bone_age_result);
        if (first?.image_path) {
          try {
            const url = await getXrayImageSignedUrl(first.image_path);
            // eslint-disable-next-line no-console
            console.debug('[XrayPanel] signed url', { url });
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
    if (next) {
      setManualYounger(next);
      setManualBoneAge(null); // re-derive midpoint from new pair
    }
  };

  const acceptFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageFile(file);
    setImageUrl(url);
  }, []);

  // Paste listener is now handled per-PatientPane via usePasteTarget so the
  // user must explicitly click the X-ray drop zone to "arm" it before
  // Ctrl+V. This keeps paste scoped to exactly one dropzone at a time.

  const midpoint = useMemo(() => {
    if (!effectiveYounger || !effectiveOlder) return null;
    return Number(((effectiveYounger.age + effectiveOlder.age) / 2).toFixed(1));
  }, [effectiveYounger, effectiveOlder]);

  const effectiveBoneAge = manualBoneAge ?? midpoint;

  // Predicted adult height = same percentile at bone-age extrapolated to age 18.
  const visitHeight = useMemo(() => {
    const m = measurements.find((x) => x.visit_id === visit.id);
    return m?.height ?? null;
  }, [measurements, visit.id]);

  const predictedAdult = useMemo(() => {
    if (visitHeight == null || effectiveBoneAge == null) return null;
    const v = predictAdultHeightByBonePercentile(
      visitHeight,
      effectiveBoneAge,
      gender,
      child.nationality ?? 'KR',
    );
    return v > 0 ? v : null;
  }, [visitHeight, effectiveBoneAge, gender, child.nationality]);

  // Live-push bone age + PAH to any parent that cares (overlay memo).
  useEffect(() => {
    onLiveChange?.({ boneAge: effectiveBoneAge, predictedAdult });
  }, [effectiveBoneAge, predictedAdult, onLiveChange]);

  const handleSave = async () => {
    if (!effectiveYounger || !effectiveOlder || effectiveBoneAge == null) return;
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
        bone_age_result: effectiveBoneAge,
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

  // Collapsed: thin vertical rail with an expand chevron
  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center rounded-lg border border-slate-200 bg-white py-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mb-2 h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
          title="X-ray 펼치기"
          aria-label="펼치기"
        >
          ›
        </button>
        <div className="rotate-180 [writing-mode:vertical-rl] text-[11px] font-semibold text-slate-600">
          X-ray
        </div>
        {existing?.bone_age_result != null && (
          <div className="mt-2 rotate-180 [writing-mode:vertical-rl] text-[11px] text-slate-500">
            BA {existing.bone_age_result.toFixed(1)}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <div className={`flex flex-col rounded-lg border border-slate-200 bg-white ${embedded ? '' : 'h-full'}`}>
      {/* Header — flex-wrap so the right-side toolbar stays on one row even
          when the panel is narrow; left title truncates if needed. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
          {!embedded && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="h-7 w-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="접기"
              aria-label="접기"
            >
              ‹
            </button>
          )}
          <div className="ml-1 flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-sm font-semibold text-slate-900">X-ray</span>
            <span className="text-[11px] text-slate-500">{visit.visit_date}</span>
            <span className="text-[11px] text-slate-500">
              · CA {chronoAge != null ? chronoAge.toFixed(1) : '—'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onNationalityChange && (
            <div className="inline-flex overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
              {(['KR', 'CN'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onNationalityChange(code)}
                  className={
                    'px-2 py-1 text-[10px] font-semibold transition ' +
                    ((child.nationality ?? 'KR') === code
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50')
                  }
                  title={code === 'KR' ? '한국 표준' : '중국 표준'}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setZoomed(true)}
            title="크게 보기"
            aria-label="크게 보기"
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            ⤢
          </button>
          <button
            type="button"
            disabled={saving || !effectiveYounger || !effectiveOlder}
            onClick={handleSave}
            className="rounded bg-slate-900 px-3 py-1 text-[12px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {saving ? '저장 중…' : existing ? '재저장' : '저장'}
          </button>
        </div>
      </div>

      {/* Body — 3 panes. When embedded inside the 기본 정보 tab we let the
          aspect-ratio of the 3 panes define the natural height, so let the
          container grow freely instead of using flex-1 / min-h-0 (those need
          a constrained parent height). */}
      <div className={`p-3 ${embedded ? '' : 'min-h-0 flex-1 overflow-y-auto'}`}>
        {!atlas ? (
          <div className="py-8 text-center text-sm text-slate-500">Atlas 로딩 중…</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Younger */}
            <Pane
              label="younger"
              color="text-blue-600"
              caption={effectiveYounger ? formatLabel(effectiveYounger) : '—'}
              hint="← 이전 / → 다음"
            >
              {effectiveYounger ? (
                <AtlasImage file={effectiveYounger.file} alt={formatLabel(effectiveYounger)} />
              ) : (
                <Placeholder text="후보 없음" />
              )}
              <StepButtons canPrev={canStepDown} canNext={canStepUp} onStep={handleStep} />
            </Pane>

            {/* Patient — drag & drop + paste + editable bone age + predicted adult */}
            <PatientPane
              imageUrl={imageUrl}
              onFile={acceptFile}
              boneAge={effectiveBoneAge}
              midpointFallback={midpoint}
              onBoneAgeChange={setManualBoneAge}
              predictedAdult={predictedAdult}
              visitHeight={visitHeight}
            />

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
    {zoomed && (
      <ZoomModal
        onClose={() => setZoomed(false)}
        title={`X-ray · ${visit.visit_date} · ${child.name}`}
        maxWidth="min(1800px, 98vw)"
      >
        {/* Fit the three panes to the available modal area without
            overflowing: each pane keeps the atlas aspect ratio, 3 columns
            share the width, and the natural height of one pane drives the
            row. On wide monitors the images max out at 80vh so nothing is
            ever clipped. */}
        <div className="flex h-full w-full flex-col">
          <div className="mx-auto grid h-full max-h-[calc(90vh-72px)] w-full grid-cols-3 gap-4">
            <ZoomPane
              label="younger"
              color="text-blue-600"
              caption={effectiveYounger ? formatLabel(effectiveYounger) : '—'}
            >
              {effectiveYounger ? (
                <AtlasImage file={effectiveYounger.file} alt={formatLabel(effectiveYounger)} />
              ) : (
                <Placeholder text="후보 없음" />
              )}
              <StepButtons canPrev={canStepDown} canNext={canStepUp} onStep={handleStep} />
            </ZoomPane>
            <ZoomPane
              label="patient"
              color="text-slate-700"
              caption={effectiveBoneAge != null ? `${effectiveBoneAge.toFixed(1)}세` : '—'}
            >
              {imageUrl ? (
                <ZoomableImg src={imageUrl} alt="patient x-ray" />
              ) : (
                <Placeholder text="이미지 없음" />
              )}
            </ZoomPane>
            <ZoomPane
              label="older"
              color="text-rose-600"
              caption={effectiveOlder ? formatLabel(effectiveOlder) : '—'}
            >
              {effectiveOlder ? (
                <AtlasImage file={effectiveOlder.file} alt={formatLabel(effectiveOlder)} />
              ) : (
                <Placeholder text="더 큰 atlas 없음" />
              )}
            </ZoomPane>
          </div>
        </div>
      </ZoomModal>
    )}
    </>
  );
}

function ZoomPane({
  label,
  color,
  caption,
  children,
  footer,
}: {
  label: string;
  color: string;
  caption: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <div className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>
          {label}
        </div>
        <div className="text-[12px] font-medium text-slate-700">{caption}</div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded bg-slate-900 ring-1 ring-slate-200">
        {children}
      </div>
      {footer}
    </div>
  );
}

function Pane({
  label,
  color,
  caption,
  hint,
  children,
  footer,
}: {
  label: string;
  color: string;
  caption: string;
  hint?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
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
      {footer}
    </div>
  );
}

function StepButtons({
  canPrev,
  canNext,
  onStep,
}: {
  canPrev: boolean;
  canNext: boolean;
  onStep: (offset: number) => void;
}) {
  return (
    <>
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onStep(-1)}
        title="이전 (더 어린 나이)"
        aria-label="이전"
        className="pointer-events-auto absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-white/85 text-base font-bold text-slate-800 shadow-md backdrop-blur hover:bg-white disabled:opacity-30"
      >
        ←
      </button>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => onStep(+1)}
        title="다음 (더 큰 나이)"
        aria-label="다음"
        className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-white/85 text-base font-bold text-slate-800 shadow-md backdrop-blur hover:bg-white disabled:opacity-30"
      >
        →
      </button>
    </>
  );
}

function PatientPane({
  imageUrl,
  onFile,
  boneAge,
  midpointFallback,
  onBoneAgeChange,
  predictedAdult,
  visitHeight,
}: {
  imageUrl: string | null;
  onFile: (file: File) => void;
  boneAge: number | null;
  midpointFallback: number | null;
  onBoneAgeChange: (v: number | null) => void;
  predictedAdult: number | null;
  visitHeight: number | null;
}) {
  const [drag, setDrag] = useState(false);
  const [draft, setDraft] = useState<string>(boneAge != null ? boneAge.toFixed(1) : '');
  const { armed, wrapperProps } = usePasteTarget({
    onPaste: onFile,
    accept: (t) => t.startsWith('image/'),
  });

  useEffect(() => {
    setDraft(boneAge != null ? boneAge.toFixed(1) : '');
  }, [boneAge]);

  const handleFiles = (files: FileList | null | undefined) => {
    const f = files?.[0];
    if (f) onFile(f);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onBoneAgeChange(null); // revert to midpoint
      return;
    }
    const n = Number(trimmed);
    if (!Number.isNaN(n) && n > 0 && n < 25) onBoneAgeChange(Number(n.toFixed(1)));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-700">
        patient
      </div>
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
        className={`relative aspect-[800/1166] overflow-hidden rounded bg-slate-900 transition ${
          armed
            ? 'ring-4 ring-indigo-400 ring-offset-2 ring-offset-white'
            : drag
              ? 'ring-2 ring-blue-500'
              : 'ring-1 ring-slate-200'
        } ${imageUrl ? '' : 'cursor-pointer hover:ring-slate-400'}`}
      >
        {imageUrl ? (
          <ZoomableImg src={imageUrl} alt="환자 X-ray" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-200">
            <div className="text-sm font-medium">이미지 끌어다 놓기</div>
            <div className="text-[11px] text-slate-400">
              {armed ? 'Ctrl+V 로 붙여넣기' : '또는 클릭 후 Ctrl+V'}
            </div>
          </div>
        )}
        {armed && (
          <div className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            📋 붙여넣기 대기
          </div>
        )}
      </div>

      {/* Editable bone-age (defaults to midpoint of younger+older) */}
      {/* Bone age input (compact, centered). */}
      <div className="flex items-center justify-center gap-1 pt-1">
        <span className="text-[11px] whitespace-nowrap text-slate-500">뼈나이</span>
        <input
          type="number"
          step="0.1"
          min={0}
          max={25}
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder={midpointFallback != null ? midpointFallback.toFixed(1) : '—'}
          className="h-7 w-16 rounded border border-slate-200 bg-white px-2 text-center text-[13px] font-semibold text-slate-900 outline-none focus:border-slate-400"
        />
        <span className="text-[11px] text-slate-500">세</span>
      </div>

      {midpointFallback != null && boneAge != null && Math.abs(boneAge - midpointFallback) > 0.05 && (
        <button
          type="button"
          onClick={() => onBoneAgeChange(null)}
          className="text-center text-[10px] text-slate-400 hover:text-slate-600 hover:underline"
        >
          평균값 ({midpointFallback.toFixed(1)}) 으로 되돌리기
        </button>
      )}

      {/* Predicted adult height — full-width block at the bottom so the text
          stays horizontal even when the pane is narrow. */}
      <div className="mt-1 flex items-center justify-between gap-2 rounded border border-indigo-200 bg-indigo-50 px-2 py-1.5">
        <span className="text-[11px] font-medium whitespace-nowrap text-indigo-700">예측 성인키</span>
        {predictedAdult != null ? (
          <span className="whitespace-nowrap text-[14px] font-bold text-indigo-900">
            {predictedAdult.toFixed(1)}
            <span className="ml-0.5 text-[11px] font-normal text-indigo-700">cm</span>
          </span>
        ) : (
          <span className="text-[11px] whitespace-nowrap text-indigo-400">
            {visitHeight == null ? '키 필요' : '뼈나이 필요'}
          </span>
        )}
      </div>

    </div>
  );
}

function AtlasImage({ file, alt }: { file: string; alt: string }) {
  return <ZoomableImg src={`/atlas/${file}`} alt={alt} />;
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
      {text}
    </div>
  );
}
