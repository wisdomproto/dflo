import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MarketingArticle } from '../../types';

const ACCENT = '#4A2D6B';
const LANG_FLAG: Record<string, string> = { th: '🇹🇭', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳' };

interface Props {
  articles: MarketingArticle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

// ── Sortable row ────────────────────────────────────────────────────────────
function SortableRow({
  article, index, isSelected, draggable, onSelect, onDelete,
}: {
  article: MarketingArticle;
  index: number;
  isSelected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: article.id, disabled: !draggable });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={onSelect}
      className={`group flex items-center gap-1 px-1.5 py-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-[#4A2D6B]/10' : 'hover:bg-gray-100'
      }`}
    >
      {/* Drag handle (only this initiates drag) */}
      <span
        {...(draggable ? listeners : {})}
        onClick={(e) => e.stopPropagation()}
        className={`shrink-0 select-none px-0.5 text-gray-300 ${
          draggable ? 'cursor-grab active:cursor-grabbing hover:text-gray-500' : 'opacity-30'
        }`}
        style={{ touchAction: 'none' }}
        title={draggable ? '드래그로 순서 변경' : '전체 필터에서만 순서 변경'}
      >
        ⠿
      </span>

      {/* 순서 번호 (부모 관점 우선순위) */}
      <span className="shrink-0 w-6 text-right text-[11px] tabular-nums text-gray-400">{index}</span>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800" title={article.title}>
            {article.title || '(제목 없음)'}
          </span>
          {article.confirmed && (
            <span className="shrink-0 text-green-600 text-xs" title="컨펌됨">✓</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
          {article.category && (
            <span className="truncate max-w-[110px]">{article.category}</span>
          )}
          {/* 번역 보유 언어 플래그 (master 는 한국어 원본) */}
          <span className="shrink-0">
            🇰🇷
            {Object.entries(article.translations ?? {})
              .filter(([, t]) => t?.body?.trim())
              .map(([lang]) => LANG_FLAG[lang] ?? '🌐')
              .join('')}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 p-1 rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
        title="삭제"
      >
        🗑
      </button>
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────────────────
export function ContentListPanel({
  articles, selectedId, onSelect, onNew, onDelete, onReorder,
}: Props) {
  const [filter, setFilter] = useState<string>('전체');

  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))];
  const filtered = filter === '전체' ? articles : articles.filter((a) => a.category === filter);
  const canDrag = filter === '전체';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = articles.findIndex((a) => a.id === active.id);
    const newIdx = articles.findIndex((a) => a.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(articles, oldIdx, newIdx).map((a) => a.id));
  }

  const list = (
    <SortableContext items={filtered.map((a) => a.id)} strategy={verticalListSortingStrategy}>
      {filtered.map((a) => (
        <SortableRow
          key={a.id}
          article={a}
          index={articles.findIndex((x) => x.id === a.id) + 1}
          isSelected={a.id === selectedId}
          draggable={canDrag}
          onSelect={() => onSelect(a.id)}
          onDelete={() => onDelete(a.id)}
        />
      ))}
    </SortableContext>
  );

  return (
    <aside className="w-72 shrink-0 border-r border-gray-200 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800">
            콘텐츠 <span className="font-normal text-gray-400">({articles.length})</span>
          </span>
          <button
            onClick={onNew}
            className="text-xs font-semibold px-2 py-1 rounded-md text-white"
            style={{ backgroundColor: ACCENT }}
          >
            + 새 글
          </button>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {['전체', ...categories].map((cat) => {
              const active = filter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                    active ? 'text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                  style={active ? { backgroundColor: ACCENT } : undefined}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-400 px-3 leading-relaxed">
            글이 없습니다. + 새 글 으로 시작하세요.
          </div>
        ) : canDrag ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {list}
          </DndContext>
        ) : (
          list
        )}
      </div>
    </aside>
  );
}
