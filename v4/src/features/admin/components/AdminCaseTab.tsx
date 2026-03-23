import { useState, useRef } from 'react';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import {
  type ECase, mkCase, mkMeasurement, ic, cellIc, fw, cardCls,
  Badge, Skeleton, thumb, label, empty,
  editBtn, foldBtn, delBtn, newBtn, cancelBtn, saveBtn,
} from './AdminContentShared';
import type { GrowthCase, CaseMeasurement } from '@/shared/types';

interface Props {
  items: GrowthCase[];
  loading: boolean;
  saving: boolean;
  onSave: (item: ECase) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLightbox: (url: string) => void;
}

export function AdminCaseTab({ items, loading, saving, onSave, onDelete, onLightbox }: Props) {
  const [eC, setEC] = useState<ECase | null>(null);
  const dragIdx = useRef<number | null>(null);
  const s = (p: Partial<ECase>) => setEC((v) => v ? { ...v, ...p } : v);

  const handleSave = async () => { if (eC) { await onSave(eC); setEC(null); } };

  const calcAge = (measuredDate: string, birthDate?: string): number => {
    if (!birthDate || !measuredDate) return 0;
    const b = new Date(birthDate);
    const m = new Date(measuredDate);
    return Math.round((m.getTime() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;
  };

  const form = () => {
    if (!eC) return null;
    const ms = eC.measurements ?? [];
    const setMs = (newMs: CaseMeasurement[]) => s({ measurements: newMs });

    const updateM = (idx: number, patch: Partial<CaseMeasurement>) => {
      const next = [...ms];
      next[idx] = { ...next[idx], ...patch };
      if (patch.date) next[idx].age = calcAge(patch.date, eC.birth_date);
      setMs(next);
    };
    const removeM = (idx: number) => setMs(ms.filter((_, i) => i !== idx));
    const addM = () => {
      const today = new Date().toISOString().split('T')[0];
      setMs([...ms, { ...mkMeasurement(), age: calcAge(today, eC.birth_date) }]);
    };

    const handleDragStart = (idx: number) => { dragIdx.current = idx; };
    const handleDragOver = (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIdx.current === null || dragIdx.current === idx) return;
      const next = [...ms];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(idx, 0, moved);
      dragIdx.current = idx;
      setMs(next);
    };
    const handleDragEnd = () => { dragIdx.current = null; };

    return (
      <div className={fw}>
        <ImageUploader folder="cases" currentUrl={eC.image_url || undefined} onUploaded={(url) => s({ image_url: url })} onPreviewClick={onLightbox} />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>{label('차트번호 *')}<input className={ic} value={eC.patient_name} onChange={(e) => s({ patient_name: e.target.value })} /></div>
          <div>{label('성별')}<select className={ic} value={eC.gender ?? 'male'} onChange={(e) => s({ gender: e.target.value as 'male' | 'female' })}><option value="male">남</option><option value="female">여</option></select></div>
          <div>{label('생년월일')}<input className={ic} type="date" value={eC.birth_date ?? ''} onChange={(e) => {
            const bd = e.target.value;
            const recalced = ms.map((m) => ({ ...m, age: calcAge(m.date, bd) }));
            s({ birth_date: bd, measurements: recalced });
          }} /></div>
          <div>{label('아버지 키(cm)')}<input className={ic} type="number" value={eC.father_height ?? ''} onChange={(e) => s({ father_height: +e.target.value || undefined })} /></div>
          <div>{label('어머니 키(cm)')}<input className={ic} type="number" value={eC.mother_height ?? ''} onChange={(e) => s({ mother_height: +e.target.value || undefined })} /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>{label('목표 키(cm)')}<input className={ic} type="number" value={eC.target_height ?? ''} onChange={(e) => s({ target_height: +e.target.value || undefined })} /></div>
          <div>{label('정렬 순서')}<input className={ic} type="number" value={eC.order_index ?? 0} onChange={(e) => s({ order_index: +e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm text-gray-300 whitespace-nowrap self-end pb-2"><input type="checkbox" checked={eC.is_featured ?? false} onChange={(e) => s({ is_featured: e.target.checked })} /> 추천</label>
        </div>
        <div>{label('특이사항')}<textarea className={`${ic} min-h-[60px]`} value={eC.special_notes ?? ''} onChange={(e) => s({ special_notes: e.target.value })} /></div>
        <div>{label('치료 메모')}<textarea className={`${ic} min-h-[50px]`} value={eC.treatment_memo ?? ''} onChange={(e) => s({ treatment_memo: e.target.value })} /></div>

        {/* 측정 데이터 테이블 */}
        <div className="border border-gray-600 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-700/50">
            <span className="text-sm font-medium text-gray-300">측정 데이터 ({ms.length})</span>
            <button type="button" onClick={addM} className="text-xs text-primary hover:text-primary-light">+ 행 추가</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-700 text-gray-400 text-[11px]">
                  <th className="w-8 px-1 py-2 text-center"></th>
                  <th className="px-1 py-2 text-left min-w-[110px]">측정일</th>
                  <th className="px-1 py-2 text-left min-w-[70px]">만나이</th>
                  <th className="px-1 py-2 text-left min-w-[70px]">키(cm)</th>
                  <th className="px-1 py-2 text-left min-w-[70px]">체중(kg)</th>
                  <th className="px-1 py-2 text-left min-w-[70px]">뼈나이</th>
                  <th className="px-1 py-2 text-left min-w-[70px]">PAH</th>
                  <th className="px-1 py-2 text-left min-w-[100px]">메모</th>
                  <th className="w-10 px-1 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {ms.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-gray-500 py-6">측정 데이터가 없습니다</td></tr>
                )}
                {ms.map((m, idx) => (
                  <tr
                    key={idx}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors group"
                  >
                    <td className="px-1 py-1 text-center cursor-grab active:cursor-grabbing text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg>
                    </td>
                    <td className="px-1 py-1"><input className={cellIc} type="date" value={m.date} onChange={(e) => updateM(idx, { date: e.target.value })} /></td>
                    <td className="px-1 py-1 text-gray-400 text-center tabular-nums">{m.age || '-'}</td>
                    <td className="px-1 py-1"><input className={cellIc} type="number" step="0.1" value={m.height || ''} onChange={(e) => updateM(idx, { height: +e.target.value })} /></td>
                    <td className="px-1 py-1"><input className={cellIc} type="number" step="0.1" value={m.weight ?? ''} onChange={(e) => updateM(idx, { weight: +e.target.value || undefined })} /></td>
                    <td className="px-1 py-1"><input className={cellIc} type="number" step="0.1" value={m.bone_age ?? ''} onChange={(e) => updateM(idx, { bone_age: +e.target.value || undefined })} /></td>
                    <td className="px-1 py-1"><input className={cellIc} type="number" step="0.1" value={m.pah ?? ''} onChange={(e) => updateM(idx, { pah: +e.target.value || undefined })} /></td>
                    <td className="px-1 py-1"><input className={cellIc} value={m.notes ?? ''} onChange={(e) => updateM(idx, { notes: e.target.value || undefined })} /></td>
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => removeM(idx)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="삭제">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2 justify-end">{cancelBtn(() => setEC(null))}{saveBtn(handleSave, saving || !eC.patient_name, saving)}</div>
      </div>
    );
  };

  if (loading) return <Skeleton />;
  return (
    <>
      {newBtn(() => setEC(mkCase()))}
      {eC && !eC.id && form()}
      <div className="space-y-3">
        {items.map((c) => {
          const isEditing = eC?.id === c.id;
          return (
            <div key={c.id}>
              <div className={cardCls}>
                <div className="flex items-center gap-3">
                  {thumb(c.image_url, '📋', 'bg-blue-900/30', onLightbox)}
                  <div>
                    <span className="font-medium text-sm text-gray-100">{c.patient_name}</span>
                    <span className="ml-2 text-xs text-gray-400">{c.gender === 'male' ? '남' : '여'}</span>
                    {c.is_featured && <> <Badge /></>}
                    {c.measurements && c.measurements.length > 0 && (
                      <span className="ml-2 text-xs text-gray-500">측정 {c.measurements.length}건</span>
                    )}
                    {c.special_notes && <p className="text-xs text-gray-500 truncate max-w-[200px]">{c.special_notes}</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  {isEditing ? foldBtn(() => setEC(null)) : editBtn(() => setEC({ ...c }))}
                  {delBtn(() => onDelete(c.id))}
                </div>
              </div>
              {isEditing && form()}
            </div>
          );
        })}
        {!items.length && empty('등록된 성장 사례가 없습니다.')}
      </div>
    </>
  );
}
