// src/features/marketing/components/ads/DirectUploadTab.tsx
// 다크 포스트 소재 — 광고 전용 이미지/영상을 업로드해 R2 보관 + 라이브러리에 영구 저장.
// 영상은 업로드 시 첫 프레임을 자동 캡처해 썸네일로 저장하고, 항목별로 커버를 따로 올릴 수도 있다.
// 파일=R2(marketing/ads), 참조(URL·이름·종류·썸네일)=marketing_ad_creatives(migration 054).
import { useEffect, useRef, useState } from 'react';
import { uploadAdCreativeFile } from '../../services/aiImageService';
import { fetchAdCreatives, saveAdCreative, deleteAdCreative, updateAdCreativeThumbnail, type AdCreative } from '../../services/adCreativeLibraryService';
import type { PickedCreative } from './CreativePicker';

// 영상 File → 첫 프레임 JPEG File. 실패 시 null(그땐 썸네일 없이 진행).
function extractFirstFrame(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    (video as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (f: File | null) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(f); };
    video.onloadeddata = () => { try { video.currentTime = Math.min(0.1, (video.duration || 1) / 2); } catch { finish(null); } };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => finish(b ? new File([b], `${file.name.replace(/\.[^.]+$/, '')}-cover.jpg`, { type: 'image/jpeg' }) : null), 'image/jpeg', 0.85);
      } catch { finish(null); }
    };
    video.onerror = () => finish(null);
    setTimeout(() => finish(null), 15000); // 안전망
    video.src = url;
  });
}

export function DirectUploadTab({
  market,
  onPick,
}: {
  market: string;
  onPick: (c: PickedCreative) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AdCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [thumbTargetId, setThumbTargetId] = useState<string | null>(null);
  const [thumbBusyId, setThumbBusyId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAdCreatives(market).then(setItems).finally(() => setLoading(false));
  }, [market]);

  const handleFiles = async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError('');
    const saved: AdCreative[] = [];
    const fails: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const isVideo = f.type.startsWith('video/');
      setProgress(`${i + 1}/${files.length} 업로드 중 — ${f.name}`);
      try {
        const url = await uploadAdCreativeFile(f);
        let thumb = isVideo ? '' : url;
        if (isVideo) {
          setProgress(`${i + 1}/${files.length} 첫 프레임 추출 중 — ${f.name}`);
          const frame = await extractFirstFrame(f);
          if (frame) { try { thumb = await uploadAdCreativeFile(frame); } catch { /* 썸네일 없이 진행 */ } }
        }
        const rec = await saveAdCreative({ market, name: f.name.replace(/\.[^.]+$/, ''), kind: isVideo ? 'reels' : 'image', mediaUrl: url, thumbnailUrl: thumb });
        saved.push(rec);
      } catch (e) {
        fails.push(`${f.name}: ${e instanceof Error ? e.message : '실패'}`);
      }
    }
    setBusy(false);
    setProgress('');
    if (saved.length) setItems((prev) => [...saved, ...prev]);
    if (fails.length) setError(`일부 실패: ${fails.join(' / ')}`);
  };

  // 항목별 커버(썸네일) 교체
  const onThumbFile = async (file: File | undefined) => {
    const id = thumbTargetId;
    setThumbTargetId(null);
    if (!file || !id) return;
    setThumbBusyId(id);
    try {
      const url = await uploadAdCreativeFile(file);
      await updateAdCreativeThumbnail(id, url);
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, thumbnailUrl: url } : x)));
    } catch (e) {
      window.alert(`표지 변경 실패: ${e instanceof Error ? e.message : '오류'}`);
    } finally {
      setThumbBusyId(null);
    }
  };

  const pick = (c: AdCreative) => {
    onPick({
      kind: c.kind,
      articleId: null,
      lang: market,
      thumbnailUrl: c.thumbnailUrl || (c.kind === 'image' ? c.mediaUrl : ''),
      mediaUrl: c.mediaUrl,
      name: c.name,
      caption: '',
    });
  };

  const remove = async (c: AdCreative) => {
    if (!window.confirm(`'${c.name}' 소재를 라이브러리에서 삭제할까요? (R2 파일은 유지)`)) return;
    try {
      await deleteAdCreative(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      window.alert(`삭제 실패: ${e instanceof Error ? e.message : '오류'}`);
    }
  };

  return (
    <div className="space-y-3">
      {/* 업로드(추가) 드롭존 */}
      <div
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onPaste={(e) => { if (e.clipboardData.files.length) handleFiles(e.clipboardData.files); }}
        className={`grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-6 py-7 text-center outline-none transition-colors ${
          dragOver ? 'border-[#4A2D6B] bg-[#4A2D6B]/5' : 'border-gray-300 hover:border-[#4A2D6B] focus:border-[#4A2D6B]'
        }`}
      >
        {busy ? (
          <div className="space-y-1"><div className="text-xl">⏳</div><p className="text-xs text-gray-600">{progress}</p></div>
        ) : (
          <div className="space-y-1">
            <div className="text-2xl">⬆️</div>
            <p className="text-sm font-medium text-gray-700">이미지·영상을 끌어다 놓거나 클릭해서 업로드</p>
            <p className="text-[11px] text-gray-400">여러 파일 동시 · 영상 mp4 ≤100MB · 영상은 첫 프레임을 자동 썸네일로 저장 · 클릭 후 Ctrl+V 가능</p>
          </div>
        )}
      </div>
      {error && <p className="text-center text-xs text-red-500">{error}</p>}

      {/* 라이브러리 그리드 */}
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">소재 불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">저장된 다크 포스트 소재가 없습니다. 위로 업로드하세요.</p>
      ) : (
        <>
          <p className="text-[11px] text-gray-400">저장된 소재 {items.length}개 — 타일 클릭=캠페인 추가 · 영상은 🖼 표지로 커버 변경</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((c) => (
              <div
                key={c.id}
                onClick={() => pick(c)}
                className="group relative cursor-pointer overflow-hidden rounded-lg border-2 border-transparent text-left hover:border-[#4A2D6B]"
              >
                <div className="relative aspect-square bg-gray-100">
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : c.kind === 'reels' ? (
                    <video src={c.mediaUrl} className="h-full w-full object-cover" muted />
                  ) : (
                    <div className="grid h-full place-items-center text-2xl text-gray-300">🖼</div>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold text-white">
                    {c.kind === 'reels' ? '🎬 영상' : '🖼 이미지'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void remove(c); }}
                    className="absolute right-1 top-1 hidden rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white group-hover:block hover:bg-red-600"
                    title="삭제"
                  >✕</button>
                  {c.kind === 'reels' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setThumbTargetId(c.id); thumbInputRef.current?.click(); }}
                      disabled={thumbBusyId === c.id}
                      className="absolute bottom-1 left-1 hidden rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white group-hover:block hover:bg-[#4A2D6B] disabled:opacity-50"
                      title="표지(썸네일) 변경"
                    >{thumbBusyId === c.id ? '…' : '🖼 표지'}</button>
                  )}
                </div>
                <div className="truncate px-1.5 py-1 text-[11px] text-gray-700">{c.name || '(이름 없음)'}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-[11px] text-gray-400">
        다크 포스트 = 광고용 소재. 영상 썸네일은 첫 프레임이 기본이며, 🖼 표지로 직접 지정할 수 있습니다.
      </p>

      <input ref={inputRef} type="file" accept="image/*,video/mp4,video/quicktime" multiple className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} />
      <input ref={thumbInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { void onThumbFile(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
