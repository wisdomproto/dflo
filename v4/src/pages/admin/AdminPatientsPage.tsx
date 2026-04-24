import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchPatients,
  createPatient,
  deletePatient,
  type PatientWithParent,
} from '@/features/admin/services/adminService';
import { useUIStore } from '@/stores/uiStore';
import GenderIcon from '@/shared/components/GenderIcon';
import type { Gender } from '@/shared/types';
import {
  classifyPatient,
  CATEGORY_ORDER,
  PATIENT_CATEGORIES,
  type PatientCategoryId,
} from '@/features/admin/utils/patientCategories';
import { regionSortKey } from '@/features/admin/utils/region';

export default function AdminPatientsPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [patients, setPatients] = useState<PatientWithParent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<PatientCategoryId>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Precompute categories per patient once per list load.
  const categoriesById = useMemo(() => {
    const map = new Map<string, PatientCategoryId[]>();
    for (const p of patients) map.set(p.id, classifyPatient(p));
    return map;
  }, [patients]);

  // Count patients per category for the filter chip badges.
  const categoryCounts = useMemo(() => {
    const counts: Record<PatientCategoryId, number> = {
      parents_short: 0, slow_growth: 0, precocious: 0, inflammation: 0,
      late_start: 0, preterm: 0, picky_eating: 0, sleep_deficit: 0,
    };
    for (const cats of categoriesById.values()) {
      for (const c of cats) counts[c]++;
    }
    return counts;
  }, [categoriesById]);

  // Apply category filter client-side (name/chart search is still server-side).
  const filteredPatients = useMemo(() => {
    if (!activeCategories.size) return patients;
    return patients.filter((p) => {
      const cats = categoriesById.get(p.id) ?? [];
      // AND semantics: must match all active filters
      for (const needed of activeCategories) if (!cats.includes(needed)) return false;
      return true;
    });
  }, [patients, categoriesById, activeCategories]);

  // Column sorting — chart / name / region / first visit / last visit / categories / measurements / labs / status.
  type SortKey =
    | 'chart'
    | 'name'
    | 'region'
    | 'firstVisit'
    | 'lastVisit'
    | 'categories'
    | 'measurements'
    | 'labs'
    | 'status';
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);

  const sortedPatients = useMemo(() => {
    if (!sort) return filteredPatients;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const toNum = (v: unknown) => {
      const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : NaN;
      return Number.isFinite(n) ? n : NaN;
    };
    const keyOf = (p: PatientWithParent): number | string => {
      switch (sort.key) {
        case 'chart': {
          const n = toNum(p.chart_number);
          // Prefer numeric sort when chart is numeric; fallback to string.
          return Number.isFinite(n) ? n : p.chart_number ?? '';
        }
        case 'name':
          return p.name ?? '';
        case 'region':
          return regionSortKey(p.region);
        case 'firstVisit':
          // '' sorts before any valid date — push blanks to the bottom regardless of dir.
          return p.firstVisitDate ?? (dir === 1 ? '￿' : '');
        case 'lastVisit':
          return p.lastVisitDate ?? (dir === 1 ? '￿' : '');
        case 'categories':
          return (categoriesById.get(p.id) ?? []).length;
        case 'measurements':
          return p.measurementCount ?? 0;
        case 'labs':
          return p.labCount ?? 0;
        case 'status':
          return p.is_active ? 1 : 0;
      }
    };
    return [...filteredPatients].sort((a, b) => {
      const av = keyOf(a);
      const bv = keyOf(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'ko') * dir;
    });
  }, [filteredPatients, sort, categoriesById]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // third click clears
    });
  };

  const sortIndicator = (key: SortKey) => {
    if (!sort || sort.key !== key) return ' ⇅';
    return sort.dir === 'asc' ? ' ▲' : ' ▼';
  };

  const toggleCategory = (id: PatientCategoryId) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (p: PatientWithParent) => {
    const ok = window.confirm(
      `#${p.chart_number} ${p.name} 환자를 삭제하시겠습니까?\n` +
        `모든 진료 기록(측정, X-ray, 검사, 처방)이 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`,
    );
    if (!ok) return;
    try {
      await deletePatient(p.id);
      addToast('success', '환자를 삭제했습니다');
      loadPatients(search);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '삭제 실패');
    }
  };

  useEffect(() => {
    loadPatients('');
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => loadPatients(search), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  async function loadPatients(q: string) {
    try {
      setLoading(true);
      const data = await fetchPatients(q || undefined);
      setPatients(data);
    } catch {
      addToast('error', '환자 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }

  function CategoryBadges({ ids, compact }: { ids: PatientCategoryId[]; compact?: boolean }) {
    if (!ids.length) return <span className="text-gray-300 text-xs">-</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => {
          const cat = PATIENT_CATEGORIES[id];
          return (
            <span
              key={id}
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cat.color}`}
              title={cat.label}
            >
              <span>{cat.emoji}</span>
              {!compact && <span>{cat.label}</span>}
            </span>
          );
        })}
      </div>
    );
  }

  function StatusBadge({ active }: { active: boolean }) {
    return active
      ? <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">활성</span>
      : <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">비활성</span>;
  }

  function RegionBadge({ patient }: { patient: PatientWithParent }) {
    const r = patient.region;
    if (!r) return <span className="text-gray-300 text-xs">-</span>;
    if (r.district) {
      return (
        <span className="inline-flex items-center gap-1">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
            서울
          </span>
          <span className="text-xs text-slate-800">{r.district}</span>
        </span>
      );
    }
    return (
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
        {r.metro}
      </span>
    );
  }

  function formatVisitDate(iso: string | undefined) {
    if (!iso) return <span className="text-gray-300">-</span>;
    return <span className="font-mono text-xs text-slate-700">{iso}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">환자 관리</h1>
        {!loading && (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
            {filteredPatients.length}
            {activeCategories.size > 0 && (
              <span className="text-blue-500/70"> / {patients.length}</span>
            )}
          </span>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            + 환자 추가
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="환자번호 또는 이름 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
      />

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_ORDER.map((id) => {
          const cat = PATIENT_CATEGORIES[id];
          const active = activeCategories.has(id);
          const count = categoryCounts[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleCategory(id)}
              className={
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ' +
                (active
                  ? cat.color.replace('border-', 'ring-2 ring-') + ' shadow-sm'
                  : cat.color + ' opacity-70 hover:opacity-100')
              }
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className="ml-0.5 rounded-full bg-white/70 px-1.5 text-[10px] font-semibold">
                {count}
              </span>
            </button>
          );
        })}
        {activeCategories.size > 0 && (
          <button
            type="button"
            onClick={() => setActiveCategories(new Set())}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            초기화
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            불러오는 중...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            {patients.length === 0
              ? '등록된 환자가 없습니다'
              : '선택한 카테고리에 해당하는 환자가 없습니다'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden lg:table w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase select-none">
                <tr>
                  <th
                    onClick={() => toggleSort('chart')}
                    className="cursor-pointer px-4 py-3 text-left hover:text-slate-700"
                  >
                    환자번호{sortIndicator('chart')}
                  </th>
                  <th
                    onClick={() => toggleSort('name')}
                    className="cursor-pointer px-4 py-3 text-left hover:text-slate-700"
                  >
                    환자{sortIndicator('name')}
                  </th>
                  <th
                    onClick={() => toggleSort('region')}
                    className="cursor-pointer px-4 py-3 text-left hover:text-slate-700"
                  >
                    주소{sortIndicator('region')}
                  </th>
                  <th
                    onClick={() => toggleSort('firstVisit')}
                    className="cursor-pointer px-4 py-3 text-left hover:text-slate-700"
                  >
                    최초 내원{sortIndicator('firstVisit')}
                  </th>
                  <th
                    onClick={() => toggleSort('lastVisit')}
                    className="cursor-pointer px-4 py-3 text-left hover:text-slate-700"
                  >
                    최근 내원{sortIndicator('lastVisit')}
                  </th>
                  <th
                    onClick={() => toggleSort('categories')}
                    className="cursor-pointer px-4 py-3 text-left hover:text-slate-700"
                  >
                    카테고리{sortIndicator('categories')}
                  </th>
                  <th
                    onClick={() => toggleSort('measurements')}
                    className="cursor-pointer px-4 py-3 text-center hover:text-slate-700"
                  >
                    측정 수{sortIndicator('measurements')}
                  </th>
                  <th
                    onClick={() => toggleSort('labs')}
                    className="cursor-pointer px-4 py-3 text-center hover:text-slate-700"
                  >
                    Lab{sortIndicator('labs')}
                  </th>
                  <th
                    onClick={() => toggleSort('status')}
                    className="cursor-pointer px-4 py-3 text-center hover:text-slate-700"
                  >
                    상태{sortIndicator('status')}
                  </th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPatients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/admin/patients/${p.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900">
                      #{p.chart_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span className="inline-flex items-center gap-1.5">
                        <GenderIcon gender={p.gender as Gender} size="sm" />
                        {p.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RegionBadge patient={p} />
                    </td>
                    <td className="px-4 py-3">{formatVisitDate(p.firstVisitDate)}</td>
                    <td className="px-4 py-3">{formatVisitDate(p.lastVisitDate)}</td>
                    <td className="px-4 py-3">
                      <CategoryBadges ids={categoriesById.get(p.id) ?? []} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
                        {p.measurementCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          'px-2 py-0.5 text-xs font-medium rounded-full ' +
                          ((p.labCount ?? 0) > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-400')
                        }
                      >
                        {p.labCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge active={p.is_active} /></td>
                    <td className="px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p);
                        }}
                        title="환자 삭제"
                        aria-label="환자 삭제"
                        className="rounded p-1.5 text-red-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="lg:hidden divide-y divide-gray-100">
              {sortedPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/admin/patients/${p.id}`)}
                  className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 cursor-pointer"
                >
                  <GenderIcon gender={p.gender as Gender} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-500">
                        #{p.chart_number}
                      </span>
                      <span className="font-medium text-gray-900 truncate">{p.name}</span>
                      <StatusBadge active={p.is_active} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <RegionBadge patient={p} />
                      {p.lastVisitDate && (
                        <span className="font-mono">최근 {p.lastVisitDate}</span>
                      )}
                    </div>
                    <div className="mt-1">
                      <CategoryBadges ids={categoriesById.get(p.id) ?? []} compact />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-600">
                      측정 {p.measurementCount ?? 0}
                    </span>
                    <span
                      className={
                        'px-2 py-0.5 text-[10px] font-medium rounded-full ' +
                        ((p.labCount ?? 0) > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-400')
                      }
                    >
                      Lab {p.labCount ?? 0}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p);
                    }}
                    title="환자 삭제"
                    aria-label="환자 삭제"
                    className="ml-1 shrink-0 rounded p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {addOpen && (
        <AddPatientModal
          onClose={() => setAddOpen(false)}
          onCreated={(id) => {
            setAddOpen(false);
            loadPatients(search);
            navigate(`/admin/patients/${id}`);
          }}
        />
      )}
    </div>
  );
}

function AddPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const [chartNumber, setChartNumber] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    chartNumber.trim() !== '' && name.trim() !== '' && birthDate !== '' && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const child = await createPatient({
        chart_number: chartNumber.trim(),
        name: name.trim(),
        gender,
        birth_date: birthDate,
      });
      onCreated(child.id);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '환자 생성 실패');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">새 환자 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            환자번호 *
            <input
              autoFocus
              value={chartNumber}
              onChange={(e) => setChartNumber(e.target.value)}
              placeholder="예) 3177"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            이름 *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <div className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            성별 *
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={
                  'flex-1 px-3 py-1.5 text-xs font-semibold ' +
                  (gender === 'male' ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')
                }
              >
                남
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={
                  'flex-1 border-l border-slate-200 px-3 py-1.5 text-xs font-semibold ' +
                  (gender === 'female' ? 'bg-pink-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')
                }
              >
                여
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            생년월일 *
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? '생성 중…' : '환자 추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
