import GenderIcon from '@/shared/components/GenderIcon';
import { calculateAge, formatAge } from '@/shared/utils/age';
import type { Child } from '@/shared/types';

interface Props {
  child: Child;
  visitCount: number;
  lastVisitDate: string | null;
  boneAgeCount: number;
  prescriptionCount: number;
  labCount: number;
}

function formatDateKo(d: string | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
}

export function PatientHeaderCard({
  child,
  visitCount,
  lastVisitDate,
  boneAgeCount,
  prescriptionCount,
  labCount,
}: Props) {
  const age = calculateAge(child.birth_date);
  const gradient =
    child.gender === 'male'
      ? 'from-blue-500 to-indigo-600'
      : 'from-pink-400 to-rose-500';

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg">
      <div className={`bg-gradient-to-br ${gradient} px-5 pt-4 pb-4 relative`}>
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-8 translate-x-8" />

        <div className="flex items-center gap-3 relative">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <GenderIcon gender={child.gender} size="md" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{child.name}</h2>
            <p className="text-xs text-white/70">
              차트번호 <span className="font-mono font-semibold">{child.chart_number}</span>
              {' · '}
              {formatAge(age)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4 relative">
          <Stat label="진료" value={visitCount} />
          <Stat label="뼈나이" value={boneAgeCount} />
          <Stat label="처방" value={prescriptionCount} />
          <Stat label="검사" value={labCount} />
        </div>

        <p className="text-[11px] text-white/70 mt-3 relative">
          마지막 진료: <span className="font-semibold">{formatDateKo(lastVisitDate)}</span>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/15 backdrop-blur-sm px-2 py-2 text-center">
      <p className="text-base font-bold text-white leading-tight">{value}</p>
      <p className="text-[10px] text-white/70 leading-tight mt-0.5">{label}</p>
    </div>
  );
}
