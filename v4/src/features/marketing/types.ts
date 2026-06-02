// src/features/marketing/types.ts
export type Competition = 'high' | 'medium' | 'low';

export interface Keyword {
  keyword: string;
  pcSearch: number;
  mobileSearch: number;
  totalSearch: number;
  competition: Competition;
  category: string;
  isGolden: boolean;
}

export type TopicStatus = 'new' | 'done' | 'similar';

export interface Topic {
  id: string;
  category: string;
  categoryName: string;
  title: string;
  angle: string;
  keywords: string[];
  source: string;
  status: TopicStatus;
}

export interface StrategyDoc {
  file: string;
  title: string;
  description: string;
  group: '국내' | '글로벌' | '국가별 작전' | '채널분석';
  order: number;
}

export interface BlogCategory {
  code: string;
  name: string;
  context: string;
}

export interface MarketingConfig {
  brandName: string;
  brandDescription: string;
  targetAudience: string;
  usp: string;
  brandTone: string;
  bannedKeywords: string[];
  marketerName: string;
  marketerExpertise: string;
  marketerStyle: string;
  marketerPhrases: string[];
  blogRules: string;
  blogCategories: BlogCategory[];
  blogImageStyle: string;
  targetLanguages: string[];
  aiModel: string;
}
