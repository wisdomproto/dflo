import type { Child } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

// ================================================
// Children Service - 187 성장케어 v4
// ================================================

/**
 * 부모 ID로 자녀 목록을 조회합니다.
 */
export async function fetchChildrenByParentId(parentId: string): Promise<Child[]> {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', parentId)
    // .eq('is_active', true) // column does not exist in DB
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch children:', error);
    throw new Error('자녀 목록을 불러오는데 실패했습니다.');
  }

  return data as Child[];
}

/**
 * 자녀 ID로 단일 자녀를 조회합니다.
 */
export async function fetchChildById(id: string): Promise<Child | null> {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    // .eq('is_active', true) // column does not exist in DB
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('Failed to fetch child:', error);
    throw new Error('자녀 정보를 불러오는데 실패했습니다.');
  }

  return data as Child;
}

/**
 * 새 자녀를 등록합니다.
 */
export async function createChild(child: {
  parent_id: string;
  name: string;
  gender: Child['gender'];
  birth_date: string;
  birth_week?: number;
  birth_weight?: number;
  birth_notes?: string;
  father_height?: number;
  mother_height?: number;
}): Promise<Child> {
  const { data, error } = await supabase
    .from('children')
    .insert(child)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create child:', error);
    throw new Error('자녀 등록에 실패했습니다.');
  }

  return data as Child;
}

/**
 * 자녀 정보를 수정합니다.
 */
export async function updateChild(
  id: string,
  updates: Partial<Child>,
): Promise<Child> {
  const { data, error } = await supabase
    .from('children')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update child:', error);
    throw new Error('자녀 정보 수정에 실패했습니다.');
  }

  return data as Child;
}

/**
 * 자녀를 비활성화합니다 (소프트 삭제).
 */
export async function deleteChild(id: string): Promise<void> {
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Failed to delete child:', error);
    throw new Error('자녀 삭제에 실패했습니다.');
  }
}
