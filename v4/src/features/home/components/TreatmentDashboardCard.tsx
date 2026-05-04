// ================================================
// TreatmentDashboardCard — 치료 단계 환자용 홈 대시보드
// 마지막 진료 N일 전 + 진료기록·다이어리 quick entry
// ================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import type { Child } from '@/shared/types';

interface Props {
  child: Child;
}

interface VisitMeta {
  daysSince: number;
  lastDate: string;
  totalVisits: number;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function formatKo(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
}

export function TreatmentDashboardCard({ child }: Props) {
  const [meta, setMeta] = useState<VisitMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_date, is_intake')
        .eq('child_id', child.id)
        .or('is_intake.is.null,is_intake.eq.false')
        .order('visit_date', { ascending: false });
      if (cancelled || error || !data || data.length === 0) {
        if (!cancelled) setMeta(null);
        return;
      }
      const last = data[0];
      const ds = daysBetween(new Date(last.visit_date), new Date());
      setMeta({ daysSince: ds, lastDate: last.visit_date, totalVisits: data.length });
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  const tone = (() => {
    if (!meta) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' };
    if (meta.daysSince <= 30) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' };
    if (meta.daysSince <= 90) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' };
    return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800' };
  })();

  const reminderCopy = (() => {
    if (!meta) return null;
    if (meta.daysSince <= 30) return `최근에 잘 다니고 계세요 👏`;
    if (meta.daysSince <= 90) return `진료 받은 지 좀 됐어요. 곧 다녀오세요`;
    return `오랜만이에요. 예약을 잡아 보세요`;
  })();

  return (
    <div className={`rounded-2xl p-4 border ${tone.bg} ${tone.border} space-y-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>🩺</span> {child.name} 치료 진행 중
        </h3>
        {meta && (
          <span className="text-[10px] text-gray-500">총 {meta.totalVisits}회 진료</span>
        )}
      </div>

      {meta ? (
        <div className={`rounded-xl bg-white/70 px-3 py-2.5 ${tone.text}`}>
          <p className="text-[11px] font-medium opacity-80">마지막 진료</p>
          <p className="text-base font-bold leading-tight mt-0.5">
            {meta.daysSince === 0 ? '오늘' : `${meta.daysSince}일 전`}
            <span className="text-[11px] font-normal opacity-70 ml-1.5">({formatKo(meta.lastDate)})</span>
          </p>
          {reminderCopy && (
            <p className="text-xs mt-1 opacity-80">{reminderCopy}</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white/70 px-3 py-3 text-center">
          <p className="text-xs text-gray-500">아직 진료 기록이 없어요</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/app/records"
          className="rounded-xl bg-white border border-gray-200 px-3 py-3 text-center active:bg-gray-50 transition-colors"
        >
          <p className="text-2xl">📋</p>
          <p className="text-xs font-bold text-gray-800 mt-0.5">진료기록</p>
          <p className="text-[10px] text-gray-400">측정·뼈나이·예측키</p>
        </Link>
        <Link
          to="/app/routine"
          className="rounded-xl bg-white border border-gray-200 px-3 py-3 text-center active:bg-gray-50 transition-colors"
        >
          <p className="text-2xl">📔</p>
          <p className="text-xs font-bold text-gray-800 mt-0.5">생활 다이어리</p>
          <p className="text-[10px] text-gray-400">오늘 기록하기</p>
        </Link>
      </div>
    </div>
  );
}
