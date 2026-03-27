import { supabase } from '@/shared/lib/supabase';
import type { WebsiteSection } from '../types/websiteSection';

const TABLE_NAME = 'website_sections';

export async function fetchSections(): Promise<WebsiteSection[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[websiteSectionService] fetchSections error:', err);
    return [];
  }
}

export async function saveSections(sections: WebsiteSection[]): Promise<WebsiteSection[]> {
  try {
    // Delete all existing sections
    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .neq('id', ''); // Delete all rows

    if (deleteError) throw deleteError;

    // Insert new sections
    if (sections.length === 0) return [];

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(
        sections.map((section) => ({
          ...section,
          updatedAt: new Date().toISOString(),
        }))
      )
      .select();

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[websiteSectionService] saveSections error:', err);
    throw err;
  }
}

export async function updateSection(
  id: string,
  updates: Partial<WebsiteSection>
): Promise<WebsiteSection> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[websiteSectionService] updateSection error:', err);
    throw err;
  }
}
