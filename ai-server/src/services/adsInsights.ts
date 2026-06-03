// ai-server/src/services/adsInsights.ts
// Pure prompt builder for ad-campaign diagnosis. Takes the client-derived campaign
// metrics + GA4 실측 카톡 전환 수, returns a Korean diagnosis prompt string.
// generateText is called by the route (this file stays import-free of gemini).

export interface AdsInsightCampaign {
  name: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

export interface AdsInsightRequest {
  campaigns: AdsInsightCampaign[];
  kakaoClicks: number;
}

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta(페이스북/인스타)',
  google: 'Google',
  youtube: 'YouTube',
  naver: '네이버',
};

function fmtWon(n: number): string {
  return `₩${Math.round(n || 0).toLocaleString('ko-KR')}`;
}

export function buildAdsInsightPrompt(req: AdsInsightRequest): string {
  const campaigns = Array.isArray(req.campaigns) ? req.campaigns : [];
  const kakaoClicks = Number(req.kakaoClicks) || 0;

  const lines = campaigns.map((c, i) => {
    const platform = PLATFORM_LABEL[c.platform] || c.platform || '기타';
    return `${i + 1}. [${platform}] ${c.name || '(이름 없음)'} — 지출 ${fmtWon(c.spend)}, 노출 ${(
      c.impressions || 0
    ).toLocaleString('ko-KR')}, 클릭 ${(c.clicks || 0).toLocaleString('ko-KR')}, 전환 ${(
      c.conversions || 0
    ).toLocaleString('ko-KR')}, 매출 ${fmtWon(c.revenue)} · CTR ${(c.ctr || 0).toFixed(2)}%, CPC ${fmtWon(
      c.cpc,
    )}, CPA ${fmtWon(c.cpa)}, ROAS ${(c.roas || 0).toFixed(2)}`;
  });

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);

  return `당신은 소아 성장 클리닉 "187 성장클리닉"의 퍼포먼스 마케팅 애널리스트입니다.
아래 광고 캠페인 실적을 진단해, 어떤 캠페인이 비효율적인지와 예산 재배분 방향을 제안하세요.

## 캠페인 실적 (${campaigns.length}개)
${lines.length ? lines.join('\n') : '(등록된 캠페인 없음)'}

## 합계
- 총 지출: ${fmtWon(totalSpend)}
- 총 매출: ${fmtWon(totalRevenue)}
- 전체 ROAS: ${totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00'}

## 참고 — 사이트 실측 신호
- 지난 30일 사이트 전체 카카오톡 상담 클릭: ${kakaoClicks.toLocaleString('ko-KR')}회
  (※ 이 수치는 사이트 전체 합계로, 특정 캠페인 전환과 1:1로 귀속되지 않습니다. 추세 참고용입니다.)

## 진단 규칙
1. CPA가 높거나 ROAS가 1 미만(매출 < 지출)인 캠페인을 "비효율"로 지목하고 이유를 설명하세요.
2. CTR이 낮으면(클릭률 문제) 소재/타겟, CPA가 높으면(전환 문제) 랜딩/오디언스 관점으로 구분해 진단하세요.
3. 예산을 어디서 줄이고 어디로 옮길지 구체적으로 제안하세요.
4. 의료 광고법을 준수하고 과장된 효과 보장 표현은 쓰지 마세요.
5. 순수 텍스트로, 한국어로, 항목별 짧은 문단으로 작성하세요 (마크다운/코드블록 금지).

진단 요약을 작성하세요.`;
}
