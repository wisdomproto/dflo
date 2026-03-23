import { useState } from 'react';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import {
  type ERecipe, mkRecipe, ic, fw, cardCls, DIFF,
  Badge, Skeleton, thumb, label, empty,
  editBtn, foldBtn, delBtn, newBtn, cancelBtn, saveBtn,
} from './AdminContentShared';
import type { Recipe } from '@/shared/types';

interface Props {
  items: Recipe[];
  loading: boolean;
  saving: boolean;
  onSave: (item: ERecipe) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLightbox: (url: string) => void;
}

export function AdminRecipeTab({ items, loading, saving, onSave, onDelete, onLightbox }: Props) {
  const [eR, setER] = useState<ERecipe | null>(null);
  const s = (p: Partial<ERecipe>) => setER((v) => v ? { ...v, ...p } : v);

  const handleSave = async () => { if (eR) { await onSave(eR); setER(null); } };

  const form = () => {
    if (!eR) return null;
    return (
      <div className={fw}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-[220px] shrink-0">
            <ImageUploader folder="recipes" currentUrl={eR.image_url || undefined} onUploaded={(url) => s({ image_url: url })} onPreviewClick={onLightbox} />
          </div>
          <div className="flex-1 space-y-3">
            <div>{label('제목')}<input className={ic} placeholder="제목" value={eR.title} onChange={(e) => s({ title: e.target.value })} /></div>
            <div>{label('주요 효능')}<input className={ic} placeholder="주요 효능" value={eR.key_benefits ?? ''} onChange={(e) => s({ key_benefits: e.target.value })} /></div>
            <div>{label('주요 영양소 (쉼표 구분)')}<input className={ic} placeholder="칼슘, 비타민D, 단백질" value={(eR.main_nutrients ?? []).join(', ')} onChange={(e) => s({ main_nutrients: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} /></div>
            <div className="flex gap-3">
              <div className="flex-1">{label('재료 (줄 단위)')}<textarea className={`${ic} min-h-[80px]`} placeholder="재료 1&#10;재료 2" value={(eR.ingredients ?? []).join('\n')} onChange={(e) => s({ ingredients: e.target.value.split('\n').filter(Boolean) })} /></div>
              <div className="flex-1">{label('조리 순서 (줄 단위)')}<textarea className={`${ic} min-h-[80px]`} placeholder="1단계&#10;2단계" value={(eR.steps ?? []).join('\n')} onChange={(e) => s({ steps: e.target.value.split('\n').filter(Boolean) })} /></div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">{label('조리시간(분)')}<input className={ic} type="number" value={eR.cooking_time_minutes ?? ''} onChange={(e) => s({ cooking_time_minutes: +e.target.value })} /></div>
              <div className="flex-1">{label('난이도')}<select className={ic} value={eR.difficulty ?? '보통'} onChange={(e) => s({ difficulty: e.target.value })}>{DIFF.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="flex-1">{label('정렬 순서')}<input className={ic} type="number" value={eR.order_index ?? 0} onChange={(e) => s({ order_index: +e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm text-gray-300 whitespace-nowrap self-end pb-2"><input type="checkbox" checked={eR.is_featured ?? false} onChange={(e) => s({ is_featured: e.target.checked })} /> 추천</label>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end">{cancelBtn(() => setER(null))}{saveBtn(handleSave, saving || !eR.title, saving)}</div>
      </div>
    );
  };

  if (loading) return <Skeleton />;
  return (
    <>
      {newBtn(() => setER(mkRecipe()))}
      {eR && !eR.id && form()}
      <div className="space-y-3">
        {items.map((r) => {
          const isEditing = eR?.id === r.id;
          return (
            <div key={r.id}>
              <div className={cardCls}>
                <div className="flex items-center gap-3">
                  {thumb(r.image_url, '🍳', 'bg-orange-900/30', onLightbox)}
                  <div>
                    <span className="font-medium text-sm text-gray-100">{r.title}</span>
                    {r.is_featured && <> <Badge /></>}
                    {r.key_benefits && <p className="text-xs text-gray-400 truncate max-w-[200px]">{r.key_benefits}</p>}
                  </div>
                </div>
                <div className="flex gap-3">{isEditing ? foldBtn(() => setER(null)) : editBtn(() => setER({ ...r }))}{delBtn(() => onDelete(r.id))}</div>
              </div>
              {isEditing && form()}
            </div>
          );
        })}
        {!items.length && empty('등록된 레시피가 없습니다.')}
      </div>
    </>
  );
}
