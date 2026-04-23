import { useEffect, useMemo, useState } from 'react';
import type { Medication } from '@/shared/types';
import {
  fetchMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from '@/features/hospital/services/medicationService';

const CATS = ['ALL', 'MED', 'INJ', 'PRO'] as const;
type Cat = (typeof CATS)[number];
const CAT_LABEL: Record<Cat, string> = {
  ALL: '전체',
  MED: '처방약',
  INJ: '주사',
  PRO: '시술',
};

function prefixOf(code: string): Cat {
  if (code.startsWith('INJ')) return 'INJ';
  if (code.startsWith('PRO')) return 'PRO';
  if (code.startsWith('MED')) return 'MED';
  return 'MED';
}

export default function AdminMedicationsPage() {
  const [rows, setRows] = useState<Medication[]>([]);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Cat>('ALL');
  const [form, setForm] = useState({
    code: '',
    name: '',
    default_dose: '',
    unit: '',
    notes: '',
  });
  const [editing, setEditing] = useState<string | null>(null);

  async function reload() {
    setRows(await fetchMedications({ activeOnly: true }));
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((m) => {
      if (cat !== 'ALL' && prefixOf(m.code) !== cat) return false;
      if (!q) return true;
      return (
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.default_dose ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, cat]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: rows.length, MED: 0, INJ: 0, PRO: 0 };
    for (const m of rows) out[prefixOf(m.code)]++;
    return out;
  }, [rows]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">약품 마스터</h1>
        <div className="text-sm text-gray-500">총 {rows.length}개</div>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">{editing ? '수정' : '신규 등록'}</h2>
        <div className="grid grid-cols-5 gap-2 text-sm">
          <input
            placeholder="코드 (예: MED0042)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="rounded border px-2 py-1 font-mono"
          />
          <input
            placeholder="약명"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded border px-2 py-1"
          />
          <input
            placeholder="기본 용량 (예: 1.0)"
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
          <button
            onClick={submit}
            className="rounded bg-[#667eea] px-3 py-1 text-white hover:bg-[#5568d3]"
          >
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
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <input
            placeholder="코드 / 약명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-[200px] rounded border px-3 py-1.5 text-sm"
            autoFocus
          />
          <div className="flex gap-1 text-xs">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full px-3 py-1 ${
                  cat === c
                    ? 'bg-[#667eea] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CAT_LABEL[c]} ({counts[c] ?? 0})
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400">{filtered.length}개 표시</div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">코드</th>
                <th className="px-3 py-2 text-left">약명</th>
                <th className="px-3 py-2 text-left">기본 용량</th>
                <th className="px-3 py-2 text-left">단위</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{m.code}</td>
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2">{m.default_dose ?? '-'}</td>
                  <td className="px-3 py-2">{m.unit ?? '-'}</td>
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
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs text-[#667eea] hover:underline"
                    >
                      수정
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`"${m.name}" 삭제?`)) {
                          await deleteMedication(m.id);
                          reload();
                        }
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    일치하는 약품이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
