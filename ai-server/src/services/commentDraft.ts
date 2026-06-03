// ai-server/src/services/commentDraft.ts
// Pure prompt builder for brand-mention reply drafts. Mirrors articleGenerator.ts:
// takes the marketing_config (DB snake_case row) + a mention request, returns a prompt string.
// generateText() is called by the route — this module stays import-free (pure function).

export interface CommentConfig {
  brand_name?: string | null;
  brand_tone?: string | null;
  marketer_name?: string | null;
  marketer_style?: string | null;
  marketer_phrases?: string[] | null;
}

export interface CommentDraftRequest {
  body: string;
  platform?: string;
  sentiment?: string;
  tone?: string;
  language?: string;
}

const PLATFORM_MAP: Record<string, string> = {
  naver_kin: '네이버 지식인 답변',
  naver_blog: '네이버 블로그 댓글',
  naver_cafe: '네이버 카페 댓글',
  blog: '블로그 댓글',
  instagram: '인스타그램 댓글',
  youtube: '유튜브 댓글',
  facebook: '페이스북 댓글',
  threads: '스레드 답글',
  community: '커뮤니티 댓글',
};

const TONE_MAP: Record<string, string> = {
  professional: '전문적이고 신뢰감 있는 톤 (의학적 근거를 곁들이되 어렵지 않게)',
  friendly: '친근하고 따뜻한 톤 (부모 입장에 공감하며 편하게)',
  short: '짧고 간결한 톤 (2~3문장으로 핵심만)',
};

const LANG_LABEL: Record<string, string> = {
  ko: '한국어',
  th: '태국어',
  vi: '베트남어',
  en: '영어',
};

const MAX_BODY = 1000;

export function buildCommentPrompt(config: CommentConfig, req: CommentDraftRequest): string {
  const brand = config.brand_name?.trim() || '187 성장클리닉';
  const platformLabel = PLATFORM_MAP[req.platform ?? ''] || '온라인 댓글';
  const toneLabel = TONE_MAP[req.tone ?? 'professional'] || TONE_MAP.professional;
  const langCode = req.language || 'ko';
  const langLabel = LANG_LABEL[langCode] || langCode;
  const sentiment = (req.sentiment ?? 'neutral').toLowerCase();
  const negativeLine =
    sentiment === 'negative'
      ? '\n- 이 멘션은 부정적입니다. 절대 방어적이거나 논쟁적으로 응대하지 말고, 정중히 공감하며 도움을 제안하세요.'
      : '';
  const phrases = (config.marketer_phrases ?? []).filter(Boolean).join(', ');
  const mentionBody = (req.body ?? '').slice(0, MAX_BODY);

  return `당신은 ${brand}의 마케터로서, 아래 온라인 멘션에 달 자연스러운 답글 초안을 작성합니다.

## 브랜드 / 화자
- 브랜드: ${brand}
${config.brand_tone?.trim() ? `- 브랜드 톤: ${config.brand_tone.trim()}` : ''}
${[config.marketer_name, config.marketer_style].filter(Boolean).join(' · ') ? `- 화자: ${[config.marketer_name, config.marketer_style].filter(Boolean).join(' · ')}` : ''}
${phrases ? `- 즐겨 쓰는 표현: ${phrases}` : ''}

## 멘션 정보
- 노출 위치: ${platformLabel}
- 멘션 본문:
"""
${mentionBody}
"""

## 답글 작성 규칙
- 광고/홍보처럼 들리지 않게, 진짜 사람이 쓴 것처럼 자연스럽게 작성하세요.
- 읽는 사람에게 실질적인 도움(정보·공감·팁)을 주세요. 노골적인 영업·브랜드 자랑은 금지합니다.
- 요청 톤: ${toneLabel}${negativeLine}
- 의료 광고법을 준수하고, 효과를 단정·보장하지 마세요.
- ${langLabel}로 작성하세요.
- 답글 본문만 출력하세요(머리말·따옴표·설명 없이).`;
}
