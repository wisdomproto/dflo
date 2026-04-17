// Left-column visit list for the admin patient detail page.
//   - full mode: inline height/weight inputs on each card + expandable scroll box
//   - rail mode: thin date-stamp strip (used when X-ray panel is open)

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLabTestsByVisit, createLabTest } from '@/features/hospital/services/labTestService';
import { fetchPrescriptionsByVisit } from '@/features/hospital/services/prescriptionService';
import { upsertMeasurementField } from '@/features/hospital/services/hospitalMeasurementService';
import { deleteVisit } from '@/features/hospital/services/visitService';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';
import { calculateAgeAtDate } from '@/shared/utils/age';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { usePasteTarget } from '@/shared/hooks/usePasteTarget';
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
  nationality?: 'KR' | 'CN';
  visits: Visit[];
  measurements: HospitalMeasurement[];
  selectedVisitId: string | null;
  onSelectVisit: (visitId: string | null) => void;
  onMeasurementChanged: (m: HospitalMeasurement) => void;
  /** Parent refreshes the visits list after a row is removed. */
  onVisitDeleted?: () => void;
  collapsed?: boolean;
}

function aiPredictedHeight(
  m: HospitalMeasurement | undefined,
  gender: Gender,
  nationality: 'KR' | 'CN' = 'KR',
): number | null {
  if (!m?.height || !m?.bone_age) return null;
  const v = predictAdultHeightByBonePercentile(
    m.height,
    m.bone_age,
    gender === 'male' ? 'M' : 'F',
    nationality,
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
  nationality = 'KR',
  visits,
  measurements,
  selectedVisitId,
  onSelectVisit,
  onMeasurementChanged,
  onVisitDeleted,
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
        const isSelected = selectedVisitId === v.id;
        return (
          <li
            key={v.id}
            className={`group relative overflow-hidden rounded-lg border bg-white transition-colors ${
              isSelected
                ? 'border-indigo-400 ring-2 ring-indigo-100'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectVisit(v.id)}
              aria-pressed={isSelected}
              className="flex w-full items-baseline gap-2 px-3 py-2.5 text-left"
            >
              <span
                className={
                  'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ' +
                  (isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')
                }
              >
                #{idx}
              </span>
              <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                {v.visit_date}
              </span>
            </button>
            <button
              type="button"
              title="진료 기록 삭제"
              aria-label="진료 기록 삭제"
              onClick={async (e) => {
                e.stopPropagation();
                const ok = window.confirm(
                  `${v.visit_date} 진료 기록을 삭제하시겠습니까?\n` +
                    `측정, X-ray, 검사, 처방 등 해당 회차의 모든 데이터가 함께 삭제됩니다.`,
                );
                if (!ok) return;
                try {
                  await deleteVisit(v.id);
                  if (selectedVisitId === v.id) onSelectVisit(null);
                  onVisitDeleted?.();
                } catch (err) {
                  logger.error('delete visit failed', err);
                  alert('삭제에 실패했습니다.');
                }
              }}
              className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded p-1 text-red-400 shadow-sm ring-1 ring-red-100 hover:bg-red-50 hover:text-red-600 group-hover:inline-flex"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
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
        className="h-8 w-[78px] rounded border border-slate-200 bg-white pr-6 pl-1.5 text-right text-[12px] text-slate-900 outline-none focus:border-slate-400"
      />
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
        {suffix}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-[13px] font-semibold text-slate-900">{value}</span>
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
    const arr = files ? Array.from(files) : [];
    arr.forEach((f) => {
      void upload(f);
    });
  };

  const { armed, wrapperProps } = usePasteTarget({ onPaste: (f) => void upload(f) });

  return (
    <div className="py-1">
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
        className={`cursor-pointer rounded border border-dashed px-3 py-2 text-center text-[11px] transition ${
          armed
            ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100'
            : drag
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-slate-300 text-slate-500 hover:border-slate-400'
        }`}
      >
        {uploading
          ? '업로드 중…'
          : armed
            ? '📋 붙여넣기 대기 중 — Ctrl+V'
            : '📎 검사 파일 첨부 (드래그 · 클릭 후 붙여넣기)'}
      </div>
    </div>
  );
}
