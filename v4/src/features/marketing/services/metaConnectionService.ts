// src/features/marketing/services/metaConnectionService.ts
// Meta 연결 상태/연결시작/해제/발행 — ai-server 프록시(토큰은 절대 클라로 안 옴).
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export interface MetaConnection {
  connected: boolean;
  userName?: string;
  pages?: Array<{ id: string; name: string; instagram: { id: string; username: string } | null; threadsId: string | null }>;
}

export async function getMetaConnection(): Promise<MetaConnection> {
  const res = await fetch(`${BASE}/api/marketing/meta/connection`);
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) return { connected: false };
  return b as MetaConnection;
}

export function startMetaConnect(returnTo: string): void {
  window.location.href = `${BASE}/api/auth/meta?return=${encodeURIComponent(returnTo)}`;
}

export async function disconnectMeta(): Promise<void> {
  const res = await fetch(`${BASE}/api/marketing/meta/connection`, { method: 'DELETE' });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '연결 해제 실패');
}

// 큐 1건 즉시 발행(meta/website 공용). ai-server executor 경유.
export async function runPublish(queueId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/marketing/publish/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.success) throw new Error(b.error || '발행 실패');
  return (b.postId as string) ?? '';
}
