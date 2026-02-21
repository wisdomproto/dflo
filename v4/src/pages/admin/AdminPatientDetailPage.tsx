import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchPatientDetail,
  addMeasurement,
  deleteMeasurement,
} from '@/features/admin/services/adminService';
import { useUIStore } from '@/stores/uiStore';
import { calculateAge, calculateAgeAtDate, formatAge } from '@/shared/utils/age';
import { GrowthChart } from '@/shared/components/GrowthChart';
import type { GrowthPoint } from '@/shared/components/GrowthChart';
import { calculateHeightPercentileLMS } from '@/shared/data/growthStandard';
import { RoutineCalendar } from '@/features/admin/components/RoutineCalendar';
import type { Child, Measurement, User } from '@/shared/types';

type ParentInfo = Pick<User, 'id' | 'name' | 'email' | 'phone'>;

interface FormState {
  measured_date: string;
  height: string;
  weight: string;
  bone_age: string;
  pah: string;
  notes: string;
  doctor_notes: string;
}

const emptyForm: FormState = {
  measured_date: new Date().toISOString().split('T')[0],
  height: '',
  weight: '',
  bone_age: '',
  pah: '',
  notes: '',
  doctor_notes: '',
};

export default function AdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [child, setChild] = useState<Child | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [parent, setParent] = useState<ParentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const data = await fetchPatientDetail(id);
      setChild(data.child);
      setMeasurements(data.measurements);
      setParent(data.parent);
    } catch {
      setChild(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 측정 데이터 → GrowthChart 포인트
  const chartPoints = useMemo<GrowthPoint[]>(() => {
    if (!child) return [];
    return measurements
      .filter((m) => m.height > 0)
      .map((m) => {
        const age = calculateAgeAtDate(child.birth_date, new Date(m.measured_date));
        return { age: age.decimal, height: m.height };
      })
      .sort((a, b) => a.age - b.age);
  }, [child, measurements]);

  // 최신 날짜순 정렬된 측정 데이터
  const sortedMeasurements = useMemo(
    () => [...measurements].sort((a, b) => b.measured_date.localeCompare(a.measured_date)),
    [measurements],
  );

  const handleDelete = async (mId: string) => {
    if (!window.confirm('이 측정 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteMeasurement(mId);
      addToast('success', '측정 기록이 삭제되었습니다');
      await load();
    } catch {
      addToast('error', '삭제에 실패했습니다');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form.height) return;
    setSubmitting(true);
    try {
      await addMeasurement({
        child_id: id,
        measured_date: form.measured_date,
        height: Number(form.height),
        weight: form.weight ? Number(form.weight) : undefined,
        bone_age: form.bone_age ? Number(form.bone_age) : undefined,
        pah: form.pah ? Number(form.pah.split(/[~\-–—]/)[0].trim()) || undefined : undefined,
        notes: form.notes || undefined,
        doctor_notes: form.doctor_notes || undefined,
      });
      addToast('success', '측정 기록이 추가되었습니다');
      setForm(emptyForm);
      setFormOpen(false);
      await load();
    } catch {
      addToast('error', '측정 기록 추가에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-6 h-40 animate-pulse" />
        <div className="bg-white rounded-xl shadow-sm p-6 h-60 animate-pulse" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-gray-400 text-lg">환자를 찾을 수 없습니다</p>
        <button onClick={() => navigate('/admin/patients')} className="text-primary underline text-sm">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const age = calculateAge(child.birth_date);

  return (
    <div className="space-y-6">
      {/* 환자 정보 */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{child.gender === 'male' ? '\u2642' : '\u2640'}</span>
            <div>
              <h1 className="text-xl font-bold">{child.name}</h1>
              <p className="text-sm text-gray-500">{formatAge(age)} ({child.birth_date})</p>
            </div>
            <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${child.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {child.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button onClick={() => navigate('/admin/patients')} className="text-sm text-gray-500 hover:text-gray-700">
            &larr; 목록
          </button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          {child.father_height != null && <span>아버지 키: {child.father_height}cm</span>}
          {child.mother_height != null && <span>어머니 키: {child.mother_height}cm</span>}
          {parent && <span>보호자: {parent.name} ({parent.phone ?? parent.email})</span>}
        </div>
      </div>

      {/* 그래프(좌) + 측정 기록(우) — PC에서 가로 배치 */}
      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        {/* 성장 그래프 */}
        {chartPoints.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 lg:w-[420px] lg:flex-shrink-0">
            <GrowthChart
              gender={child.gender}
              points={chartPoints}
              zoomable
              onExpand={() => setChartExpanded(true)}
            />
          </div>
        )}

        {/* 측정 기록 */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">측정 기록 ({measurements.length})</h2>
            <button
              onClick={() => setFormOpen((o) => !o)}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm"
            >
              {formOpen ? '닫기' : '+ 기록 추가'}
            </button>
          </div>

          {/* 측정 추가 폼 */}
          {formOpen && (
            <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">측정일 *</span>
                  <input type="date" value={form.measured_date} onChange={set('measured_date')} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">키 (cm) *</span>
                  <input type="number" step="0.1" value={form.height} onChange={set('height')} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">체중 (kg)</span>
                  <input type="number" step="0.1" value={form.weight} onChange={set('weight')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">뼈나이</span>
                  <input type="number" step="0.1" value={form.bone_age} onChange={set('bone_age')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">뼈 예측키 (PAH)</span>
                  <input type="text" placeholder="예: 165 또는 150~151" value={form.pah} onChange={set('pah')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1 col-span-2 md:col-span-1">
                  <span className="text-xs text-gray-500">메모</span>
                  <input type="text" value={form.notes} onChange={set('notes')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1 col-span-2 md:col-span-1">
                  <span className="text-xs text-gray-500">의사 소견</span>
                  <input type="text" value={form.doctor_notes} onChange={set('doctor_notes')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </label>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={submitting} className="bg-primary text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">
                  {submitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          )}

          {/* 측정 테이블 */}
          {sortedMeasurements.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">측정 기록이 없습니다</p>
          ) : (
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">날짜</th>
                    <th className="pb-2 font-medium text-right">키</th>
                    <th className="pb-2 font-medium text-right">체중</th>
                    <th className="pb-2 font-medium text-right">만나이</th>
                    <th className="pb-2 font-medium text-right">뼈나이</th>
                    <th className="pb-2 font-medium text-right">뼈 예측키</th>
                    <th className="pb-2 pr-4 font-medium text-right">백분위</th>
                    <th className="pb-2 pl-4 font-medium">의사 소견</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedMeasurements.map((m) => {
                    const mAge = child ? calculateAgeAtDate(child.birth_date, new Date(m.measured_date)) : null;
                    const percentile = (mAge && mAge.decimal >= 2 && m.height && child)
                      ? calculateHeightPercentileLMS(m.height, mAge.decimal, child.gender)
                      : null;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="py-2 whitespace-nowrap">{m.measured_date}</td>
                        <td className="py-2 text-right font-medium">{m.height}cm</td>
                        <td className="py-2 text-right text-gray-600">{m.weight != null ? `${m.weight}kg` : '-'}</td>
                        <td className="py-2 text-right text-gray-600">{mAge ? formatAge(mAge) : '-'}</td>
                        <td className="py-2 text-right text-gray-600">{m.bone_age != null ? `${Math.floor(m.bone_age)}세 ${Math.round((m.bone_age % 1) * 12)}개월` : '-'}</td>
                        <td className="py-2 text-right text-purple-600 font-medium">{m.pah != null ? `${m.pah}cm` : ''}</td>
                        <td className="py-2 pr-4 text-right text-blue-600 font-medium">
                          {percentile != null ? `${percentile.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-2 pl-4 max-w-[200px] truncate text-gray-600">{m.doctor_notes || m.notes || '-'}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded px-2 py-1 text-xs transition-colors"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 생활습관 기록 캘린더 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <RoutineCalendar childId={child.id} />
      </div>

      {/* 그래프 크게 보기 모달 */}
      {chartExpanded && chartPoints.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setChartExpanded(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-h-[92vh] overflow-auto"
            style={{ width: 'min(55vh, 90vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{child.name} — 성장 그래프</h3>
              <button
                onClick={() => setChartExpanded(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <GrowthChart
              gender={child.gender}
              points={chartPoints}
              showTitle={false}
              zoomable
            />
          </div>
        </div>
      )}
    </div>
  );
}
