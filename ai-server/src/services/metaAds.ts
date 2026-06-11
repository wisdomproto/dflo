// Meta Marketing API 푸시 — 워크스페이스 캠페인을 실제 Meta 캠페인→광고세트→광고로 생성.
// v1: 기존 FB 게시물 부스팅(참여형). 라이브 검증된 계약(2026-06-11):
//   campaign: objective + status:PAUSED + special_ad_categories:[] + is_adset_budget_sharing_enabled:false
//   adset(engagement): OUTCOME_ENGAGEMENT → optimization_goal:POST_ENGAGEMENT + destination_type:ON_POST
//                      + promoted_object:{page_id} + billing_event:IMPRESSIONS + bid_strategy
//                      + daily/lifetime_budget(통화 최소단위, KRW=원) + targeting{geo,age,gender,
//                        targeting_automation:{advantage_audience:0}} + start_time
//   ad: adset_id + creative:{object_story_id:"{pageId}_{postId}"} + status:PAUSED
// 업로드 소재(다크 포스트)는 앱 개발 모드에선 object_story_spec 생성이 막혀 →
//   "페이지에 발행(/photos·/videos, published:true) → post_id 부스팅" 우회(검증 2026-06-11).
//   발행한 post_id 를 ad.source_post_id 에 저장해 재푸시 시 중복 발행 안 함.
// 토큰: ads 호출=userToken(ads_management), 페이지 발행=pageAccessToken. 둘 다 metaConnectionStore.
import { getBundle, findPageToken } from './metaConnectionStore.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Sb = import('@supabase/supabase-js').SupabaseClient;
let _sb: Sb | null = null;
async function sbClient(): Promise<Sb> {
  if (_sb) return _sb;
  const { createClient } = await import('@supabase/supabase-js');
  _sb = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } },
  );
  return _sb;
}

// 시장(언어) → Meta 국가코드. 광고 통화/시장과 직교(타겟 국가).
const MARKET_COUNTRY: Record<string, string[]> = {
  ko: ['KR'], th: ['TH'], vi: ['VN'], en: ['US'],
};

// 워크스페이스 objective → Meta ODAX. 부스팅(링크 없는 게시물)은 ENGAGEMENT 만 안전 → 전부 engagement 로 수렴.
// 추후 트래픽/전환(링크·픽셀)은 별도 크리에이티브 경로에서.
type AdsetPlan = { objective: string; optimization_goal: string; destination_type?: string };
function planFor(_objective: string): AdsetPlan {
  // v1: 기존 게시물 부스팅 = 참여
  return { objective: 'OUTCOME_ENGAGEMENT', optimization_goal: 'POST_ENGAGEMENT', destination_type: 'ON_POST' };
}

