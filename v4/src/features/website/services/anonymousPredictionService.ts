// 익명 예측 적재 — 홈페이지 예측키 계산 결과를 anonymous_predictions 에 1행 insert (migration 060).
// fire-and-forget: 실패해도 절대 UX 안 깨짐(전부 swallow). 호출은 공개 iframe 사용분만(HeightCalculator embedded).
import { supabase } from '@/shared/lib/supabase';
import { randomLocaleName, localeToCountry } from '../lib/anonymousName';

export interface PredictionCore {
  locale: string;
  gender: 'male' | 'female';
  birthDate: string; // YYYY-MM-DD
  ageYears: number;
  currentHeight: number;
  predictedHeight: number;
  percentile: number;
  growthStandard: string; // KR/TH
}

// 페이지 로드(탭)당 동일 세션 id — 같은 방문자의 재계산을 나중에 묶기 위함.
function calcSessionId(): string {
  try {
    const k = 'calc_sid';
    let s = sessionStorage.getItem(k);
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(k, s);
    }
    return s;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

// UTM/리퍼러 best-effort: iframe 부모(랜딩) URL 은 document.referrer 에 들어오고 UTM 도 거기 붙는다.
// 임베드 자체 URL(?lang=) 에 utm 이 있으면 그것도 본다. 없으면 null.
function attribution() {
  const ref = (typeof document !== 'undefined' && document.referrer) || '';
  let refSearch = '';
  try { refSearch = new URL(ref).search; } catch { /* ref 가 비었거나 URL 아님 */ }
  const fromRef = new URLSearchParams(refSearch);
  const here = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const pick = (k: string) => fromRef.get(k) || here.get(k) || null;
  return {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_content: pick('utm_content'),
    referrer: ref || null,
  };
}

export async function saveAnonymousPrediction(core: PredictionCore): Promise<void> {
  try {
    const { error } = await supabase.from('anonymous_predictions').insert({
      display_name: randomLocaleName(core.locale),
      locale: core.locale,
      country: localeToCountry(core.locale),
      gender: core.gender,
      birth_date: core.birthDate,
      age_years: Number(core.ageYears.toFixed(2)),
      current_height: core.currentHeight,
      predicted_height: Number(core.predictedHeight.toFixed(1)),
      percentile: Number(core.percentile.toFixed(2)),
      growth_standard: core.growthStandard,
      session_id: calcSessionId(),
      ...attribution(),
    });
    if (error) { /* 익명 적재 실패는 무시 (분석용 데이터) */ }
  } catch {
    /* tracking must never break UX */
  }
}

// 측정 로그 1행 (DB row). admin 조회용 — anon SELECT 정책(migration 061) 필요.
export interface PredictionRow {
  id: string;
  created_at: string;
  display_name: string | null;
  locale: string | null;
  country: string | null;
  gender: string | null;
  birth_date: string | null;
  age_years: number | null;
  current_height: number | null;
  predicted_height: number | null;
  percentile: number | null;
  growth_standard: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  session_id: string | null;
}

// admin 측정 로그 조회 (최근순). migration 061(anon SELECT) 미적용이면 error throw → 페이지가 안내.
export async function fetchAnonymousPredictions(opts?: { limit?: number; country?: string }): Promise<PredictionRow[]> {
  let q = supabase
    .from('anonymous_predictions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 500);
  if (opts?.country) q = q.eq('country', opts.country);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PredictionRow[];
}
