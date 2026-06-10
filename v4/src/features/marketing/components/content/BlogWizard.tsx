// src/features/marketing/components/content/BlogWizard.tsx
// 통합 블로그 위저드: 키워드 → AI 아웃라인 → AI 본문 → 구글 SEO 점수 → AI 수정.
// 단일 소스 marketing_articles.blog[lang] (migration 045). 언어는 최상단 셀렉터(props).
import { useEffect, useRef, useState } from 'react';
import type { MarketingArticle, BlogSeoArticle, BlogSeoMap, BlogSeoSection } from '../../types';
import { BLOG_SEO_LANGS } from '../../types';
import { saveBlogSeo, generateBlogSeoOutline, generateBlogSeoBody, rewriteSelection } from '../../services/marketingArticleService';
import { uploadImageFile } from '../../services/aiImageService';
import { scoreArticle, type SeoDetail, type SeoResult } from '../../utils/googleSeoScorer';
import { BlogSeoEditor } from './BlogSeoEditor';
import { BlogSeoScorePanel } from './BlogSeoScorePanel';

const ACCENT = '#4A2D6B';
type Step = 1 | 2 | 3;
const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: '키워드' }, { n: 2, label: '구조' }, { n: 3, label: '글쓰기' },
];

// 블로그 본문 삽화 공통 스타일 — 전 섹션 동일(카드뉴스 COMMON_STYLE 과 동일한 운용).
const BLOG_IMG_STYLE = [
  '· 비율: 가로 16:9 (1600×900), 블로그 본문 삽화용.',
  '· 아트 스타일: 플랫 2D 벡터 일러스트. 굵고 둥근 형태, 단색 면(그라데이션 최소)에 옅은 드롭섀도우만. 사진·3D 아님.',
  '· 색감: 브랜드 보라(#667eea→#764ba2) 계열 + 민트(#33D6B5) 절제된 포인트. 밝고 깨끗한 톤.',
  '· 인물: 등장 시 7~9세 한국 어린이(밝은 표정, 파스텔 옷). 의료·성장 주제에 맞는 따뜻하고 신뢰감 있는 분위기.',
  '· 구성: 넓은 여백, 단순한 배경, 한눈에 핵심 개념 하나가 읽히도록.',
  '· 텍스트: 일러스트 안에 글자/숫자 넣지 않기. 워터마크·로고 없음.',
  '· 피할 것: 사실적 사진, 무섭거나 우울한 분위기, 복잡한 배경, 글자, 잘린 형태.',
].join('\n');

function allImagePrompts(a: BlogSeoArticle): string {
  let p = `[공통 스타일 — 모든 섹션 동일]\n${BLOG_IMG_STYLE}\n`;
  a.sections.forEach((s, i) => {
    if (!s.imagePrompt?.trim()) return;
    p += `\n\n=== #${i + 1}. ${s.heading || '섹션'} ===\n${s.imagePrompt}`;
  });
  return p;
}

function emptyArticle(): BlogSeoArticle {
  return { seoTitle: '', slug: '', metaDescription: '', h1: '', primaryKeyword: '', secondaryKeywords: [], sections: [], faq: [] };
}
// 섹션 이미지는 텍스트가 없어 전 언어 공통 — 같은 인덱스의 모든 언어 섹션에 동일 URL 적용(섹션 없는 언어는 스킵).
function applySectionImageAll(blog: BlogSeoMap, i: number, url: string | null): BlogSeoMap {
  const next: BlogSeoMap = { ...blog };
  for (const l of BLOG_SEO_LANGS) {
    const art = next[l];
    if (art && i < art.sections.length) {
      next[l] = { ...art, sections: art.sections.map((s, idx) => (idx === i ? { ...s, imageUrl: url } : s)) };
    }
  }
  return next;
}
function emptySection(heading = ''): BlogSeoSection {
  return { heading, html: '', imagePrompt: '', imageUrl: null };
}

