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

// Per-language version of a content's base article. The master row holds the
// Korean original (title/body); other languages live in `translations[lang]`.
export interface ArticleTranslation {
  title: string;
  body: string;
  status?: 'none' | 'translating' | 'completed';
}

export interface MarketingArticle {
  id: string;
  topicId: string | null;
  title: string;
  body: string;
  category: string;
  keywords: string[];
  language: string; // master language (always 'ko' for content-studio articles)
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  confirmed: boolean;
  sortOrder: number;
  translations: Record<string, ArticleTranslation>; // keyed by lang, e.g. { th: {...} }
  blog: BlogSeoMap; // SEO blog (migration 045): per-language structured article
  reels: ReelsMap; // reels (migration 046): per-language video + caption + hashtags
}

// ── SEO blog (migration 045) ────────────────────────────────────────────────
export type BlogSeoLangCode = 'ko' | 'en' | 'th' | 'vi';
export const BLOG_SEO_LANGS: BlogSeoLangCode[] = ['ko', 'en', 'th', 'vi'];
export interface BlogSeoSection {
  heading: string;
  html: string;
  imagePrompt: string;
  imageUrl: string | null;
}
export interface BlogSeoFaq {
  q: string;
  a: string;
}
export interface BlogSeoArticle {
  seoTitle: string;
  slug: string;
  metaDescription: string;
  h1: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  sections: BlogSeoSection[];
  faq: BlogSeoFaq[];
}
export type BlogSeoMap = Partial<Record<BlogSeoLangCode, BlogSeoArticle>>;

// ── Reels (migration 046) ───────────────────────────────────────────────────
// Per-language short-form video (mp4 on R2). Keyed by lang (ko/th/vi/en/ch —
// same set as the top language selector). Caption/hashtags are NOT stored here —
// they are shared (single source) from the cardnews (marketing_cardnews).
export interface ReelsLangData {
  videoUrl: string | null;
}
export type ReelsMap = Partial<Record<string, ReelsLangData>>;

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
  imageUrl: string | null; // legacy(언어공통). 완성 이미지는 images[lang] 사용 — 폐기 예정 백업
  imageY: number; // object-position Y %
  textBlocks: TextBlock[];
  images?: Partial<Record<CardLang, string>>; // 언어별 완성 이미지 (canvas JSONB 내 저장, DDL 불필요)
}

export type CardLang = 'ko' | 'en' | 'th' | 'vi' | 'ch' | 'cn';
export const CARD_LANGS: CardLang[] = ['ko', 'en', 'th', 'vi', 'ch', 'cn'];
export interface CardSlideText {
  headline: string;
  subtext: string;
}

export interface CardnewsSlide {
  id: string;
  cardnewsId: string;
  canvas: CardCanvasData;
  imagePrompt: string;
  sortOrder: number;
  // i18n (migration 044): 일러스트는 언어공통, 텍스트만 언어별
  illustration: string;
  texts: Record<CardLang, CardSlideText>;
  role: string;
  isCta: boolean;
}

export interface Cardnews {
  id: string;
  contentId: string; // → marketing_articles.id
  caption: string;
  hashtags: string[];
  slides: CardnewsSlide[];
  // i18n (migration 044)
  captions: Record<CardLang, string>;
  hashtagsI18n: Record<CardLang, string>;
}

export interface CardnewsTemplate {
  id: string;
  name: string;
  bgColor: string;
  imageY: number;
  textBlocks: TextBlock[];
}
