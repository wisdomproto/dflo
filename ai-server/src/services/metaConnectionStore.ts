// marketing_meta_connection CRUD. 토큰 묶음은 암호화 저장. 토큰은 절대 클라로 안 나간다.
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt, getEncKey } from './metaCrypto.js';

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } },
);

export interface MetaPage {
  id: string;
  name: string;
  pageAccessToken: string;
  instagram: { id: string; username: string } | null;
  threadsId: string | null;
}
export interface MetaBundle {
  userToken: string;
  userId: string;
  userName: string;
  pages: MetaPage[];
  connectedAt: string;
}

export async function saveConnection(bundle: MetaBundle, expiresAt: string | null): Promise<void> {
  const enc_payload = encrypt(JSON.stringify(bundle), getEncKey());
  const { error } = await sb.from('marketing_meta_connection').upsert(
    {
      meta_user_id: bundle.userId,
      meta_user_name: bundle.userName,
      enc_payload,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'meta_user_id' },
  );
  if (error) throw new Error(error.message);
}

// 실패 원인을 구분해 돌려준다. 셋(조회 실패·연결 없음·복호화 실패)을 다 null 로 뭉개면
// 전부 "Meta 연결이 없습니다" 로 보고돼 진단이 막힌다 — ★getEncKey() 가 try 안이라
// META_TOKEN_ENC_KEY 누락도 '연결 없음' 으로 둔갑한다.
//
// 조회는 짧게 재시도한다: 이 한 번의 읽기가 실패하면 발행 전체가 15/60/180분 뒤로 밀리는데,
// 실제로 ko/th/en·IG/FB 를 가리지 않고 간헐 실패했고(영어 IG 는 재시도 3번을 다 태우고 최종 failed)
// 서버는 replica 1개라 인스턴스 차이가 아니다 = 읽기 자체가 가끔 튄다(ai-server 는 암스테르담).
export async function getBundleResult(): Promise<{ bundle: MetaBundle | null; reason?: string }> {
  let data: Array<{ enc_payload: string }> | null = null;
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    const res = await sb
      .from('marketing_meta_connection')
      .select('enc_payload')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (!res.error) { data = res.data as Array<{ enc_payload: string }> | null; break; }
    lastErr = res.error.message;
  }
  if (lastErr && !data) return { bundle: null, reason: `연결 조회 실패(3회 재시도): ${lastErr}` };
  if (!data || data.length === 0) return { bundle: null, reason: '저장된 연결 없음(재연결 필요)' };
  try {
    return { bundle: JSON.parse(decrypt(data[0].enc_payload as string, getEncKey())) as MetaBundle };
  } catch (e) {
    return { bundle: null, reason: `토큰 복호화 실패(META_TOKEN_ENC_KEY 확인): ${e instanceof Error ? e.message : ''}` };
  }
}

export async function getBundle(): Promise<MetaBundle | null> {
  const { bundle, reason } = await getBundleResult();
  if (!bundle) console.error('[meta] 연결 사용 불가 —', reason);
  return bundle;
}

export async function getConnectionPublic(): Promise<{
  connected: boolean;
  userName?: string;
  pages?: Array<{ id: string; name: string; instagram: { id: string; username: string } | null; threadsId: string | null }>;
}> {
  const b = await getBundle();
  if (!b) return { connected: false };
  return {
    connected: true,
    userName: b.userName,
    pages: b.pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram, threadsId: p.threadsId })),
  };
}

export function findPageToken(bundle: MetaBundle, targetId: string): string | null {
  for (const p of bundle.pages) {
    if (p.id === targetId || p.instagram?.id === targetId || p.threadsId === targetId) {
      return p.pageAccessToken;
    }
  }
  return null;
}

export async function deleteConnection(): Promise<void> {
  const { error } = await sb.from('marketing_meta_connection').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(error.message);
}

// /me/accounts 에 안 나오는 비즈니스 포트폴리오 소유 페이지(예: IG 연결 후 자산화) 보강용.
// 이미 채널로 등록된 page_id 들을 fetchAccounts 에서 직접 조회해 bundle 에 합친다.
export async function getRegisteredPageIds(): Promise<string[]> {
  const { data, error } = await sb.from('marketing_channels').select('meta_page_id').not('meta_page_id', 'is', null);
  if (error || !data) return [];
  return [...new Set(data.map((r) => (r as { meta_page_id: string }).meta_page_id).filter(Boolean))];
}
