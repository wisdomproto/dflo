// ================================================
// coachingGenerator — 환자 컨텍스트 → Gemini → 식단/잠/운동 코칭 JSON
// ================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { generateText } from './gemini.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export interface CoachingContent {
  meal: string;
  sleep: string;
  exercise: string;
  summary?: string;
}

const SHORT_STATURE_LABELS: Record<string, string> = {
  parents_short: '부모 키 작음',
  parents_height_gap: '부모 키 차이 큼',
  picky_eating: '편식',
  parents_early_stop: '부모 일찍 성장 멈춤',
  insufficient_sleep: '수면 부족',
  chronic_illness: '만성 질환',
};

function ageDecimal(birth: string): number {
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return 0;
  const ms = Date.now() - b.getTime();
  return Math.round((ms / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

/** 환자 컨텍스트를 짧은 한국어 brief 으로 정리 — 토큰 절약 */
async function buildContext(childId: string): Promise<string> {
  const { data: child, error: cErr } = await sb
    .from('children')
    .select(
      'id, name, gender, birth_date, father_height, mother_height, intake_survey',
    )
    .eq('id', childId)
    .single();
  if (cErr || !child) throw new Error(`child not found: ${childId}`);

  // 최근 측정 1건
  const { data: m } = await sb
    .from('hospital_measurements')
    .select('measured_date, height, weight, bone_age, pah')
    .eq('child_id', childId)
    .order('measured_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 최근 7일 daily_routines (식단/수면/운동/수분 패턴)
  const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: routines } = await sb
    .from('daily_routines')
    .select('routine_date, sleep_quality, water_intake_ml, growth_injection, mood, basic_supplements')
    .eq('child_id', childId)
    .gte('routine_date', sevenAgo);

  // 최근 7일 meals 평균 평가
  const routineIds = (routines ?? []).map((r) => (r as { id?: string }).id).filter(Boolean) as string[];
  type MealRow = { is_healthy: boolean | null };
  let meals: MealRow[] = [];
  if (routineIds.length) {
    const { data } = await sb
      .from('meals')
      .select('is_healthy')
      .in('daily_routine_id', routineIds);
    meals = (data ?? []) as MealRow[];
  }

  const survey = (child as { intake_survey: { tanner_stage?: number | null; short_stature_causes?: string[]; chronic_conditions?: string } | null }).intake_survey;
  const causes =
    survey?.short_stature_causes && survey.short_stature_causes.length
      ? survey.short_stature_causes.map((c) => SHORT_STATURE_LABELS[c] ?? c).join(', ')
      : '';

  const lines: string[] = [];
  lines.push(`이름: ${(child as { name: string }).name}`);
  lines.push(
    `${(child as { gender: string }).gender === 'male' ? '남아' : '여아'}, 만 ${ageDecimal((child as { birth_date: string }).birth_date).toFixed(1)}세`,
  );
  if ((child as { father_height: number | null }).father_height || (child as { mother_height: number | null }).mother_height)
    lines.push(`부모 키: 父 ${(child as { father_height: number | null }).father_height ?? '?'} / 母 ${(child as { mother_height: number | null }).mother_height ?? '?'}cm`);
  if (m) lines.push(`최근 키: ${m.height}cm${m.bone_age ? `, 뼈나이 ${m.bone_age}세` : ''}${m.pah ? `, 예측키 ${m.pah}cm` : ''}`);
  if (survey?.tanner_stage) lines.push(`사춘기: Tanner ${survey.tanner_stage}단계`);
  if (causes) lines.push(`키 작은 추정 원인: ${causes}`);
  if (survey?.chronic_conditions) lines.push(`만성 질환: ${survey.chronic_conditions}`);

  // 최근 7일 다이어리 패턴
  if (routines && routines.length) {
    const sleepGood = routines.filter((r) => r.sleep_quality === 'good').length;
    const sleepBad = routines.filter((r) => r.sleep_quality === 'bad').length;
    const avgWater = Math.round(
      routines.reduce((a, r) => a + (r.water_intake_ml ?? 0), 0) / routines.length,
    );
    const injDays = routines.filter((r) => r.growth_injection === true).length;
    lines.push(
      `최근 7일 패턴: 수면 좋음 ${sleepGood}일/별로 ${sleepBad}일, 평균 수분 ${avgWater}ml, 성장주사 ${injDays}일`,
    );
  } else {
    lines.push('최근 7일 다이어리 기록 없음');
  }

  // 식단 평가
  if (meals.length) {
    const good = meals.filter((m) => m.is_healthy === true).length;
    const bad = meals.filter((m) => m.is_healthy === false).length;
    lines.push(`최근 7일 식단 평가: 좋음 ${good}회 / 별로 ${bad}회 (총 ${meals.length}끼 기록)`);
  }

  return lines.join('\n');
}

/**
 * Gemini 호출해서 식단/잠/운동 가이드 JSON 생성.
 * 부드러운 친근체. 환자가 이해하기 쉽게.
 */
async function generateCoaching(context: string): Promise<CoachingContent> {
  const prompt = `다음은 키 성장 클리닉 환자의 정보야.

${context}

위 정보를 바탕으로 환자(어린이/청소년)와 보호자에게 줄 **오늘의 생활 가이드**를 만들어줘.
부드럽고 친근한 한국어 반말체(또는 존댓말체)로, 짧고 행동 가능하게.
의료적 진단/처방 X. 생활습관(식단·잠·운동) 코칭만.

반드시 다음 JSON 형식만 반환해 (다른 말 X):
{
  "meal": "식단 가이드 1~2 문장 (위 환자 데이터의 편식·알러지·키 작은 원인 반영)",
  "sleep": "수면 가이드 1~2 문장 (사춘기·성장호르몬 분비 시간대 강조)",
  "exercise": "운동 가이드 1~2 문장 (점프·스트레칭·성장 자극 운동)",
  "summary": "한 문장 요약 격려 메시지"
}`;

  const raw = await generateText(prompt);
  // JSON parse — Gemini 가 markdown 코드펜스로 감쌀 수 있음
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // 추출 시도 — { 부터 } 까지
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Gemini coaching: JSON parse 실패');
    parsed = JSON.parse(m[0]);
  }
  const obj = parsed as CoachingContent;
  if (!obj.meal || !obj.sleep || !obj.exercise) {
    throw new Error('Gemini coaching: 필수 필드 누락');
  }
  return obj;
}

/**
 * 환자 코칭 카드 가져오기. 오늘 캐시 있으면 재사용, 없거나 force 면 새로 생성.
 */
export async function getOrGenerateCoaching(
  childId: string,
  opts: { force?: boolean } = {},
): Promise<{ content: CoachingContent; date: string; generatedAt: string; cached: boolean }> {
  const today = new Date().toISOString().slice(0, 10);

  if (!opts.force) {
    const { data: existing } = await sb
      .from('coaching_cards')
      .select('content, content_date, generated_at')
      .eq('child_id', childId)
      .eq('content_date', today)
      .maybeSingle();
    if (existing) {
      return {
        content: existing.content as CoachingContent,
        date: existing.content_date,
        generatedAt: existing.generated_at,
        cached: true,
      };
    }
  }

  const ctx = await buildContext(childId);
  const content = await generateCoaching(ctx);

  const { data: upserted, error: upErr } = await sb
    .from('coaching_cards')
    .upsert(
      {
        child_id: childId,
        content_date: today,
        content,
        model: 'gemini-2.5-flash',
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,content_date' },
    )
    .select('content_date, generated_at')
    .single();
  if (upErr) throw upErr;

  return {
    content,
    date: upserted.content_date,
    generatedAt: upserted.generated_at,
    cached: false,
  };
}
