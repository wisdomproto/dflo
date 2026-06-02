// src/features/marketing/components/ArticleEditor.tsx
import { useState } from 'react';
import topicsRaw from '../data/topics.json';
import type { MarketingArticle, Topic } from '../types';
import { generateArticle, saveArticle } from '../services/marketingArticleService';

const TOPICS = topicsRaw as Topic[];
const LANGS = ['ko', 'th', 'vi', 'en'];

export function ArticleEditor({
  article,
  onSaved,
  onCancel,
}: {
  article: MarketingArticle | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(article?.title ?? '');
  const [angle, setAngle] = useState('');
  const [keywords, setKeywords] = useState<string[]>(article?.keywords ?? []);
  const [category, setCategory] = useState(article?.category ?? '');
  const [topicId, setTopicId] = useState<string | null>(article?.topicId ?? null);
  const [language, setLanguage] = useState(article?.language ?? 'ko');
  const [body, setBody] = useState(article?.body ?? '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickTopic = (id: string) => {
    if (!id) {
      setTopicId(null); // "직접 입력"으로 되돌릴 때 stale topicId 제거
      return;
    }
    const t = TOPICS.find((x) => x.id === id);
    if (!t) return;
    setTopicId(t.id);
    setTitle(t.title);
    setAngle(t.angle);
    setKeywords(t.keywords);
    setCategory(t.category);
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      setErr('제목(주제)을 입력하세요.');
      return;
    }
    setGenerating(true);
    setErr(null);
    try {
      const content = await generateArticle({ title, angle, keywords, category, topicId: topicId ?? undefined, language });
      setBody(content);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await saveArticle({
        id: article?.id,
        topicId,
        title,
        body,
        category,
        keywords,
        language,
        status: body.trim() ? 'done' : 'draft',
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{article ? '글 편집' : '새 글 생성'}</h1>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">
          ← 목록
        </button>
      </div>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">주제 백로그에서 선택</span>
          <select
            value={topicId ?? ''}
            onChange={(e) => pickTopic(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— 직접 입력 —</option>
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} · {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">제목(주제)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">앵글</span>
          <input value={angle} onChange={(e) => setAngle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">키워드 (쉼표 구분)</span>
          <input
            value={keywords.join(', ')}
            onChange={(e) => setKeywords(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">카테고리</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">언어</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-[#4A2D6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {generating ? '생성 중… (수십 초)' : '✨ AI 생성'}
        </button>
      </section>

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <span className="block text-xs font-medium text-gray-500">본문 (편집 가능)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#4A2D6B] focus:outline-none"
        />
        <div className="flex items-center gap-2">
          {err && <span className="text-xs text-red-500">{err}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="ml-auto rounded-lg bg-[#4A2D6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </section>
    </div>
  );
}
