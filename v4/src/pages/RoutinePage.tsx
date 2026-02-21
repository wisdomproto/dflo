// ================================================
// RoutinePage - 187 성장케어 v4
// 일일 루틴 트래커 (입력 + 캘린더 뷰)
// 성장 기록(차트/예측/측정기록) 통합
// ================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Layout from '@/shared/components/Layout';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import ChildSelector from '@/shared/components/ChildSelector';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useChildrenStore } from '@/stores/childrenStore';
import { useUIStore } from '@/stores/uiStore';
import { MealCard } from '@/features/meal/components/MealCard';
import { MealAnalysisSection } from '@/features/meal/components/MealAnalysisSection';
import { ExerciseCard } from '@/features/exercise/components/ExerciseCard';
import { CalendarView, routineToFlags } from '@/features/routine/components/CalendarView';
import type { DayFlags } from '@/features/routine/components/CalendarView';
import { supabase } from '@/shared/lib/supabase';
import { GrowthModalContent } from '@/features/routine/components/GrowthModalContent';
import {
  fetchMealsByRoutine,
  fetchPhotosByRoutine,
  fetchAnalysesByRoutine,
} from '@/features/meal/services/mealService';
import { fetchRoutine, upsertRoutine, fetchRoutinesByMonth, fetchExerciseLogsByRoutine } from '@/features/routine/services/routineService';
import { fetchMeasurements } from '@/features/growth/services/measurementService';
import { toDateString, formatDate } from '@/shared/utils/date';
import { calculateAgeAtDate, formatAge } from '@/shared/utils/age';
import {
  calculateHeightPercentileLMS,
  predictAdultHeightLMS,
} from '@/shared/data/growthStandard';
import { calculatePAH, calculateMidParentalHeight } from '@/shared/utils/growth';
import type { DailyRoutine, ExerciseLog, Meal, MealAnalysis, MealPhoto, MealType, Measurement, SleepQuality, Mood } from '@/shared/types';
import type { MeasurementRow } from '@/shared/components/MeasurementTable';
import type { GrowthPoint } from '@/shared/components/GrowthChart';

const SUPPLEMENTS = ['비타민D', '칼슘', '아연', '유산균', '오메가3'] as const;
const SLEEP_OPTS: { value: SleepQuality; label: string }[] = [
  { value: 'good', label: '좋음' }, { value: 'normal', label: '보통' }, { value: 'bad', label: '나쁨' },
];
const MOOD_OPTS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: '좋음' }, { value: 'normal', emoji: '😐', label: '보통' },
  { value: 'sad', emoji: '😢', label: '슬픔' }, { value: 'tired', emoji: '😴', label: '피곤' },
  { value: 'sick', emoji: '🤒', label: '아픔' },
];

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
  </svg>
);

