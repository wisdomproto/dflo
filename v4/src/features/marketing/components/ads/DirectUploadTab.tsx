// src/features/marketing/components/ads/DirectUploadTab.tsx
// 광고 전용 소재(마케팅 릴 mp4·광고 이미지) 직접 업로드 — 다크 포스트 경로.
// 콘텐츠 스튜디오에 없는 파일(Remotion 마케팅 릴, GPT 광고 이미지)을 R2(marketing/ads)에
// 원본 업로드 후 소재로 추가한다. 드래그앤드롭 + 클릭 선택 + (포커스 후) Ctrl+V.
import { useRef, useState } from 'react';
import { uploadAdCreativeFile } from '../../services/aiImageService';
import type { PickedCreative } from './CreativePicker';

export function DirectUploadTab({
  market,
  onPick,
}: {
  market: string;
  onPick: (c: PickedCreative) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError('');
    const picks: PickedCreative[] = [];
    const fails: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress(`${i + 1}/${files.length} 업로드 중 — ${f.name}`);
      try {
        const url = await uploadAdCreativeFile(f);
        const isVideo = f.type.startsWith('video/');
        picks.push({
          kind: isVideo ? 'reels' : 'image',
          articleId: null,
          lang: market,
          thumbnailUrl: isVideo ? '' : url,
          mediaUrl: url,
          name: f.name.replace(/\.[^.]+$/, ''),
          caption: '',
        });
      } catch (e) {
        fails.push(`${f.name}: ${e instanceof Error ? e.message : '실패'}`);
      }
    }
    setBusy(false);
    setProgress('');
    if (fails.length > 0 && picks.length === 0) {
      setError(fails.join(' / '));
      return;
    }
    if (fails.length > 0) window.alert(`일부 업로드 실패:\n${fails.join('\n')}`);
    picks.forEach(onPick); // 부모가 콘텐츠로 추가 + 모달 닫음
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <div
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onPaste={(e) => { if (e.clipboardData.files.length) handleFiles(e.clipboardData.files); }}
        className={`grid w-full max-w-xl cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-8 py-16 text-center outline-none transition-colors ${
          dragOver ? 'border-[#4A2D6B] bg-[#4A2D6B]/5' : 'border-gray-300 hover:border-[#4A2D6B] focus:border-[#4A2D6B]'
        }`}
      >
        {busy ? (
          <div className="space-y-1">
            <div className="text-2xl">⏳</div>
            <p className="text-sm text-gray-600">{progress}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-3xl">⬆️</div>
            <p className="text-sm font-medium text-gray-700">이미지·영상을 끌어다 놓거나 클릭해서 선택</p>
            <p className="text-xs text-gray-400">
              여러 파일 동시 가능 · 영상 mp4 ≤100MB · 이미지는 원본(JPG/PNG) 그대로 업로드
              <br />클릭 후 Ctrl+V 붙여넣기도 됩니다
            </p>
          </div>
        )}
      </div>
      {error && <p className="max-w-xl text-center text-xs text-red-500">{error}</p>}
      <p className="max-w-xl text-center text-[11px] text-gray-400">
        업로드한 소재는 피드에 올라가지 않고 광고(다크 포스트)에만 쓰입니다. 본문 카피는 캠페인 저장 후
        Meta 광고관리자에서 다듬거나, 소재 추가 시점의 캡션 없이 비워둡니다.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
