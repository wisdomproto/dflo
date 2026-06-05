// src/features/marketing/components/content/ImageGenButton.tsx
import { useState } from 'react';
import { generateAndUpload } from '../../services/aiImageService';

interface Props {
  prompt: string;
  onGenerated: (url: string) => void;
}

export function ImageGenButton({ prompt, onGenerated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !prompt.trim() || loading;

  const handleClick = async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const url = await generateAndUpload(prompt);
      onGenerated(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="h-8 self-start rounded border border-[#4A2D6B] px-3 text-xs font-semibold text-[#4A2D6B] hover:bg-[#4A2D6B]/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? '생성 중…' : '🖼 이미지 생성'}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
