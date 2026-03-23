import { useState } from 'react';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import {
  type EGuide, mkGuide, ic, fw, cardCls,
  Badge, Skeleton, thumb, label, empty,
  editBtn, foldBtn, delBtn, newBtn, cancelBtn, saveBtn,
} from './AdminContentShared';
import type { GrowthGuide } from '@/shared/types';

interface Props {
  items: GrowthGuide[];
  loading: boolean;
  saving: boolean;
  onSave: (item: EGuide) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLightbox: (url: string) => void;
}

export function AdminGuideTab({ items, loading, saving, onSave, onDelete, onLightbox }: Props) {
  const [eG, setEG] = useState<EGuide | null>(null);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const s = (p: Partial<EGuide>) => setEG((v) => v ? { ...v, ...p } : v);

  const handleSave = async () => { if (eG) { await onSave(eG); setEG(null); } };

  const form = () => {
    if (!eG) return null;
    let parsed: { summary?: string; key_points?: string[]; sections?: { title: string; content: string }[] } = {};
    try { parsed = JSON.parse(eG.content); } catch { parsed = { summary: eG.content }; }
    const updateJson = (patch: Partial<typeof parsed>) => { s({ content: JSON.stringify({ ...parsed, ...patch }, null, 2) }); };

    return (
      <div className={fw}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-[220px] shrink-0">
            <ImageUploader folder="guides" currentUrl={eG.image_url || undefined} onUploaded={(url) => s({ image_url: url })} onPreviewClick={onLightbox} />
          </div>
          <div className="flex-1 space-y-3">
            <div>{label('제목')}<input className={ic} placeholder="제목" value={eG.title} onChange={(e) => s({ title: e.target.value })} /></div>
            <div>{label('부제목')}<input className={ic} placeholder="부제목" value={eG.subtitle ?? ''} onChange={(e) => s({ subtitle: e.target.value })} /></div>
            <div className="flex gap-3">
              <div className="flex-1">{label('아이콘 (이모지)')}<input className={ic} placeholder="📖" value={eG.icon ?? ''} onChange={(e) => s({ icon: e.target.value })} /></div>
              <div className="flex-1">{label('카테고리')}<input className={ic} placeholder="성장" value={eG.category ?? ''} onChange={(e) => s({ category: e.target.value })} /></div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">{label('배너 색상 (#hex)')}<input className={ic} placeholder="#667eea" value={eG.banner_color ?? ''} onChange={(e) => s({ banner_color: e.target.value })} /></div>
              <div className="flex items-end gap-2 pb-1"><span className="text-xs text-gray-400">미리보기</span><div className="w-8 h-8 rounded-lg border border-gray-600" style={{ background: eG.banner_color || '#333' }} /></div>
              <div className="flex-1">{label('정렬 순서')}<input className={ic} type="number" value={eG.order_index ?? 0} onChange={(e) => s({ order_index: +e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm text-gray-300 whitespace-nowrap self-end pb-2"><input type="checkbox" checked={eG.is_featured ?? false} onChange={(e) => s({ is_featured: e.target.checked })} /> 추천</label>
            </div>
          </div>
        </div>
        {rawJsonMode ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">JSON 직접 편집</span>
              <button type="button" onClick={() => setRawJsonMode(false)} className="text-xs text-primary hover:text-primary-light">구조 편집으로</button>
            </div>
            <textarea className={`${ic} min-h-[200px] font-mono text-xs`} value={eG.content} onChange={(e) => s({ content: e.target.value })} />
          </div>
        ) : (
          <div className="space-y-3 border border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">본문 내용</span>
              <button type="button" onClick={() => setRawJsonMode(true)} className="text-xs text-gray-500 hover:text-gray-300">JSON 편집</button>
            </div>
            <div>{label('요약')}<textarea className={`${ic} min-h-[60px]`} placeholder="요약 텍스트" value={parsed.summary ?? ''} onChange={(e) => updateJson({ summary: e.target.value })} /></div>
            <div>{label('핵심 포인트 (줄 단위)')}<textarea className={`${ic} min-h-[80px]`} placeholder="포인트 1&#10;포인트 2" value={(parsed.key_points ?? []).join('\n')} onChange={(e) => updateJson({ key_points: e.target.value.split('\n').filter(Boolean) })} /></div>
          </div>
        )}
        <div className="flex gap-2 justify-end">{cancelBtn(() => setEG(null))}{saveBtn(handleSave, saving || !eG.title || !eG.content, saving)}</div>
      </div>
    );
  };

  if (loading) return <Skeleton />;
  return (
    <>
      {newBtn(() => setEG(mkGuide()))}
      {eG && !eG.id && form()}
      <div className="space-y-3">
        {items.map((g) => {
          const isEditing = eG?.id === g.id;
          return (
            <div key={g.id}>
              <div className={cardCls}>
                <div className="flex items-center gap-3">
                  {g.image_url ? thumb(g.image_url, '📖', 'bg-green-900/30', onLightbox) : g.icon ? <span className="text-xl">{g.icon}</span> : thumb(undefined, '📖', 'bg-green-900/30', onLightbox)}
                  <div>
                    <span className="font-medium text-sm text-gray-100">{g.title}</span>
                    {g.is_featured && <> <Badge /></>}
                    {g.category && <span className="ml-2 text-xs text-gray-400">{g.category}</span>}
                  </div>
                </div>
                <div className="flex gap-3">{isEditing ? foldBtn(() => setEG(null)) : editBtn(() => setEG({ ...g }))}{delBtn(() => onDelete(g.id))}</div>
              </div>
              {isEditing && form()}
            </div>
          );
        })}
        {!items.length && empty('등록된 가이드가 없습니다.')}
      </div>
    </>
  );
}
