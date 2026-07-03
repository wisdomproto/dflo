import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchGrowthReports,
  deleteGrowthReport,
  deleteAllGrowthReports,
  type GrowthReportRow,
} from '@/features/website/services/growthReportService';
import { selectSignalBlocks, ALWAYS_SHOW } from '@/features/website/report/signalBlocks';
import type { BlockId } from '@/features/website/report/types';

// 설문 완료(맞춤 리포트) 로그 — growth_reports 를 anon 으로 직접 읽음 (migration 067). PIN 게이트 뷰.
// 예측키 측정과 달리 실제 설문 답변 기반 '신호'(걱정 항목)까지 표시 → 상담 성향 파악용.

const GENDER_LABEL: Record<string, string> = { male: '남', female: '여' };
const BLOCK_LABEL: Record<BlockId, string> = {
  sleep: '😴수면', inflammation: '🤧염증', nutrition: '🥩영양', exercise: '🏃운동',
  puberty: '⏳사춘기', genetics: '🧬유전', obesity: '⚖️비만', growthVelocity: '📉성장느림',
  sga: '👶저출생', stress: '😔스트레스',
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return (iso || '').slice(0, 16); }
}

function srcOf(r: GrowthReportRow): string {
  const u = r.utm;
  if (u?.utm_source) return [u.utm_source, u.utm_medium, u.utm_campaign].filter(Boolean).join(' / ');
  if (u?.referrer) { try { return new URL(u.referrer).hostname; } catch { return u.referrer; } }
  return '직접';
}

// 항상 노출(수면·영양·운동) 제외한, 그 아이의 '특이 신호'만
function signals(r: GrowthReportRow): string[] {
  if (!r.measurement || !r.survey) return [];
  try {
    return selectSignalBlocks(r.measurement, r.survey)
      .filter((id) => !ALWAYS_SHOW.includes(id))
      .map((id) => BLOCK_LABEL[id] ?? id);
  } catch { return []; }
}

export function SurveyReportsView() {
  const [rows, setRows] = useState<GrowthReportRow[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null); setErr('');
    fetchGrowthReports({ limit: 500 })
      .then((d) => { if (!cancelled) setRows(d); })
      .catch((e) => { if (!cancelled) setErr(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('이 설문 기록을 삭제할까요?')) return;
    setBusy(id);
    try {
      await deleteGrowthReport(id);
      setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (e: unknown) {
      window.alert('삭제 실패: ' + (e instanceof Error ? e.message : String(e)) + '\n(migration 067 적용 여부 확인)');
    } finally { setBusy(null); }
  }

  async function handleDeleteAll() {
    if (!rows?.length) return;
    if (!window.confirm(`표시된 ${rows.length}건을 전부 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy('all');
    try { await deleteAllGrowthReports(); setRows([]); }
    catch (e: unknown) { window.alert('삭제 실패: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setBusy(null); }
  }

  const stats = useMemo(() => {
    if (!rows) return null;
    let male = 0, female = 0, withParent = 0;
    const sigCount: Record<string, number> = {};
    for (const r of rows) {
      const g = r.measurement?.gender;
      if (g === 'male') male++; else if (g === 'female') female++;
      if (r.survey?.fatherHeight && r.survey?.motherHeight) withParent++;
      for (const s of signals(r)) sigCount[s] = (sigCount[s] ?? 0) + 1;
    }
    const topSig = Object.entries(sigCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(' · ');
    return { total: rows.length, male, female, withParent, topSig };
  }, [rows]);

  return (
    <>
      {rows && rows.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button onClick={handleDeleteAll} disabled={busy != null}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-40">
            {busy === 'all' ? '삭제 중…' : '🗑️ 전체 삭제'}
          </button>
        </div>
      )}

      {err && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ 데이터를 불러오지 못했습니다: {err}
          <p className="mt-1 text-xs text-amber-600">
            <code className="rounded bg-amber-100 px-1">migration 067</code>(growth_reports anon SELECT)이 아직 적용되지 않았을 수 있습니다 — Supabase 대시보드에서 적용하세요.
          </p>
        </div>
      )}

      {!err && rows === null && <div className="py-12 text-center text-sm text-gray-400">불러오는 중…</div>}

      {!err && rows !== null && rows.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
          <div className="mb-2 text-3xl">📝</div>
          <p className="text-sm font-semibold text-gray-600">설문 완료 데이터가 없습니다</p>
          <p className="mt-1 text-xs text-gray-400">측정 후 설문까지 완료하면 여기에 쌓입니다.</p>
        </div>
      )}

      {!err && stats && rows && rows.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="총 설문" value={`${stats.total}건`} />
            <Stat label="남 / 여" value={`${stats.male} / ${stats.female}`} />
            <Stat label="부모키 입력" value={`${stats.withParent}건`} />
            <Stat label="주요 신호" value={stats.topSig || '-'} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <Th>시간</Th><Th>이름</Th><Th>성별</Th><Th>만나이</Th><Th>현재키</Th><Th>예측키</Th>
                  <Th>백분위</Th><Th>부모키(부/모)</Th><Th>신호</Th><Th>유입</Th><Th>리포트</Th><Th>{''}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const m = r.measurement, s = r.survey;
                  const sig = signals(r);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <Td>{fmtDate(r.created_at)}</Td>
                      <Td>{s?.childName || '-'}</Td>
                      <Td>{GENDER_LABEL[m?.gender ?? ''] ?? '-'}</Td>
                      <Td>{m?.age != null ? `${Number(m.age).toFixed(1)}세` : '-'}</Td>
                      <Td>{m?.currentHeight != null ? `${m.currentHeight}cm` : '-'}</Td>
                      <Td className="font-semibold text-[#0F6E56]">{m?.predicted != null ? `${m.predicted}cm` : '-'}</Td>
                      <Td>{m?.percentile != null ? `${Number(m.percentile).toFixed(0)}%` : '-'}</Td>
                      <Td className="text-xs text-gray-500">{s?.fatherHeight || s?.motherHeight ? `${s?.fatherHeight || '-'}/${s?.motherHeight || '-'}` : '-'}</Td>
                      <Td className="max-w-[200px] whitespace-normal text-xs" title={s?.growthConcerns || ''}>
                        {sig.length ? sig.join(' ') : <span className="text-gray-300">-</span>}
                      </Td>
                      <Td className="max-w-[160px] truncate text-xs text-gray-400" title={srcOf(r)}>{srcOf(r)}</Td>
                      <Td>
                        <a href={`/report/r/${r.id}`} target="_blank" rel="noopener noreferrer" title="이 사람이 받은 성장 리포트 보기"
                          className="rounded-md px-2 py-1 text-xs font-semibold text-[#0F6E56] hover:bg-[#0F6E56]/10 whitespace-nowrap">
                          📋 보기
                        </a>
                      </Td>
                      <Td>
                        <button onClick={() => handleDelete(r.id)} disabled={busy != null} title="삭제"
                          className="rounded-md px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          {busy === r.id ? '…' : '🗑️'}
                        </button>
                      </Td>
                    </tr>
                  );
                })}
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
