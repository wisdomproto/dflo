// src/features/marketing/components/content/BlogReferencesPanel.tsx
// 블로그 근거 논문 패널 — 아티클 단위(전 언어 공통, migration 049).
// 매처가 자동 채운 blog_references 를 표시 + 수동 제거/순서변경/검색추가.
// 부모(BlogWizard)에서 key={article.id} 로 글 전환 시 remount(상태 시드).
import { useState } from 'react';
import type { BlogReference } from '../../types';
import { saveBlogReferences, searchEvidencePapers } from '../../services/marketingArticleService';

export function BlogReferencesPanel({ articleId, initial }: { articleId: string; initial: BlogReference[] }) {
  const [refs, setRefs] = useState<BlogReference[]>(initial ?? []);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<BlogReference[]>([]);
  const [searching, setSearching] = useState(false);

  const persist = async (next: BlogReference[]) => {
    setRefs(next); setErr(null);
    try { await saveBlogReferences(articleId, next); setSaved(true); setTimeout(() => setSaved(false), 1500); }
    catch (e) { setErr(e instanceof Error ? e.message : '저장 실패'); }
  };
  const remove = (pmid: string) => persist(refs.filter((r) => r.pmid !== pmid));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= refs.length) return;
    const next = [...refs]; const [m] = next.splice(from, 1); next.splice(to, 0, m); void persist(next);
  };
  const add = (r: BlogReference) => {
    if (refs.some((x) => x.pmid === r.pmid)) return;
    void persist([...refs, r]); setResults([]); setTerm('');
  };
  const search = async () => {
    setSearching(true);
    try { setResults(await searchEvidencePapers(term)); } finally { setSearching(false); }
  };

  return (
    <section className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-bold text-gray-800">📚 참고문헌 <span className="text-xs font-normal text-gray-400">(전 언어 공통)</span></h3>
        {saved && <span className="text-xs text-green-600">✓ 저장됨</span>}
        <span className="ml-auto text-xs text-gray-400">{refs.length}편</span>
      </div>
      {err && <div className="mb-2 text-xs text-red-600">{err}</div>}
      {refs.length === 0
        ? <p className="text-xs text-gray-400">아직 없음. 매처를 돌리거나 아래에서 검색해 추가하세요.</p>
        : <ol className="space-y-1">
            {refs.map((r, i) => (
              <li key={r.pmid} className="flex items-start gap-2 rounded bg-gray-50 px-2 py-1.5 text-xs">
                <span className="shrink-0 rounded bg-indigo-100 px-1 text-[10px] font-semibold text-indigo-700">{Math.round(r.similarity * 100)}%</span>
                <span className="flex-1">
                  <span className="font-medium text-gray-800">{r.title}</span>
                  <span className="text-gray-500"> — {r.journal}{r.year ? `, ${r.year}` : ''}</span>
                  {r.url && <a href={r.url} target="_blank" rel="noopener" className="ml-1 text-indigo-600 underline">PubMed↗</a>}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="text-gray-400 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === refs.length - 1} className="text-gray-400 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => remove(r.pmid)} className="text-red-400 hover:text-red-600">✕</button>
                </span>
              </li>
            ))}
          </ol>}
      <div className="mt-3 flex gap-2">
        <input className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs" value={term}
          onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search(); }}
          placeholder="논문 제목으로 검색해 추가 (영문)" />
        <button type="button" onClick={() => void search()} disabled={searching || !term.trim()}
          className="rounded-md bg-gray-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
          {searching ? '검색 중…' : '검색'}</button>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 space-y-1 rounded border border-gray-100 p-1">
          {results.map((r) => (
            <li key={r.pmid}>
              <button type="button" onClick={() => add(r)} className="w-full rounded px-2 py-1 text-left text-xs hover:bg-indigo-50">
                <span className="font-medium text-gray-800">{r.title}</span>
                <span className="text-gray-500"> — {r.journal}{r.year ? `, ${r.year}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
