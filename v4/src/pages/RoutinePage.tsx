// ================================================
// RoutinePage - 187 성장케어 v4
// 일일 루틴 트래커 (입력 + 월별 통계)
// 성장 기록(차트/예측/측정기록) 통합
// ================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { MonthStatsView } from '@/features/routine/components/MonthStatsView';
import { GrowthModalContent } from '@/features/routine/components/GrowthModalContent';
import { HeightWeightCard } from '@/features/routine/components/HeightWeightCard';
import { SleepCard } from '@/features/routine/components/SleepCard';
import { WaterCard } from '@/features/routine/components/WaterCard';
import { SupplementCard } from '@/features/routine/components/SupplementCard';
import { InjectionCard } from '@/features/routine/components/InjectionCard';
import { MemoCard } from '@/features/routine/components/MemoCard';
import { PhotoCaptureCard } from '@/features/routine/components/PhotoCaptureCard';
import {
  fetchMealsByRoutine,
  fetchPhotosByRoutine,
  fetchAnalysesByRoutine,
} from '@/features/meal/services/mealService';
import { fetchRoutine, upsertRoutine, fetchExerciseLogsByRoutine } from '@/features/routine/services/routineService';
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

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
  </svg>
);

export default function RoutinePage() {
  const selectedChildId = useChildrenStore((s) => s.selectedChildId);
  const getSelectedChild = useChildrenStore((s) => s.getSelectedChild);
  const addToast = useUIStore((s) => s.addToast);

  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const [tab, setTab] = useState<'input' | 'calendar'>('input');
  const [date, setDate] = useState(() => {
    if (dateParam) {
      const d = new Date(dateParam + 'T00:00:00');
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const today0 = new Date();
  const [calYear, setCalYear] = useState(today0.getFullYear());
  const [calMonth, setCalMonth] = useState(today0.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // URL ?date=YYYY-MM-DD 변경 추적 (통계 페이지에서 날짜 클릭 시 점프)
  useEffect(() => {
    if (!dateParam) return;
    const d = new Date(dateParam + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return;
    setDate(d);
    // 한 번 적용 후 URL 정리
    setSearchParams({}, { replace: true });
  }, [dateParam, setSearchParams]);

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

  // 현재 루틴 ID
  const dateRef = useRef<HTMLInputElement>(null);
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

  const ensureRoutineId = useCallback(async (): Promise<string | null> => {
    if (routineId) return routineId;
    if (!selectedChildId) return null;
    try {
      const saved = await upsertRoutine({ child_id: selectedChildId, routine_date: toDateString(date), growth_injection: false });
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

  const isToday = toDateString(date) === toDateString(new Date());
  const shiftDate = (d: number) => { if (d > 0 && isToday) return; setDate((p) => { const n = new Date(p); n.setDate(n.getDate() + d); if (n > new Date()) return p; return n; }); };
  const shiftMonth = (d: number) => { let m = calMonth + d, y = calYear; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } setCalMonth(m); setCalYear(y); };

  // 성장 데이터 계산
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

  const measAge = useMemo(() => child ? calculateAgeAtDate(child.birth_date, date) : null, [child, date]);
  const h = dailyHeight ? parseFloat(dailyHeight) : 0;
  const measPct = measAge && h && child ? calculateHeightPercentileLMS(h, measAge.decimal, child.gender) : null;
  const measPred = measAge && h && child ? predictAdultHeightLMS(h, measAge.decimal, child.gender) : null;

  return (
    <Layout title="데일리 루틴 기록">
      <div className="flex items-center justify-between px-4 pt-2">
        <ChildSelector />
      </div>

      {/* 탭 바 */}
      <div className="flex mx-4 mt-2 p-1 bg-white/60 backdrop-blur-sm rounded-xl gap-1 relative">
        <div onClick={() => { if (tab !== 'input') setTab('input'); }}
          className={`w-1/2 flex-shrink-0 flex items-center justify-center gap-0 rounded-lg px-1 py-1 transition-all cursor-pointer ${
            tab === 'input' ? 'bg-white shadow-sm' : 'opacity-60'
          }`}>
          <span className={`text-xs font-semibold pl-0.5 pr-0.5 whitespace-nowrap ${tab === 'input' ? 'text-primary' : 'text-gray-400'}`}>📝 입력</span>
          <button onClick={(e) => { e.stopPropagation(); if (tab !== 'input') setTab('input'); shiftDate(-1); }} className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100 transition-colors"><Chevron dir="left" /></button>
          <button onClick={(e) => { e.stopPropagation(); if (tab !== 'input') setTab('input'); dateRef.current?.showPicker?.(); }} className={`text-center text-sm font-bold whitespace-nowrap active:opacity-70 transition-colors ${tab === 'input' ? 'text-primary' : 'text-gray-500'}`}>
            {formatDate(date, 'month')}
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (tab !== 'input') setTab('input'); shiftDate(1); }} disabled={isToday} className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${isToday ? 'text-gray-200' : 'text-gray-400 active:bg-gray-100'}`}><Chevron dir="right" /></button>
          {toDateString(date) !== toDateString(new Date()) && (
            <button onClick={(e) => { e.stopPropagation(); setDate(new Date()); if (tab !== 'input') setTab('input'); }} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold active:bg-primary/20">
              오늘
            </button>
          )}
          <input ref={dateRef} type="date" value={toDateString(date)} max={toDateString(new Date())}
            onChange={(e) => { if (e.target.value) { setDate(new Date(e.target.value + 'T00:00:00')); if (tab !== 'input') setTab('input'); } }}
            className="absolute opacity-0 w-0 h-0 pointer-events-none" />
        </div>
        <button onClick={() => setTab(tab === 'calendar' ? 'input' : 'calendar')}
          className={`w-1/2 flex-shrink-0 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            tab === 'calendar' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 active:text-gray-600'
          }`}>
          📊 통계
        </button>
      </div>

      {tab === 'calendar' && (
        <div className="flex items-center justify-center gap-2 mx-4 mt-1">
          <button onClick={() => shiftMonth(-1)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100 transition-colors"><Chevron dir="left" /></button>
          <span className="text-sm font-bold text-gray-700">{calYear}년 {calMonth}월</span>
          <button onClick={() => shiftMonth(1)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100 transition-colors"><Chevron dir="right" /></button>
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 py-4">
        {!selectedChildId ? (
          <Card className="py-8 text-center"><p className="text-sm text-gray-400">자녀를 먼저 선택해주세요</p></Card>
        ) : tab === 'input' ? (
          loading ? <LoadingSpinner message="불러오는 중..." /> : (
            <>
              <HeightWeightCard
                dailyHeight={dailyHeight} dailyWeight={dailyWeight}
                onDailyHeightChange={setDailyHeight} onDailyWeightChange={setDailyWeight}
                child={child ?? null} measAge={measAge} measPct={measPct} measPred={measPred}
                latestBoneAge={latestBoneAge} measurementCount={measurements.length}
                onShowGrowthModal={() => setShowGrowthModal(true)}
              />

              {selectedChildId && (
                <>
                  <MealCard routineId={routineId} childId={selectedChildId} meals={mealList} photos={mealPhotos} onDataChange={refreshMealData} onAnalysisChange={refreshAnalysisData} ensureRoutineId={ensureRoutineId} />
                  <MealAnalysisSection analyses={mealAnalyses} meals={mealList} photos={mealPhotos} childId={selectedChildId} onAnalysisChange={refreshAnalysisData} />
                </>
              )}
              <ExerciseCard routineId={routineId} exerciseLogs={exerciseLogs} onDataChange={refreshExerciseData} ensureRoutineId={ensureRoutineId} />

              <SleepCard sleepTime={sleepTime} wakeTime={wakeTime} sleepQuality={sleepQuality}
                onSleepTimeChange={setSleepTime} onWakeTimeChange={setWakeTime} onSleepQualityChange={setSleepQuality} />

              <WaterCard waterIntake={waterIntake} onWaterIntakeChange={setWaterIntake} />

              <SupplementCard supplements={supplements} onSupplementsChange={setSupplements} />

              {child?.is_patient && (
                <InjectionCard growthInjection={growthInjection} injectionTime={injectionTime}
                  onGrowthInjectionChange={setGrowthInjection} onInjectionTimeChange={setInjectionTime} />
              )}

              <MemoCard mood={mood} dailyNotes={dailyNotes} onMoodChange={setMood} onDailyNotesChange={setDailyNotes} />

              <PhotoCaptureCard />

              <button onClick={handleSave} disabled={saving}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary py-3.5 text-sm font-bold text-white
                           active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-primary/25">
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </>
          )
        ) : (
          <MonthStatsView childId={selectedChildId} year={calYear} month={calMonth}
            selectedDate={date}
            onSelectDate={(d: Date) => { setDate(d); setTab('input'); }} />
        )}
      </div>

      <Modal isOpen={showGrowthModal} onClose={() => setShowGrowthModal(false)} title="성장 기록" size="lg">
        {child && latestMeas && <GrowthModalContent latestHeight={latestMeas.height} latestWeight={latestMeas.weight} gender={child.gender} latestLMS={latestLMS} bpPrediction={bpPrediction} mph={mph} chartPoints={chartPoints} tableRows={tableRows} />}
      </Modal>
    </Layout>
  );
}
