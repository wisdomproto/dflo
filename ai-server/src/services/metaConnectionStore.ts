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

export async function getBundle(): Promise<MetaBundle | null> {
  const { data, error } = await sb
    .from('marketing_meta_connection')
    .select('enc_payload')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  try {
    return JSON.parse(decrypt(data[0].enc_payload as string, getEncKey())) as MetaBundle;
  } catch {
    return null;
  }
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
