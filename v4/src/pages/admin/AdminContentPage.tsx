// ================================================
// AdminContentPage - 콘텐츠 저작도구 (다크 테마)
// 성장 가이드 / 건강 레시피 / 성장 사례 통합 관리
// ================================================

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  upsertRecipe, deleteRecipe,
  upsertGuide, deleteGuide,
  upsertGrowthCase, deleteGrowthCase,
} from '@/features/admin/services/adminService';
import { fetchRecipes, fetchGrowthCases, fetchGrowthGuides } from '@/features/content/services/contentService';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import { useUIStore } from '@/stores/uiStore';
import type { Recipe, GrowthCase, GrowthGuide, CaseMeasurement } from '@/shared/types';

type Tab = 'recipe' | 'guide' | 'case';
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'guide', label: '성장 가이드', emoji: '📚' },
  { key: 'recipe', label: '건강 레시피', emoji: '🥗' },
  { key: 'case', label: '성장 사례', emoji: '📋' },
];
const DIFF = ['쉬움', '보통', '어려움'] as const;

type ERecipe = Partial<Recipe> & { title: string };
type EGuide = Partial<GrowthGuide> & { title: string; content: string };
type ECase = Partial<GrowthCase> & { patient_name: string };

const mkRecipe = (): ERecipe => ({ title: '', image_url: '', key_benefits: '', cooking_time_minutes: 0, difficulty: '보통', is_featured: false, order_index: 0 });
const mkGuide = (): EGuide => ({ title: '', subtitle: '', icon: '', category: '', content: '', image_url: '', banner_color: '', is_featured: false, order_index: 0 });
const mkCase = (): ECase => ({ patient_name: '', gender: 'male', special_notes: '', image_url: '', is_featured: false, order_index: 0, measurements: [] });
const mkMeasurement = (): CaseMeasurement => ({ date: new Date().toISOString().split('T')[0], age: 0, height: 0 });

/* ---- dark theme classes ---- */
const ic = 'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm w-full text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';
const cellIc = 'bg-transparent border-0 w-full text-xs text-gray-200 placeholder-gray-500 py-1 px-1 focus:outline-none focus:bg-gray-700/50 rounded';
const fw = 'bg-gray-800 rounded-xl p-4 space-y-3';
const cardCls = 'bg-gray-800 rounded-xl shadow-sm p-4 flex items-center justify-between';

const Badge = () => <span className="bg-yellow-900/50 text-yellow-400 rounded-full px-2 py-0.5 text-xs">추천</span>;
const Skeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => <div key={i} className="bg-gray-800 rounded-xl p-4 h-16 animate-pulse" />)}
  </div>
);

