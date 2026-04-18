import type { Child, Measurement, User } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

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

// ---------- Patient List ----------

export interface PatientWithParent extends Child {
  parent?: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
  latestMeasurement?: Measurement;
  measurementCount?: number;
}

export async function fetchPatients(search?: string): Promise<PatientWithParent[]> {
  let query = supabase
    .from('children')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    // Search across name, chart_number, and chart_number partial for quick
    // lookup in the admin patients list.
    query = query.or(
      `name.ilike.%${search}%,chart_number.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch patients:', error);
    throw error;
  }

  const patients = (data ?? []) as Child[];

  // Fetch parent info and latest measurement for each patient
  const enriched: PatientWithParent[] = await Promise.all(
    patients.map(async (patient) => {
      const [parentRes, measurementRes, countRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, email, phone')
          .eq('id', patient.parent_id)
          .maybeSingle(),
        supabase
          .from('hospital_measurements')
          .select('*')
          .eq('child_id', patient.id)
          .order('measured_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('hospital_measurements')
          .select('id', { count: 'exact' })
          .eq('child_id', patient.id),
      ]);

      return {
        ...patient,
        parent: (parentRes.data as PatientWithParent['parent']) ?? undefined,
        latestMeasurement: (measurementRes.data as Measurement) ?? undefined,
        measurementCount: countRes.count ?? 0,
      };
    }),
  );

  return enriched;
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
