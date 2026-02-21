// ================================================
// CaseDetail - 성장 사례 상세 보기
// 성별/목표키/성장폭 + 차트 + 측정 테이블
// ================================================

import { MeasurementTable, type MeasurementRow } from '@/shared/components/MeasurementTable';
import { GrowthChart, type GrowthPoint } from '@/shared/components/GrowthChart';
import { getGenderStyle } from '@/shared/utils/gender';
import { parseKoreanAge, type CaseMeasurementRow } from './CasePredictionBadge';
import type { GrowthCase } from '@/shared/types';

/** CaseMeasurementRow → GrowthPoint (차트용) */
function toChartPoints(measurements: CaseMeasurementRow[], birthDate?: string): GrowthPoint[] {
  const points: GrowthPoint[] = [];
  for (const m of measurements) {
    const h = typeof m.height === 'string' ? parseFloat(m.height) : m.height;
    if (!h) continue;
    let age = parseKoreanAge(m.age);
    if (!age && birthDate && m.date) {
      const bd = new Date(birthDate);
      const md = new Date(m.date);
      age = (md.getTime() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    }
    if (age && age >= 2) points.push({ age, height: h });
  }
  return points;
}

/** CaseMeasurementRow[] → MeasurementRow[] (테이블용, 최신순) */
function toTableRows(measurements: CaseMeasurementRow[]): MeasurementRow[] {
  const sorted = [...measurements].sort((a, b) => {
    const da = a.date ?? '';
    const db = b.date ?? '';
    return db.localeCompare(da);
  });

  return sorted.map((m, i): MeasurementRow => {
    const h = typeof m.height === 'string' ? parseFloat(m.height) : m.height;
    const w = typeof m.weight === 'string' ? parseFloat(m.weight) : m.weight;
    const ba = m.bone_age ? parseFloat(String(m.bone_age)) : null;
    const p = m.pah ? parseFloat(String(m.pah)) : null;
    const ageStr = typeof m.age === 'number' ? `${m.age}세` : m.age;
    return {
      key: `case-${i}`,
      date: m.date ?? '',
      age: ageStr,
      ageDecimal: parseKoreanAge(m.age) ?? undefined,
      height: h,
      weight: w,
      boneAge: ba,
      pah: p,
      notes: m.notes,
    };
  });
}

export function CaseDetail({ caseData }: { caseData: GrowthCase }) {
  const c = caseData;
  const measurements = (c.measurements ?? []) as CaseMeasurementRow[];

  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  const firstH = typeof first?.height === 'string' ? parseFloat(first.height) : first?.height;
  const lastH = typeof last?.height === 'string' ? parseFloat(last.height) : last?.height;
  const heightGain = firstH && lastH ? (lastH - firstH).toFixed(1) : null;

  const chartPoints = toChartPoints(measurements, c.birth_date);
  const tableRows = toTableRows(measurements);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className={`rounded-xl py-3 ${getGenderStyle(c.gender).bgLight}`}>
          <p className="text-xs text-gray-500">성별</p>
          <p className={`text-sm font-bold mt-0.5 ${getGenderStyle(c.gender).color}`}>{getGenderStyle(c.gender).label}</p>
        </div>
        <div className="bg-gray-50 rounded-xl py-3">
          <p className="text-xs text-gray-500">목표키</p>
          <p className="text-sm font-bold mt-0.5 text-primary">{c.target_height ? `${c.target_height}cm` : '-'}</p>
        </div>
        <div className="bg-gray-50 rounded-xl py-3">
          <p className="text-xs text-gray-500">성장폭</p>
          <p className="text-sm font-bold mt-0.5 text-green-600">{heightGain ? `+${heightGain}cm` : '-'}</p>
        </div>
      </div>

      {c.father_height && c.mother_height && (
        <div className="flex gap-4 text-sm text-gray-600">
          <span>아빠 {c.father_height}cm</span>
          <span>엄마 {c.mother_height}cm</span>
        </div>
      )}

      {c.special_notes && (
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-sm text-amber-800">{c.special_notes}</p>
        </div>
      )}

      {chartPoints.length > 0 && (
        <GrowthChart gender={c.gender} points={chartPoints} />
      )}

      {measurements.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-800 mb-2">측정 기록</h4>
          <MeasurementTable
            rows={tableRows}
            gender={c.gender}
            showBoneAge
            showPah
            showPercentile
            showPredicted
          />
        </div>
      )}
    </div>
  );
}