async function gpost(path: string, body: Record<string, unknown>, token: string): Promise<{ id?: string; error?: Record<string, unknown> }> {
  const fd = new URLSearchParams();
  for (const k of Object.keys(body)) {
    const v = body[k];
    fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  fd.append('access_token', token);
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body: fd });
  return res.json() as Promise<{ id?: string; error?: Record<string, unknown> }>;
}
async function gget(path: string, token: string): Promise<Record<string, unknown>> {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${GRAPH}/${path}${sep}access_token=${token}`);
  return res.json() as Promise<Record<string, unknown>>;
}
function graphErr(j: { error?: Record<string, unknown> }): string {
  const e = j.error;
  if (!e) return 'Graph 오류';
  return String(e['error_user_msg'] || e['error_user_title'] || e['message'] || 'Graph 오류');
}

// 페이지 영상 발행 — 썸네일(thumbUrl) 있으면 multipart thumb 로 같이. 실패 시 무-thumb 폴백.
async function postPageVideo(pageId: string, token: string, mediaUrl: string, caption: string, thumbUrl: string): Promise<{ id?: string; error?: Record<string, unknown> }> {
  if (thumbUrl) {
    try {
      const resp = await fetch(thumbUrl);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const fd = new FormData();
        fd.append('file_url', mediaUrl);
        fd.append('description', caption);
        fd.append('published', 'true');
        fd.append('thumb', new Blob([buf], { type: resp.headers.get('content-type') || 'image/jpeg' }), 'thumb.jpg');
        fd.append('access_token', token);
        const r = await fetch(`${GRAPH}/${pageId}/videos`, { method: 'POST', body: fd });
        const j = (await r.json()) as { id?: string; error?: Record<string, unknown> };
        if (j.id) return j; // 성공 — 우리 썸네일 적용됨
        // thumb 때문일 수 있으니 무-thumb 로 재시도
      }
    } catch { /* 폴백 */ }
  }
  return gpost(`${pageId}/videos`, { file_url: mediaUrl, description: caption, published: true }, token);
}

// 업로드 소재를 FB 페이지에 발행 → 부스팅용 post_id 반환(개발모드 우회).
// 이미지: /photos(post_id 즉시 반환). 영상: /videos(file_url) → 처리완료 폴링 → post_id.
// thumbUrl 있으면 영상 썸네일로 사용(없으면 Meta 자동 = 사실상 첫 프레임).
async function publishCreativeToPage(
  pageId: string, pageToken: string, mediaUrl: string, isVideo: boolean, caption: string, thumbUrl = '',
): Promise<{ postId?: string; error?: string }> {
  if (isVideo) {
    const v = await postPageVideo(pageId, pageToken, mediaUrl, caption, thumbUrl);
    if (!v.id) return { error: graphErr(v) };
    // 동영상 처리 완료 + post_id 생성까지 폴링(최대 ~60초).
    for (let i = 0; i < 24; i++) {
      await sleep(2500);
      const st = await gget(`${v.id}?fields=status,post_id`, pageToken);
      const postId = st.post_id as string | undefined;
      const ready = (st.status as { video_status?: string } | undefined)?.video_status === 'ready';
      if (postId) return { postId };
      if (ready) { await sleep(2000); const again = await gget(`${v.id}?fields=post_id`, pageToken); if (again.post_id) return { postId: again.post_id as string }; }
    }
    return { error: '동영상 처리 시간 초과(나중에 다시 시도).' };
  }
  const ph = await gpost(`${pageId}/photos`, { url: mediaUrl, caption, published: true }, pageToken);
  if (ph.error) return { error: graphErr(ph) };
  const postId = (ph as { post_id?: string }).post_id || (ph.id ? `${pageId}_${ph.id}` : undefined);
  return postId ? { postId } : { error: '발행 post_id 없음' };
}

export interface PushResult {
  ok: boolean;
  metaCampaignId?: string;
  metaAdsetId?: string;
  adIds?: string[];
  warnings: string[];
  error?: string;
}

// 워크스페이스 캠페인 1건 → Meta 에 PAUSED 로 생성. 멱등성은 v1 범위 밖(매번 신규 생성).
export async function pushCampaign(campaignId: string): Promise<PushResult> {
  const warnings: string[] = [];
  const sb = await sbClient();

  const { data: camp } = await sb.from('marketing_ad_campaigns').select('*').eq('id', campaignId).single();
  if (!camp) return { ok: false, warnings, error: '캠페인을 찾을 수 없습니다.' };

  if (!camp.account_id) return { ok: false, warnings, error: '캠페인에 광고 계정이 연결돼 있지 않습니다.' };
  const { data: acc } = await sb.from('marketing_ad_accounts').select('*').eq('id', camp.account_id).single();
  const act = (acc?.external_id as string) || '';
  if (!act || !act.startsWith('act_')) {
    return { ok: false, warnings, error: '광고 계정에 Meta 계정 ID(act_…)가 없습니다. 계정 설정에서 등록하세요.' };
  }

  const bundle = await getBundle();
  if (!bundle) return { ok: false, warnings, error: 'Meta 연결이 없습니다(재연결 필요).' };
  const token = bundle.userToken;

  // 광고세트(워크스페이스는 캠페인당 자동 세트 1개) + 광고
  const { data: sets } = await sb.from('marketing_ad_sets').select('*').eq('campaign_id', campaignId).order('sort_order');
  const set = (sets ?? [])[0] as Record<string, unknown> | undefined;
  if (!set) return { ok: false, warnings, error: '광고 세트가 없습니다(캠페인 편집기에서 저장 필요).' };

  const allAds = (((await sb.from('marketing_ads').select('*').eq('ad_set_id', set.id as string).order('sort_order')).data) ?? []) as Array<Record<string, unknown>>;
  if (allAds.length === 0) return { ok: false, warnings, error: '광고 소재가 없습니다. 소재 선택에서 담으세요.' };

  // 시장 → 타겟 국가
  const market = (camp.market as string) || (camp.language as string) || 'ko';
  const countries = MARKET_COUNTRY[market] ?? ['KR'];

  // 부스팅 대상 FB 페이지: 시장 FB 채널 매핑 우선, 없으면 기존 부스팅 게시물 id 접두에서.
  const { data: fbCh } = await sb.from('marketing_channels')
    .select('meta_page_id').eq('platform', 'facebook').eq('locale', market)
    .not('meta_page_id', 'is', null).limit(1).maybeSingle();
  let pageId = (fbCh?.meta_page_id as string) || '';
  if (!pageId) { const bp = allAds.find((a) => a.source_post_id); if (bp) pageId = (bp.source_post_id as string).split('_')[0]; }
  if (!pageId) return { ok: false, warnings, error: `${market.toUpperCase()} FB 페이지를 찾을 수 없습니다. 채널 설정에서 FB 페이지를 매핑하세요.` };
  const pageToken = findPageToken(bundle, pageId);

  // 각 소재 → 부스팅용 post_id 해석. 업로드 소재(media_url, post 없음)는 페이지에 발행 후 post_id 확보.
  const resolved: Array<{ a: Record<string, unknown>; storyId: string }> = [];
  for (const a of allAds) {
    let storyId = (a.source_post_id as string) || '';
    if (!storyId && a.media_url) {
      if (!pageToken) { warnings.push(`'${(a.name as string) || '소재'}': 페이지 토큰 없음(재연결 필요) — 건너뜀`); continue; }
      const r = await publishCreativeToPage(
        pageId, pageToken, a.media_url as string,
        (a.creative_kind as string) === 'reels', (a.primary_text as string) || '',
        (a.thumbnail_url as string) || '',
      );
      if (!r.postId) { warnings.push(`'${(a.name as string) || '소재'}' 페이지 발행 실패: ${r.error}`); continue; }
      storyId = r.postId;
      // 발행 post_id 저장 → 재푸시 시 중복 발행 안 함.
      await sb.from('marketing_ads').update({ source_post_id: storyId, source_channel: 'facebook' }).eq('id', a.id as string).then(() => undefined, () => undefined);
    }
    if (storyId) resolved.push({ a, storyId });
    else warnings.push(`'${(a.name as string) || '소재'}': 부스팅 가능한 게시물/미디어가 없어 건너뜀`);
  }
  if (resolved.length === 0) return { ok: false, warnings, error: '푸시할 소재가 없습니다(위 경고 참고).' };

  // 예산: 워크스페이스는 세트에 예산. KRW 등 통화 최소단위 그대로.
  const budget = Math.round(Number(set.budget) || 0);
  const budgetType = (set.budget_type as string) === 'lifetime' ? 'lifetime' : 'daily';
  if (budget < 1499) warnings.push('일 예산이 Meta 최소(₩1,499)보다 낮을 수 있습니다 — Meta가 거절하면 예산을 올리세요.');

  // 타겟
  const t = (set.targeting as Record<string, unknown>) ?? {};
  const genders = Array.isArray(t.genders)
    ? (t.genders as string[]).map((g) => (g === 'male' ? 1 : 2)).filter(Boolean)
    : [];
  const targeting: Record<string, unknown> = {
    geo_locations: { countries },
    age_min: typeof t.ageMin === 'number' ? t.ageMin : 25,
    age_max: typeof t.ageMax === 'number' ? t.ageMax : 45,
    targeting_automation: { advantage_audience: 0 },
  };
  if (genders.length === 1) targeting.genders = genders;

  const plan = planFor((camp.objective as string) || 'engagement');
  const startTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분 뒤 시작(PAUSED라 실제 미집행)

  // 1) 캠페인
  const campRes = await gpost(`${act}/campaigns`, {
    name: (camp.name as string) || '187 캠페인',
    objective: plan.objective,
    status: 'PAUSED',
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,
  }, token);
  if (!campRes.id) {
    const error = `캠페인 생성 실패: ${graphErr(campRes)}`;
    await sb.from('marketing_ad_campaigns').update({ meta_push_error: error }).eq('id', campaignId).then(() => undefined, () => undefined);
    return { ok: false, warnings, error };
  }
  const metaCampaignId = campRes.id;

  // 2) 광고세트
  const budgetField = budgetType === 'lifetime' ? 'lifetime_budget' : 'daily_budget';
  const adsetBody: Record<string, unknown> = {
    name: `${(camp.name as string) || '세트'} — 세트`,
    campaign_id: metaCampaignId,
    status: 'PAUSED',
    billing_event: 'IMPRESSIONS',
    optimization_goal: plan.optimization_goal,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    [budgetField]: budget,
    promoted_object: { page_id: pageId },
    targeting,
    start_time: startTime,
  };
  if (plan.destination_type) adsetBody.destination_type = plan.destination_type;
  if (budgetType === 'lifetime') {
    // lifetime 예산은 종료시각 필수
    const end = (set.period_end as string) || new Date(Date.now() + 7 * 86400000).toISOString();
    adsetBody.end_time = new Date(end).toISOString();
  }
  const setRes = await gpost(`${act}/adsets`, adsetBody, token);
  if (!setRes.id) {
    const error = `광고세트 생성 실패: ${graphErr(setRes)}`;
    // 캠페인 롤백(쓰레기 방지)
    await fetch(`${GRAPH}/${metaCampaignId}?access_token=${token}`, { method: 'DELETE' }).catch(() => undefined);
    await sb.from('marketing_ad_campaigns').update({ meta_push_error: error }).eq('id', campaignId).then(() => undefined, () => undefined);
    return { ok: false, warnings, error };
  }
  const metaAdsetId = setRes.id;

  // 3) 광고(소재별) — resolved 의 object_story_id 로 생성
  const adIds: string[] = [];
  for (const { a, storyId } of resolved) {
    const adRes = await gpost(`${act}/ads`, {
      name: (a.name as string) || '187 광고',
      adset_id: metaAdsetId,
      status: 'PAUSED',
      creative: { object_story_id: storyId },
    }, token);
    if (adRes.id) {
      adIds.push(adRes.id);
      await sb.from('marketing_ads').update({ meta_ad_id: adRes.id }).eq('id', a.id as string).then(() => undefined, () => undefined);
    } else {
      warnings.push(`광고 생성 실패(${(a.name as string) || storyId}): ${graphErr(adRes)}`);
    }
  }

  // 4) 매핑 저장(best-effort — 컬럼 없으면 무시)
  await sb.from('marketing_ad_sets').update({ meta_adset_id: metaAdsetId }).eq('id', set.id as string).then(() => undefined, () => undefined);
  await sb.from('marketing_ad_campaigns')
    .update({ meta_campaign_id: metaCampaignId, meta_pushed_at: new Date().toISOString(), meta_push_error: null })
    .eq('id', campaignId).then(() => undefined, () => undefined);

  return {
    ok: adIds.length > 0,
    metaCampaignId,
    metaAdsetId,
    adIds,
    warnings,
    error: adIds.length === 0 ? '광고가 하나도 생성되지 않았습니다(위 경고 참고).' : undefined,
  };
}

// 광고 계정 성과(insights) — 캠페인별 지출/노출/클릭. 워크스페이스 성과 자동 채움용.
export interface AccountInsightRow {
  campaignId: string; campaignName: string;
  spend: number; impressions: number; clicks: number; reach: number; ctr: number; cpc: number;
}
export async function fetchAccountInsights(externalAccountId: string, datePreset = 'maximum'): Promise<AccountInsightRow[]> {
  const bundle = await getBundle();
  if (!bundle) throw new Error('Meta 연결이 없습니다.');
  const act = externalAccountId.startsWith('act_') ? externalAccountId : `act_${externalAccountId}`;
  const fields = 'campaign_id,campaign_name,spend,impressions,clicks,reach,ctr,cpc';
  const url = `${GRAPH}/${act}/insights?level=campaign&fields=${fields}&date_preset=${datePreset}&access_token=${bundle.userToken}`;
  const res = await fetch(url);
  const j = (await res.json()) as { data?: Array<Record<string, string>>; error?: Record<string, unknown> };
  if (j.error) throw new Error(graphErr(j));
  return (j.data ?? []).map((r) => ({
    campaignId: r.campaign_id ?? '',
    campaignName: r.campaign_name ?? '',
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    reach: Number(r.reach ?? 0),
    ctr: Number(r.ctr ?? 0),
    cpc: Number(r.cpc ?? 0),
  }));
}
