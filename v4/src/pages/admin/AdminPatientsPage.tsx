import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPatients, type PatientWithParent } from '@/features/admin/services/adminService';
import { useUIStore } from '@/stores/uiStore';
import { calculateAge, formatAge } from '@/shared/utils/age';
import GenderIcon from '@/shared/components/GenderIcon';
import type { Gender } from '@/shared/types';

export default function AdminPatientsPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [patients, setPatients] = useState<PatientWithParent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

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

  function StatusBadge({ active }: { active: boolean }) {
    return active
      ? <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">활성</span>
      : <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">비활성</span>;
  }

  function MeasurementInfo({ p }: { p: PatientWithParent }) {
    if (!p.latestMeasurement) return <span className="text-gray-400 text-sm">-</span>;
    const m = p.latestMeasurement;
    return (
      <span className="text-sm text-gray-700">
        {m.height}cm{m.weight != null && ` / ${m.weight}kg`}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">환자 관리</h1>
        {!loading && (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
            {patients.length}
          </span>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="환자 이름 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
      />

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            불러오는 중...
          </div>
        ) : patients.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            등록된 환자가 없습니다
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden lg:table w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">환자</th>
                  <th className="px-4 py-3 text-left">나이</th>
                  <th className="px-4 py-3 text-left">보호자</th>
                  <th className="px-4 py-3 text-left">최근 측정</th>
                  <th className="px-4 py-3 text-center">측정 수</th>
                  <th className="px-4 py-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/admin/patients/${p.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span className="inline-flex items-center gap-1.5">
                        <GenderIcon gender={p.gender as Gender} size="sm" />
                        {p.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatAge(calculateAge(p.birth_date))}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.parent?.name ?? '-'}</td>
                    <td className="px-4 py-3"><MeasurementInfo p={p} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
                        {p.measurementCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge active={p.is_active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="lg:hidden divide-y divide-gray-100">
              {patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/admin/patients/${p.id}`)}
                  className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 cursor-pointer"
                >
                  <GenderIcon gender={p.gender as Gender} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{p.name}</span>
                      <StatusBadge active={p.is_active} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatAge(calculateAge(p.birth_date))}
                      {p.parent?.name && ` · ${p.parent.name}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <MeasurementInfo p={p} />
                    <span className="block mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600 text-center">
                      {p.measurementCount ?? 0}회
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
