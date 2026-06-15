// Meta 타게팅 — 우리 워크스페이스 모델(지역 spec·관심사 id·노출위치·연령·성별)을
// 실제 Meta Marketing API targeting 객체로 변환 + 타게팅 검색(지역/관심사 자동완성).
//
// 순수 변환부(buildTargetingSpec/mapPlacements)는 import 부작용 없음 → 단위 테스트 가능.
// 검색부(searchAdGeo/searchAdInterest)는 Meta 유저 토큰이 필요해 metaConnectionStore 를
// lazy import (env 없는 테스트 환경에서 import-time throw 회피).

const GRAPH = 'https://graph.facebook.com/v21.0';

// ── 순수 변환부 ────────────────────────────────────────────────────
export interface GeoSpecInput {
  type?: string; // country | region | city | zip
  key?: string;
  name?: string;
  radius?: number;
  distanceUnit?: string;
}
export interface InterestSpecInput {
  id?: string;
  name?: string;
}
export interface TargetingInput {
  geos?: unknown;
  interests?: unknown;
  ageMin?: unknown;
  ageMax?: unknown;
  genders?: unknown;
  locales?: unknown;
  customAudiences?: unknown; // 맞춤 타겟(리타게팅) — {id,name}[] 또는 id 문자열[]
  excludedAudiences?: unknown;
}

// 워크스페이스 노출위치 id → Meta publisher_platforms + 플랫폼별 positions.
const PLACEMENT_MAP: Record<string, { platform: string; position?: string }[]> = {
  feed: [{ platform: 'facebook', position: 'feed' }, { platform: 'instagram', position: 'stream' }],
  stories: [{ platform: 'facebook', position: 'story' }, { platform: 'instagram', position: 'story' }],
  reels: [{ platform: 'facebook', position: 'facebook_reels' }, { platform: 'instagram', position: 'reels' }],
  explore: [{ platform: 'instagram', position: 'explore' }],
  search: [{ platform: 'facebook', position: 'search' }],
  audience_network: [{ platform: 'audience_network', position: 'classic' }],
};

export function mapPlacements(ids: string[]): Record<string, unknown> {
  const platforms = new Set<string>();
  const fb = new Set<string>();
  const ig = new Set<string>();
  const an = new Set<string>();
  for (const id of ids) {
    const entries = PLACEMENT_MAP[id];
    if (!entries) continue;
    for (const e of entries) {
      platforms.add(e.platform);
      if (!e.position) continue;
      if (e.platform === 'facebook') fb.add(e.position);
      else if (e.platform === 'instagram') ig.add(e.position);
      else if (e.platform === 'audience_network') an.add(e.position);
    }
  }
  const out: Record<string, unknown> = {};
  if (platforms.size) out.publisher_platforms = [...platforms];
  if (fb.size) out.facebook_positions = [...fb];
  if (ig.size) out.instagram_positions = [...ig];
  if (an.size) out.audience_network_positions = [...an];
  return out;
}

function parseGeos(v: unknown): GeoSpecInput[] {
  if (!Array.isArray(v)) return [];
  return v.map((g): GeoSpecInput => {
    if (typeof g === 'string') return { name: g }; // 레거시 라벨(키 없음 → 미반영)
    if (g && typeof g === 'object') {
      const o = g as Record<string, unknown>;
      return {
        type: typeof o.type === 'string' ? o.type : undefined,
        key: typeof o.key === 'string' ? o.key : undefined,
        name: typeof o.name === 'string' ? o.name : undefined,
        radius: typeof o.radius === 'number' ? o.radius : undefined,
        distanceUnit: typeof o.distanceUnit === 'string' ? o.distanceUnit : undefined,
      };
    }
    return {};
  });
}

function parseInterests(v: unknown): InterestSpecInput[] {
  if (!Array.isArray(v)) return [];
  return v.map((i): InterestSpecInput => {
    if (typeof i === 'string') return { name: i };
    if (i && typeof i === 'object') {
      const o = i as Record<string, unknown>;
      return {
        id: typeof o.id === 'string' ? o.id : undefined,
        name: typeof o.name === 'string' ? o.name : undefined,
      };
    }
    return {};
  });
}

function parseAudienceIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const a of v) {
    if (typeof a === 'string') {
      if (a) out.push(a);
    } else if (a && typeof a === 'object') {
      const id = (a as Record<string, unknown>).id;
      if (typeof id === 'string' && id) out.push(id);
    }
  }
  return out;
}

function buildGeoLocations(geos: GeoSpecInput[], fallbackCountries: string[]): Record<string, unknown> {
  const countries: string[] = [];
  const regions: { key: string }[] = [];
  const cities: { key: string; radius: number; distance_unit: string }[] = [];
  const zips: { key: string }[] = [];
  for (const g of geos) {
    if (!g.key) continue; // 해석 안 된 라벨은 푸시 불가 → 건너뜀
    if (g.type === 'country') countries.push(g.key);
    else if (g.type === 'region') regions.push({ key: g.key });
    else if (g.type === 'city')
      cities.push({ key: g.key, radius: g.radius && g.radius > 0 ? g.radius : 17, distance_unit: g.distanceUnit === 'mile' ? 'mile' : 'kilometer' });
    else if (g.type === 'zip') zips.push({ key: g.key });
  }
  const geo: Record<string, unknown> = {};
  if (countries.length) geo.countries = countries;
  if (regions.length) geo.regions = regions;
  if (cities.length) geo.cities = cities;
  if (zips.length) geo.zips = zips;
  // 해석된 지역이 하나도 없으면 시장 국가로 폴백(기존 동작 보존).
  if (Object.keys(geo).length === 0) return { countries: fallbackCountries };
  return geo;
}

