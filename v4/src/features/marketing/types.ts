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
  group: '종합 전략' | '국내' | '글로벌' | '국가별 작전' | '채널분석' | '광고 전략' | '치료사례';
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

// 콘텐츠 스튜디오 구분 (migration 055): regular = 62개 토픽 정규 / custom = ad-hoc 릴스
export type ArticleKind = 'regular' | 'custom';

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
  kind: ArticleKind; // 정규/커스텀 (migration 055, 미적용 DB는 'regular' 폴백)
  translations: Record<string, ArticleTranslation>; // keyed by lang, e.g. { th: {...} }
  blog: BlogSeoMap; // SEO blog (migration 045): per-language structured article
  reels: ReelsMap; // reels (migration 046): per-language video + caption + hashtags
  reelAssets: ReelAssets; // 릴스 인포그래픽 이미지 (migration 050): 언어공용 (텍스트 없음, 렌더가 언어별 오버레이)
  blogReferences: BlogReference[]; // 블로그 근거 논문 (migration 049), 아티클 단위·언어 독립
  reelScript: ReelScriptDoc | null;   // 릴 에디터 script (migration 057) — 웹 전용 기록
  reelRuntime: ReelRuntimeDoc | null; // timing/preview/tts_text — 워커 전용 기록(웹은 읽기만)
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

// ── 블로그 근거 논문 (migration 049) ─────────────────────────────────────────
// 아티클 단위(언어 독립) 인용 스냅샷. 매처가 자동 채우고 스튜디오에서 수동 편집.
export interface BlogReference {
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string;        // PubMed link
  similarity: number; // 0~1 (매칭 점수, 배지·정렬용; 수동 추가는 1)
}

// ── Reels (migration 046) ───────────────────────────────────────────────────
// Per-language short-form video (mp4 on R2). Keyed by lang (ko/th/vi/en/ch —
// same set as the top language selector). 정규 콘텐츠의 caption/hashtags 는 카드뉴스
// 단일 소스(여기 저장 안 함). 커스텀 콘텐츠(kind='custom')는 카드뉴스가 없어
// caption/hashtags 를 여기에 직접 저장 — 발행 실행기가 reels[lang].caption 우선,
// 없으면 카드뉴스 폴백.
export interface ReelsLangData {
  videoUrl: string | null;
  coverUrl: string | null; // 인스타 릴스 커버(섬네일) — 언어별 (텍스트가 박혀 있어 per-lang)
  coverAuto?: boolean; // true = 영상 첫 프레임 자동 추출본 → 영상 교체 시 함께 재추출. false = 직접 올린 커버(유지)
  caption?: string; // 커스텀 콘텐츠 전용 (정규는 카드뉴스 공용)
  hashtags?: string; // 커스텀 콘텐츠 전용
}
export type ReelsMap = Partial<Record<string, ReelsLangData>>;

// ── Reel infographic assets (migration 050) ─────────────────────────────────
// 인포그래픽 이미지 = 텍스트 없음(NO text) + 전 언어 공용 1장. 키 = 스토리보드 인포그래픽 id(ig1/ig2/…).
// 텍스트는 렌더(PresenterShort)가 insertLabels 로 언어별 오버레이 → 이미지는 언어 무관.
export interface ReelAssets {
  infographics?: Record<string, string>; // { ig1: '<r2-url>', ... }
}

// ── 릴스 라이트 에디터 (migration 057) ───────────────────────────────────────
export type ReelLang = 'ko' | 'th' | 'vi' | 'en' | 'cn' | 'ch';

export type ReelStickerAnim = 'none' | 'pop' | 'float' | 'pulse' | 'shake';
export interface ReelStickerItem {
  id: string;
  src: string;                 // R2 절대 URL
  kind: 'image' | 'gif';
  x: number; y: number; w: number; rot: number;  // 1080×1920 전체 캔버스 분수(중심 기준), w=가로폭 분수
  fromFrac: number;            // 청크 길이 대비 시작 비율 0~1
  durFrac: number | null;      // null = 청크 끝까지
  anim: ReelStickerAnim;
  loop?: boolean;
}
export type ReelInsertLabel = {
  x: number; y: number;        // 인서트 패널 존 내 분수 (캔버스 분수와 다른 좌표계!)
  size?: number; weight?: number; color?: string; pill?: string;
} & Partial<Record<ReelLang, string>>;
// 청크: 언어 필드(ko, cap_ko, hl_ko, …)가 동적 키라 Record 합성. start/end 등 기존 필드 라운드트립 보존.
export type ReelChunk = {
  id: string;
  insert?: string;             // R2 절대 URL (시드 시 치환)
  insertLabels?: ReelInsertLabel[];
  stickers?: ReelStickerItem[];
} & Record<string, unknown>;
export interface ReelScriptDoc {
  slug: string;
  script: {
    header: Record<string, { top: string; mark: string }>;
    headerStyle?: { markBg?: string; markFg?: string };
    cta?: Record<string, string>;
    chunks: ReelChunk[];
  } & Record<string, unknown>; // title/_note/fps 등 미편집 필드 보존
}
export interface ReelTimingEntry { id: string; durFrames: number; origStartF: number; rate: number; natSec?: number }
export interface ReelRuntimeDoc {
  timing?: Partial<Record<ReelLang, ReelTimingEntry[]>>;
  preview?: Partial<Record<ReelLang, { lipsyncUrl: string; audio: Record<string, string> }>>;
  tts_text?: Partial<Record<ReelLang, Record<string, string>>>;
}
export type ReelJobStatus = 'queued' | 'claimed' | 'tts' | 'lipsync' | 'upload_preview' | 'render' | 'upload' | 'done' | 'failed';
export interface ReelJob {
  id: string; articleId: string; slug: string; lang: ReelLang;
  kind: 'render' | 'full'; status: ReelJobStatus;
  progressNote: string | null; error: string | null;
  requestedAt: string; startedAt: string | null; finishedAt: string | null; updatedAt: string;
}
export interface ReelStickerAsset {
  id: string; name: string; category: 'sticker' | 'emoji';
  url: string; kind: 'image' | 'gif'; createdAt: string;
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