export default function AdminContentPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [tab, setTab] = useState<Tab>('guide');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [guides, setGuides] = useState<GrowthGuide[]>([]);
  const [cases, setCases] = useState<GrowthCase[]>([]);
  const [loading, setLoading] = useState<Record<Tab, boolean>>({ recipe: false, guide: false, case: false });
  const [eR, setER] = useState<ERecipe | null>(null);
  const [eG, setEG] = useState<EGuide | null>(null);
  const [eC, setEC] = useState<ECase | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const dragIdx = useRef<number | null>(null);

  const load = useCallback(async (t: Tab) => {
    setLoading((p) => ({ ...p, [t]: true }));
    try {
      if (t === 'recipe') setRecipes(await fetchRecipes());
      else if (t === 'guide') setGuides(await fetchGrowthGuides());
      else setCases(await fetchGrowthCases());
    } catch (e: unknown) { addToast('error', e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.'); }
    finally { setLoading((p) => ({ ...p, [t]: false })); }
  }, [addToast]);

  useEffect(() => { load(tab); }, [tab, load]);

  async function save(t: Tab) {
    setSaving(true);
    try {
      if (t === 'recipe' && eR) { await upsertRecipe(eR); setER(null); }
      else if (t === 'guide' && eG) { await upsertGuide(eG); setEG(null); }
      else if (t === 'case' && eC) { await upsertGrowthCase(eC); setEC(null); }
      addToast('success', '저장되었습니다');
      await load(t);
    } catch (e: unknown) { addToast('error', e instanceof Error ? e.message : '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  }

  async function del(t: Tab, id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      if (t === 'recipe') await deleteRecipe(id);
      else if (t === 'guide') await deleteGuide(id);
      else await deleteGrowthCase(id);
      addToast('success', '삭제되었습니다');
      await load(t);
    } catch (e: unknown) { addToast('error', e instanceof Error ? e.message : '삭제에 실패했습니다.'); }
  }

  /* ---- shared UI helpers ---- */
  const editBtn = (onClick: () => void) => <button onClick={onClick} className="text-primary hover:text-primary-light text-xs">수정</button>;
  const foldBtn = (onClick: () => void) => <button onClick={onClick} className="text-gray-400 hover:text-gray-200 text-xs">접기</button>;
  const delBtn = (onClick: () => void) => <button onClick={onClick} className="text-red-400 hover:text-red-300 text-xs">삭제</button>;
  const newBtn = (onClick: () => void) => <button onClick={onClick} className="text-sm font-medium text-primary hover:text-primary-light">+ 새로 만들기</button>;
  const cancelBtn = (onClick: () => void) => <button onClick={onClick} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5">취소</button>;
  const saveBtn = (onClick: () => void, disabled: boolean) => (
    <button onClick={onClick} disabled={disabled} className="text-sm bg-primary text-white rounded-lg px-4 py-1.5 disabled:opacity-40 hover:bg-primary-dark transition-colors">
      {saving ? '저장 중...' : '저장'}
    </button>
  );
  const empty = (msg: string) => <p className="text-gray-500 text-sm text-center py-8">{msg}</p>;
  const label = (text: string) => <span className="text-[11px] text-gray-400 block mb-0.5">{text}</span>;

  /** 클릭 가능한 썸네일 */
  const thumb = (url: string | undefined, fallbackEmoji: string, fallbackBg: string) => {
    if (url) {
      return (
        <img
          src={url} alt=""
          className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-primary/50 transition"
          onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }}
        />
      );
    }
    return <div className={`w-10 h-10 rounded-lg ${fallbackBg} flex items-center justify-center text-lg`}>{fallbackEmoji}</div>;
  };

  /* ================ Recipe ================ */
  function recipeForm() {
    if (!eR) return null;
    const s = (p: Partial<ERecipe>) => setER((v) => v ? { ...v, ...p } : v);
    return (
      <div className={fw}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 왼쪽: 이미지 */}
          <div className="lg:w-[220px] shrink-0">
            <ImageUploader folder="recipes" currentUrl={eR.image_url || undefined} onUploaded={(url) => s({ image_url: url })} onPreviewClick={setLightboxUrl} />
          </div>
          {/* 오른쪽: 데이터 */}
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
        <div className="flex gap-2 justify-end">{cancelBtn(() => setER(null))}{saveBtn(() => save('recipe'), saving || !eR.title)}</div>
      </div>
    );
  }

  function recipeTab() {
    if (loading.recipe) return <Skeleton />;
    return (
      <>
        {newBtn(() => setER(mkRecipe()))}
        {eR && !eR.id && recipeForm()}
        <div className="space-y-3">
          {recipes.map((r) => {
            const isEditing = eR?.id === r.id;
            return (
              <div key={r.id}>
                <div className={cardCls}>
                  <div className="flex items-center gap-3">
                    {thumb(r.image_url, '🍳', 'bg-orange-900/30')}
                    <div>
                      <span className="font-medium text-sm text-gray-100">{r.title}</span>
                      {r.is_featured && <> <Badge /></>}
                      {r.key_benefits && <p className="text-xs text-gray-400 truncate max-w-[200px]">{r.key_benefits}</p>}
                    </div>
                  </div>
                  <div className="flex gap-3">{isEditing ? foldBtn(() => setER(null)) : editBtn(() => setER({ ...r }))}{delBtn(() => del('recipe', r.id))}</div>
                </div>
                {isEditing && recipeForm()}
              </div>
            );
          })}
          {!recipes.length && empty('등록된 레시피가 없습니다.')}
        </div>
      </>
    );
  }

  /* ================ Guide ================ */
  function guideForm() {
    if (!eG) return null;
    const s = (p: Partial<EGuide>) => setEG((v) => v ? { ...v, ...p } : v);
    return (
      <div className={fw}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 왼쪽: 이미지 */}
          <div className="lg:w-[220px] shrink-0">
            <ImageUploader folder="guides" currentUrl={eG.image_url || undefined} onUploaded={(url) => s({ image_url: url })} onPreviewClick={setLightboxUrl} />
          </div>
          {/* 오른쪽: 데이터 */}
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
        {/* 본문 내용 편집 - 전체 너비 */}
        {(() => {
          let parsed: { summary?: string; key_points?: string[]; sections?: { title: string; content: string }[] } = {};
          try { parsed = JSON.parse(eG.content); } catch { parsed = { summary: eG.content }; }
          const updateJson = (patch: Partial<typeof parsed>) => { s({ content: JSON.stringify({ ...parsed, ...patch }, null, 2) }); };

          return rawJsonMode ? (
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
          );
        })()}
        <div className="flex gap-2 justify-end">{cancelBtn(() => setEG(null))}{saveBtn(() => save('guide'), saving || !eG.title || !eG.content)}</div>
      </div>
    );
  }

  function guideTab() {
    if (loading.guide) return <Skeleton />;
    return (
      <>
        {newBtn(() => setEG(mkGuide()))}
        {eG && !eG.id && guideForm()}
        <div className="space-y-3">
          {guides.map((g) => {
            const isEditing = eG?.id === g.id;
            return (
              <div key={g.id}>
                <div className={cardCls}>
                  <div className="flex items-center gap-3">
                    {g.image_url ? thumb(g.image_url, '📖', 'bg-green-900/30') : g.icon ? <span className="text-xl">{g.icon}</span> : thumb(undefined, '📖', 'bg-green-900/30')}
                    <div>
                      <span className="font-medium text-sm text-gray-100">{g.title}</span>
                      {g.is_featured && <> <Badge /></>}
                      {g.category && <span className="ml-2 text-xs text-gray-400">{g.category}</span>}
                    </div>
                  </div>
                  <div className="flex gap-3">{isEditing ? foldBtn(() => setEG(null)) : editBtn(() => setEG({ ...g }))}{delBtn(() => del('guide', g.id))}</div>
                </div>
                {isEditing && guideForm()}
              </div>
            );
          })}
          {!guides.length && empty('등록된 가이드가 없습니다.')}
        </div>
      </>
    );
  }

  /* ================ Case ================ */
  function caseForm() {
    if (!eC) return null;
    const s = (p: Partial<ECase>) => setEC((v) => v ? { ...v, ...p } : v);
    const ms = eC.measurements ?? [];
    const setMs = (newMs: CaseMeasurement[]) => s({ measurements: newMs });

    /** 생년월일 + 측정일 → 만나이 (소수점 1자리) */
    const calcAge = (measuredDate: string, birthDate?: string): number => {
      if (!birthDate || !measuredDate) return 0;
      const b = new Date(birthDate);
      const m = new Date(measuredDate);
      const diffMs = m.getTime() - b.getTime();
      return Math.round((diffMs / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
    };

    const updateM = (idx: number, patch: Partial<CaseMeasurement>) => {
      const next = [...ms];
      next[idx] = { ...next[idx], ...patch };
      // 측정일이 바뀌면 만나이 자동 계산
      if (patch.date) {
        next[idx].age = calcAge(patch.date, eC.birth_date);
      }
      setMs(next);
    };
    const removeM = (idx: number) => setMs(ms.filter((_, i) => i !== idx));
    const addM = () => {
      const today = new Date().toISOString().split('T')[0];
      setMs([...ms, { ...mkMeasurement(), age: calcAge(today, eC.birth_date) }]);
    };

    // drag & drop reorder
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
        <ImageUploader folder="cases" currentUrl={eC.image_url || undefined} onUploaded={(url) => s({ image_url: url })} onPreviewClick={setLightboxUrl} />

        {/* 기본 정보 한 줄 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>{label('차트번호 *')}<input className={ic} value={eC.patient_name} onChange={(e) => s({ patient_name: e.target.value })} /></div>
          <div>{label('성별')}<select className={ic} value={eC.gender ?? 'male'} onChange={(e) => s({ gender: e.target.value as 'male' | 'female' })}><option value="male">남</option><option value="female">여</option></select></div>
          <div>{label('생년월일')}<input className={ic} type="date" value={eC.birth_date ?? ''} onChange={(e) => {
            const bd = e.target.value;
            // 생년월일 바뀌면 모든 측정 만나이 재계산
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

        {/* 측정 데이터 - 엑셀 테이블 */}
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

        <div className="flex gap-2 justify-end">{cancelBtn(() => setEC(null))}{saveBtn(() => save('case'), saving || !eC.patient_name)}</div>
      </div>
    );
  }

  function caseTab() {
    if (loading.case) return <Skeleton />;
    return (
      <>
        {newBtn(() => setEC(mkCase()))}
        {eC && !eC.id && caseForm()}
        <div className="space-y-3">
          {cases.map((c) => {
            const isEditing = eC?.id === c.id;
            return (
              <div key={c.id}>
                <div className={cardCls}>
                  <div className="flex items-center gap-3">
                    {thumb(c.image_url, '📋', 'bg-blue-900/30')}
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
                    {delBtn(() => del('case', c.id))}
                  </div>
                </div>
                {isEditing && caseForm()}
              </div>
            );
          })}
          {!cases.length && empty('등록된 성장 사례가 없습니다.')}
        </div>
      </>
    );
  }

  /* ================ Page ================ */
  return (
    <div className="space-y-6 bg-gray-900 -m-4 lg:-m-6 p-4 lg:p-6 min-h-full rounded-xl">
      <h1 className="text-2xl font-bold text-gray-100">콘텐츠 저작도구</h1>
      <div className="flex gap-2">
        {TABS.map(({ key, label: l, emoji }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setER(null); setEG(null); setEC(null); }}
            className={`rounded-full py-2 px-4 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === key ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>{emoji}</span> {l}
          </button>
        ))}
      </div>
      {tab === 'recipe' && recipeTab()}
      {tab === 'guide' && guideTab()}
      {tab === 'case' && caseTab()}

      {/* 이미지 크게 보기 모달 */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxUrl} alt="크게 보기" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center text-sm hover:bg-red-500 transition-colors">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
