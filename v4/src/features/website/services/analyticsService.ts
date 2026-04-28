// GA4 분석 데이터를 ai-server (/api/analytics) 에서 가져오는 클라이언트.

const AI_SERVER = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:4000';

export interface AnalyticsOverview {
  range: { startDate: string; endDate: string };
  totals: {
    pageViews: number;
    activeUsers: number;
    kakaoConsultClicks: number;
    conversionRate: number;
  };
  daily: Array<{ date: string; pageViews: number; kakaoClicks: number }>;
  topPages: Array<{ path: string; views: number }>;
  kakaoBySource: Array<{ source: string; clicks: number }>;
  byLocale: Array<{ locale: string; pageViews: number; kakaoClicks: number }>;
}

export async function fetchAnalyticsOverview(days: number): Promise<AnalyticsOverview> {
  const res = await fetch(`${AI_SERVER}/api/analytics/overview?days=${days}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `GA4 호출 실패 (${res.status})`);
  }
  return json.data as AnalyticsOverview;
}
