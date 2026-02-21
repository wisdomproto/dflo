import type { Recipe, GrowthCase, GrowthGuide } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

// ================================================
// Content Service - 187 성장케어 v4
// ================================================

/**
 * 활성화된 레시피 목록을 정렬 순서대로 조회합니다.
 */
export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (error) {
    logger.error('Failed to fetch recipes:', error);
    throw new Error('레시피 목록을 불러오는데 실패했습니다.');
  }

  return data as Recipe[];
}

/**
 * 활성화된 성장 사례 목록을 조회합니다.
 */
export async function fetchGrowthCases(): Promise<GrowthCase[]> {
  const { data, error } = await supabase
    .from('growth_cases')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (error) {
    logger.error('Failed to fetch growth cases:', error);
    throw new Error('성장 사례를 불러오는데 실패했습니다.');
  }

  return data as GrowthCase[];
}

/**
 * 활성화된 성장 가이드 목록을 조회합니다.
 * 카테고리로 필터링할 수 있습니다.
 */
export async function fetchGrowthGuides(
  category?: string,
): Promise<GrowthGuide[]> {
  let query = supabase
    .from('growth_guides')
    .select('*')
    .eq('is_published', true);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('order_index', { ascending: true });

  if (error) {
    logger.error('Failed to fetch growth guides:', error);
    throw new Error('성장 가이드를 불러오는데 실패했습니다.');
  }

  return data as GrowthGuide[];
}

