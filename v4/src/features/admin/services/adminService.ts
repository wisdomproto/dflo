import type { Child, IntakeSurvey, Measurement, User } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import { regionFromAddress, type Region } from '@/features/admin/utils/region';
import {
  analyzeLabRow,
  deriveGrowthSignals,
  type ClinicalSignals,
} from '@/features/admin/utils/patientCategories';

// ================================================
// Admin Service - 187 성장케어 v4
// 관리자 전용 데이터 서비스
// ================================================

// ---------- Dashboard Stats ----------

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  totalMeasurements: number;
  recipesCount: number;
  guidesCount: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [children, measurements, recipes, guides] = await Promise.all([
    supabase.from('children').select('id, created_at', { count: 'exact' }),
    supabase.from('hospital_measurements').select('id', { count: 'exact' }),
    supabase.from('recipes').select('id', { count: 'exact' }).eq('is_published', true),
    supabase.from('growth_guides').select('id', { count: 'exact' }).eq('is_published', true),
  ]);

  const allChildren = children.data ?? [];
  const activeCount = allChildren.length; // children 테이블에 is_active 컬럼 없음
  const newThisMonth = allChildren.filter((c) => c.created_at >= firstOfMonth).length;

  return {
    totalPatients: allChildren.length,
    activePatients: activeCount,
    newPatientsThisMonth: newThisMonth,
    totalMeasurements: measurements.count ?? 0,
    recipesCount: recipes.count ?? 0,
    guidesCount: guides.count ?? 0,
  };
}

// ---------- Region Distribution ----------

export interface RegionDistribution {
  /** Province / metro counts, keyed by region label ('서울', '경기', '부산', ...). */
  provinces: Record<string, number>;
  /** Seoul 구 counts, keyed by 구 name ('강남구', ...). */
  seoulDistricts: Record<string, number>;
  /** Addresses that failed to resolve to any known region. */
  unknown: number;
  /** 미국 / 해외 거주로 태그된 환자. */
  overseas: number;
  /** Patients with a non-empty address string (== resolved + unknown). */
  totalWithAddress: number;
  /** Grand total, including patients with no address at all. */
  totalPatients: number;
}

export async function fetchRegionDistribution(): Promise<RegionDistribution> {
  const PAGE_SIZE = 1000;
  let from = 0;
  const rows: Array<{ intake_survey: unknown }> = [];
  while (true) {
    const { data, error } = await supabase
      .from('children')
      .select('intake_survey')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      logger.error('fetchRegionDistribution failed:', error);
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as Array<{ intake_survey: unknown }>));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const provinces: Record<string, number> = {};
  const seoulDistricts: Record<string, number> = {};
  let unknown = 0;
  let overseas = 0;
  let totalWithAddress = 0;

  for (const r of rows) {
    const contact = (r.intake_survey as { contact?: { address?: string | null } } | null)?.contact;
    const addr = contact?.address;
    if (!addr || !String(addr).trim()) continue;
    totalWithAddress += 1;
    const reg = regionFromAddress(addr);
    if (!reg) {
      unknown += 1;
      continue;
    }
    if (reg.metro === '해외') {
      overseas += 1;
      continue;
    }
    provinces[reg.metro] = (provinces[reg.metro] ?? 0) + 1;
    if (reg.metro === '서울' && reg.district) {
      seoulDistricts[reg.district] = (seoulDistricts[reg.district] ?? 0) + 1;
    }
  }

  return {
    provinces,
    seoulDistricts,
    unknown,
    overseas,
    totalWithAddress,
    totalPatients: rows.length,
  };
}

// ---------- Patient List ----------

export interface PatientWithParent extends Child {
  parent?: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
  latestMeasurement?: Measurement;
  measurementCount?: number;
  labCount?: number;
  /** Earliest non-intake visit date (YYYY-MM-DD) or undefined if never seen. */
  firstVisitDate?: string;
  /** Most recent non-intake visit date (YYYY-MM-DD). */
  lastVisitDate?: string;
  /** Parsed from `intake_survey.contact.address` — null if unknown. */
  region?: Region | null;
  /** Real clinical signals fed into classifyPatient (Rx / labs / bone age). */
  clinical?: ClinicalSignals;
}

const PAGE = 1000;

