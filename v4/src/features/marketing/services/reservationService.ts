// reservationService.ts — 예약(콜백) 로그 조회/삭제.
// reservations 테이블은 PII(실명·실전화)라 anon 정책이 없다(migration 068) → anon Supabase 로 직접 못 읽음.
// 마케팅 예약 로그는 ai-server(service_role) 경유로만 조회/삭제한다. PIN(WEBSITE_ADMIN_PIN, 기본 8054) 게이트.
const BASE = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const ADMIN_PIN = '8054'; // 마케팅 PIN 과 동일 (ai-server WEBSITE_ADMIN_PIN 기본값)

export interface ReservationRow {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  contact_method: string | null;
  message: string | null;
  locale: string | null;
  status: string | null;
  consent: boolean | null;
  referrer: string | null;
  utm: Record<string, string> | null;
}

export async function fetchReservations(limit = 500): Promise<ReservationRow[]> {
  const resp = await fetch(`${BASE}/api/reservations?limit=${limit}`, {
    headers: { 'x-admin-pin': ADMIN_PIN },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.ok) throw new Error(data?.error || `조회 실패 (${resp.status})`);
  return (data.rows ?? []) as ReservationRow[];
}

export async function deleteReservation(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/api/reservations/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-pin': ADMIN_PIN },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.ok) throw new Error(data?.error || `삭제 실패 (${resp.status})`);
}
