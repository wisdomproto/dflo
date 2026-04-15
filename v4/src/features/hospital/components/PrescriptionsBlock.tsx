import { useEffect, useState } from 'react';
import type { Prescription, Medication } from '@/shared/types';
import {
  fetchPrescriptionsByVisit,
  createPrescription,
  deletePrescription,
} from '@/features/hospital/services/prescriptionService';
import { MedicationPicker } from './MedicationPicker';

export function PrescriptionsBlock({
  visitId,
  childId,
}: {
  visitId: string;
  childId: string;
}) {
  const [rows, setRows] = useState<Prescription[]>([]);
  const [medLabel, setMedLabel] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<{ id: string; m: Medication } | null>(null);
  const [dose, setDose] = useState('');
  const [freq, setFreq] = useState('');
  const [dur, setDur] = useState('');
  const [notes, setNotes] = useState('');

  async function reload() {
    const list = await fetchPrescriptionsByVisit(visitId);
    setRows(list);
  }
  useEffect(() => {
    reload();
  }, [visitId]);

  async function add() {
    if (!picked) return;
    await createPrescription({
      visit_id: visitId,
      child_id: childId,
      medication_id: picked.id,
      dose: dose || picked.m.default_dose,
      frequency: freq,
      duration_days: dur ? Number(dur) : undefined,
      notes,
    });
    setMedLabel((prev) => ({ ...prev, [picked.id]: `${picked.m.code} · ${picked.m.name}` }));
    setPicked(null);
    setDose('');
    setFreq('');
    setDur('');
    setNotes('');
    reload();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1 text-sm">
        {rows.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded border px-2 py-1"
          >
            <span>
              <span className="font-mono text-xs text-gray-500">
                {medLabel[p.medication_id] ?? p.medication_id}
              </span>
              {p.dose && <> · {p.dose}</>}
              {p.frequency && <> · {p.frequency}</>}
              {p.duration_days && <> · {p.duration_days}일</>}
            </span>
            <button
              onClick={async () => {
                if (confirm('처방 삭제?')) {
                  await deletePrescription(p.id);
                  reload();
                }
              }}
              className="text-xs text-red-500"
            >
              삭제
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs text-gray-400">처방 없음</li>}
      </ul>

      <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
        <div className="text-xs font-semibold">처방 추가</div>
        <MedicationPicker
          value={picked?.id ?? null}
          onChange={(id, m) => setPicked({ id, m })}
        />
        <div className="grid grid-cols-3 gap-2 text-xs">
          <input
            placeholder="용량"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            className="rounded border px-2 py-1"
          />
          <input
            placeholder="빈도 (1일 2회)"
            value={freq}
            onChange={(e) => setFreq(e.target.value)}
            className="rounded border px-2 py-1"
          />
          <input
            placeholder="기간 (일)"
            type="number"
            value={dur}
            onChange={(e) => setDur(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </div>
        <input
          placeholder="메모"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded border px-2 py-1 text-xs"
        />
        <button
          onClick={add}
          disabled={!picked}
          className="rounded bg-[#667eea] px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          + 추가
        </button>
      </div>
    </div>
  );
}
