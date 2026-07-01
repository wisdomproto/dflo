import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchAnonymousPredictions,
  deleteAnonymousPrediction,
  deleteAllAnonymousPredictions,
  type PredictionRow,
} from '@/features/website/services/anonymousPredictionService';

// 홈페이지 익명 예측키 측정 로그 (anonymous_predictions). 기존 admin 환자 페이지처럼 v4 anon 클라로 직접 읽음
// (PII 없는 익명 데이터 + AdminRoute 가드). 적재는 공개 계산기(embedded) 측정 완료 시 anon insert.
// 삭제(테스트·스팸 정리)는 migration 062(anon DELETE) 필요.

const COUNTRY_LABEL: Record<string, string> = { KR: '🇰🇷 한국', TH: '🇹🇭 태국', VN: '🇻🇳 베트남', EN: '🇺🇸 영어권' };
const GENDER_LABEL: Record<string, string> = { male: '남', female: '여' };

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return (iso || '').slice(0, 16); }
}

function srcOf(r: PredictionRow): string {
  if (r.utm_source) return [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(' / ');
  if (r.referrer) { try { return new URL(r.referrer).hostname; } catch { return r.referrer; } }
  return '직접';
}

export default function PredictionsLogPage() {
  const [rows, setRows] = useState<PredictionRow[] | null>(null);
  const [err, setErr] = useState('');
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // 삭제 중인 row id 또는 'all'

  useEffect(() => {
    let cancelled = false;
    setRows(null); setErr('');
    fetchAnonymousPredictions({ limit: 500, country: country || undefined })
      .then((d) => { if (!cancelled) setRows(d); })
      .catch((e) => { if (!cancelled) setErr(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, [country]);

  async function handleDelete(id: string) {
    if (!window.confirm('이 측정 기록을 삭제할까요?')) return;
    setBusy(id);
    try {
      await deleteAnonymousPrediction(id);
      setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (e: unknown) {
      window.alert('삭제 실패: ' + (e instanceof Error ? e.message : String(e)) + '\n(migration 062 적용 여부 확인)');
    } finally { setBusy(null); }
  }

  async function handleDeleteAll() {
    if (!rows?.length) return;
    if (!window.confirm(`현재 표시된 ${rows.length}건을 전부 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy('all');
    try {
      await deleteAllAnonymousPredictions();
      setRows([]);
    } catch (e: unknown) {
      window.alert('삭제 실패: ' + (e instanceof Error ? e.message : String(e)) + '\n(migration 062 적용 여부 확인)');
    } finally { setBusy(null); }
  }

  const stats = useMemo(() => {
    if (!rows) return null;
    const byCountry: Record<string, number> = {};
    let male = 0, female = 0, sumPred = 0, nPred = 0;
    for (const r of rows) {
      if (r.country) byCountry[r.country] = (byCountry[r.country] ?? 0) + 1;
      if (r.gender === 'male') male++; else if (r.gender === 'female') female++;
      if (r.predicted_height != null) { sumPred += Number(r.predicted_height); nPred++; }
    }
    return { total: rows.length, byCountry, male, female, avgPred: nPred ? sumPred / nPred : 0 };
  }, [rows]);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">📈 예측키 측정 로그</h1>
          <p className="mt-0.5 text-xs text-gray-400">홈페이지 익명 계산기 측정 결과 · 최신순 (최대 500건)</p>
        </div>
        <div className="flex items-center gap-2">
          {rows && rows.length > 0 && (
            <button onClick={handleDeleteAll} disabled={busy != null}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-40">
              {busy === 'all' ? '삭제 중…' : '🗑️ 전체 삭제'}
            </button>
          )}
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
            <option value="">전체 국가</option>
            <option value="KR">🇰🇷 한국</option>
            <option value="TH">🇹🇭 태국</option>
            <option value="VN">🇻🇳 베트남</option>
            <option value="EN">🇺🇸 영어권</option>
          </select>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ 데이터를 불러오지 못했습니다: {err}
          <p className="mt-1 text-xs text-amber-600">
            <code className="rounded bg-amber-100 px-1">migration 061</code>(anon SELECT 정책)이 아직 적용되지 않았을 수 있습니다 — Supabase 대시보드에서 적용하세요.
          </p>
        </div>
      )}

      {!err && rows === null && (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중…</div>
      )}

      {!err && rows !== null && rows.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
          <div className="mb-2 text-3xl">📭</div>
          <p className="text-sm font-semibold text-gray-600">측정 데이터가 없습니다</p>
          <p className="mt-1 text-xs text-gray-400">홈페이지에서 예측키 측정이 완료되면 여기에 쌓입니다.</p>
        </div>
      )}

      {!err && stats && rows && rows.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="총 측정" value={`${stats.total}건`} />
            <Stat label="남 / 여" value={`${stats.male} / ${stats.female}`} />
            <Stat label="평균 예측키" value={stats.avgPred ? `${stats.avgPred.toFixed(1)}cm` : '-'} />
            <Stat label="국가 분포" value={Object.entries(stats.byCountry).map(([k, v]) => `${k} ${v}`).join(' · ') || '-'} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <Th>시간</Th><Th>국적</Th><Th>이름</Th><Th>성별</Th><Th>만나이</Th>
                  <Th>현재키</Th><Th>예측키</Th><Th>백분위</Th><Th>유입</Th><Th>{''}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td>{fmtDate(r.created_at)}</Td>
                    <Td>{COUNTRY_LABEL[r.country ?? ''] ?? r.country ?? '-'}</Td>
                    <Td>{r.display_name ?? '-'}</Td>
                    <Td>{GENDER_LABEL[r.gender ?? ''] ?? '-'}</Td>
                    <Td>{r.age_years != null ? `${Number(r.age_years).toFixed(1)}세` : '-'}</Td>
                    <Td>{r.current_height != null ? `${r.current_height}cm` : '-'}</Td>
                    <Td className="font-semibold text-[#0F6E56]">{r.predicted_height != null ? `${r.predicted_height}cm` : '-'}</Td>
                    <Td>{r.percentile != null ? `${Number(r.percentile).toFixed(0)}%` : '-'}</Td>
                    <Td className="max-w-[180px] truncate text-xs text-gray-400" title={srcOf(r)}>{srcOf(r)}</Td>
                    <Td>
                      <button onClick={() => handleDelete(r.id)} disabled={busy != null}
                        title="이 기록 삭제"
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
    </div>
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