// Generic paginator — PostgREST caps a single response at 1000 rows, so any
// table that can exceed that needs explicit paging. Clinical filtering and
// category chips run client-side, so the list page depends on fetching the
// full child+measurement set in one go.
async function fetchAllRows<T>(
  builder: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await builder(from, from + PAGE - 1);
    if (error) {
      logger.error('fetchAllRows failed:', error);
      return out;
    }
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function fetchPatients(search?: string): Promise<PatientWithParent[]> {
  // 1) Fetch children with any search filter applied — paginated so the full
  //    roster is available to client-side category filters.
  const patients = await fetchAllRows<Child>(async (from, to) => {
    let q = supabase
      .from('children')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (search) {
      q = q.or(`name.ilike.%${search}%,chart_number.ilike.%${search}%`);
    }
    const { data, error } = await q;
    return { data: (data ?? []) as Child[], error };
  });
  if (!patients.length) return [];

  // 2) Batch-fetch parent users + all measurements in two queries (not N+1).
  const parentIds = Array.from(
    new Set(patients.map((p) => p.parent_id).filter(Boolean) as string[]),
  );
  const childIds = patients.map((p) => p.id);

  // PostgREST caps a single response at 1000 rows by default, so the full
  // measurement set for every patient (now ~3k rows) won't come back in one
  // request. Paginate explicitly until the page size is short — otherwise
  // patients past the cutoff silently show measurementCount=0.
  async function fetchAllMeasurements(): Promise<Measurement[]> {
    const PAGE = 1000;
    const out: Measurement[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('hospital_measurements')
        .select('id, child_id, measured_date, height, weight, bone_age, pah')
        .in('child_id', childIds)
        .order('measured_date', { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) {
        logger.error('fetchPatients measurements:', error);
        return out;
      }
      if (!data || data.length === 0) break;
      out.push(...(data as Measurement[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  }

  // Lab tests — now pull test_type + result_data so we can derive clinical
  // signals (allergy positives, organic-acid dysbiosis, blood flags), not just
  // a count. Same paging pattern since the ceiling could eventually trip us.
  type LabRow = { child_id: string; test_type: string; result_data: Record<string, unknown> | null };
  async function fetchAllLabs(): Promise<LabRow[]> {
    const out: LabRow[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('lab_tests')
        .select('child_id, test_type, result_data')
        .in('child_id', childIds)
        .range(from, from + PAGE - 1);
      if (error) {
        logger.error('fetchPatients labs:', error);
        return out;
      }
      if (!data || data.length === 0) break;
      out.push(...(data as LabRow[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  }

  // Prescriptions joined to medication_legend.drug_class — gives us the
  // puberty-blocker / sleep-aid signals the classifier needs. We fetch the
  // legend once (small) and map prescriptions → drug class client-side.
  async function fetchAllPrescriptions(): Promise<Array<{ child_id: string; medication_id: string }>> {
    const out: Array<{ child_id: string; medication_id: string }> = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('child_id, medication_id')
        .in('child_id', childIds)
        .range(from, from + PAGE - 1);
      if (error) {
        logger.error('fetchPatients prescriptions:', error);
        return out;
      }
      if (!data || data.length === 0) break;
      out.push(...(data as Array<{ child_id: string; medication_id: string }>));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  }

  // Visits — same paginated pattern so we don't miss dates past the 1000-row cap.
  // `is_intake=false` excludes the virtual first-consult row that every patient
  // has (see Phase 13 notes).
  async function fetchAllVisitDates(): Promise<Array<{ child_id: string; visit_date: string }>> {
    const out: Array<{ child_id: string; visit_date: string }> = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('visits')
        .select('child_id, visit_date')
        .in('child_id', childIds)
        .eq('is_intake', false)
        .range(from, from + PAGE - 1);
      if (error) {
        logger.error('fetchPatients visits:', error);
        return out;
      }
      if (!data || data.length === 0) break;
      out.push(...(data as Array<{ child_id: string; visit_date: string }>));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  }

  const [parentsRes, measurements, labs, visitDates, prescriptions, legendRes] = await Promise.all([
    parentIds.length
      ? supabase.from('users').select('id, name, email, phone').in('id', parentIds)
      : Promise.resolve({ data: [], error: null }),
    fetchAllMeasurements(),
    fetchAllLabs(),
    fetchAllVisitDates(),
    fetchAllPrescriptions(),
    supabase.from('medication_legend').select('medication_id, drug_class'),
  ]);

  if (parentsRes.error) logger.error('fetchPatients parents:', parentsRes.error);
  if (legendRes.error) logger.error('fetchPatients medication_legend:', legendRes.error);

  // 3) Index parents by id, group measurements + lab counts by child_id.
  const parentMap = new Map<string, PatientWithParent['parent']>();
  for (const p of parentsRes.data ?? []) {
    parentMap.set((p as { id: string }).id, p as PatientWithParent['parent']);
  }

  const measurementsByChild = new Map<string, Measurement[]>();
  for (const m of measurements) {
    const arr = measurementsByChild.get(m.child_id) ?? [];
    arr.push(m);
    measurementsByChild.set(m.child_id, arr);
  }

  // Lab counts + per-child lab signal flags in one pass.
  const labCountByChild = new Map<string, number>();
  const labSignalByChild = new Map<
    string,
    { allergyPositive: boolean; organicAcidAbnormal: boolean; bloodAbnormal: boolean }
  >();
  for (const l of labs) {
    labCountByChild.set(l.child_id, (labCountByChild.get(l.child_id) ?? 0) + 1);
    const r = analyzeLabRow(l.test_type, l.result_data);
    const cur = labSignalByChild.get(l.child_id) ?? {
      allergyPositive: false,
      organicAcidAbnormal: false,
      bloodAbnormal: false,
    };
    cur.allergyPositive ||= r.allergy;
    cur.organicAcidAbnormal ||= r.organicAcid;
    cur.bloodAbnormal ||= r.blood;
    labSignalByChild.set(l.child_id, cur);
  }

  // medication_id → drug_class, then drug classes per child.
  const classByMedication = new Map<string, string>();
  for (const row of legendRes.data ?? []) {
    const r = row as { medication_id: string; drug_class: string | null };
    if (r.drug_class) classByMedication.set(r.medication_id, r.drug_class);
  }
  const drugClassesByChild = new Map<string, Set<string>>();
  for (const p of prescriptions) {
    const cls = classByMedication.get(p.medication_id);
    if (!cls) continue;
    const set = drugClassesByChild.get(p.child_id) ?? new Set<string>();
    set.add(cls);
    drugClassesByChild.set(p.child_id, set);
  }

  // Track first/last non-intake visit per child in one pass.
  const visitRangeByChild = new Map<string, { first: string; last: string }>();
  for (const v of visitDates) {
    if (!v.visit_date) continue;
    const cur = visitRangeByChild.get(v.child_id);
    if (!cur) {
      visitRangeByChild.set(v.child_id, { first: v.visit_date, last: v.visit_date });
      continue;
    }
    if (v.visit_date < cur.first) cur.first = v.visit_date;
    if (v.visit_date > cur.last) cur.last = v.visit_date;
  }

  // 4) Assemble without any extra round-trips.
  return patients.map((patient) => {
    const ms = measurementsByChild.get(patient.id) ?? [];
    const range = visitRangeByChild.get(patient.id);
    // intake_survey is typed narrowly in shared/types; contact is stashed by
    // the roster importer under intake_survey.contact.address.
    const contact = (patient.intake_survey as { contact?: { address?: string | null } } | null | undefined)?.contact;
    const region = regionFromAddress(contact?.address ?? null);

    const labSig = labSignalByChild.get(patient.id);
    const growth = deriveGrowthSignals(patient, ms);
    const clinical: ClinicalSignals = {
      drugClasses: drugClassesByChild.get(patient.id) ?? new Set<string>(),
      allergyPositive: labSig?.allergyPositive ?? false,
      organicAcidAbnormal: labSig?.organicAcidAbnormal ?? false,
      bloodAbnormal: labSig?.bloodAbnormal ?? false,
      ...growth,
    };

    return {
      ...patient,
      parent: parentMap.get(patient.parent_id),
      latestMeasurement: ms[0], // already sorted desc by measured_date
      measurementCount: ms.length,
      labCount: labCountByChild.get(patient.id) ?? 0,
      firstVisitDate: range?.first,
      lastVisitDate: range?.last,
      region,
      clinical,
    };
  });
}

// ---------- Create / Delete ----------

export async function createPatient(input: {
  chart_number: string;
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  father_height?: number;
  mother_height?: number;
  desired_height?: number;
  parent_email?: string;
  // Optional intake fields (used by the intake-submission approval flow).
  country?: string;
  name_en?: string;
  phone?: string;
  email?: string;
  address?: string;
  grade?: string;
  class_height_rank?: string;
  intake_survey?: IntakeSurvey | null;
}): Promise<Child> {
  // Reuse the shared "cases" parent user by default so we don't demand a
  // boho account for every new patient. Admin can reassign later via the
  // basic info tab.
  const parentEmail = input.parent_email ?? 'cases@187growth.com';
  let parentId: string | null = null;
  {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', parentEmail)
      .maybeSingle();
    if (existing?.id) {
      parentId = existing.id as string;
    } else {
      const { data: inserted, error } = await supabase
        .from('users')
        .insert({
          email: parentEmail,
          name: '치료 사례 보호자',
          role: 'parent',
          password: 'change-me',
          is_active: true,
        })
        .select('id')
        .single();
      if (error) {
        logger.error('createPatient: create parent failed', error);
        throw new Error('보호자 생성에 실패했습니다.');
      }
      parentId = (inserted as { id: string }).id;
    }
  }
  if (!parentId) throw new Error('보호자 확보 실패');

  const { data, error } = await supabase
    .from('children')
    .insert({
      parent_id: parentId,
      chart_number: input.chart_number,
      name: input.name,
      gender: input.gender,
      birth_date: input.birth_date,
      father_height: input.father_height,
      mother_height: input.mother_height,
      desired_height: input.desired_height,
      country: input.country,
      name_en: input.name_en,
      phone: input.phone,
      email: input.email,
      address: input.address,
      grade: input.grade,
      class_height_rank: input.class_height_rank,
      intake_survey: input.intake_survey ?? undefined,
      is_active: true,
    })
    .select('*')
    .single();
  if (error) {
    logger.error('createPatient failed', error);
    if (/duplicate key|unique/i.test(error.message)) {
      throw new Error(`환자번호 "${input.chart_number}" 가 이미 사용 중입니다.`);
    }
    throw new Error('환자 생성에 실패했습니다.');
  }
  return data as Child;
}

/**
 * 환자번호(chart_number) 정확 일치로 환자 1명 조회. 빠른 데이터 입력
 * 모달에서 이름 자동 채움 + 존재 여부 확인용. 없으면 null.
 */
export async function fetchChildByChartNumber(
  chartNumber: string,
): Promise<{ id: string; name: string; gender: string } | null> {
  const { data, error } = await supabase
    .from('children')
    .select('id, name, gender')
    .eq('chart_number', chartNumber)
    .maybeSingle();
  if (error) {
    logger.error('fetchChildByChartNumber failed', error);
    throw new Error('환자 조회에 실패했습니다.');
  }
  return (data as { id: string; name: string; gender: string } | null) ?? null;
}

/**
 * Delete a patient AND every clinical record hanging off of them
 * (visits CASCADE → measurements, X-ray, labs, prescriptions).
 * Supabase Storage files are NOT cleaned up here.
 */
export async function deletePatient(childId: string): Promise<void> {
  const { error } = await supabase.from('children').delete().eq('id', childId);
  if (error) {
    logger.error('deletePatient failed', error);
    throw new Error('환자 삭제에 실패했습니다.');
  }
}

// ---------- Patient Detail ----------

export async function fetchPatientDetail(childId: string) {
  // is_intake 로 표시된 "첫 상담 가상 visit"의 측정값은 첫 상담 뷰 전용으로만
  // 쓰이고 일반 진료 기록/성장 그래프에는 노출되지 않는다. 해당 measurement
  // 는 FirstConsultPanel 내부에서 `useIntakeVisitAndMeasurement` 로 따로
  // 읽는다.
  const [childRes, intakeVisitsRes, measurementsRes] = await Promise.all([
    supabase.from('children').select('*').eq('id', childId).single(),
    supabase
      .from('visits')
      .select('id')
      .eq('child_id', childId)
      .eq('is_intake', true),
    supabase
      .from('hospital_measurements')
      .select('*')
      .eq('child_id', childId)
      .order('measured_date', { ascending: false }),
  ]);

  if (childRes.error) throw childRes.error;

  const child = childRes.data as Child;

  const { data: parentData } = await supabase
    .from('users')
    .select('id, name, email, phone')
    .eq('id', child.parent_id)
    .maybeSingle();

  const intakeVisitIds = new Set(
    (intakeVisitsRes.data ?? []).map((v) => v.id as string),
  );
  const measurements = ((measurementsRes.data ?? []) as Measurement[]).filter(
    (m) => !intakeVisitIds.has(m.visit_id as string),
  );

  return {
    child,
    measurements,
    parent: parentData as Pick<User, 'id' | 'name' | 'email' | 'phone'> | null,
  };
}

// ---------- Measurement CRUD ----------

export async function addMeasurement(
  measurement: Omit<Measurement, 'id' | 'created_at' | 'updated_at'>,
) {
  const { error } = await supabase.from('hospital_measurements').insert(measurement);
  if (error) {
    logger.error('Failed to add measurement:', error);
    throw error;
  }
}

export async function updateMeasurement(id: string, updates: Partial<Measurement>) {
  const { error } = await supabase
    .from('hospital_measurements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error('Failed to update measurement:', error);
    throw error;
  }
}

export async function deleteMeasurement(id: string) {
  const { error } = await supabase.from('hospital_measurements').delete().eq('id', id);
  if (error) {
    logger.error('Failed to delete measurement:', error);
    throw error;
  }
}

// ---------- Routine Data (Admin) ----------

export interface RoutineSummary {
  date: string;
  hasMeal: boolean;
  hasExercise: boolean;
  hasWater: boolean;
  hasSupplement: boolean;
  hasInjection: boolean;
  hasSleep: boolean;
}

export async function fetchRoutineSummaries(
  childId: string,
  year: number,
  month: number,
): Promise<RoutineSummary[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const { data: routines, error } = await supabase
    .from('daily_routines')
    .select('id, routine_date, water_intake_ml, basic_supplements, extra_supplements, growth_injection, sleep_time, wake_time, sleep_quality')
    .eq('child_id', childId)
    .gte('routine_date', startDate)
    .lt('routine_date', endDate);

  if (error) {
    logger.error('Failed to fetch routines:', error);
    return [];
  }
  if (!routines || routines.length === 0) return [];

  const routineIds = routines.map((r) => r.id);

  // 식사와 운동 기록 한번에 가져오기
  const [mealsRes, exerciseRes] = await Promise.all([
    supabase.from('meals').select('daily_routine_id').in('daily_routine_id', routineIds),
    supabase.from('exercise_logs').select('daily_routine_id').in('daily_routine_id', routineIds),
  ]);

  const mealRoutineIds = new Set((mealsRes.data ?? []).map((m) => m.daily_routine_id));
  const exerciseRoutineIds = new Set((exerciseRes.data ?? []).map((e) => e.daily_routine_id));

  return routines.map((r) => ({
    date: r.routine_date,
    hasMeal: mealRoutineIds.has(r.id),
    hasExercise: exerciseRoutineIds.has(r.id),
    hasWater: (r.water_intake_ml ?? 0) > 0,
    hasSupplement: ((r.basic_supplements as string[])?.length ?? 0) > 0 || ((r.extra_supplements as string[])?.length ?? 0) > 0,
    hasInjection: r.growth_injection === true,
    hasSleep: r.sleep_quality != null || r.sleep_time != null,
  }));
}

// ---------- Patient Data Import (CSV) ----------

export interface ImportRow {
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  father_height?: number;
  mother_height?: number;
  height?: number;
  weight?: number;
  measured_date?: string;
}

export function parseCSV(csv: string): ImportRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 3) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });

    const gender = row.gender === '여' || row.gender === 'female' ? 'female' : 'male';

    rows.push({
      name: row.name || row['이름'] || '',
      gender,
      birth_date: row.birth_date || row['생년월일'] || '',
      father_height: row.father_height ? Number(row.father_height) : undefined,
      mother_height: row.mother_height ? Number(row.mother_height) : undefined,
      height: row.height || row['키'] ? Number(row.height || row['키']) : undefined,
      weight: row.weight || row['체중'] ? Number(row.weight || row['체중']) : undefined,
      measured_date: row.measured_date || row['측정일'] || undefined,
    });
  }

  return rows.filter((r) => r.name && r.birth_date);
}

export async function importPatients(parentId: string, rows: ImportRow[]) {
  let imported = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const { data: child, error: childError } = await supabase
        .from('children')
        .insert({
          parent_id: parentId,
          name: row.name,
          gender: row.gender,
          birth_date: row.birth_date,
          father_height: row.father_height,
          mother_height: row.mother_height,
          // children 테이블에 is_active 컬럼 없음
        })
        .select('id')
        .single();

      if (childError) throw childError;

      if (row.height && child) {
        await supabase.from('hospital_measurements').insert({
          child_id: child.id,
          measured_date: row.measured_date || new Date().toISOString().split('T')[0],
          height: row.height,
          weight: row.weight,
        });
      }

      imported++;
    } catch (err) {
      logger.error(`Failed to import row:`, err);
      failed++;
    }
  }

  return { imported, failed };
}
