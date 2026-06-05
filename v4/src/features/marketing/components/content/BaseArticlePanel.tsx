// src/features/marketing/components/content/BaseArticlePanel.tsx
import { useEffect, useState } from 'react';
import type { MarketingArticle, BlogCategory } from '../../types';
import {
  saveArticle,
  generateBaseArticle,
  rewriteSelection,
  translateArticle,
  setConfirmed,
} from '../../services/marketingArticleService';
import { fetchConfig } from '../../services/marketingConfigService';
import { RichTextEditor } from './RichTextEditor';
import { TopicSuggestDialog } from './TopicSuggestDialog';

const ACCENT = '#4A2D6B';

interface Props {
  article: MarketingArticle; // selected content (master = Korean original)
  language: string; // currently selected language (from LanguageSelector)
  onSaved: () => void; // parent reloads list after save
}

export function BaseArticlePanel({ article, language, onSaved }: Props) {
  const isKo = language === 'ko';

  // Per-language fields
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body);
  // Master-level fields (shared across languages)
  const [angle, setAngle] = useState(''); // local only
  const [keywords, setKeywords] = useState<string[]>(article.keywords);
  const [category, setCategory] = useState(article.category);
  const [confirmed, setConfirmedState] = useState(article.confirmed);

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [generating, setGenerating] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load the right title/body whenever the article OR the selected language changes.
  useEffect(() => {
    if (isKo) {
      setTitle(article.title);
      setBody(article.body);
    } else {
      const tr = article.translations[language];
      setTitle(tr?.title ?? '');
      setBody(tr?.body ?? '');
    }
    setErr(null);
    setSaved(false);
  }, [article.id, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset master-level fields only when switching articles.
  useEffect(() => {
    setAngle('');
    setKeywords(article.keywords);
    setCategory(article.category);
    setConfirmedState(article.confirmed);
  }, [article.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConfig().then((c) => setCategories(c.blogCategories)).catch(() => undefined);
  }, []);

  const handleGenerate = async () => {
    if (!title.trim()) {
      setErr('제목을 입력하세요.');
      return;
    }
    if (body.trim() && !window.confirm('기존 본문을 새로 생성한 내용으로 덮어쓸까요?')) return;
    setGenerating(true);
    setErr(null);
    try {
      const html = await generateBaseArticle({ title, angle, keywords, category, language });
      setBody(html);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const handleTranslate = async () => {
    if (!article.body.trim()) {
      setErr('원본(한국어) 본문이 없습니다. 먼저 한국어 글을 작성하세요.');
      return;
    }
    if (body.trim() && !window.confirm('이 언어의 기존 번역을 새로 덮어쓸까요?')) return;
    setTranslating(true);
    setErr(null);
    try {
      const r = await translateArticle({ title: article.title, body: article.body, targetLang: language });
      setTitle(r.title);
      setBody(r.body);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '번역 실패');
    } finally {
      setTranslating(false);
    }
  };

  const handleToggleConfirm = async () => {
    setErr(null);
    try {
      await setConfirmed(article.id, !confirmed);
      setConfirmedState(!confirmed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '컨펌 변경 실패');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const base = {
        id: article.id,
        topicId: article.topicId,
        category,
        keywords,
        confirmed,
      };
      if (isKo) {
        await saveArticle({
          ...base,
          title,
          body,
          language: 'ko',
          status: body.trim() ? 'done' : 'draft',
          translations: article.translations,
        });
      } else {
        // Keep master ko fields; update only this language's translation.
        await saveArticle({
          ...base,
          title: article.title,
          body: article.body,
          language: article.language,
          status: article.status,
          translations: {
            ...article.translations,
            [language]: { title, body, status: body.trim() ? 'completed' : 'none' },
          },
        });
      }
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const input = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      {/* Metadata bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isKo ? '제목' : `${language.toUpperCase()} 제목`}
          className={`${input} flex-1 min-w-[200px]`}
        />
        {categories.length > 0 ? (
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
            <option value="">— 카테고리 —</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
            ))}
          </select>
        ) : (
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="카테고리" className={`${input} w-28`} />
        )}
        <input
          value={keywords.join(', ')}
          onChange={(e) => setKeywords(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          placeholder="키워드 (쉼표)"
          className={`${input} min-w-[160px] flex-1`}
        />
        {isKo && (
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="앵글 (선택)"
            className={`${input} w-40`}
          />
        )}
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        {isKo ? (
          <>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {generating ? '생성 중… (수십 초)' : '✨ AI 생성'}
            </button>
            <button
              type="button"
              onClick={() => setShowDialog(true)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              🎯 주제 추천
            </button>
            <button
              type="button"
              onClick={handleToggleConfirm}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${confirmed ? 'bg-green-600' : 'bg-gray-400'}`}
            >
              {confirmed ? '✅ 컨펌됨' : '컨펌하기'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleTranslate}
            disabled={translating}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {translating ? '번역 중… (수십 초)' : `🌐 한국어 → ${language.toUpperCase()} AI 번역`}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {err && <span className="text-xs text-red-500">{err}</span>}
          {saved && <span className="text-xs font-medium text-green-600">✓ 저장됨</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {/* Body editor */}
      <RichTextEditor
        value={body}
        onChange={setBody}
        onRewrite={(sel) => rewriteSelection({ selection: sel }).then((r) => r)}
      />

      {showDialog && (
        <TopicSuggestDialog
          categories={categories}
          onPick={(t) => {
            setTitle(t.title);
            setAngle(t.angle);
            setKeywords(t.keywords);
            setShowDialog(false);
          }}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
