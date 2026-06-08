// src/features/marketing/components/content/BlogSeoPanel.tsx
// "블로그(SEO)" 탭 — 언어별(ko/en/th/vi) 구조화 블로그 글 보기/수정 + 섹션별 이미지 업로드.
// 데이터는 marketing_articles.blog JSONB (migration 045). 변경은 700ms 디바운스로 저장.
import { useEffect, useRef, useState } from 'react';
import type {
  MarketingArticle,
  BlogSeoArticle,
  BlogSeoMap,
  BlogSeoLangCode,
  BlogSeoSection,
} from '../../types';
import { BLOG_SEO_LANGS } from '../../types';
import { saveBlogSeo } from '../../services/marketingArticleService';
import { uploadImageFile } from '../../services/aiImageService';
import { ImageDropzone } from './ImageDropzone';

const ACCENT = '#4A2D6B';
const LANG_LABEL: Record<BlogSeoLangCode, { flag: string; label: string }> = {
  ko: { flag: '🇰🇷', label: 'KO' },
  en: { flag: '🇺🇸', label: 'EN' },
  th: { flag: '🇹🇭', label: 'TH' },
  vi: { flag: '🇻🇳', label: 'VI' },
};

function emptyArticle(): BlogSeoArticle {
  return { seoTitle: '', slug: '', metaDescription: '', h1: '', primaryKeyword: '', secondaryKeywords: [], sections: [], faq: [] };
}

