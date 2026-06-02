import type { HospitalMeasurement } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { predictAdultHeightByBonePercentile } from '@/features/bone-age/lib/growthPrediction';

/** 그 회차의 measurement(=어드민이 헤더에서 보던 PAH) 를 DB 와 일치시킨다.
 *  bone_age + height + child.gender(+nationality) 가 모두 있어야 계산 가능.
 *  실패 시 silent — 저장 자체는 막지 않는다. */
async function syncPahForVisit(visitId: string): Promise<void> {
  try {
    const { data: ms, error: mErr } = await supabase
      .from('hospital_measurements')
      .select('id, child_id, height, bone_age')
      .eq('visit_id', visitId)
      .limit(1);
    if (mErr || !ms || ms.length === 0) return;
    const m = ms[0] as { id: string; child_id: string; height: number | null; bone_age: number | null };
    if (m.bone_age == null || m.height == null) return;

    const { data: cRows, error: cErr } = await supabase
      .from('children')
      .select('gender, nationality')
      .eq('id', m.child_id)
      .limit(1);
    if (cErr || !cRows || cRows.length === 0) return;
    const child = cRows[0] as { gender: string; nationality?: 'KR' | 'CN' };
    if (child.gender !== 'male' && child.gender !== 'female') return;

    const pah = predictAdultHeightByBonePercentile(
      m.height,
      m.bone_age,
      child.gender === 'male' ? 'M' : 'F',
      child.nationality ?? 'KR',
    );
    if (!pah || pah <= 0) return;
    const rounded = Math.round(pah * 10) / 10;

    await supabase
      .from('hospital_measurements')
      .update({ pah: rounded, updated_at: new Date().toISOString() })
      .eq('id', m.id);
  } catch (e) {
    logger.error('syncPahForVisit failed', e);
  }
}

export async function fetchMeasurementsByVisit(visitId: string): Promise<HospitalMeasurement[]> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .select('*')
    .eq('visit_id', visitId)
    .order('measured_date', { ascending: false });
  if (error) {
    logger.error('fetchMeasurementsByVisit failed', error);
    throw new Error('측정 기록을 불러오지 못했습니다.');
  }
  return (data ?? []) as HospitalMeasurement[];
}

export async function createMeasurement(input: {
  visit_id: string;
  child_id: string;
  measured_date: string;
  height: number;
  weight?: number;
  bone_age?: number;
  pah?: number;
  doctor_notes?: string;
}): Promise<HospitalMeasurement> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .insert(input)
    .select()
    .single();
  if (error) {
    logger.error('createMeasurement failed', error);
    throw new Error('측정 기록 저장에 실패했습니다.');
  }
  return data as HospitalMeasurement;
}

export async function updateMeasurement(
  id: string,
  // bone_age 는 null 로 비울 수 있어야 한다(0년 0개월 = 미측정) → Omit 후 재정의.
  patch: Partial<Omit<HospitalMeasurement, 'id' | 'created_at' | 'updated_at' | 'bone_age'>> & {
    bone_age?: number | null;
  },
): Promise<HospitalMeasurement> {
  const { data, error } = await supabase
    .from('hospital_measurements')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error('updateMeasurement failed', error);
    throw new Error('측정 기록 수정에 실패했습니다.');
  }
  return data as HospitalMeasurement;
}

/** Upsert a single field on the measurement row for a visit. Creates the row
 *  if it doesn't exist yet (using visit_date as measured_date). bone_age 또는
 *  height 가 patch 에 있으면 저장 후 PAH 도 자동 재계산해 DB 에 저장한다. */
export async function upsertMeasurementField(input: {
  visit_id: string;
  child_id: string;
  measured_date: string;
  // bone_age 는 null(미측정) 허용.
  patch: Partial<Pick<HospitalMeasurement, 'height' | 'weight' | 'pah' | 'doctor_notes'>> & {
    bone_age?: number | null;
  };
}): Promise<HospitalMeasurement> {
  const existing = await fetchMeasurementsByVisit(input.visit_id);
  let row: HospitalMeasurement;
  if (existing[0]) {
    row = await updateMeasurement(existing[0].id, input.patch);
  } else {
    const { data, error } = await supabase
      .from('hospital_measurements')
      .insert({
        visit_id: input.visit_id,
        child_id: input.child_id,
        measured_date: input.measured_date,
        ...input.patch,
      })
      .select()
      .single();
    if (error) {
      logger.error('upsertMeasurementField failed', error);
      throw new Error('측정 기록 저장에 실패했습니다.');
    }
    row = data as HospitalMeasurement;
  }
  // bone_age / height 변경 시 PAH 도 같이 갱신. patch 에 pah 가 명시적으로
  // 포함된 경우는 사용자가 직접 입력한 값이라 덮어쓰지 않음.
  if (('bone_age' in input.patch || 'height' in input.patch) && !('pah' in input.patch)) {
    await syncPahForVisit(input.visit_id);
    // 최신 행 다시 읽어 calling-side 에 정확한 pah 반환
    const refreshed = await fetchMeasurementsByVisit(input.visit_id);
    if (refreshed[0]) row = refreshed[0];
  }
  return row;
}

export async function updateMeasurementBoneAge(
  visitId: string,
  boneAge: number,
): Promise<void> {
  const { error } = await supabase
    .from('hospital_measurements')
    .update({ bone_age: boneAge, updated_at: new Date().toISOString() })
    .eq('visit_id', visitId);
  if (error) {
    logger.error('updateMeasurementBoneAge failed', error);
    throw new Error('뼈나이 동기화에 실패했습니다.');
  }
  // BA 가 갱신되면 PAH 도 같이 재계산 (DB 일관성).
  await syncPahForVisit(visitId);
}
