// src/features/marketing/services/metaConnectionService.ts
// Meta 연결 상태/연결시작/해제/발행 — ai-server 프록시(토큰은 절대 클라로 안 옴).
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

// 마케팅 센터(PIN 보호)는 Supabase 로그인을 안 쓰므로, prod ai-server 보호용 공유 시크릿을
// 헤더로 보낸다. 미설정(dev)이면 헤더 없이 호출 — ai-server marketingAuth 가 통과시킨다.
const MARKETING_KEY = import.meta.env.VITE_MARKETING_KEY as string | undefined;
function mkHeaders(base: Record<string, string> = {}): Record<string, string> {
  return MARKETING_KEY ? { ...base, 'x-marketing-key': MARKETING_KEY } : base;
}

export interface MetaConnection {
  connected: boolean;
  userName?: string;
  pages?: Array<{ id: string; name: string; instagram: { id: string; username: string } | null; threadsId: string | null }>;
}

export async function getMetaConnection(): Promise<MetaConnection> {
  const res = await fetch(`${BASE}/api/marketing/meta/connection`, { headers: mkHeaders() });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) return { connected: false };
  return b as MetaConnection;
}

export function startMetaConnect(returnTo: string): void {
  window.location.href = `${BASE}/api/auth/meta?return=${encodeURIComponent(returnTo)}`;
}

export async function disconnectMeta(): Promise<void> {
  const res = await fetch(`${BASE}/api/marketing/meta/connection`, { method: 'DELETE', headers: mkHeaders() });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '연결 해제 실패');
}

// 큐 1건 즉시 발행(meta/website 공용). ai-server executor 경유.
export async function runPublish(queueId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/publish/run`, {
    method: 'POST', headers: mkHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ queueId }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '발행 실패');
  return (b.postId as string) ?? '';
}

// 발행된 채널 게시물 삭제(페이스북만). 큐 행 삭제는 호출 측에서 별도로 수행.
export async function deleteChannelPost(queueId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/marketing/publish/delete-post`, {
    method: 'POST', headers: mkHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ queueId }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '게시물 삭제 실패');
}
