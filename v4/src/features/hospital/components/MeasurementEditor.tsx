import { useState } from 'react';
import type { HospitalMeasurement } from '@/shared/types';
import {
  createMeasurement,
  updateMeasurement,
} from '@/features/hospital/services/hospitalMeasurementService';

interface Props {
  visitId: string;
  childId: string;
  measurement: HospitalMeasurement | null;
  onSaved: (m: HospitalMeasurement) => void;
}

export function MeasurementEditor({ visitId, childId, measurement, onSaved }: Props) {
  const [height, setHeight] = useState(measurement?.height?.toString() ?? '');
  const [weight, setWeight] = useState(measurement?.weight?.toString() ?? '');
  const [boneAge, setBoneAge] = useState(measurement?.bone_age?.toString() ?? '');
  const [pah, setPah] = useState(measurement?.pah?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        visit_id: visitId,
        child_id: childId,
        measured_date: measurement?.measured_date ?? new Date().toISOString().slice(0, 10),
        height: Number(height),
        weight: weight ? Number(weight) : undefined,
        bone_age: boneAge ? Number(boneAge) : undefined,
        pah: pah ? Number(pah) : undefined,
      };
      const saved = measurement
        ? await updateMeasurement(measurement.id, payload)
        : await createMeasurement(payload);
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
      <label className="text-sm">
        키 (cm)
        <input
          type="number"
          step="0.1"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        몸무게 (kg)
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        뼈나이 (세)
        <input
          type="number"
          step="0.1"
          value={boneAge}
          onChange={(e) => setBoneAge(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        PAH (cm)
        <input
          type="number"
          step="0.1"
          value={pah}
          onChange={(e) => setPah(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <div className="col-span-2 text-right">
        <button
          type="button"
          onClick={save}
          disabled={saving || !height}
          className="rounded bg-[#667eea] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}
