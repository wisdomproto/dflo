import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardStats, type DashboardStats } from '@/features/admin/services/adminService';
import { useUIStore } from '@/stores/uiStore';

const statCards = [
  { key: 'totalPatients', label: '총 환자 수', icon: '👥', bg: 'bg-blue-50' },
  { key: 'activePatients', label: '활성 환자 수', icon: '💚', bg: 'bg-green-50' },
  { key: 'newPatientsThisMonth', label: '이번 달 신규', icon: '🆕', bg: 'bg-amber-50' },
  { key: 'totalMeasurements', label: '총 측정 기록', icon: '📏', bg: 'bg-purple-50' },
  { key: 'recipesCount', label: '레시피 수', icon: '🍽️', bg: 'bg-orange-50' },
  { key: 'guidesCount', label: '가이드 수', icon: '📖', bg: 'bg-teal-50' },
] as const;

const quickActions = [
  { label: '환자 관리', path: '/admin/patients', icon: '👥' },
  { label: '콘텐츠 작성', path: '/admin/content', icon: '✏️' },
  { label: '데이터 업로드', path: '/admin/import', icon: '📤' },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((err) => addToast('error', err?.message ?? '통계를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm p-4 h-28 animate-pulse"
            />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map(({ key, label, icon, bg }) => (
            <div
              key={key}
              className={`${bg} bg-white rounded-xl shadow-sm p-4 flex flex-col gap-1`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-2xl font-bold">
                {stats[key].toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-12">
          데이터를 불러올 수 없습니다.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">빠른 이동</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map(({ label, path, icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-white rounded-xl shadow-sm px-5 py-3 flex items-center gap-2 hover:bg-primary/5 transition-colors"
            >
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
