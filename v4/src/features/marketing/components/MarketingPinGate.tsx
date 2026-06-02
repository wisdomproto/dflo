// src/features/marketing/components/MarketingPinGate.tsx
import { useState } from 'react';

interface Props {
  onSubmit: (pin: string) => boolean;
}

export function MarketingPinGate({ onSubmit }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handle = () => {
    if (!onSubmit(pin)) {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="flex h-dvh items-center justify-center bg-[#fafaf8]">
      <div className="w-80 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-[#4A2D6B]">187 마케팅 센터</h1>
        <p className="mb-5 text-sm text-gray-500">PIN을 입력하세요</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          aria-label="PIN"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handle()}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-center tracking-widest focus:border-[#4A2D6B] focus:outline-none"
          placeholder="••••"
          autoFocus
        />
        {error && (
          <p role="alert" className="mb-2 text-xs text-red-500">
            PIN이 올바르지 않습니다
          </p>
        )}
        <button
          onClick={handle}
          disabled={!pin}
          className="w-full rounded-lg bg-[#4A2D6B] py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          입장
        </button>
      </div>
    </div>
  );
}
