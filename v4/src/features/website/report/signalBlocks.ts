import type { BlockId, ReportMeasurement, ReportSurvey } from './types';

// 보편 블록: 트리거 무관 항상 노출(승인된 설계). 순수 조건 블록은 아래 트리거로.
export const ALWAYS_SHOW: BlockId[] = ['sleep', 'nutrition', 'exercise'];

const num = (v?: string) => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

/** 취침 HH:MM 이 늦은지 (>=22:30, 또는 새벽 0~4시) */
function lateBedtime(t?: string): boolean {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return false;
  const [h, m] = t.split(':').map(Number);
  return h < 5 || h * 60 + m >= 22 * 60 + 30;
}

export function selectSignalBlocks(m: ReportMeasurement, s: ReportSurvey): BlockId[] {
  const set = new Set<BlockId>(ALWAYS_SHOW);

  if (lateBedtime(s.sleepTime)) set.add('sleep');
  if (/비염|알러지|알레르기|천식|아토피/.test(s.pastConditions || '')) set.add('inflammation');

  // 사춘기 이른 신호(나이 대비)
  const early =
    (m.gender === 'female' && ((s.menarche?.includes('시작') && m.age < 11) ||
      (/봉우리|뚜렷/.test(s.breastDevelopment || '') && m.age < 9))) ||
    (m.gender === 'male' && s.voiceChange === '시작됨' && m.age < 11) ||
    (/초기|중기/.test(s.pubertyStage || '') && m.age < (m.gender === 'female' ? 9 : 10));
  if (early) set.add('puberty');

  // 유전: 부모키 있으면 노출(카피는 예측 위치별로 signalContent에서 분기)
  if (m.fatherHeight && m.motherHeight) set.add('genetics');

  // 과체중·비만: 간이 BMI 휴리스틱(BMI-for-age 데이터 없음 → 근사, 추후 튜닝)
  const w = num(s.currentWeight);
  if (Number.isFinite(w) && m.currentHeight > 0) {
    const bmi = w / Math.pow(m.currentHeight / 100, 2);
    if (bmi >= 23) set.add('obesity');
  }

  // 성장 속도 저하
  if (/느려|안 자라/.test(s.growthPattern || '') ||
      (Number.isFinite(num(s.yearlyGrowth)) && num(s.yearlyGrowth) < 4)) set.add('growthVelocity');

  // 저출생/조산(SGA)
  if ((Number.isFinite(num(s.birthWeight)) && num(s.birthWeight) < 2.5) ||
      (Number.isFinite(num(s.gestationalWeeks)) && num(s.gestationalWeeks) < 37)) set.add('sga');

  // 스트레스(약신호)
  if (/스트레스|불안|긴장/.test(s.growthConcerns || '')) set.add('stress');

  const order: BlockId[] = ['sleep','inflammation','nutrition','exercise','puberty','genetics','obesity','growthVelocity','sga','stress'];
  return order.filter((id) => set.has(id));
}