function fullText(a: BlogSeoArticle): string {
  return [
    `SEO Title: ${a.seoTitle}`,
    `Slug: ${a.slug}`,
    `Meta: ${a.metaDescription}`,
    `Primary: ${a.primaryKeyword}`,
    `Secondary: ${a.secondaryKeywords.join(', ')}`,
    '',
    `# ${a.h1}`,
    '',
    ...a.sections.map((s) => `## ${s.heading}\n${s.html}\n[IMG] ${s.imagePrompt}`),
    '',
    ...a.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`),
  ].join('\n');
}

export function BlogSeoPanel({ article }: { article: MarketingArticle }) {
  const [blog, setBlog] = useState<BlogSeoMap>(article.blog ?? {});
  const [lang, setLang] = useState<BlogSeoLangCode>('ko');
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setBlog(article.blog ?? {});
    setLang('ko');
  }, [article.id, article.blog]);

  const cur = blog[lang];

  const queueSave = (next: BlogSeoMap) => {
    setBlog(next);
    setErr(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveBlogSeo(article.id, next);
        setSavedAt(true);
        setTimeout(() => setSavedAt(false), 1500);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '저장 실패');
      }
    }, 700);
  };

  const patch = (p: Partial<BlogSeoArticle>) => {
    const base = cur ?? emptyArticle();
    queueSave({ ...blog, [lang]: { ...base, ...p } });
  };
  const patchSection = (i: number, p: Partial<BlogSeoSection>) => {
    if (!cur) return;
    patch({ sections: cur.sections.map((s, idx) => (idx === i ? { ...s, ...p } : s)) });
  };

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1200);
    });
  };

  const onBulkUpload = async (files?: FileList | null) => {
    if (!files || !files.length || !cur) return;
    const arr = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const count = Math.min(arr.length, cur.sections.length);
    setErr(null);
    let sections = cur.sections;
    for (let i = 0; i < count; i++) {
      setBulkProgress(`${i + 1}/${count}`);
      try {
        const url = await uploadImageFile(arr[i]);
        sections = sections.map((s, idx) => (idx === i ? { ...s, imageUrl: url } : s));
        patch({ sections });
      } catch (e) {
        setErr(`#${i + 1} 업로드 실패: ${e instanceof Error ? e.message : ''}`);
      }
    }
    if (arr.length > cur.sections.length) setErr(`이미지 ${arr.length}장 중 ${count}장만 섹션에 배치됨`);
    setBulkProgress(null);
  };

  const inputCls = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none';
  const labelCls = 'text-xs font-semibold text-gray-500';

  return (
    <div className="flex h-full flex-col">
      {/* Language tabs + actions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50/60 px-4 py-2">
        <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white">
          {BLOG_SEO_LANGS.map((l) => {
            const active = lang === l;
            const has = !!blog[l]?.sections?.length;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${active ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                style={active ? { backgroundColor: ACCENT } : undefined}
              >
                <span>{LANG_LABEL[l].flag}</span>
                <span>{LANG_LABEL[l].label}</span>
                <span className="text-[10px] opacity-70">{has ? '✓' : '—'}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        {savedAt && <span className="text-xs text-green-600">✓ 저장됨</span>}
        {cur && (
          <>
            <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
              🖼 이미지 일괄 업로드
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onBulkUpload(e.target.files)} />
            </label>
            <button
              type="button"
              onClick={() => copy('full', fullText(cur))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              {copied === 'full' ? '✓ 복사됨' : '📋 글 전체 복사'}
            </button>
          </>
        )}
      </div>

      {err && <div className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-600">{err}</div>}
      {bulkProgress && <div className="shrink-0 bg-blue-50 px-4 py-2 text-xs text-blue-700">업로드 중… {bulkProgress}</div>}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!cur ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-gray-400">
            <p>이 글에는 아직 {LANG_LABEL[lang].label} SEO 블로그 데이터가 없습니다.</p>
            <button
              type="button"
              onClick={() => patch({})}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              빈 글 만들기
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {/* SEO meta */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-bold text-[#4A2D6B]">SEO 메타</div>
              <div>
                <span className={labelCls}>SEO 제목 <span className="text-gray-300">({cur.seoTitle.length}자)</span></span>
                <input className={inputCls} value={cur.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} />
              </div>
              <div>
                <span className={labelCls}>Slug</span>
                <input className={`${inputCls} font-mono`} value={cur.slug} onChange={(e) => patch({ slug: e.target.value })} />
              </div>
              <div>
                <span className={labelCls}>메타 설명 <span className="text-gray-300">({cur.metaDescription.length}자)</span></span>
                <textarea className={inputCls} rows={2} value={cur.metaDescription} onChange={(e) => patch({ metaDescription: e.target.value })} />
              </div>
              <div>
                <span className={labelCls}>H1</span>
                <input className={inputCls} value={cur.h1} onChange={(e) => patch({ h1: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={labelCls}>Primary 키워드</span>
                  <input className={inputCls} value={cur.primaryKeyword} onChange={(e) => patch({ primaryKeyword: e.target.value })} />
                </div>
                <div>
                  <span className={labelCls}>Secondary (쉼표 구분)</span>
                  <input
                    className={inputCls}
                    value={cur.secondaryKeywords.join(', ')}
                    onChange={(e) => patch({ secondaryKeywords: e.target.value.split(',').map((s) => s.trim()) })}
                  />
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="text-sm font-bold text-[#4A2D6B]">섹션 ({cur.sections.length})</div>
            {cur.sections.map((s, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#4A2D6B] px-2 py-0.5 text-[11px] font-bold text-white">#{i + 1}</span>
                  <input
                    className={`${inputCls} font-semibold`}
                    value={s.heading}
                    onChange={(e) => patchSection(i, { heading: e.target.value })}
                    placeholder="소제목 (H2)"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {/* Image */}
                  <div className="sm:w-56 shrink-0">
                    <ImageDropzone
                      url={s.imageUrl}
                      alt={s.heading}
                      onUploaded={(u) => patchSection(i, { imageUrl: u })}
                      onClear={() => patchSection(i, { imageUrl: null })}
                      aspectRatio="16/9"
                    />
                    <div className="mt-1 flex items-start gap-1">
                      <p className="flex-1 text-[11px] leading-snug text-gray-400">🎨 {s.imagePrompt}</p>
                      <button
                        type="button"
                        onClick={() => copy(`p${i}`, s.imagePrompt)}
                        className="shrink-0 rounded border border-gray-200 px-1.5 text-[10px] text-gray-500 hover:bg-gray-100"
                      >
                        {copied === `p${i}` ? '✓' : '복사'}
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 space-y-2">
                    <div className="prose prose-sm max-w-none rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: s.html }} />
                    <textarea
                      className={`${inputCls} font-mono text-xs`}
                      rows={5}
                      value={s.html}
                      onChange={(e) => patchSection(i, { html: e.target.value })}
                      placeholder="본문 HTML"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* FAQ */}
            {cur.faq.length > 0 && (
              <>
                <div className="text-sm font-bold text-[#4A2D6B]">FAQ ({cur.faq.length})</div>
                {cur.faq.map((f, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
                    <input
                      className={`${inputCls} font-semibold`}
                      value={f.q}
                      onChange={(e) => patch({ faq: cur.faq.map((x, idx) => (idx === i ? { ...x, q: e.target.value } : x)) })}
                      placeholder="질문"
                    />
                    <textarea
                      className={inputCls}
                      rows={2}
                      value={f.a}
                      onChange={(e) => patch({ faq: cur.faq.map((x, idx) => (idx === i ? { ...x, a: e.target.value } : x)) })}
                      placeholder="답변"
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
