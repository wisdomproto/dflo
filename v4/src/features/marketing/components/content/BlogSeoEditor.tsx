// src/features/marketing/components/content/BlogSeoEditor.tsx
// 메타 + 섹션 + FAQ 편집 캔버스. 언어탭 없음(최상단 셀렉터가 언어 담당).
// 상태/저장은 부모가 소유 — 여기서는 값 표시 + 변경 콜백만(드래그 인덱스만 로컬).
import { useState } from 'react';
import type { BlogSeoArticle, BlogSeoSection } from '../../types';
import { ImageDropzone } from './ImageDropzone';

const inputCls = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#4A2D6B] focus:outline-none';
const labelCls = 'text-xs font-semibold text-gray-500';

interface Props {
  data: BlogSeoArticle;
  mode: 'structure' | 'full';
  onPatch: (p: Partial<BlogSeoArticle>) => void;
  onPatchSection: (i: number, p: Partial<BlogSeoSection>) => void;
  /** 섹션 이미지는 전 언어 공통(텍스트 없는 일러스트) — 같은 인덱스 전 언어에 동기화. */
  onSetSectionImage: (i: number, url: string | null) => void;
  onAddSection: () => void;
  onRemoveSection: (i: number) => void;
  onMoveSection?: (from: number, to: number) => void;
  onCopyPrompt?: (i: number, prompt: string) => void;
  copiedKey?: string | null;
}

export function BlogSeoEditor({ data, mode, onPatch, onPatchSection, onSetSectionImage, onAddSection, onRemoveSection, onMoveSection, onCopyPrompt, copiedKey }: Props) {
  const full = mode === 'full';
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const onDrop = (to: number) => {
    if (dragIdx !== null && onMoveSection) onMoveSection(dragIdx, to);
    setDragIdx(null); setOverIdx(null);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* SEO 메타 */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-bold text-[#4A2D6B]">SEO 메타</div>
        <div>
          <span className={labelCls}>SEO 제목 <span className="text-gray-300">({data.seoTitle.length}자)</span></span>
          <input className={inputCls} value={data.seoTitle} onChange={(e) => onPatch({ seoTitle: e.target.value })} />
        </div>
        <div>
          <span className={labelCls}>Slug</span>
          <input className={`${inputCls} font-mono`} value={data.slug} onChange={(e) => onPatch({ slug: e.target.value })} />
        </div>
        <div>
          <span className={labelCls}>메타 설명 <span className="text-gray-300">({data.metaDescription.length}자)</span></span>
          <textarea className={inputCls} rows={2} value={data.metaDescription} onChange={(e) => onPatch({ metaDescription: e.target.value })} />
        </div>
        <div>
          <span className={labelCls}>H1</span>
          <input className={inputCls} value={data.h1} onChange={(e) => onPatch({ h1: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={labelCls}>Primary 키워드</span>
            <input className={inputCls} value={data.primaryKeyword} onChange={(e) => onPatch({ primaryKeyword: e.target.value })} />
          </div>
          <div>
            <span className={labelCls}>Secondary (쉼표 구분)</span>
            <input className={inputCls} value={data.secondaryKeywords.join(', ')}
              onChange={(e) => onPatch({ secondaryKeywords: e.target.value.split(',').map((s) => s.trim()) })} />
          </div>
        </div>
      </div>

      {/* 섹션 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-[#4A2D6B]">섹션 ({data.sections.length})</div>
        <button type="button" onClick={onAddSection} className="rounded border border-gray-300 px-2 py-0.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">+ 섹션</button>
      </div>
      {data.sections.map((s, i) => (
        <div key={i}
          onDragOver={(e) => { if (dragIdx !== null && onMoveSection) { e.preventDefault(); setOverIdx(i); } }}
          onDrop={(e) => { e.preventDefault(); onDrop(i); }}
          className={`space-y-3 rounded-xl border bg-white p-4 transition-colors ${
            overIdx === i && dragIdx !== null && dragIdx !== i ? 'border-[#4A2D6B] ring-2 ring-[#4A2D6B]/30' : 'border-gray-200'
          } ${dragIdx === i ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2">
            {onMoveSection && (
              <span draggable
                onDragStart={() => setDragIdx(i)}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                title="드래그하여 순서 변경"
                className="shrink-0 cursor-grab select-none px-1 text-base leading-none text-gray-300 hover:text-gray-500 active:cursor-grabbing">⠿</span>
            )}
            <span className="rounded-full bg-[#4A2D6B] px-2 py-0.5 text-[11px] font-bold text-white">#{i + 1}</span>
            <input className={`${inputCls} font-semibold`} value={s.heading}
              onChange={(e) => onPatchSection(i, { heading: e.target.value })} placeholder="소제목 (H2)" />
            <button type="button" onClick={() => onRemoveSection(i)} className="shrink-0 rounded border border-gray-200 px-1.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500">삭제</button>
          </div>

          {full && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="sm:w-56 shrink-0">
                <ImageDropzone url={s.imageUrl} alt={s.heading}
                  onUploaded={(u) => onSetSectionImage(i, u)}
                  onClear={() => onSetSectionImage(i, null)} aspectRatio="16/9" />
                <p className="mt-1 text-[10px] text-gray-400">🌐 이미지는 전 언어 공통 (텍스트 없는 일러스트)</p>
                <div className="mt-1 flex items-start gap-1">
                  <p className="flex-1 text-[11px] leading-snug text-gray-400">🎨 {s.imagePrompt}</p>
                  {onCopyPrompt && (
                    <button type="button" onClick={() => onCopyPrompt(i, s.imagePrompt)}
                      className="shrink-0 rounded border border-gray-200 px-1.5 text-[10px] text-gray-500 hover:bg-gray-100">
                      {copiedKey === `p${i}` ? '✓' : '복사'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="prose prose-sm max-w-none rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: s.html }} />
                <textarea className={`${inputCls} font-mono text-xs`} rows={5} value={s.html}
                  onChange={(e) => onPatchSection(i, { html: e.target.value })} placeholder="본문 HTML" />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* FAQ */}
      {data.faq.length > 0 && (
        <>
          <div className="text-sm font-bold text-[#4A2D6B]">FAQ ({data.faq.length})</div>
          {data.faq.map((f, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
              <input className={`${inputCls} font-semibold`} value={f.q}
                onChange={(e) => onPatch({ faq: data.faq.map((x, idx) => (idx === i ? { ...x, q: e.target.value } : x)) })} placeholder="질문" />
              {full && (
                <textarea className={inputCls} rows={2} value={f.a}
                  onChange={(e) => onPatch({ faq: data.faq.map((x, idx) => (idx === i ? { ...x, a: e.target.value } : x)) })} placeholder="답변" />
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
