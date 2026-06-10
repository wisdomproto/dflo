// src/features/marketing/components/content/BlogPreviewModal.tsx
// 블로그 발행 미리보기 — 발행 템플릿(blog-post.html)과 동일한 마크업/CSS(+/_shell.css)를 iframe srcDoc 으로 렌더.
// iframe 폭을 모바일(390)/PC(820)로 토글 → 내부 미디어쿼리(.post-title 640px 분기 등)가 폭에 반응 = 진짜 적응형.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BlogSeoArticle, BlogReference } from '../../types';

const ACCENT = '#4A2D6B';
const FAQ_HEADING: Record<string, string> = { ko: '자주 묻는 질문', en: 'FAQ', th: 'คำถามที่พบบ่อย', vi: 'Câu hỏi thường gặp' };
// 발행 blog.mjs renderReferencesHtml 의 REF_HEADINGS 와 동일 (6언어).
const REF_HEADING: Record<string, string> = { ko: '참고문헌', en: 'References', th: 'เอกสารอ้างอิง', vi: 'Tài liệu tham khảo', ch: '參考文獻', cn: '参考文献' };

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 발행 blog-post.html <style> + 본문 타이포(h2/h3/p/ul/img) + CSS 변수 폴백(_shell.css 로드 실패 대비).
const PREVIEW_CSS = `
:root{--ink:#1a1a2e;--body:#333;--muted:#8a8a9a;--hairline:#e6e6ef;--shell-page-bg:#f6f5fb;}
*{box-sizing:border-box;}
body{margin:0;font-family:'Noto Sans KR',system-ui,-apple-system,sans-serif;background:#fff;color:var(--body);-webkit-font-smoothing:antialiased;}
.post-container{max-width:740px;margin:0 auto;padding:24px;}
.post-header{padding:32px 0 24px;border-bottom:1px solid var(--hairline);}
.post-title{font-size:28px;font-weight:900;color:var(--ink);letter-spacing:-0.6px;line-height:1.3;margin:0;}
.post-meta{font-size:13px;color:var(--muted);margin-top:12px;}
.post-body{padding:28px 0;font-size:16px;line-height:1.85;color:var(--body);}
.post-body img{max-width:100%;height:auto;margin:24px 0;border-radius:8px;display:block;}
.post-body h2{font-size:22px;font-weight:800;color:var(--ink);margin:38px 0 14px;line-height:1.35;}
.post-body h3{font-size:18px;font-weight:700;color:var(--ink);margin:24px 0 10px;}
.post-body p{margin:0 0 16px;}
.post-body ul,.post-body ol{margin:0 0 16px;padding-left:22px;}
.post-body li{margin:6px 0;}
.post-body strong{color:var(--ink);}
.post-faq{margin-top:8px;border-top:1px solid var(--hairline);padding-top:8px;}
.post-references{margin:32px 0 0;padding-top:20px;border-top:1px solid var(--hairline);}
.post-references-title{font-size:18px;font-weight:800;color:var(--ink);margin-bottom:10px;}
.post-references-list{font-size:13px;line-height:1.7;color:var(--muted);padding-left:20px;margin:0;}
.post-references-list li{margin:6px 0;}
.post-references-list a{color:var(--ink);text-decoration:underline;}
.ref-links a{white-space:nowrap;}
.post-empty{color:#aaa;font-style:italic;}
@media(min-width:640px){.post-title{font-size:36px;}.post-body h2{font-size:26px;}}
`;

