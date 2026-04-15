import { useEffect, useState } from 'react';
import type { Medication } from '@/shared/types';
import {
  fetchMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from '@/features/hospital/services/medicationService';

export default function AdminMedicationsPage() {
  const [rows, setRows] = useState<Medication[]>([]);
  const [form, setForm] = useState({
    code: '',
    name: '',
    default_dose: '',
    unit: '',
    notes: '',
  });
  const [editing, setEditing] = useState<string | null>(null);

  async function reload() {
    setRows(await fetchMedications());
  }
  useEffect(() => {
    reload();
  }, []);

  async function submit() {
    if (!form.code || !form.name) return;
    if (editing) await updateMedication(editing, form);
    else await createMedication(form);
    setForm({ code: '', name: '', default_dose: '', unit: '', notes: '' });
    setEditing(null);
    reload();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-xl font-bold">약품 마스터</h1>
      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">{editing ? '수정' : '신규 등록'}</h2>
        <div className="grid grid-cols-5 gap-2 text-sm">
          <input
            placeholder="코드"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="rounded border px-2 py-1"
          />
          <input
            placeholder="약명"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded border px-2 py-1"
          />
          <input
            placeholder="기본 용량"
            value={form.default_dose}
            onChange={(e) => setForm((f) => ({ ...f, default_dose: e.target.value }))}
            className="rounded border px-2 py-1"
          />
          <input
            placeholder="단위"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            className="rounded border px-2 py-1"
          />
          <button onClick={submit} className="rounded bg-[#667eea] px-3 py-1 text-white">
            {editing ? '저장' : '등록'}
          </button>
        </div>
        <input
          placeholder="메모 (선택)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="mt-2 w-full rounded border px-2 py-1 text-sm"
        />
      </section>

      <section className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">코드</th>
              <th className="px-3 py-2 text-left">약명</th>
              <th className="px-3 py-2 text-left">기본 용량</th>
              <th className="px-3 py-2 text-left">단위</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className={m.is_active ? '' : 'opacity-40'}>
                <td className="px-3 py-2 font-mono">{m.code}</td>
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2">{m.default_dose ?? '-'}</td>
                <td className="px-3 py-2">{m.unit ?? '-'}</td>
                <td className="px-3 py-2">{m.is_active ? '활성' : '비활성'}</td>
                <td className="space-x-2 px-3 py-2 text-right">
                  <button
                    onClick={() => {
                      setEditing(m.id);
                      setForm({
                        code: m.code,
                        name: m.name,
                        default_dose: m.default_dose ?? '',
                        unit: m.unit ?? '',
                        notes: m.notes ?? '',
                      });
                    }}
                    className="text-xs text-[#667eea] hover:underline"
                  >
                    수정
                  </button>
                  {m.is_active && (
                    <button
                      onClick={async () => {
                        if (confirm('비활성화?')) {
                          await deleteMedication(m.id);
                          reload();
                        }
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      비활성화
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
