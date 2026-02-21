// ================================================
// Meal Service - 187 성장케어 v4
// 식사 기록 및 사진 관리
// ================================================

import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { Meal, MealPhoto, MealAnalysis, MealType } from '@/shared/types';

const BUCKET = 'meal-photos';

// ------------------------------------------------
// Meals
// ------------------------------------------------

export async function fetchMealsByRoutine(routineId: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('daily_routine_id', routineId)
    .order('meal_type', { ascending: true });

  if (error) {
    logger.error('Failed to fetch meals:', error);
    throw new Error('식사 기록을 불러오는데 실패했습니다.');
  }
  return data as Meal[];
}

export async function upsertMeal(meal: {
  id?: string;
  daily_routine_id: string;
  meal_type: MealType;
  meal_time?: string;
  description?: string;
  is_healthy?: boolean;
  portion_size?: string;
}): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .upsert(meal)
    .select()
    .single();

  if (error) {
    logger.error('Failed to upsert meal:', error);
    throw new Error('식사 기록 저장에 실패했습니다.');
  }
  return data as Meal;
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id);
  if (error) {
    logger.error('Failed to delete meal:', error);
    throw new Error('식사 기록 삭제에 실패했습니다.');
  }
}

// ------------------------------------------------
// Meal Photos
// ------------------------------------------------

export async function fetchPhotosByMeal(mealId: string): Promise<MealPhoto[]> {
  const { data, error } = await supabase
    .from('meal_photos')
    .select('*')
    .eq('meal_id', mealId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch meal photos:', error);
    throw new Error('식사 사진을 불러오는데 실패했습니다.');
  }
  return data as MealPhoto[];
}

export async function fetchPhotosByRoutine(routineId: string): Promise<(MealPhoto & { meal_type: MealType })[]> {
  const { data, error } = await supabase
    .from('meal_photos')
    .select('*, meals!inner(meal_type, daily_routine_id)')
    .eq('meals.daily_routine_id', routineId);

  if (error) {
    logger.error('Failed to fetch photos by routine:', error);
    throw new Error('식사 사진을 불러오는데 실패했습니다.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    meal_id: row.meal_id,
    photo_url: row.photo_url,
    file_name: row.file_name,
    file_size: row.file_size,
    uploaded_at: row.uploaded_at,
    meal_type: row.meals.meal_type as MealType,
  }));
}

/**
 * 사진 파일을 Supabase Storage에 업로드하고, meal_photos 레코드를 생성합니다.
 */
export async function uploadMealPhoto(
  mealId: string,
  file: File,
  childId: string,
): Promise<MealPhoto> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${childId}/${mealId}/${Date.now()}.${ext}`;

  // 1) Storage 업로드
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    logger.error('Failed to upload meal photo:', uploadError);
    throw new Error('사진 업로드에 실패했습니다.');
  }

  // 2) Public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // 3) DB 레코드
  const { data, error } = await supabase
    .from('meal_photos')
    .insert({
      meal_id: mealId,
      photo_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to insert meal photo record:', error);
    throw new Error('사진 기록 저장에 실패했습니다.');
  }
  return data as MealPhoto;
}

/**
 * 사진 삭제 (Storage + DB)
 */
export async function deleteMealPhoto(photo: MealPhoto): Promise<void> {
  // Storage path 추출: publicUrl에서 bucket 이후 경로
  const url = new URL(photo.photo_url);
  const storagePath = url.pathname.split(`/${BUCKET}/`)[1];
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  const { error } = await supabase.from('meal_photos').delete().eq('id', photo.id);
  if (error) {
    logger.error('Failed to delete meal photo:', error);
    throw new Error('사진 삭제에 실패했습니다.');
  }
}

// ------------------------------------------------
// Meal Analyses (AI 분석 결과)
// ------------------------------------------------

export async function saveMealAnalysis(
  mealId: string,
  analysis: {
    menu_name: string;
    ingredients: string[];
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    growth_score: number;
    advice: string;
  },
): Promise<MealAnalysis> {
  // 기존 분석 결과가 있으면 삭제 후 새로 저장 (1 meal = 1 analysis)
  await supabase.from('meal_analyses').delete().eq('meal_id', mealId);

  const { data, error } = await supabase
    .from('meal_analyses')
    .insert({ meal_id: mealId, ...analysis })
    .select()
    .single();

  if (error) {
    logger.error('Failed to save meal analysis:', error);
    throw new Error('분석 결과 저장에 실패했습니다.');
  }
  return data as MealAnalysis;
}

export async function fetchAnalysesByRoutine(
  routineId: string,
): Promise<(MealAnalysis & { meal_type: MealType })[]> {
  const { data, error } = await supabase
    .from('meal_analyses')
    .select('*, meals!inner(meal_type, daily_routine_id)')
    .eq('meals.daily_routine_id', routineId);

  if (error) {
    logger.error('Failed to fetch meal analyses:', error);
    throw new Error('분석 결과를 불러오는데 실패했습니다.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    meal_id: row.meal_id,
    menu_name: row.menu_name,
    ingredients: row.ingredients ?? [],
    calories: row.calories,
    carbs: row.carbs,
    protein: row.protein,
    fat: row.fat,
    growth_score: row.growth_score,
    advice: row.advice,
    created_at: row.created_at,
    meal_type: row.meals.meal_type as MealType,
  }));
}
