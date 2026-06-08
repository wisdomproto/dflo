import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchPatients,
  createPatient,
  deletePatient,
  fetchChildByChartNumber,
  type PatientWithParent,
} from '@/features/admin/services/adminService';
import { fetchVisitsForChild, createVisit } from '@/features/hospital/services/visitService';
import { createMeasurement } from '@/features/hospital/services/hospitalMeasurementService';
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
import { countryFlag, countryLabel } from '@/shared/data/countries';
import { fetchStoryChildIds } from '@/features/admin/services/patientStoryService';
import PatientStoryModal from '@/features/admin/components/PatientStoryModal';
import { useFavoritePatients } from '@/features/admin/hooks/useFavoritePatients';
import { updateChildField } from '@/features/hospital/services/intakeSurveyService';
import { TREATMENT_STAGES, type TreatmentStatus } from '@/shared/utils/treatmentStage';

// 국가 탭 순서 — 한국 클리닉 기준 + 동남아/미국 확장.
// 한국 탭은 국적 미설정 환자도 포함 (filteredPatients 참조).
const COUNTRY_TABS = ['KR', 'TH', 'MY', 'ID', 'VN', 'US'] as const;

export default function AdminPatientsPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [patients, setPatients] = useState<PatientWithParent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [dataEntryOpen, setDataEntryOpen] = useState(false);
  // "환자 데이터 입력"에서 없는 번호로 새 환자 등록할 때 환자번호 미리 채움.
  const [prefillChart, setPrefillChart] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<PatientCategoryId>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>(''); // '' = 전체
  const [stageFilter, setStageFilter] = useState<TreatmentStatus | ''>(''); // '' = 전체 단계
  const [storyChildIds, setStoryChildIds] = useState<Set<string>>(new Set());
  const [storyOpenFor, setStoryOpenFor] = useState<PatientWithParent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { favorites, isFavorite, toggle: toggleFavorite } = useFavoritePatients();

  // Precompute categories per patient once per list load.
  const categoriesById = useMemo(() => {
    const map = new Map<string, PatientCategoryId[]>();
    for (const p of patients) map.set(p.id, classifyPatient(p, p.clinical));
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

  // Apply category + favorites filter client-side (name/chart search is still
  // server-side). 즐겨찾기 토글이 켜져 있으면 favorites 집합에 있는 환자만,
  // 카테고리 칩과 조합 시 AND 의미.
  const filteredPatients = useMemo(() => {
    let list = patients;
    if (favoritesOnly) list = list.filter((p) => favorites.has(p.id));
    if (countryFilter) {
      // 한국 탭은 국적 미설정 환자(기존 244명 다수)도 포함 — 한국 클리닉 기본값.
      list = list.filter((p) => {
        const c = p.country ?? '';
        return countryFilter === 'KR' ? c === 'KR' || c === '' : c === countryFilter;
      });
    }
    if (stageFilter) {
      list = list.filter((p) => (p.treatment_status ?? 'consultation') === stageFilter);
    }
    if (activeCategories.size) {
      list = list.filter((p) => {
        const cats = categoriesById.get(p.id) ?? [];
        for (const needed of activeCategories) if (!cats.includes(needed)) return false;
        return true;
      });
    }
    return list;
  }, [patients, categoriesById, activeCategories, favoritesOnly, favorites, countryFilter, stageFilter]);

  // 단계별 건수 (필터칩 배지) — 미설정은 상담으로 집계.
  const stageCounts = useMemo(() => {
    const c: Record<TreatmentStatus, number> = { consultation: 0, treatment: 0, completed: 0 };
    for (const p of patients) c[(p.treatment_status ?? 'consultation') as TreatmentStatus]++;
    return c;
  }, [patients]);

  // 단계 변경 — 낙관적 업데이트 후 실패 시 롤백.
  async function changeStage(p: PatientWithParent, val: TreatmentStatus) {
    const prev = p.treatment_status;
    setPatients((list) => list.map((x) => (x.id === p.id ? { ...x, treatment_status: val } : x)));
    try {
      await updateChildField(p.id, { treatment_status: val });
    } catch {
      setPatients((list) => list.map((x) => (x.id === p.id ? { ...x, treatment_status: prev } : x)));
      addToast('error', '단계 변경에 실패했습니다');
    }
  }

  // 국가 탭 건수 — 한국 = KR + 국적 미설정, 그 외는 해당 코드.
  const countryCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = Object.fromEntries(
      COUNTRY_TABS.map((c) => [c, 0]),
    );
    for (const p of patients) {
      const c = p.country ?? '';
      if (c === '' || c === 'KR') counts.KR++;
      else if (c in counts) counts[c]++;
    }
    return { all: patients.length, ...counts };
  }, [patients]);

  // Column sorting — chart / name / region / first visit / last visit / categories / measurements / labs.
  type SortKey =
    | 'chart'
    | 'name'
    | 'region'
    | 'firstVisit'
    | 'lastVisit'
    | 'categories'
    | 'measurements'
    | 'labs';
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);

  const sortedPatients = useMemo(() => {
    // 사용자가 컬럼 헤더를 안 눌렀을 때의 기본 정렬: 측정 수 내림차순,
    // 동률이면 최근 내원 내림차순 (최신이 위). 즐겨찾기는 필터로 보는
    // 거라 정렬에는 영향 없음.
    if (!sort) {
      return [...filteredPatients].sort((a, b) => {
        const ma = a.measurementCount ?? 0;
        const mb = b.measurementCount ?? 0;
        if (mb !== ma) return mb - ma;
        const la = a.lastVisitDate ?? '';
        const lb = b.lastVisitDate ?? '';
        return lb.localeCompare(la);
      });
    }
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
    fetchStoryChildIds().then(setStoryChildIds).catch(() => {});
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

  // 치료 단계 인라인 선택 (상담 / 치료 중 / 완료). 행 클릭(네비)과 분리.
  function StageSelect({ p }: { p: PatientWithParent }) {
    const cur = (p.treatment_status ?? 'consultation') as TreatmentStatus;
    const stage = TREATMENT_STAGES.find((s) => s.value === cur)!;
    return (
      <select
        value={cur}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          changeStage(p, e.target.value as TreatmentStatus);
        }}
        title="치료 단계 변경"
        className={'cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-medium outline-none ' + stage.badge}
      >
        {TREATMENT_STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    );
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
        <div className="ml-auto flex flex-col items-stretch gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPrefillChart('');
              setAddOpen(true);
            }}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            + 환자 추가
          </button>
          <button
            type="button"
            onClick={() => setDataEntryOpen(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            ＋ 환자 데이터 입력
          </button>
        </div>
      </div>

      {/* 국가별 탭 */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
        {[
          { value: '', label: '🌐 전체', count: countryCounts.all },
          ...COUNTRY_TABS.map((code) => ({
            value: code as string,
            label: countryLabel(code),
            count: countryCounts[code],
          })),
        ].map((t) => {
          const active = countryFilter === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setCountryFilter(t.value)}
              className={
                'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ' +
                (active
                  ? 'border-indigo-500 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700')
              }
            >
              <span>{t.label}</span>
              <span
                className={
                  'rounded-full px-1.5 text-[10px] font-semibold ' +
                  (active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500')
                }
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="환자번호 또는 이름 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
      />

      {/* Filter chips: favorites + categories */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          className={
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ' +
            (favoritesOnly
              ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300 shadow-sm'
              : 'border border-amber-200 bg-amber-50 text-amber-700 opacity-80 hover:opacity-100')
          }
          title="즐겨찾기한 환자만 보기"
        >
          <span>{favoritesOnly ? '⭐' : '☆'}</span>
          <span>즐겨찾기</span>
          <span className="ml-0.5 rounded-full bg-white/70 px-1.5 text-[10px] font-semibold">
            {favorites.size}
          </span>
        </button>
        {/* 치료 단계 필터 */}
        <span className="mx-0.5 h-4 w-px bg-slate-200" aria-hidden />
        {TREATMENT_STAGES.map((s) => {
          const active = stageFilter === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setStageFilter(active ? '' : s.value)}
              className={
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ' +
                (active ? s.active + ' shadow-sm' : s.badge + ' opacity-70 hover:opacity-100')
              }
            >
              <span>{s.label}</span>
              <span className="ml-0.5 rounded-full bg-white/70 px-1.5 text-[10px] font-semibold">
                {stageCounts[s.value]}
              </span>
            </button>
          );
        })}
        <span className="mx-0.5 h-4 w-px bg-slate-200" aria-hidden />
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
        {(activeCategories.size > 0 || favoritesOnly || countryFilter || stageFilter) && (
          <button
            type="button"
            onClick={() => {
              setActiveCategories(new Set());
              setFavoritesOnly(false);
              setCountryFilter('');
              setStageFilter('');
            }}
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
                  <th className="px-2 py-3 text-center w-8" title="즐겨찾기">⭐</th>
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
                  <th className="px-4 py-3 text-center">단계</th>
                  <th className="px-3 py-3 text-center">스토리</th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPatients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/admin/patients/${p.id}`)}
                    className={
                      'group cursor-pointer transition-colors hover:bg-gray-50 ' +
                      (p.treatment_status === 'completed' ? 'opacity-50' : '')
                    }
                  >
                    <td className="px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(p.id);
                        }}
                        title={isFavorite(p.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        aria-label="즐겨찾기 토글"
                        className={
                          'inline-flex h-7 w-7 items-center justify-center rounded transition ' +
                          (isFavorite(p.id)
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:bg-slate-100 hover:text-amber-400')
                        }
                      >
                        {isFavorite(p.id) ? '★' : '☆'}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900">
                      #{p.chart_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span className="inline-flex items-center gap-1.5">
                        <GenderIcon gender={p.gender as Gender} size="sm" />
                        {p.name}
                        {countryFlag(p.country) && (
                          <span title={countryLabel(p.country)}>{countryFlag(p.country)}</span>
                        )}
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
                    <td className="px-4 py-3 text-center"><StageSelect p={p} /></td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStoryOpenFor(p);
                        }}
                        title={storyChildIds.has(p.id) ? '스토리 보기' : '스토리 없음 (클릭으로 상태 확인)'}
                        aria-label="환자 스토리 보기"
                        className={
                          'inline-flex items-center justify-center rounded-full px-2 py-1 text-base transition ' +
                          (storyChildIds.has(p.id)
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-slate-50 text-slate-300 hover:bg-slate-100')
                        }
                      >
                        📖
                      </button>
                    </td>
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
                  className={
                    'flex items-center gap-3 px-4 py-3 active:bg-gray-50 cursor-pointer ' +
                    (p.treatment_status === 'completed' ? 'opacity-50' : '')
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(p.id);
                    }}
                    title={isFavorite(p.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    aria-label="즐겨찾기 토글"
                    className={
                      'shrink-0 rounded p-1 text-lg ' +
                      (isFavorite(p.id) ? 'text-amber-500' : 'text-slate-300')
                    }
                  >
                    {isFavorite(p.id) ? '★' : '☆'}
                  </button>
                  <GenderIcon gender={p.gender as Gender} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-500">
                        #{p.chart_number}
                      </span>
                      <span className="font-medium text-gray-900 truncate">{p.name}</span>
                      {countryFlag(p.country) && (
                        <span title={countryLabel(p.country)}>{countryFlag(p.country)}</span>
                      )}
                      <StageSelect p={p} />
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
                      setStoryOpenFor(p);
                    }}
                    title={storyChildIds.has(p.id) ? '스토리 보기' : '스토리 없음'}
                    aria-label="환자 스토리 보기"
                    className={
                      'ml-1 shrink-0 rounded p-2 text-lg ' +
                      (storyChildIds.has(p.id) ? 'text-amber-600' : 'text-slate-300')
                    }
                  >
                    📖
                  </button>
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
          initialChartNumber={prefillChart}
          onClose={() => setAddOpen(false)}
          onCreated={(id) => {
            setAddOpen(false);
            loadPatients(search);
            navigate(`/admin/patients/${id}`);
          }}
        />
      )}
      {dataEntryOpen && (
        <PatientDataEntryModal
          onClose={() => setDataEntryOpen(false)}
          onSaved={() => {
            setDataEntryOpen(false);
            loadPatients(search);
          }}
          onRegisterNew={(chart) => {
            setDataEntryOpen(false);
            setPrefillChart(chart);
            setAddOpen(true);
          }}
        />
      )}
      {storyOpenFor && (
        <PatientStoryModal
          childId={storyOpenFor.id}
          childName={storyOpenFor.name}
          chartNumber={storyOpenFor.chart_number}
          onClose={() => setStoryOpenFor(null)}
        />
      )}
    </div>
  );
}

function AddPatientModal({
  onClose,
  onCreated,
  initialChartNumber = '',
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
  initialChartNumber?: string;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const [chartNumber, setChartNumber] = useState(initialChartNumber);
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

/**
 * 빠른 환자 데이터 입력 — 환자번호를 넣으면 이름을 자동으로 찾아 채우고,
 * 날짜(기본 오늘)·키·몸무게만 입력해 해당 날짜의 측정값을 저장한다.
 * 없는 번호면 새 환자 등록 안내 → AddPatientModal 로 연결(onRegisterNew).
 */
function PatientDataEntryModal({
  onClose,
  onSaved,
  onRegisterNew,
}: {
  onClose: () => void;
  onSaved: () => void;
  onRegisterNew: (chartNumber: string) => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  // 로컬 시간 기준 오늘(YYYY-MM-DD). toISOString 은 UTC라 날짜가 밀릴 수 있어 sv-SE 사용.
  const todayIso = new Date().toLocaleDateString('sv-SE');

  const [chartNumber, setChartNumber] = useState('');
  const [date, setDate] = useState(todayIso);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 환자 조회 상태: idle(미입력) / loading / found / notfound.
  const [lookup, setLookup] = useState<
    | { status: 'idle' | 'loading' | 'notfound' }
    | { status: 'found'; child: { id: string; name: string; gender: string } }
  >({ status: 'idle' });
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 환자번호 입력 디바운스 조회 → 이름 자동 채움 / 없음 안내.
  useEffect(() => {
    const c = chartNumber.trim();
    if (!c) {
      setLookup({ status: 'idle' });
      return;
    }
    setLookup({ status: 'loading' });
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(async () => {
      try {
        const child = await fetchChildByChartNumber(c);
        // 조회 결과 도착 시 입력값이 그대로인지 확인(빠른 타이핑 경합 방지).
        setLookup(child ? { status: 'found', child } : { status: 'notfound' });
      } catch {
        setLookup({ status: 'notfound' });
      }
    }, 400);
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [chartNumber]);

  const canSubmit =
    lookup.status === 'found' && date !== '' && height.trim() !== '' && !submitting;

  const submit = async () => {
    if (lookup.status !== 'found' || !canSubmit) return;
    const h = parseFloat(height);
    if (!Number.isFinite(h) || h <= 0) {
      addToast('error', '키를 올바르게 입력하세요');
      return;
    }
    const w = weight.trim() ? parseFloat(weight) : undefined;
    if (w != null && !Number.isFinite(w)) {
      addToast('error', '몸무게를 올바르게 입력하세요');
      return;
    }
    setSubmitting(true);
    try {
      const childId = lookup.child.id;
      // 같은 날짜 일반 visit 이 있으면 재사용(중복 방지), 없으면 생성.
      const visits = await fetchVisitsForChild(childId);
      const visit =
        visits.find((v) => v.visit_date === date) ??
        (await createVisit({ child_id: childId, visit_date: date }));
      await createMeasurement({
        visit_id: visit.id,
        child_id: childId,
        measured_date: date,
        height: h,
        weight: w,
      });
      addToast('success', `${lookup.child.name} 환자 데이터를 저장했습니다`);
      onSaved();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '저장에 실패했습니다');
      setSubmitting(false);
    }
  };

  const inputCls =
    'h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

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
          <h2 className="text-sm font-semibold text-slate-900">환자 데이터 입력</h2>
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
              className={inputCls}
            />
          </label>

          {/* 조회 상태 표시 */}
          {lookup.status === 'loading' && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              조회 중…
            </div>
          )}
          {lookup.status === 'found' && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              ✓ {lookup.child.name} 환자
            </div>
          )}
          {lookup.status === 'notfound' && (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <span className="text-xs font-medium text-amber-800">
                존재하지 않는 환자번호입니다. 환자를 새로 등록하시겠습니까?
              </span>
              <button
                type="button"
                onClick={() => onRegisterNew(chartNumber.trim())}
                className="self-start rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                이 번호로 새 환자 등록 →
              </button>
            </div>
          )}

          <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            날짜 *
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              키 (cm) *
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="예) 142.5"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              몸무게 (kg)
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="예) 38.2"
                className={inputCls}
              />
            </label>
          </div>
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
            {submitting ? '저장 중…' : '데이터 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