const SectionTitle = ({ icon, text, right }: { icon: string; text: string; right?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
      <span>{icon}</span>{text}
    </h3>
    {right}
  </div>
);

export default function RoutinePage() {
  const selectedChildId = useChildrenStore((s) => s.selectedChildId);
  const getSelectedChild = useChildrenStore((s) => s.getSelectedChild);
  const addToast = useUIStore((s) => s.addToast);

  const [tab, setTab] = useState<'input' | 'calendar'>('input');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 입력 폼 상태
  const [dailyHeight, setDailyHeight] = useState('');
  const [dailyWeight, setDailyWeight] = useState('');
  const [sleepTime, setSleepTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | ''>('');
  const [waterIntake, setWaterIntake] = useState(0);
  const [supplements, setSupplements] = useState<string[]>([]);
  const [growthInjection, setGrowthInjection] = useState(false);
  const [injectionTime, setInjectionTime] = useState('');
  const [mood, setMood] = useState<Mood | ''>('');
  const [dailyNotes, setDailyNotes] = useState('');

  // 캘린더 상태
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [monthRoutines, setMonthRoutines] = useState<DailyRoutine[]>([]);
  const [dayFlagsMap, setDayFlagsMap] = useState<Map<string, DayFlags>>(new Map());

  // 현재 루틴 ID
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [mealList, setMealList] = useState<Meal[]>([]);
  const [mealPhotos, setMealPhotos] = useState<(MealPhoto & { meal_type: MealType })[]>([]);
  const [mealAnalyses, setMealAnalyses] = useState<(MealAnalysis & { meal_type: MealType })[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);

  // 성장 기록
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const measurementsRef = useRef<Measurement[]>([]);
  measurementsRef.current = measurements;

  const child = getSelectedChild();

  const resetForm = useCallback(() => {
    setDailyHeight(''); setDailyWeight('');
    setSleepTime(''); setWakeTime(''); setSleepQuality(''); setWaterIntake(0);
    setSupplements([]); setGrowthInjection(false); setInjectionTime('');
    setMood(''); setDailyNotes('');
    setRoutineId(null); setMealList([]); setMealPhotos([]); setMealAnalyses([]); setExerciseLogs([]);
  }, []);

  const populateForm = useCallback((r: DailyRoutine) => {
    // 루틴에 저장된 값 우선, 없으면 최근 측정값으로 기본값 표시
    const latest = measurementsRef.current[0];
    setDailyHeight(r.daily_height ? String(r.daily_height) : latest ? String(latest.height) : '');
    setDailyWeight(r.daily_weight ? String(r.daily_weight) : latest?.weight ? String(latest.weight) : '');
    setSleepTime(r.sleep_time ?? ''); setWakeTime(r.wake_time ?? '');
    setSleepQuality(r.sleep_quality ?? ''); setWaterIntake(r.water_intake_ml ?? 0);
    setSupplements(r.basic_supplements ?? []); setGrowthInjection(r.growth_injection);
    setInjectionTime(r.injection_time ?? ''); setMood(r.mood ?? '');
    setDailyNotes(r.daily_notes ?? '');
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    let cancelled = false;
    setLoading(true);
    resetForm();
    fetchRoutine(selectedChildId, toDateString(date))
      .then(async (r) => {
        if (cancelled) return;
        if (r) {
          populateForm(r);
          setRoutineId(r.id);
          const [meals, photos, analyses, exercises] = await Promise.all([
            fetchMealsByRoutine(r.id), fetchPhotosByRoutine(r.id), fetchAnalysesByRoutine(r.id), fetchExerciseLogsByRoutine(r.id),
          ]);
          if (!cancelled) { setMealList(meals); setMealPhotos(photos); setMealAnalyses(analyses); setExerciseLogs(exercises); }
        } else {
          // 루틴이 없는 날: 최근 측정값을 기본값으로 채움
          const latest = measurementsRef.current[0];
          if (latest && !cancelled) {
            setDailyHeight(String(latest.height));
            if (latest.weight) setDailyWeight(String(latest.weight));
          }
        }
      })
      .catch(() => { if (!cancelled) addToast('error', '루틴 정보를 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedChildId, date, resetForm, populateForm, addToast]);

  useEffect(() => {
    if (!selectedChildId) { setMeasurements([]); return; }
    let cancelled = false;
    fetchMeasurements(selectedChildId).then((d) => { if (!cancelled) setMeasurements(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedChildId]);

  useEffect(() => {
    if (!selectedChildId || tab !== 'calendar') return;
    let cancelled = false;
    fetchRoutinesByMonth(selectedChildId, calYear, calMonth).then(async (routines) => {
      if (cancelled) return;
      setMonthRoutines(routines);
      if (routines.length === 0) { setDayFlagsMap(new Map()); return; }
      const ids = routines.map((r) => r.id);
      const [mealsRes, exRes] = await Promise.all([
        supabase.from('meals').select('daily_routine_id').in('daily_routine_id', ids),
        supabase.from('exercise_logs').select('daily_routine_id').in('daily_routine_id', ids),
      ]);
      if (cancelled) return;
      const mealIds = new Set((mealsRes.data ?? []).map((m) => m.daily_routine_id));
      const exIds = new Set((exRes.data ?? []).map((e) => e.daily_routine_id));
      const map = new Map<string, DayFlags>();
      routines.forEach((r) => map.set(r.routine_date, routineToFlags(r, mealIds, exIds)));
      setDayFlagsMap(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedChildId, calYear, calMonth, tab]);

  /** 루틴이 아직 없으면 자동 생성 후 id 반환 */
  const ensureRoutineId = useCallback(async (): Promise<string | null> => {
    if (routineId) return routineId;
    if (!selectedChildId) return null;
    try {
      const saved = await upsertRoutine({
        child_id: selectedChildId, routine_date: toDateString(date),
        growth_injection: false,
      });
      setRoutineId(saved.id);
      return saved.id;
    } catch { return null; }
  }, [routineId, selectedChildId, date]);

  const handleSave = async () => {
    if (!selectedChildId) { addToast('warning', '자녀를 먼저 선택해주세요.'); return; }
    setSaving(true);
    try {
      const saved = await upsertRoutine({
        child_id: selectedChildId, routine_date: toDateString(date),
        daily_height: dailyHeight ? parseFloat(dailyHeight) : undefined,
        daily_weight: dailyWeight ? parseFloat(dailyWeight) : undefined,
        sleep_time: sleepTime || undefined, wake_time: wakeTime || undefined,
        sleep_quality: sleepQuality || undefined, water_intake_ml: waterIntake || undefined,
        basic_supplements: supplements.length > 0 ? supplements : undefined,
        growth_injection: growthInjection,
        injection_time: growthInjection && injectionTime ? injectionTime : undefined,
        mood: mood || undefined, daily_notes: dailyNotes || undefined,
      });
      setRoutineId(saved.id);
      addToast('success', '루틴이 저장되었습니다.');
    } catch { addToast('error', '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const refreshMealData = useCallback(async () => {
    if (!routineId) return;
    const [meals, photos] = await Promise.all([fetchMealsByRoutine(routineId), fetchPhotosByRoutine(routineId)]);
    setMealList(meals); setMealPhotos(photos);
  }, [routineId]);

  const refreshAnalysisData = useCallback(async () => {
    if (!routineId) return;
    setMealAnalyses(await fetchAnalysesByRoutine(routineId));
  }, [routineId]);

  const refreshExerciseData = useCallback(async () => {
    if (!routineId) return;
    setExerciseLogs(await fetchExerciseLogsByRoutine(routineId));
  }, [routineId]);

  const shiftDate = (d: number) => setDate((p) => { const n = new Date(p); n.setDate(n.getDate() + d); return n; });
  const shiftMonth = (d: number) => { let m = calMonth + d, y = calYear; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } setCalMonth(m); setCalYear(y); };

  // 병원 데이터
  const latestMeas = measurements[0] ?? null;
  const latestBoneAge = useMemo(() => {
    if (!latestMeas?.bone_age) return null;
    return { boneAge: latestMeas.bone_age, pah: latestMeas.pah, measuredDate: latestMeas.measured_date };
  }, [latestMeas]);

  const latestLMS = useMemo(() => {
    if (!child || !latestMeas) return null;
    const age = calculateAgeAtDate(child.birth_date, new Date(latestMeas.measured_date));
    const pct = calculateHeightPercentileLMS(latestMeas.height, age.decimal, child.gender);
    const pred = predictAdultHeightLMS(latestMeas.height, age.decimal, child.gender);
    return { percentile: pct, predicted: pred > 0 ? pred : null };
  }, [child, latestMeas]);

  const bpPrediction = useMemo(() => {
    if (!child || !measurements.length) return null;
    const m = measurements.find((x) => x.bone_age != null);
    if (!m) return null;
    return { pah: calculatePAH(m.height, m.bone_age!, child.gender), boneAge: m.bone_age! };
  }, [child, measurements]);

  const mph = useMemo(() => {
    if (!child?.father_height || !child?.mother_height) return null;
    const v = calculateMidParentalHeight(child.father_height, child.mother_height, child.gender);
    return v > 0 ? v : null;
  }, [child]);

  const chartPoints: GrowthPoint[] = useMemo(() => {
    if (!child) return [];
    return measurements.map((m) => ({ age: calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal, height: m.height })).filter((p) => p.age >= 2).reverse();
  }, [measurements, child]);

  const tableRows: MeasurementRow[] = useMemo(() => measurements.map((m) => {
    const a = child ? calculateAgeAtDate(child.birth_date, new Date(m.measured_date)) : null;
    return { key: m.id, date: m.measured_date, age: a ? formatAge(a) : undefined, ageDecimal: a?.decimal, height: m.height, weight: m.weight, boneAge: m.bone_age, pah: m.pah, notes: m.notes };
  }), [measurements, child]);

  // 키·체중 측정 카드용
  const measAge = useMemo(() => child ? calculateAgeAtDate(child.birth_date, date) : null, [child, date]);
  const h = dailyHeight ? parseFloat(dailyHeight) : 0;
  const measPct = measAge && h && child ? calculateHeightPercentileLMS(h, measAge.decimal, child.gender) : null;
  const measPred = measAge && h && child ? predictAdultHeightLMS(h, measAge.decimal, child.gender) : null;

  return (
    <Layout title="루틴 기록">
      <div className="flex items-center justify-between px-4 pt-2">
        <ChildSelector />
      </div>

      {/* 탭 전환 */}
      <div className="flex mx-4 mt-2 p-1 bg-white/60 backdrop-blur-sm rounded-xl gap-1">
        {(['input', 'calendar'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              tab === t
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-400 active:text-gray-600'
            }`}>
            {t === 'input' ? '📝 입력' : '📅 캘린더'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {!selectedChildId ? (
          <Card className="py-8 text-center"><p className="text-sm text-gray-400">자녀를 먼저 선택해주세요</p></Card>
        ) : tab === 'input' ? (
          loading ? <LoadingSpinner message="불러오는 중..." /> : (
            <>
              <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3.5 shadow-sm">
                <button onClick={() => shiftDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 active:bg-gray-100 active:text-gray-700 transition-colors"><Chevron dir="left" /></button>
                <span className="text-sm font-bold text-gray-800">{formatDate(date, 'full')}</span>
                <button onClick={() => shiftDate(1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 active:bg-gray-100 active:text-gray-700 transition-colors"><Chevron dir="right" /></button>
              </div>

              {/* 키·체중 */}
              <Card>
                <SectionTitle icon="📏" text="키·체중 측정"
                  right={measurements.length > 0 ? <button onClick={() => setShowGrowthModal(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary active:bg-primary/20 transition-colors" title="성장 기록 보기">📊</button> : undefined} />
                {measAge && <p className="text-xs text-gray-400 -mt-1 mb-3">만 {formatAge(measAge)} ({measAge.decimal.toFixed(1)}세)</p>}
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-gray-500">키 (cm)<input type="number" inputMode="decimal" step="0.1" placeholder="0.0" value={dailyHeight} onChange={(e) => setDailyHeight(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></label>
                  <label className="text-xs text-gray-500">체중 (kg)<input type="number" inputMode="decimal" step="0.1" placeholder="0.0" value={dailyWeight} onChange={(e) => setDailyWeight(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></label>
                </div>
                {h > 0 && (measPct !== null || measPred !== null) && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {measPct !== null && <div className="bg-blue-50 rounded-lg px-3 py-2"><p className="text-[10px] text-blue-500">백분위</p><p className="text-sm font-bold text-blue-700">{measPct.toFixed(1)}%</p></div>}
                    {measPred !== null && measPred > 0 && <div className="bg-purple-50 rounded-lg px-3 py-2"><p className="text-[10px] text-purple-500">예측 성인키</p><p className="text-sm font-bold text-purple-700">{measPred}cm</p></div>}
                  </div>
                )}
                {child?.is_patient && latestBoneAge && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 mb-2">🏥 병원 데이터 ({latestBoneAge.measuredDate})</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-[10px] text-gray-400">골연령</p><div className="mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">{latestBoneAge.boneAge}세</div></div>
                      <div><p className="text-[10px] text-gray-400">뼈 예측키 (PAH)</p><div className="mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">{latestBoneAge.pah ? `${latestBoneAge.pah}cm` : '-'}</div></div>
                    </div>
                  </div>
                )}
              </Card>

              {selectedChildId && (
                <>
                  <MealCard routineId={routineId} childId={selectedChildId} meals={mealList} photos={mealPhotos} onDataChange={refreshMealData} onAnalysisChange={refreshAnalysisData} ensureRoutineId={ensureRoutineId} />
                  <MealAnalysisSection analyses={mealAnalyses} meals={mealList} photos={mealPhotos} childId={selectedChildId} onAnalysisChange={refreshAnalysisData} />
                </>
              )}
              <ExerciseCard routineId={routineId} exerciseLogs={exerciseLogs} onDataChange={refreshExerciseData} ensureRoutineId={ensureRoutineId} />

              <Card>
                <SectionTitle icon="🌙" text="수면" />
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className="text-xs text-gray-500">취침 시간<input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
                  <label className="text-xs text-gray-500">기상 시간<input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
                </div>
                <div className="flex gap-2">
                  {SLEEP_OPTS.map((o) => (<button key={o.value} onClick={() => setSleepQuality(o.value)} className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${sleepQuality === o.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{o.label}</button>))}
                </div>
              </Card>

              <Card>
                <SectionTitle icon="💧" text="수분 섭취" />
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">{waterIntake}ml</span>
                  <div className="flex gap-2 ml-auto">{[100, 200, 500].map((n) => (<button key={n} onClick={() => setWaterIntake((v) => v + n)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 active:bg-blue-100">+{n}ml</button>))}</div>
                </div>
                {waterIntake > 0 && <button onClick={() => setWaterIntake(0)} className="mt-2 text-xs text-gray-400 underline">초기화</button>}
              </Card>

              <Card>
                <SectionTitle icon="💊" text="영양제" />
                <div className="flex flex-wrap gap-2">
                  {SUPPLEMENTS.map((s) => { const on = supplements.includes(s); return (<button key={s} onClick={() => setSupplements((p) => on ? p.filter((x) => x !== s) : [...p, s])} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${on ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{on ? '✓ ' : ''}{s}</button>); })}
                </div>
              </Card>

              {child?.is_patient && (
                <Card>
                  <SectionTitle icon="💉" text="호르몬 주사" />
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">오늘 주사 투여</span>
                    <button onClick={() => setGrowthInjection((v) => !v)} className={`relative ml-auto h-7 w-12 rounded-full transition-colors ${growthInjection ? 'bg-primary' : 'bg-gray-200'}`}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${growthInjection ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
                  </div>
                  {growthInjection && <label className="block mt-3 text-xs text-gray-500">투여 시간<input type="time" value={injectionTime} onChange={(e) => setInjectionTime(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>}
                </Card>
              )}

              <Card>
                <SectionTitle icon="📝" text="메모" />
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                  {MOOD_OPTS.map((o) => (<button key={o.value} onClick={() => setMood(o.value)} className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors flex-shrink-0 ${mood === o.value ? 'bg-primary/10 ring-1 ring-primary' : 'bg-gray-50'}`}><span className="text-lg">{o.emoji}</span><span className={mood === o.value ? 'text-primary font-medium' : 'text-gray-500'}>{o.label}</span></button>))}
                </div>
                <textarea value={dailyNotes} onChange={(e) => setDailyNotes(e.target.value)} placeholder="오늘 아이의 컨디션이나 특이사항을 기록해주세요" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
              </Card>

              <button onClick={handleSave} disabled={saving}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary py-3.5 text-sm font-bold text-white
                           active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-primary/25">
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </>
          )
        ) : (
          <CalendarView calYear={calYear} calMonth={calMonth} date={date} monthRoutines={monthRoutines} dayFlagsMap={dayFlagsMap} onShiftMonth={shiftMonth} onSelectDate={(d) => { setDate(d); setTab('input'); }} />
        )}
      </div>

      <Modal isOpen={showGrowthModal} onClose={() => setShowGrowthModal(false)} title="성장 기록" size="lg">
        {child && latestMeas && <GrowthModalContent latestHeight={latestMeas.height} latestWeight={latestMeas.weight} gender={child.gender} latestLMS={latestLMS} bpPrediction={bpPrediction} mph={mph} chartPoints={chartPoints} tableRows={tableRows} />}
      </Modal>
    </Layout>
  );
}
