import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchReservations, deleteReservation, type ReservationRow } from '../services/reservationService';

// 예약(콜백) 신청 로그 — 한글 하단 바 "예약하기" 폼 접수분.
// PII(실전화)라 anon 직접 read 안 하고 ai-server(service_role, PIN) 경유.

const METHOD_LABEL: Record<string, string> = { phone: '📞 전화', text: '💬 문자' };

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return (iso || '').slice(0, 16); }
}

function srcOf(r: ReservationRow): string {
  if (r.utm?.utm_source) return [r.utm.utm_source, r.utm.utm_medium, r.utm.utm_campaign].filter(Boolean).join(' / ');
  if (r.referrer) { try { return new URL(r.referrer).hostname; } catch { return r.referrer; } }
  return '직접';
}

export function ReservationsView() {
  const [rows, setRows] = useState<ReservationRow[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null); setErr('');
    fetchReservations(500)
      .then((d) => { if (!cancelled) setRows(d); })
      .catch((e) => { if (!cancelled) setErr(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('이 예약 신청을 삭제할까요?')) return;
    setBusy(id);
    try {
      await deleteReservation(id);
      setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (e: unknown) {
      window.alert('삭제 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setBusy(null); }
  }

  const stats = useMemo(() => {
    if (!rows) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let todayCount = 0;
    for (const r of rows) { if (new Date(r.created_at) >= today) todayCount++; }
    return { total: rows.length, today: todayCount };
  }, [rows]);

  return (
    <>
      {err && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ 예약 로그를 불러오지 못했습니다: {err}
          <p className="mt-1 text-xs text-amber-600">
            ai-server 연결 및 <code className="rounded bg-amber-100 px-1">migration 068</code>(reservations 테이블) 적용 여부를 확인하세요.
          </p>
        </div>
      )}

      {!err && rows === null && (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중…</div>
      )}

      {!err && rows !== null && rows.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
          <div className="mb-2 text-3xl">📭</div>
          <p className="text-sm font-semibold text-gray-600">예약 신청이 없습니다</p>
          <p className="mt-1 text-xs text-gray-400">홈페이지 하단 "예약하기"로 접수되면 여기에 쌓입니다.</p>
        </div>
      )}

      {!err && stats && rows && rows.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="총 예약" value={`${stats.total}건`} />
            <Stat label="오늘" value={`${stats.today}건`} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <Th>시간</Th><Th>성명</Th><Th>연락처</Th><Th>방식</Th><Th>상담 내용</Th><Th>유입</Th><Th>{''}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td>{fmtDate(r.created_at)}</Td>
                    <Td className="font-semibold text-gray-900">{r.name}</Td>
                    <Td className="tabular-nums">{r.phone}</Td>
                    <Td>{METHOD_LABEL[r.contact_method ?? ''] ?? '📞 전화'}</Td>
                    <Td className="max-w-[220px] truncate text-gray-600" title={r.message ?? ''}>{r.message || '-'}</Td>
                    <Td className="max-w-[180px] truncate text-xs text-gray-400" title={srcOf(r)}>{srcOf(r)}</Td>
                    <Td>
                      <button onClick={() => handleDelete(r.id)} disabled={busy != null}
                        title="이 예약 삭제"
                        className="rounded-md px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                        {busy === r.id ? '…' : '🗑️'}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '', title }: { children: ReactNode; className?: string; title?: string }) {
  return <td className={`px-3 py-2 whitespace-nowrap ${className}`} title={title}>{children}</td>;
}
