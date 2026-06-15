// Meta 맞춤 타겟(custom audiences) — 광고계정의 리타게팅 풀 목록 조회 + 유사타겟(Lookalike) 생성.
// 순수 매퍼(mapAudience)는 import 부작용 없음 → 단위 테스트 가능. 호출부는 getBundle lazy import.
const GRAPH = 'https://graph.facebook.com/v21.0';

export interface AudienceSummary {
  id: string;
  name: string;
  subtype: string; // WEBSITE | CUSTOM | LOOKALIKE | ENGAGEMENT | VIDEO | ...
  approxCount?: number;
  ready?: boolean; // operation_status.code === 200
}

// Graph customaudience row → 요약. id 없으면 null.
export function mapAudience(r: Record<string, unknown>): AudienceSummary | null {
  const id = r.id ? String(r.id) : '';
  if (!id) return null;
  const count = typeof r.approximate_count === 'number'
    ? r.approximate_count
    : typeof r.approximate_count_lower_bound === 'number' ? r.approximate_count_lower_bound : undefined;
  const opCode = (r.operation_status as { code?: number } | undefined)?.code;
  return {
    id,
    name: String(r.name ?? '(이름 없음)'),
    subtype: String(r.subtype ?? ''),
    approxCount: count,
    ready: opCode === undefined ? undefined : opCode === 200,
  };
}

async function userToken(): Promise<string> {
  const { getBundle } = await import('./metaConnectionStore.js');
  const bundle = await getBundle();
  if (!bundle) throw new Error('Meta 연결이 없습니다(재연결 필요).');
  return bundle.userToken;
}
function actId(externalAccountId: string): string {
  return externalAccountId.startsWith('act_') ? externalAccountId : `act_${externalAccountId}`;
}
function graphErr(j: { error?: Record<string, unknown> }): string {
  const e = j.error;
  if (!e) return 'Graph 오류';
  return String(e['error_user_msg'] || e['message'] || 'Graph 오류');
}

export async function listCustomAudiences(externalAccountId: string): Promise<AudienceSummary[]> {
  const token = await userToken();
  const fields = 'id,name,subtype,approximate_count_lower_bound,operation_status';
  const url = `${GRAPH}/${actId(externalAccountId)}/customaudiences?fields=${fields}&limit=200&access_token=${token}`;
  const res = await fetch(url);
  const j = (await res.json()) as { data?: Array<Record<string, unknown>>; error?: Record<string, unknown> };
  if (j.error) throw new Error(graphErr(j));
  return (j.data ?? []).map(mapAudience).filter((a): a is AudienceSummary => a !== null);
}

export interface CreateLookalikeInput {
  sourceAudienceId: string;
  country: string;
  ratio: number; // 0.01 ~ 0.10 (1~10%)
  name?: string;
}
export async function createLookalike(externalAccountId: string, input: CreateLookalikeInput): Promise<{ id: string }> {
  const token = await userToken();
  if (!input.sourceAudienceId) throw new Error('원본 오디언스가 필요합니다.');
  const ratio = input.ratio > 0 && input.ratio < 1 ? input.ratio : 0.01;
  const lookalikeSpec = { type: 'similarity', country: input.country, ratio };
  const fd = new URLSearchParams();
  fd.append('name', input.name || `유사타겟 ${input.country} ${Math.round(ratio * 100)}%`);
  fd.append('subtype', 'LOOKALIKE');
  fd.append('origin_audience_id', input.sourceAudienceId);
  fd.append('lookalike_spec', JSON.stringify(lookalikeSpec));
  fd.append('access_token', token);
  const res = await fetch(`${GRAPH}/${actId(externalAccountId)}/customaudiences`, { method: 'POST', body: fd });
  const j = (await res.json()) as { id?: string; error?: Record<string, unknown> };
  if (!j.id) throw new Error(graphErr(j));
  return { id: j.id };
}
