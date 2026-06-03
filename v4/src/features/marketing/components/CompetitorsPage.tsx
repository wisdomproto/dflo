// src/features/marketing/components/CompetitorsPage.tsx
import { useEffect, useState } from 'react';
import type { Competitor, CompetitorKind, GapItem, StrengthItem } from '../services/marketingCompetitorService';
import {
  fetchCompetitors,
  addCompetitor,
  deleteCompetitor,
  saveAnalysis,
  runGapAnalysis,
} from '../services/marketingCompetitorService';

const KIND_LABEL: Record<CompetitorKind, string> = { direct: '직접', indirect: '간접' };

export function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState<CompetitorKind>('direct');
  const [memo, setMemo] = useState('');
  const [adding, setAdding] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // 갭 분석 진행 중인 경쟁사 id + 행별 에러
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<Record<string, string>>({});

  const reload = () => {
    fetchCompetitors().then(setCompetitors);
  };
  useEffect(reload, []);

  const add = async () => {
    if (!name.trim()) {
      setFormErr('경쟁사 이름을 입력하세요.');
      return;
    }
    setAdding(true);
    setFormErr(null);
    try {
      await addCompetitor({ name: name.trim(), url: url.trim(), kind, memo: memo.trim() });
      setName('');
      setUrl('');
      setKind('direct');
      setMemo('');
      reload();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : '등록 실패');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('이 경쟁사를 삭제할까요?')) return;
    try {
      await deleteCompetitor(id);
      reload();
    } catch (e) {
      setRowErr((m) => ({ ...m, [id]: e instanceof Error ? e.message : '삭제 실패' }));
    }
  };

  const analyze = async (c: Competitor) => {
    setAnalyzingId(c.id);
    setRowErr((m) => ({ ...m, [c.id]: '' }));
    try {
      // 전체 경쟁사를 컨텍스트로 보내 갭/강점을 도출, 결과는 해당 행에 스냅샷 저장.
      const payload = competitors.map((x) => ({ name: x.name, url: x.url, kind: x.kind }));
      const { gaps, strengths } = await runGapAnalysis(payload);
      await saveAnalysis(c.id, { gaps, strengths, analyzedAt: new Date().toISOString() });
      reload();
    } catch (e) {
      setRowErr((m) => ({ ...m, [c.id]: e instanceof Error ? e.message : '분석 실패' }));
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-bold text-gray-800">경쟁사 분석</h1>

      {/* 등록 폼 — 키 없이 동작 */}
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="경쟁사 이름"
            className="min-w-[160px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="URL (선택)"
            className="min-w-[180px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CompetitorKind)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
          >
            <option value="direct">직접</option>
            <option value="indirect">간접</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="메모 (선택)"
            className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none"
          />
          <button
            type="button"
            onClick={add}
            disabled={adding}
            className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {adding ? '추가 중…' : '+ 경쟁사 추가'}
          </button>
          {formErr && <span className="text-xs text-red-500">{formErr}</span>}
        </div>
      </div>

      {/* 목록 */}
      {competitors.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">아직 등록된 경쟁사가 없습니다.</p>
      ) : (
        competitors.map((c) => (
          <div key={c.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-gray-800">{c.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      c.kind === 'direct' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {KIND_LABEL[c.kind]}
                  </span>
                </div>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block truncate text-xs text-[#4A2D6B] hover:underline"
                  >
                    {c.url}
                  </a>
                )}
                {c.memo && <p className="mt-1 text-xs text-gray-500">{c.memo}</p>}
              </div>
              <button
                type="button"
                onClick={() => analyze(c)}
                disabled={analyzingId === c.id}
                className="shrink-0 rounded-lg bg-[#4A2D6B] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {analyzingId === c.id ? '분석 중…' : '🔍 갭 분석'}
              </button>
              <button
                type="button"
                aria-label="삭제"
                onClick={() => remove(c.id)}
                className="shrink-0 px-1 text-gray-300 hover:text-red-500"
              >
                🗑
              </button>
            </div>

            {rowErr[c.id] && <p className="text-xs text-red-500">{rowErr[c.id]}</p>}

            {c.analysis && (c.analysis.gaps.length > 0 || c.analysis.strengths.length > 0) && (
              <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-400">
                  분석 시각: {c.analysis.analyzedAt ? c.analysis.analyzedAt.slice(0, 16).replace('T', ' ') : '-'}
                </div>

                {c.analysis.gaps.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold text-gray-600">📉 콘텐츠 갭</h3>
                    <div className="space-y-1.5">
                      {c.analysis.gaps.map((g, i) => (
                        <GapRow key={`${g.topic}-${i}`} gap={g} />
                      ))}
                    </div>
                  </div>
                )}

                {c.analysis.strengths.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold text-gray-600">💪 우리 강점</h3>
                    <div className="space-y-1.5">
                      {c.analysis.strengths.map((s, i) => (
                        <StrengthRow key={`${s.topic}-${i}`} strength={s} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function GapRow({ gap }: { gap: GapItem }) {
  const high = (gap.priority || '').toLowerCase() === 'high';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs">
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${high ? 'bg-red-500' : 'bg-amber-400'}`}
        title={high ? '우선순위 높음' : '우선순위 보통/낮음'}
      />
      <span className="font-medium text-gray-800">{gap.topic}</span>
      {gap.monthlySearch > 0 && (
        <span className="tabular-nums text-gray-400">월 {gap.monthlySearch.toLocaleString()}</span>
      )}
      {gap.difficulty && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">{gap.difficulty}</span>}
      {gap.competitors?.map((name) => (
        <span key={name} className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-600">
          {name}
        </span>
      ))}
    </div>
  );
}

function StrengthRow({ strength }: { strength: StrengthItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs">
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      <span className="font-medium text-gray-800">{strength.topic}</span>
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">독점</span>
      {strength.monthlySearch > 0 && (
        <span className="tabular-nums text-gray-400">월 {strength.monthlySearch.toLocaleString()}</span>
      )}
      {strength.note && <span className="text-gray-500">{strength.note}</span>}
    </div>
  );
}
