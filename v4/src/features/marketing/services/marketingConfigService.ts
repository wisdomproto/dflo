// src/features/marketing/services/marketingConfigService.ts
import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';
import type { MarketingConfig, BlogCategory } from '../types';

const EMPTY: MarketingConfig = {
  brandName: '',
  brandDescription: '',
  targetAudience: '',
  usp: '',
  brandTone: '',
  bannedKeywords: [],
  marketerName: '',
  marketerExpertise: '',
  marketerStyle: '',
  marketerPhrases: [],
  blogRules: '',
  blogCategories: [],
  blogImageStyle: '',
  targetLanguages: ['ko'],
  aiModel: 'gemini-2.5-flash',
};

// Keep field lists in sync: 020 migration columns ↔ configToRow ↔ rowToConfig ↔ MarketingConfig.
type Row = Record<string, unknown>;

function rowToConfig(r: Row | null): MarketingConfig {
  if (!r) return { ...EMPTY };
  return {
    brandName: (r.brand_name as string) ?? '',
    brandDescription: (r.brand_description as string) ?? '',
    targetAudience: (r.target_audience as string) ?? '',
    usp: (r.usp as string) ?? '',
    brandTone: (r.brand_tone as string) ?? '',
    bannedKeywords: (r.banned_keywords as string[]) ?? [],
    marketerName: (r.marketer_name as string) ?? '',
    marketerExpertise: (r.marketer_expertise as string) ?? '',
    marketerStyle: (r.marketer_style as string) ?? '',
    marketerPhrases: (r.marketer_phrases as string[]) ?? [],
    blogRules: (r.blog_rules as string) ?? '',
    blogCategories: (r.blog_categories as BlogCategory[]) ?? [],
    blogImageStyle: (r.blog_image_style as string) ?? '',
    targetLanguages: (r.target_languages as string[]) ?? ['ko'],
    aiModel: (r.ai_model as string) ?? 'gemini-2.5-flash',
  };
}

function configToRow(c: MarketingConfig): Row {
  return {
    id: 1,
    brand_name: c.brandName,
    brand_description: c.brandDescription,
    target_audience: c.targetAudience,
    usp: c.usp,
    brand_tone: c.brandTone,
    banned_keywords: c.bannedKeywords,
    marketer_name: c.marketerName,
    marketer_expertise: c.marketerExpertise,
    marketer_style: c.marketerStyle,
    marketer_phrases: c.marketerPhrases,
    blog_rules: c.blogRules,
    blog_categories: c.blogCategories,
    blog_image_style: c.blogImageStyle,
    target_languages: c.targetLanguages,
    ai_model: c.aiModel,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchConfig(): Promise<MarketingConfig> {
  const { data, error } = await supabase
    .from('marketing_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    logger.warn('[marketing] fetchConfig failed:', error.message);
    return { ...EMPTY };
  }
  return rowToConfig(data as Row | null);
}

export async function saveConfig(config: MarketingConfig): Promise<void> {
  const { error } = await supabase
    .from('marketing_config')
    .upsert(configToRow(config), { onConflict: 'id' });
  if (error) throw new Error(error.message);
}
