import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type {
  Visit,
  HospitalMeasurement,
  Prescription,
  LabTest,
  XrayReading,
  Medication,
} from '@/shared/types';

// ================================================
// Patient Records Service - 187 성장케어 v4
// 환자용 read-only 진료 기록 fetch
//   visits + measurements + prescriptions(+medication name)
//   + lab_tests + xray_readings
// is_intake=true 인 가상 visit 은 제외 (기본 정보용)
// ================================================

export interface PrescriptionWithMed extends Prescription {
  medication_name: string;
  medication_unit?: string | null;
}

export interface PatientVisitRecord {
  visit: Visit;
  measurement: HospitalMeasurement | null;
  prescriptions: PrescriptionWithMed[];
  labTests: LabTest[];
  xrayReadings: XrayReading[];
}

export interface PatientRecords {
  visits: PatientVisitRecord[];
  measurements: HospitalMeasurement[]; // 회차별 1건씩, 최신순
  // 통계용
  visitCount: number;
  boneAgeCount: number;
  prescriptionCount: number;
  labCount: number;
}

/**
 * 한 child 의 모든 진료 데이터를 한 번에 가져온다.
 * is_intake=true 인 가상 visit 은 제외.
 */
export async function fetchPatientRecords(childId: string): Promise<PatientRecords> {
  // 1) visits
  const { data: visitsData, error: vErr } = await supabase
    .from('visits')
    .select('*')
    .eq('child_id', childId)
    .or('is_intake.is.null,is_intake.eq.false')
    .order('visit_date', { ascending: false });
  if (vErr) {
    logger.error('fetchPatientRecords/visits failed', vErr);
    throw new Error('진료 기록을 불러오지 못했습니다.');
  }
  const visits = (visitsData ?? []) as Visit[];
  if (visits.length === 0) {
    return {
      visits: [],
      measurements: [],
      visitCount: 0,
      boneAgeCount: 0,
      prescriptionCount: 0,
      labCount: 0,
    };
  }
  const visitIds = visits.map((v) => v.id);

  // 2) per-table batched fetch (in.[visitIds])
  const [
    measurementsRes,
    prescriptionsRes,
    labsRes,
    xraysRes,
  ] = await Promise.all([
    supabase.from('hospital_measurements').select('*').in('visit_id', visitIds),
    supabase.from('prescriptions').select('*').in('visit_id', visitIds),
    supabase.from('lab_tests').select('*').in('visit_id', visitIds),
    supabase.from('xray_readings').select('*').in('visit_id', visitIds),
  ]);

  if (measurementsRes.error) throw measurementsRes.error;
  if (prescriptionsRes.error) throw prescriptionsRes.error;
  if (labsRes.error) throw labsRes.error;
  if (xraysRes.error) throw xraysRes.error;

  const measurements = (measurementsRes.data ?? []) as HospitalMeasurement[];
  const prescriptions = (prescriptionsRes.data ?? []) as Prescription[];
  const labs = (labsRes.data ?? []) as LabTest[];
  const xrays = (xraysRes.data ?? []) as XrayReading[];

  // 3) medication name 조회 (한 번에)
  const medIds = [...new Set(prescriptions.map((p) => p.medication_id).filter(Boolean))];
  const medMap = new Map<string, Medication>();
  if (medIds.length > 0) {
    const { data: medsData, error: mErr } = await supabase
      .from('medications')
      .select('id, code, name, unit, default_dose')
      .in('id', medIds);
    if (mErr) {
      logger.error('fetchPatientRecords/medications failed', mErr);
      // medication name 없어도 페이지는 동작 — fallback: code 표시
    } else {
      for (const m of (medsData ?? []) as Medication[]) medMap.set(m.id, m);
    }
  }

  // 4) visit 단위 그룹화
  const measByVisit = new Map<string, HospitalMeasurement>();
  for (const m of measurements) {
    // 같은 visit_id 중복 시 가장 최근 한 건만
    const cur = measByVisit.get(m.visit_id);
    if (!cur || (m.measured_date > cur.measured_date)) {
      measByVisit.set(m.visit_id, m);
    }
  }

  const presByVisit = new Map<string, PrescriptionWithMed[]>();
  for (const p of prescriptions) {
    const med = medMap.get(p.medication_id);
    const enriched: PrescriptionWithMed = {
      ...p,
      medication_name: med?.name ?? med?.code ?? '약품명 없음',
      medication_unit: med?.unit ?? null,
    };
    const arr = presByVisit.get(p.visit_id) ?? [];
    arr.push(enriched);
    presByVisit.set(p.visit_id, arr);
  }

  const labsByVisit = new Map<string, LabTest[]>();
  for (const l of labs) {
    const arr = labsByVisit.get(l.visit_id) ?? [];
    arr.push(l);
    labsByVisit.set(l.visit_id, arr);
  }

  const xraysByVisit = new Map<string, XrayReading[]>();
  for (const x of xrays) {
    const arr = xraysByVisit.get(x.visit_id) ?? [];
    arr.push(x);
    xraysByVisit.set(x.visit_id, arr);
  }

  const visitRecords: PatientVisitRecord[] = visits.map((v) => ({
    visit: v,
    measurement: measByVisit.get(v.id) ?? null,
    prescriptions: presByVisit.get(v.id) ?? [],
    labTests: labsByVisit.get(v.id) ?? [],
    xrayReadings: xraysByVisit.get(v.id) ?? [],
  }));

  // 측정 데이터 추출 (성장 그래프용, 최신순)
  const measurementsRaw = visitRecords
    .map((r) => r.measurement)
    .filter((m): m is HospitalMeasurement => !!m);

  return {
    visits: visitRecords,
    measurements: measurementsRaw,
    visitCount: visits.length,
    boneAgeCount: measurementsRaw.filter((m) => m.bone_age != null).length,
    prescriptionCount: prescriptions.length,
    labCount: labs.length,
  };
}
