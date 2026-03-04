// ================================================
// useGrowthRecord - 성장 기록 데이터 훅
// measurements → chartPoints, tableRows, LMS, MPH 계산
// ================================================

import { useEffect, useMemo, useState } from 'react';
import { fetchMeasurements } from '@/features/growth/services/measurementService';
import { calculateAgeAtDate, formatAge } from '@/shared/utils/age';
import { calculateMidParentalHeight } from '@/shared/utils/growth';
import { calculateHeightPercentileLMS, predictAdultHeightLMS } from '@/shared/data/growthStandard';
import type { Child, Measurement } from '@/shared/types';
import type { GrowthPoint } from '@/shared/components/GrowthChart';
import type { MeasurementRow } from '@/shared/components/MeasurementTable';

interface GrowthRecord {
  measurements: Measurement[];
  latestMeas: Measurement | null;
  latestLMS: { percentile: number; predicted: number | null } | null;
  bpPrediction: { pah: number; boneAge: number } | null;
  mph: number | null;
  chartPoints: GrowthPoint[];
  tableRows: MeasurementRow[];
  isLoading: boolean;
}

export function useGrowthRecord(child: Child | null): GrowthRecord {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!child) { setMeasurements([]); return; }
    let cancelled = false;
    setIsLoading(true);
    fetchMeasurements(child.id)
      .then((d) => { if (!cancelled) setMeasurements(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [child?.id]);

  const latestMeas = measurements[0] ?? null;

  const latestLMS = useMemo(() => {
    if (!child || !latestMeas) return null;
    const age = calculateAgeAtDate(child.birth_date, new Date(latestMeas.measured_date));
    const pct = calculateHeightPercentileLMS(latestMeas.height, age.decimal, child.gender);
    const pred = predictAdultHeightLMS(latestMeas.height, age.decimal, child.gender);
    return { percentile: pct, predicted: pred > 0 ? pred : null };
  }, [child, latestMeas]);

  const bpPrediction = useMemo(() => {
    if (!measurements.length) return null;
    const m = measurements.find((x) => x.bone_age != null);
    if (!m || !m.bone_age || !m.pah) return null;
    return { pah: m.pah, boneAge: m.bone_age };
  }, [measurements]);

  const mph = useMemo(() => {
    if (!child?.father_height || !child?.mother_height) return null;
    const v = calculateMidParentalHeight(child.father_height, child.mother_height, child.gender);
    return v > 0 ? v : null;
  }, [child]);

  const chartPoints: GrowthPoint[] = useMemo(() => {
    if (!child) return [];
    return measurements
      .map((m) => ({ age: calculateAgeAtDate(child.birth_date, new Date(m.measured_date)).decimal, height: m.height }))
      .filter((p) => p.age >= 2)
      .reverse();
  }, [measurements, child]);

  const tableRows: MeasurementRow[] = useMemo(() => measurements.map((m) => {
    const a = child ? calculateAgeAtDate(child.birth_date, new Date(m.measured_date)) : null;
    return {
      key: m.id, date: m.measured_date, age: a ? formatAge(a) : undefined,
      ageDecimal: a?.decimal, height: m.height, weight: m.weight,
      boneAge: m.bone_age, pah: m.pah, notes: m.notes,
    };
  }), [measurements, child]);

  return { measurements, latestMeas, latestLMS, bpPrediction, mph, chartPoints, tableRows, isLoading };
}