function buildBody(a: BlogSeoArticle, lang: string): string {
  const sections = (a.sections ?? [])
    .map((s) => {
      const h = s.heading ? `<h2>${esc(s.heading)}</h2>` : '';
      const img = s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="${esc(s.heading)}" loading="lazy">` : '';
      const body = (s.html && s.html.trim()) ? s.html : '<p class="post-empty">(본문 비어 있음)</p>';
      return `${h}${img}${body}`;
    })
    .join('\n');
  const faqItems = (a.faq ?? []).filter((f) => f.q?.trim());
  const faq = faqItems.length
    ? `<section class="post-faq"><h2>${FAQ_HEADING[lang] ?? 'FAQ'}</h2>${faqItems
        .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
        .join('')}</section>`
    : '';
  return (sections || '<p class="post-empty">아직 본문이 없습니다. 글쓰기 단계에서 작성하세요.</p>') + faq;
}

// 발행 blog.mjs renderReferencesHtml 과 동일한 마크업 (아티클 단위·언어 독립).
function buildReferences(references: BlogReference[], lang: string): string {
  if (!Array.isArray(references) || references.length === 0) return '';
  const heading = REF_HEADING[lang] ?? REF_HEADING.en;
  const items = references
    .map((r) => {
      const cite = [esc(r.title), [esc(r.journal), r.year ? esc(String(r.year)) : ''].filter(Boolean).join('. ')]
        .filter(Boolean)
        .join(' ');
      const links: string[] = [];
      if (r.url) links.push(`<a href="${esc(r.url)}" target="_blank" rel="noopener nofollow">PubMed</a>`);
      if (r.doi) links.push(`<a href="https://doi.org/${esc(r.doi)}" target="_blank" rel="noopener nofollow">DOI</a>`);
      const tail = links.length ? ` <span class="ref-links">${links.join(' · ')}</span>` : '';
      return `<li>${cite}.${tail}</li>`;
    })
    .join('');
  return `<section class="post-references"><h2 class="post-references-title">${esc(heading)}</h2><ol class="post-references-list">${items}</ol></section>`;
}

function buildHtml(a: BlogSeoArticle, lang: string, references: BlogReference[]): string {
  const title = a.h1 || a.seoTitle || '(제목 없음)';
  return `<!DOCTYPE html><html lang="${esc(lang)}"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/_shell.css">
<style>${PREVIEW_CSS}</style></head>
<body data-page="blog-post"><div class="post-container">
<header class="post-header"><h1 class="post-title">${esc(title)}</h1><div class="post-meta">미리보기 · ${esc(lang.toUpperCase())}</div></header>
<article class="post-body">${buildBody(a, lang)}</article>
${buildReferences(references, lang)}
</div></body></html>`;
}

const DEVICES = [
  { key: 'mobile' as const, label: '📱 모바일', w: 390 },
  { key: 'pc' as const, label: '💻 PC', w: 820 },
];

export function BlogPreviewModal({ article, language, references = [], onClose }: { article: BlogSeoArticle; language: string; references?: BlogReference[]; onClose: () => void }) {
  const [device, setDevice] = useState<'mobile' | 'pc'>('mobile');
  const html = useMemo(() => buildHtml(article, language, references), [article, language, references]);
  // 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    // 스크롤 가능한 오버레이 — 툴바는 flow + sticky 라 절대 화면 밖으로 잘리지 않음.
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70" onClick={onClose}>
      <div className="flex min-h-full flex-col items-center gap-4 p-4" onClick={onClose}>
        {/* 툴바: 기기 토글 + 닫기 (상단 sticky) */}
        <div className="sticky top-0 z-10 flex w-full max-w-[1040px] flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-2.5 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <span className="text-sm font-bold text-gray-800">👁 블로그 미리보기</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{language.toUpperCase()}</span>
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            {DEVICES.map((d) => (
              <button key={d.key} type="button" onClick={() => setDevice(d.key)}
                className={`rounded-md px-4 py-1.5 text-sm font-bold transition ${device === d.key ? 'text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                style={device === d.key ? { backgroundColor: ACCENT } : undefined}>
                {d.label}
              </button>
            ))}
          </div>
          <span className="hidden text-[11px] text-gray-400 md:inline">발행 화면과 동일 스타일 · 폭에 따라 자동 적응</span>
          <button type="button" onClick={onClose} className="ml-auto rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-200">✕ 닫기</button>
        </div>

        {/* 기기 프레임 (폰 베젤 / 브라우저 창) */}
        {device === 'mobile' ? (
          <div onClick={(e) => e.stopPropagation()}
            className="shrink-0 overflow-hidden rounded-[2.2rem] border-[12px] border-gray-900 bg-gray-900 shadow-2xl"
            style={{ width: 392 + 24, height: 'min(80vh, 820px)' }}>
            <iframe title="모바일 미리보기" srcDoc={html} className="block h-full bg-white" style={{ width: 392, border: 0 }} />
          </div>
        ) : (
          <div onClick={(e) => e.stopPropagation()}
            className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-gray-300 bg-white shadow-2xl"
            style={{ width: 'min(1000px, 100%)', height: 'min(80vh, 760px)' }}>
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-100 px-3 py-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-2 flex-1 truncate rounded-md border border-gray-200 bg-white px-3 py-1 text-xs text-gray-400">
                dr187growup.com/{language}/blog/{article.slug || '...'}
              </div>
            </div>
            <iframe title="PC 미리보기" srcDoc={html} className="w-full flex-1 bg-white" style={{ border: 0 }} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