export function buildTargetingSpec(
  t: TargetingInput,
  opts: { fallbackCountries: string[]; placements?: string[] },
): Record<string, unknown> {
  const geos = parseGeos(t.geos);
  const interests = parseInterests(t.interests).filter((i) => i.id);
  const ageMin = typeof t.ageMin === 'number' ? t.ageMin : 25;
  const ageMax = typeof t.ageMax === 'number' ? t.ageMax : 45;

  const targeting: Record<string, unknown> = {
    geo_locations: buildGeoLocations(geos, opts.fallbackCountries),
    age_min: ageMin,
    age_max: ageMax,
    targeting_automation: { advantage_audience: 0 },
  };

  // 성별: 정확히 1개 선택 시만 지정(0/2개 = 전체).
  const genders = Array.isArray(t.genders)
    ? [...new Set((t.genders as unknown[]).map((g) => (g === 'male' ? 1 : g === 'female' ? 2 : 0)).filter((n) => n === 1 || n === 2))]
    : [];
  if (genders.length === 1) targeting.genders = genders;

  // 관심사: 해석된 id 만 flexible_spec 으로.
  if (interests.length) {
    targeting.flexible_spec = [{ interests: interests.map((i) => ({ id: i.id, name: i.name })) }];
  }

  // 언어(locale id) — UI 미노출이지만 있으면 반영.
  const locales = Array.isArray(t.locales)
    ? (t.locales as unknown[]).map((l) => Number(l)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (locales.length) targeting.locales = locales;

  // 맞춤/제외 타겟(리타게팅·유사타겟) — id 만 있으면 됨.
  const customAudiences = parseAudienceIds(t.customAudiences);
  const excludedAudiences = parseAudienceIds(t.excludedAudiences);
  if (customAudiences.length) targeting.custom_audiences = customAudiences.map((id) => ({ id }));
  if (excludedAudiences.length) targeting.excluded_custom_audiences = excludedAudiences.map((id) => ({ id }));

  // 노출위치 — 선택 시만(미선택=Meta 자동 배분).
  if (opts.placements && opts.placements.length) Object.assign(targeting, mapPlacements(opts.placements));

  return targeting;
}

// ── 검색부(Meta Targeting Search) ──────────────────────────────────
async function userToken(): Promise<string> {
  const { getBundle } = await import('./metaConnectionStore.js');
  const bundle = await getBundle();
  if (!bundle) throw new Error('Meta 연결이 없습니다(재연결 필요).');
  return bundle.userToken;
}

function graphErr(j: { error?: Record<string, unknown> }): string {
  const e = j.error;
  if (!e) return 'Graph 오류';
  return String(e['error_user_msg'] || e['message'] || 'Graph 오류');
}

export interface GeoSearchResult {
  type: string;
  key: string;
  name: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  supportsRadius?: boolean;
}

// 지역 검색(국가/지역/도시). country 주면 region/city 를 해당 국가로 필터(국가 타입은 항상 유지).
export async function searchAdGeo(query: string, country?: string): Promise<GeoSearchResult[]> {
  const q = (query || '').trim();
  if (!q) return [];
  const token = await userToken();
  const locTypes = encodeURIComponent(JSON.stringify(['country', 'region', 'city']));
  const url = `${GRAPH}/search?type=adgeolocation&location_types=${locTypes}&q=${encodeURIComponent(q)}&limit=20&access_token=${token}`;
  const res = await fetch(url);
  const j = (await res.json()) as { data?: Array<Record<string, unknown>>; error?: Record<string, unknown> };
  if (j.error) throw new Error(graphErr(j));
  let rows: GeoSearchResult[] = (j.data ?? [])
    .map((r) => ({
      type: String(r.type ?? ''),
      key: String(r.key ?? r.country_code ?? ''),
      name: String(r.name ?? ''),
      countryCode: r.country_code ? String(r.country_code) : undefined,
      countryName: r.country_name ? String(r.country_name) : undefined,
      region: r.region ? String(r.region) : undefined,
      supportsRadius: r.type === 'city' || r.type === 'zip',
    }))
    .filter((r) => r.key && r.name);
  if (country) {
    const filtered = rows.filter((r) => r.type === 'country' || r.countryCode === country);
    if (filtered.length) rows = filtered;
  }
  return rows;
}

export interface InterestSearchResult {
  id: string;
  name: string;
  audienceLower?: number;
  audienceUpper?: number;
  path?: string[];
}

export async function searchAdInterest(query: string): Promise<InterestSearchResult[]> {
  const q = (query || '').trim();
  if (!q) return [];
  const token = await userToken();
  const url = `${GRAPH}/search?type=adinterest&q=${encodeURIComponent(q)}&limit=20&access_token=${token}`;
  const res = await fetch(url);
  const j = (await res.json()) as { data?: Array<Record<string, unknown>>; error?: Record<string, unknown> };
  if (j.error) throw new Error(graphErr(j));
  return (j.data ?? [])
    .map((r) => {
      const lower = typeof r.audience_size_lower_bound === 'number'
        ? r.audience_size_lower_bound
        : typeof r.audience_size === 'number' ? r.audience_size : undefined;
      return {
        id: String(r.id ?? ''),
        name: String(r.name ?? ''),
        audienceLower: lower,
        audienceUpper: typeof r.audience_size_upper_bound === 'number' ? r.audience_size_upper_bound : undefined,
        path: Array.isArray(r.path) ? (r.path as unknown[]).map(String) : undefined,
      };
    })
    .filter((r) => r.id && r.name);
}
