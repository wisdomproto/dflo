// src/features/marketing/components/MentionsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  fetchMentions,
  saveMention,
  deleteMention,
  type Mention,
  type MentionSentiment,
} from '../services/marketingMentionService';
import { MentionCard } from './MentionCard';

const PLATFORMS = [
  { id: 'naver_kin', label: '네이버 지식인' },
  { id: 'naver_blog', label: '네이버 블로그' },
  { id: 'naver_cafe', label: '네이버 카페' },
  { id: 'blog', label: '블로그' },
  { id: 'instagram', label: '인스타그램' },
  { id: 'youtube', label: '유튜브' },
  { id: 'facebook', label: '페이스북' },
  { id: 'threads', label: '스레드' },
  { id: 'community', label: '커뮤니티' },
] as const;

const SENTIMENTS: { id: MentionSentiment; label: string }[] = [
  { id: 'positive', label: '긍정' },
  { id: 'neutral', label: '중립' },
  { id: 'negative', label: '부정' },
];

const SENT_FILTERS: { id: 'all' | MentionSentiment; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'positive', label: '긍정' },
  { id: 'neutral', label: '중립' },
  { id: 'negative', label: '부정' },
];

const LANGS = ['ko', 'th', 'vi', 'en'] as const;

const EMPTY_FORM = {
  platform: 'naver_kin' as string,
  url: '',
  author: '',
  title: '',
  body: '',
  sentiment: 'neutral' as MentionSentiment,
  language: 'ko' as string,
};

export function MentionsPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentFilter, setSentFilter] = useState<'all' | MentionSentiment>('all');
  const [platFilter, setPlatFilter] = useState<'all' | string>('all');

  const reload = () => {
    fetchMentions().then(setMentions);
  };
  useEffect(reload, []);

  const sentCounts = useMemo(() => {
    const c: Record<string, number> = { all: mentions.length, positive: 0, neutral: 0, negative: 0 };
    mentions.forEach((m) => {
      c[m.sentiment] = (c[m.sentiment] ?? 0) + 1;
    });
    return c;
  }, [mentions]);

  const filtered = useMemo(
    () =>
      mentions.filter(
        (m) =>
          (sentFilter === 'all' || m.sentiment === sentFilter) &&
          (platFilter === 'all' || m.platform === platFilter),
      ),
    [mentions, sentFilter, platFilter],
  );

  const add = async () => {
    if (!form.body.trim() && !form.title.trim()) {
      setErr('제목 또는 본문을 입력하세요.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await saveMention({ ...form, status: 'new', replyDraft: '' });
      setForm({ ...EMPTY_FORM });
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const onChanged = (updated: Mention) =>
    setMentions((list) => list.map((m) => (m.id === updated.id ? updated : m)));

  const onDelete = async (id: string) => {
    try {
      await deleteMention(id);
      setMentions((list) => list.filter((m) => m.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 pt-4 pb-3">
        <h1 className="text-lg font-bold text-gray-800">모니터링 / 댓글</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          외부에서 발견한 브랜드 언급을 기록하고 AI 답글 초안을 받아보세요.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 lg:grid-cols-[320px_1fr]">
        {/* 좌: 멘션 추가 폼 */}
        <section className="space-y-3 self-start rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700">+ 멘션 추가</h2>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">플랫폼</span>
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">URL (선택)</span>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-medium text-gray-500">작성자</span>
              <input
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
              />
            </label>
            <label className="block w-24">
              <span className="mb-1 block text-xs font-medium text-gray-500">언어</span>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">제목</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">본문</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              placeholder="발견한 언급 내용을 붙여넣으세요."
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">감성</span>
            <div className="flex gap-1.5">
              {SENTIMENTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, sentiment: s.id }))}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs ${
                    form.sentiment === s.id ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </label>
          <button
            type="button"
            onClick={add}
            disabled={saving}
            className="w-full rounded-lg bg-[#4A2D6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? '저장 중…' : '추가'}
          </button>
          {err && <p className="text-xs text-red-500">{err}</p>}
        </section>

        {/* 우: 필터 + 멘션 리스트 */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {SENT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSentFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs ${
                  sentFilter === f.id ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {f.label}
                <span className="ml-1 opacity-70">({sentCounts[f.id] ?? 0})</span>
              </button>
            ))}
            <select
              value={platFilter}
              onChange={(e) => setPlatFilter(e.target.value)}
              className="ml-auto rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-[#4A2D6B] focus:outline-none"
            >
              <option value="all">모든 플랫폼</option>
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">
              {mentions.length === 0
                ? '아직 기록된 멘션이 없습니다. 왼쪽에서 추가해보세요.'
                : '필터에 해당하는 멘션이 없습니다.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((m) => (
                <MentionCard key={m.id} mention={m} onChanged={onChanged} onDelete={onDelete} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
