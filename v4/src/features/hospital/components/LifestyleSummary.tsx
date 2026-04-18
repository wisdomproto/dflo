import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';

export function LifestyleSummary({ childId }: { childId: string }) {
  const [stats, setStats] = useState<{
    routines: number;
    meals: number;
    avgSleep: number | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      const [{ data: routines }, { data: meals }] = await Promise.all([
        supabase
          .from('daily_routines')
          .select('id, sleep_time, wake_time')
          .eq('child_id', childId)
          .gte('routine_date', since),
        supabase
          .from('meals')
          .select('id, daily_routine_id, daily_routines!inner(child_id, routine_date)')
          .gte('daily_routines.routine_date', since)
          .eq('daily_routines.child_id', childId),
      ]);
      const avgSleep = computeAvgSleep(routines ?? []);
      setStats({ routines: routines?.length ?? 0, meals: meals?.length ?? 0, avgSleep });
    }
    load();
  }, [childId]);

  function computeAvgSleep(
    rows: { sleep_time?: string | null; wake_time?: string | null }[],
  ): number | null {
    const pairs = rows.filter((r) => r.sleep_time && r.wake_time);
    if (pairs.length === 0) return null;
    const hours = pairs.map((r) => {
      const [sh, sm] = r.sleep_time!.split(':').map(Number);
      const [wh, wm] = r.wake_time!.split(':').map(Number);
      let dur = wh * 60 + wm - (sh * 60 + sm);
      if (dur < 0) dur += 24 * 60;
      return dur / 60;
    });
    return Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10;
  }

  if (!stats)
    return <div className="rounded-lg border p-4 text-sm text-gray-400">로딩…</div>;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="최근 30일 루틴" value={`${stats.routines}건`} />
      <Stat label="식사 기록" value={`${stats.meals}건`} />
      <Stat label="평균 수면" value={stats.avgSleep !== null ? `${stats.avgSleep}h` : '—'} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
