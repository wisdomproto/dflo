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

export type ArticleStatus = 'draft' | 'done';

export interface MarketingArticle {
  id: string;
  topicId: string | null;
  title: string;
  body: string;
  category: string;
  keywords: string[];
  language: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordHit {
  keyword: string;
  pcSearch: number;
  mobileSearch: number;
  totalSearch: number;
  competition: string;
  cpc: number;
  source: 'naver' | 'google';
}

export interface SavedKeyword {
  keyword: string;
  pcSearch: number;
  mobileSearch: number;
  totalSearch: number;
  competition: string;
  cpc: number;
  source: string;
  createdAt: string;
}

// ── Channel content (Phase 2+) ──────────────────────────────────────────────
export type BlogChannel = 'naver_blog' | 'wordpress';
export type BlogCardType = 'text' | 'image' | 'divider' | 'quote' | 'list';

export interface GlobalCardStyle {
  align?: 'left' | 'center' | 'right' | 'justify';
  headingBold?: boolean;
  bodyBold?: boolean;
  headingFont?: string;
  bodyFont?: string;
  headingSize?: number;
  bodySize?: number;
}

export interface BlogCardContent {
  text?: string;
  url?: string;
  alt?: string;
  caption?: string;
  imagePrompt?: string;
  imageStyle?: string;
}

export interface BlogCard {
  id: string;
  blogContentId: string;
  cardType: BlogCardType;
  content: BlogCardContent;
  sortOrder: number;
}

export interface BlogContent {
  id: string;
  contentId: string; // → marketing_articles.id
  channel: BlogChannel;
  seoTitle: string;
  seoScore: number;
  globalStyle: GlobalCardStyle;
  primaryKeyword: string;
  secondaryKeywords: string[];
  cards: BlogCard[];
}

// ── Cardnews (Phase 3) ──────────────────────────────────────────────────────
export interface TextBlock {
  id: string;
  text: string;
  x: number; // % from left
  y: number; // % from top
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  width: number; // % of card width
  height?: number;
  hidden?: boolean;
  shadow?: boolean;
}

export interface CardCanvasData {
  bgColor: string;
  imageUrl: string | null;
  imageY: number; // object-position Y %
  textBlocks: TextBlock[];
}

export interface CardnewsSlide {
  id: string;
  cardnewsId: string;
  canvas: CardCanvasData;
  imagePrompt: string;
  sortOrder: number;
}

export interface Cardnews {
  id: string;
  contentId: string; // → marketing_articles.id
  caption: string;
  hashtags: string[];
  slides: CardnewsSlide[];
}

export interface CardnewsTemplate {
  id: string;
  name: string;
  bgColor: string;
  imageY: number;
  textBlocks: TextBlock[];
}
