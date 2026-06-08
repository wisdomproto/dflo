import { useCallback, useRef, useState } from 'react';
import { usePasteTarget } from '@/shared/hooks/usePasteTarget';
import { uploadImageFile } from '../../services/aiImageService';

interface Props {
  url: string | null;
  alt?: string;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  aspectRatio?: string; // e.g. '16/9'
}

// 이미지 입력 칸: 클릭하면 붙여넣기 대상으로 지정(하이라이트) → Ctrl+V, 드래그앤드롭, 파일선택 모두 지원.
export function ImageDropzone({ url, alt, onUploaded, onClear, aspectRatio }: Props) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file || !file.type.startsWith('image/')) return;
      setErr(null);
      setUploading(true);
      try {
        onUploaded(await uploadImageFile(file));
      } catch (e) {
        setErr(e instanceof Error ? e.message : '업로드 실패');
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  const { armed, wrapperProps } = usePasteTarget({
    onPaste: handleFile,
    accept: (t) => t.startsWith('image/'),
  });

  return (
    <div className="space-y-1">
      <div
        {...wrapperProps}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={
          'relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition ' +
          (armed
            ? 'border-[#4A2D6B] bg-[#4A2D6B]/5 ring-4 ring-[#4A2D6B]/30'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400')
        }
        style={aspectRatio ? { aspectRatio } : undefined}
        title="클릭 → Ctrl+V 붙여넣기 · 드래그앤드롭"
      >
        {url ? (
          <img
            src={url}
            alt={alt ?? ''}
            className="w-full rounded-lg object-contain"
            style={aspectRatio ? { aspectRatio, height: '100%' } : { maxHeight: '16rem' }}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-1 p-2 text-center text-xs text-gray-400"
            style={aspectRatio ? { height: '100%' } : { height: '8rem' }}
          >
            <span>🖼 드래그앤드롭 / 붙여넣기</span>
            <span className={armed ? 'font-semibold text-[#4A2D6B]' : ''}>
              {armed ? 'Ctrl+V 로 붙여넣기' : '클릭하여 붙여넣기 대상 지정'}
            </span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-[#4A2D6B]">
            업로드 중…
          </div>
        )}
        {url && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
          >
            ×
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100"
        >
          📁 파일 선택
        </button>
        {armed && <span className="text-[11px] font-semibold text-[#4A2D6B]">← 붙여넣기 대상 (Ctrl+V)</span>}
        {err && <span className="text-[11px] text-red-500">{err}</span>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
