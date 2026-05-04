import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WebsiteSection, Slide } from '../types/websiteSection';

// ============= Sortable Section Tab =============
export function SortableSectionTab({
  section, idx, isActive, canDelete, onClick, onRename, onDelete,
}: {
  section: WebsiteSection;
  idx: number;
  isActive: boolean;
  canDelete: boolean;
  onClick: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed) onRename(trimmed);
    else setEditValue(section.title || `섹션 ${idx + 1}`);
    setEditing(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const displayName = section.title || `섹션 ${idx + 1}`;

  return (
    <div ref={setNodeRef} style={style}
      className={`shrink-0 flex items-center gap-0.5 rounded-t-xl text-sm font-semibold transition-all ${
        isActive
          ? 'border-b-2 border-[#0F6E56] text-[#0F6E56] bg-white'
          : 'text-gray-500 hover:text-gray-700'
      }`}>
      <span {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing px-1 py-2 select-none opacity-40 hover:opacity-100"
        style={{ touchAction: 'none' }}>
        ⠿
      </span>

      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditValue(displayName); setEditing(false); } }}
          className="w-20 px-1 py-1 text-sm border border-[#0F6E56] rounded outline-none"
        />
      ) : (
        <button onClick={onClick} onDoubleClick={() => { if (isActive) { setEditValue(displayName); setEditing(true); } }}
          className="pr-1 py-2 max-w-[100px] truncate" title={`더블클릭으로 이름 변경`}>
          {displayName}
        </button>
      )}

      {/* Delete button — only on active tab */}
      {isActive && canDelete && !editing && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="px-1 py-1 text-red-400 hover:text-red-600 text-xs" title="섹션 삭제">
          ✕
        </button>
      )}
    </div>
  );
}

// ============= Sortable Slide Tab =============
export function SortableSlideTab({
  slide, idx, isActive, canDelete, onClick, onDelete,
}: {
  slide: Slide;
  idx: number;
  isActive: boolean;
  canDelete: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}
      className={`shrink-0 flex items-center gap-0.5 rounded-xl text-sm font-semibold transition-all ${
        isActive
          ? 'bg-[#0F6E56] text-white shadow-md'
          : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0F6E56] hover:text-[#0F6E56]'
      }`}>
      <span {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing px-2 py-2 select-none opacity-40 hover:opacity-100"
        style={{ touchAction: 'none' }}>
        ⠿
      </span>
      <button onClick={onClick} className="pr-1 py-2">
        {slide.template === 'video' ? '🎬'
          : slide.template === 'cases' ? '📊'
          : slide.template === 'iframe' ? '🌐'
          : slide.template === 'faq' ? '❓'
          : '📸'} {idx + 1}
      </button>

      {/* Delete X — only on active tab */}
      {isActive && canDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="pr-2 py-1 text-white/70 hover:text-white text-xs" title="슬라이드 삭제">
          ✕
        </button>
      )}
    </div>
  );
}
