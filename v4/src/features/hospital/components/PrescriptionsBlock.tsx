import { useEffect, useMemo, useRef, useState } from 'react';
import type { Medication, Prescription } from '@/shared/types';
import {
  fetchPrescriptionsByVisit,
  createPrescription,
  deletePrescription,
} from '@/features/hospital/services/prescriptionService';
import { fetchMedications } from '@/features/hospital/services/medicationService';

interface Props {
  visitId: string;
  childId: string;
}

/**
 * Simplified prescription editor. One row = 약품(검색/표시 겸용) · 용량 · 메모.
 * - 약품 칸은 검색어 입력과 선택된 약품 표시를 하나의 input으로 통합한다.
 *   선택 후에도 돋보기 아이콘으로 다시 검색이 가능하다.
 * - 기존 처방 목록은 같은 레이아웃의 읽기전용 행으로 표시.
 */
export function PrescriptionsBlock({ visitId, childId }: Props) {
  const [rows, setRows] = useState<Prescription[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const medById = useMemo(() => {
    const m = new Map<string, Medication>();
    meds.forEach((x) => m.set(x.id, x));
    return m;
  }, [meds]);

  const reload = async () => {
    const list = await fetchPrescriptionsByVisit(visitId);
    setRows(list);
  };

  useEffect(() => {
    reload();
  }, [visitId]);
  useEffect(() => {
    fetchMedications({ activeOnly: true }).then(setMeds);
  }, []);

  // "Add new" row state
  const [picked, setPicked] = useState<Medication | null>(null);
  const [dose, setDose] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!picked) return;
    await createPrescription({
      visit_id: visitId,
      child_id: childId,
      medication_id: picked.id,
      dose: dose || picked.default_dose,
      notes,
    });
    setPicked(null);
    setDose('');
    setNotes('');
    reload();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Existing prescriptions — read-only rows */}
      {rows.length === 0 ? (
        <div className="text-xs text-slate-400">처방 없음</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((p) => {
            const med = medById.get(p.medication_id);
            const label = med ? `${med.code} · ${med.name}` : p.medication_id;
            return (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(160px,1fr)_90px_minmax(120px,2fr)_28px] items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                <span className="truncate text-slate-800">{label}</span>
                <span className="truncate text-slate-700">{p.dose ?? '—'}</span>
                <span className="truncate text-slate-600">{p.notes ?? ''}</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('처방 삭제?')) {
                      await deletePrescription(p.id);
                      reload();
                    }
                  }}
                  title="삭제"
                  aria-label="삭제"
                  className="justify-self-end rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add row — 약품 검색 겸 표시 | 용량 | 메모 | 추가 */}
      <div className="grid grid-cols-[minmax(160px,1fr)_90px_minmax(120px,2fr)_auto] items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-2 py-1.5">
        <MedicationSearchCombo value={picked} onChange={setPicked} options={meds} />
        <input
          placeholder="용량"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
        <input
          placeholder="메모"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!picked}
          className="h-8 rounded-md bg-violet-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + 추가
        </button>
      </div>
    </div>
  );
}

/**
 * Combined search / display field for medications. Shows a magnifying-glass
 * icon on the left. Typing opens a dropdown of matches; picking one replaces
 * the text with "code · name". Clicking the icon (or focusing) clears the
 * selection and re-opens the search.
 */
function MedicationSearchCombo({
  value,
  onChange,
  options,
}: {
  value: Medication | null;
  onChange: (m: Medication | null) => void;
  options: Medication[];
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 20);
    return options
      .filter((m) => m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [options, query]);

  const displayText = value ? `${value.code} · ${value.name}` : '';

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white pl-2 pr-1 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery('');
            setOpen(true);
          }}
          title="약품 검색"
          aria-label="약품 검색"
          className="mr-1 shrink-0 text-slate-400 hover:text-slate-700"
        >
          🔍
        </button>
        <input
          type="text"
          value={value ? displayText : query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            if (value) onChange(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="약품 검색 (코드 / 이름)"
          className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      {open && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-slate-400">일치하는 약품 없음</li>
          )}
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(m);
                  setQuery('');
                  setOpen(false);
                }}
                className="flex w-full items-baseline gap-1 px-2 py-1.5 text-left text-sm hover:bg-violet-50"
              >
                <span className="font-mono text-xs text-slate-500">{m.code}</span>
                <span className="text-slate-900">· {m.name}</span>
                {m.default_dose && (
                  <span className="ml-auto text-xs text-slate-400">
                    {m.default_dose}
                    {m.unit ?? ''}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