export function BlogWizard({ article, language }: { article: MarketingArticle; language: string }) {
  const [blog, setBlog] = useState<BlogSeoMap>(article.blog ?? {});
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [bulk, setBulk] = useState<string | null>(null);
  const [measured, setMeasured] = useState<SeoResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 위저드가 blog 데이터의 단일 작성자라, 글 전환(article.id) 시에만 시드한다.
  // article.blog 참조 변화(부모 refetch)로 재시드하면 진행 중인 스텝·미저장 편집이 날아간다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setBlog(article.blog ?? {}); setStep(1); setMeasured(null); }, [article.id]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  // language 전환 시 stale 점수 제거(점수는 측정 버튼으로만 갱신).
  useEffect(() => { setMeasured(null); }, [language]);
  const cur = blog[language as keyof BlogSeoMap];

  const queueSave = (next: BlogSeoMap) => {
    setBlog(next); setErr(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { await saveBlogSeo(article.id, next); setSavedAt(true); setTimeout(() => setSavedAt(false), 1500); }
      catch (e) { setErr(e instanceof Error ? e.message : '저장 실패'); }
    }, 700);
  };
  const patch = (p: Partial<BlogSeoArticle>) => queueSave({ ...blog, [language]: { ...(cur ?? emptyArticle()), ...p } });
  const patchSection = (i: number, p: Partial<BlogSeoSection>) => {
    if (!cur) return;
    patch({ sections: cur.sections.map((s, idx) => (idx === i ? { ...s, ...p } : s)) });
  };
  // 섹션 이미지 = 전 언어 공통(텍스트 없는 일러스트). 업로드/삭제 시 같은 인덱스 전 언어에 동기화.
  const setSectionImageAll = (i: number, url: string | null) => queueSave(applySectionImageAll(blog, i, url));
  const addSection = () => patch({ sections: [...(cur?.sections ?? []), emptySection()] });
  const removeSection = (i: number) => cur && patch({ sections: cur.sections.filter((_, idx) => idx !== i) });
  const moveSection = (from: number, to: number) => {
    if (!cur || from === to || from < 0 || to < 0 || to >= cur.sections.length) return;
    const next = [...cur.sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    patch({ sections: next });
  };

  const seedKeyword = (article.keywords ?? [])[0] ?? '';
  const seedSecondary = (article.keywords ?? []).slice(1);

  const runOutline = async () => {
    const base = cur ?? emptyArticle();
    if (!base.primaryKeyword.trim()) { setErr('먼저 primary 키워드를 입력하세요.'); return; }
    setBusy('outline'); setErr(null);
    try {
      const o = await generateBlogSeoOutline({
        lang: language, primaryKeyword: base.primaryKeyword, secondaryKeywords: base.secondaryKeywords,
        topicTitle: article.title, baseBody: article.body || undefined,
      });
      patch({
        seoTitle: o.seoTitle, slug: o.slug, metaDescription: o.metaDescription, h1: o.h1,
        sections: o.sectionHeadings.map((h) => emptySection(h)),
        faq: o.faqQuestions.map((q) => ({ q, a: '' })),
      });
      setStep(2);
    } catch (e) { setErr(e instanceof Error ? e.message : '아웃라인 생성 실패'); }
    finally { setBusy(null); }
  };

  const runBody = async () => {
    if (!cur || cur.sections.length === 0) { setErr('먼저 구조(섹션 제목)를 만드세요.'); return; }
    setBusy('body'); setErr(null);
    try {
      const r = await generateBlogSeoBody({
        lang: language, primaryKeyword: cur.primaryKeyword, secondaryKeywords: cur.secondaryKeywords,
        seoTitle: cur.seoTitle, h1: cur.h1,
        sectionHeadings: cur.sections.map((s) => s.heading),
        faqQuestions: cur.faq.map((f) => f.q),
        baseBody: article.body || undefined,
      });
      // 제목 매칭으로 본문 머지(개수가 어긋나도 안전).
      const sections = cur.sections.map((s, i) => {
        const g = r.sections[i];
        return g ? { ...s, html: g.html, imagePrompt: g.imagePrompt } : s;
      });
      const faq = cur.faq.map((f, i) => (r.faq[i] ? { q: f.q, a: r.faq[i].a } : f));
      patch({ sections, faq });
    } catch (e) { setErr(e instanceof Error ? e.message : '본문 생성 실패'); }
    finally { setBusy(null); }
  };

  const fixWeak = async (dt: SeoDetail) => {
    if (!cur) return;
    // 섹션 본문 약점은 첫 번째 내용 있는 섹션을 재작성, 그 외(메타/제목)는 안내만.
    const weakSectionIdx = cur.sections.findIndex((s) => stripLen(s.html) > 0);
    if (['구조화', '키워드 사용', '첫 문단'].includes(dt.label) && weakSectionIdx >= 0) {
      setFixing(dt.label); setErr(null);
      try {
        const html = await rewriteSelection({
          selection: cur.sections[weakSectionIdx].html,
          instruction: `구글 SEO 개선: '${dt.label}' 항목. ${dt.msg}. 핵심 키워드 '${cur.primaryKeyword}'를 자연스럽게 본문에 포함하고 리스트(<ul>)를 활용. ${language}로.`,
        });
        patchSection(weakSectionIdx, { html });
      } catch (e) { setErr(e instanceof Error ? e.message : '수정 실패'); }
      finally { setFixing(null); }
    } else {
      setErr(`'${dt.label}'은(는) 위 메타 필드에서 직접 보완하세요: ${dt.msg}`);
    }
  };

  const onBulkUpload = async (files?: FileList | null) => {
    if (!files || !files.length || !cur) return;
    const arr = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const count = Math.min(arr.length, cur.sections.length);
    setErr(null); let next: BlogSeoMap = blog;
    for (let i = 0; i < count; i++) {
      setBulk(`${i + 1}/${count}`);
      try { const url = await uploadImageFile(arr[i]); next = applySectionImageAll(next, i, url); queueSave(next); }
      catch (e) { setErr(`#${i + 1} 업로드 실패: ${e instanceof Error ? e.message : ''}`); }
    }
    setBulk(null);
  };

  const flashCopy = (key: string) => { setCopied(key); setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200); };
  const onCopyPrompt = (i: number, prompt: string) => {
    void navigator.clipboard.writeText(`[공통 스타일]\n${BLOG_IMG_STYLE}\n\n${prompt}`).then(() => flashCopy(`p${i}`));
  };
  const copyAllPrompts = () => {
    if (!cur) return;
    void navigator.clipboard.writeText(allImagePrompts(cur)).then(() => flashCopy('all-prompts'));
  };
  const hasAnyPrompt = !!cur?.sections.some((s) => s.imagePrompt?.trim());

  const measure = () => cur && setMeasured(scoreArticle(cur, language));
  const btn = 'rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60';

  return (
    <div className="flex h-full flex-col">
      {/* 스텝바 */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-4 py-2">
        {STEPS.map((s) => (
          <button key={s.n} type="button" onClick={() => setStep(s.n)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${step === s.n ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            style={step === s.n ? { backgroundColor: ACCENT } : undefined}>
            {s.n}. {s.label}
          </button>
        ))}
        <div className="flex-1" />
        {savedAt && <span className="text-xs text-green-600">✓ 저장됨</span>}
        {cur && step >= 3 && (
          <button type="button" onClick={copyAllPrompts} disabled={!hasAnyPrompt}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            {copied === 'all-prompts' ? '✅ 복사됨' : '📋 이미지 프롬프트 전체 복사'}
          </button>
        )}
        {cur && step >= 3 && (
          <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            🖼 이미지 일괄 업로드
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onBulkUpload(e.target.files)} />
          </label>
        )}
      </div>

      {err && <div className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-600">{err}</div>}
      {bulk && <div className="shrink-0 bg-blue-50 px-4 py-2 text-xs text-blue-700">업로드 중… {bulk}</div>}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Step 1: 키워드 */}
        {step === 1 && (
          <div className="mx-auto max-w-xl space-y-4">
            <div>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Primary 키워드</span>
              <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={cur?.primaryKeyword ?? ''}
                onChange={(e) => patch({ primaryKeyword: e.target.value })} placeholder={seedKeyword || '예: 소아 성장'} />
            </div>
            <div>
              <span className="mb-1 block text-sm font-semibold text-gray-700">Secondary 키워드 (쉼표 구분)</span>
              <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={(cur?.secondaryKeywords ?? []).join(', ')}
                onChange={(e) => patch({ secondaryKeywords: e.target.value.split(',').map((s) => s.trim()) })} placeholder={seedSecondary.join(', ') || '예: 키 크는 법, 성장판'} />
            </div>
            {seedKeyword && !cur?.primaryKeyword && (
              <button type="button" onClick={() => patch({ primaryKeyword: seedKeyword, secondaryKeywords: seedSecondary })}
                className="text-xs text-[#4A2D6B] underline">기본글 키워드 가져오기</button>
            )}
            <div><button type="button" onClick={runOutline} disabled={busy === 'outline'} className={btn} style={{ backgroundColor: ACCENT }}>
              {busy === 'outline' ? '생성 중…' : '✨ AI 아웃라인 생성'}</button></div>
          </div>
        )}

        {/* Step 2: 구조 */}
        {step === 2 && (
          <div className="space-y-4">
            <button type="button" onClick={runOutline} disabled={busy === 'outline'} className={btn} style={{ backgroundColor: ACCENT }}>
              {busy === 'outline' ? '생성 중…' : '✨ AI 아웃라인 재생성'}</button>
            {cur ? <BlogSeoEditor data={cur} mode="structure" onPatch={patch} onPatchSection={patchSection} onSetSectionImage={setSectionImageAll} onAddSection={addSection} onRemoveSection={removeSection} onMoveSection={moveSection} />
              : <p className="text-sm text-gray-400">키워드 단계에서 아웃라인을 먼저 생성하세요.</p>}
          </div>
        )}

        {/* Step 3: 글쓰기 (SEO 점수 측정 + 분석기반 수정 버튼 통합) */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={runBody} disabled={busy === 'body'} className={btn} style={{ backgroundColor: ACCENT }}>
                {busy === 'body' ? '생성 중… (수십 초)' : '✨ AI 본문 생성'}</button>
              {cur && (
                <button type="button" onClick={measure}
                  className="rounded-lg border border-[#4A2D6B] px-4 py-2 text-sm font-semibold text-[#4A2D6B] hover:bg-[#4A2D6B]/5">
                  📊 SEO 점수 측정</button>
              )}
            </div>
            {cur ? (
              <>
                {measured && <BlogSeoScorePanel result={measured} onFix={fixWeak} fixing={fixing} />}
                <details className="rounded-lg bg-[#1a1a2e] p-3 text-[11px] text-gray-300">
                  <summary className="cursor-pointer font-semibold text-indigo-300">🎨 이미지 공통 스타일 — 모든 섹션 동일 (복사 시 자동 포함)</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans">{BLOG_IMG_STYLE}</pre>
                </details>
                <BlogSeoEditor data={cur} mode="full" onPatch={patch} onPatchSection={patchSection} onSetSectionImage={setSectionImageAll} onAddSection={addSection} onRemoveSection={removeSection} onMoveSection={moveSection} onCopyPrompt={onCopyPrompt} copiedKey={copied} />
              </>
            ) : <p className="text-sm text-gray-400">구조를 먼저 만드세요.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function stripLen(html: string): number {
  return String(html || '').replace(/<[^>]*>/g, '').trim().length;
}
