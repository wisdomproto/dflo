// ================================================
// ImageUploader - 이미지 업로드 / 미리보기 / 삭제
// Supabase Storage (content-images) 연동
// 이미지 위에 드래그 앤 드롭으로 교체 가능
// ================================================

import { useState, useRef } from 'react';
import { uploadImage, deleteImage } from '@/shared/lib/storage';

type Folder = 'recipes' | 'guides' | 'cases';

interface Props {
  folder: Folder;
  currentUrl?: string;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
  /** 미리보기 이미지 클릭 시 콜백 (크게 보기 용) */
  onPreviewClick?: (url: string) => void;
}

export function ImageUploader({ folder, currentUrl, onUploaded, onRemoved, onPreviewClick }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB 이하여야 합니다');
      return;
    }

    setError(null);
    setUploading(true);
    setDragOver(false);

    try {
      // 기존 이미지가 Supabase Storage URL이면 삭제
      if (currentUrl && currentUrl.includes('supabase')) {
        try { await deleteImage(currentUrl); } catch { /* 무시 */ }
      }
      const url = await uploadImage(folder, file);
      setPreview(url);
      onUploaded(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (currentUrl && currentUrl.includes('supabase')) {
      try { await deleteImage(currentUrl); } catch { /* 무시 */ }
    }
    setPreview(null);
    onUploaded('');
    onRemoved?.();
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div
          className="relative group"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <img
            src={preview}
            alt="미리보기"
            onClick={() => onPreviewClick?.(preview)}
            className={`w-full h-36 object-cover rounded-lg border-2 transition-all ${
              dragOver ? 'border-primary opacity-50' : 'border-gray-200'
            } ${onPreviewClick ? 'cursor-pointer' : ''}`}
          />
          {/* 드래그 오버 레이 */}
          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/20">
              <p className="text-sm font-medium text-primary">이미지 교체</p>
            </div>
          )}
          {/* 업로드 중 오버레이 */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {/* 삭제 버튼 */}
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white
                       flex items-center justify-center text-xs opacity-0 group-hover:opacity-100
                       transition-opacity hover:bg-red-500"
            aria-label="이미지 삭제"
          >
            ✕
          </button>
          {/* 교체 버튼 */}
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 rounded-lg bg-black/50 text-white px-2 py-1
                       text-xs opacity-0 group-hover:opacity-100
                       transition-opacity hover:bg-black/70"
          >
            📷 변경
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center h-36 rounded-lg border-2 border-dashed
                     cursor-pointer transition-colors
                     ${uploading ? 'border-primary bg-primary/5' : dragOver ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'}`}
        >
          {uploading ? (
            <>
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-primary mt-2">업로드 중...</p>
            </>
          ) : (
            <>
              <span className="text-2xl text-gray-300">📷</span>
              <p className="text-xs text-gray-400 mt-1">클릭 또는 드래그하여 업로드</p>
              <p className="text-[10px] text-gray-300">JPG, PNG, WebP (5MB 이하)</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
