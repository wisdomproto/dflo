import type { CSSProperties } from 'react';
import type { BlogCard, BlogCardContent, BlogCardType, GlobalCardStyle } from '../../types';
import { RichTextEditor } from './RichTextEditor';

const ACCENT = '#4A2D6B';

const TYPE_LABELS: Record<BlogCardType, string> = {
  text: '본문',
  quote: '인용',
  list: '리스트',
  image: '이미지',
  divider: '구분선',
};

interface Props {
  card: BlogCard;
  globalStyle: GlobalCardStyle;
  onChange: (content: BlogCardContent) => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
}

function styleHint(g: GlobalCardStyle): CSSProperties {
  const style: CSSProperties = {};
  if (g.align) style.textAlign = g.align;
  if (g.bodyFont) style.fontFamily = g.bodyFont;
  if (g.bodySize) style.fontSize = g.bodySize;
  return style;
}

export function BlogCardItem({ card, globalStyle, onChange, onDelete, dragHandleProps }: Props) {
  const { cardType, content } = card;

  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          {...dragHandleProps}
          className="cursor-grab select-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          aria-label="드래그하여 순서 변경"
        >
          ⠿
        </button>
        <span
          className="rounded px-1.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
        >
          {TYPE_LABELS[cardType]}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          aria-label="카드 삭제"
        >
          🗑
        </button>
      </div>

      {/* Body by type */}
      {(cardType === 'text' || cardType === 'quote' || cardType === 'list') && (
        <div
          className={cardType === 'quote' ? 'border-l-4 pl-3' : undefined}
          style={cardType === 'quote' ? { ...styleHint(globalStyle), borderColor: ACCENT } : styleHint(globalStyle)}
        >
          {cardType === 'list' && (
            <div className="mb-1 text-xs font-medium text-gray-400">리스트</div>
          )}
          <RichTextEditor
            value={content.text ?? ''}
            onChange={(html) => onChange({ ...content, text: html })}
            placeholder="섹션 내용"
          />
        </div>
      )}

      {cardType === 'image' && (
        <div className="space-y-2">
          {content.url ? (
            <img
              src={content.url}
              alt={content.alt ?? ''}
              className="max-h-64 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
              이미지 (Phase 3에서 생성)
            </div>
          )}
          <label className="block text-xs font-medium text-gray-500">
            이미지 프롬프트
            <input
              type="text"
              value={content.imagePrompt ?? ''}
              onChange={(e) => onChange({ ...content, imagePrompt: e.target.value })}
              placeholder="이미지 프롬프트: ..."
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            />
          </label>
          <label className="block text-xs font-medium text-gray-500">
            ALT 텍스트 (SEO)
            <input
              type="text"
              value={content.alt ?? ''}
              onChange={(e) => onChange({ ...content, alt: e.target.value })}
              placeholder="대체 텍스트"
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            />
          </label>
        </div>
      )}

      {cardType === 'divider' && (
        <div>
          <div className="mb-1 text-xs font-medium text-gray-400">구분선</div>
          <hr className="border-gray-200" />
        </div>
      )}
    </div>
  );
}
