// 로컬 state 로 타이핑하고 blur/Enter 시 1회만 커밋하는 텍스트 입력 — undo 스냅샷(≤20) 키스트로크 소진 방지.
// value prop(=doc) 변경 시 표시값 동기화: 언어/콘텐츠 전환·undo/redo 로 외부 값이 바뀌면 따라간다.
import { useState } from 'react';

const inputCls =
  'w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-[#4A2D6B] focus:outline-none';

export function CommitInput({
  value, onCommit, placeholder, className,
}: { value: string; onCommit: (v: string) => void; placeholder?: string; className?: string }) {
  const [local, setLocal] = useState(value);
  const [seed, setSeed] = useState(value); // 렌더 중 외부 value 변화 감지(파생 state 동기화 패턴)
  if (seed !== value) {
    setSeed(value);
    setLocal(value);
  }
  const commit = () => { if (local !== value) onCommit(local); };
  return (
    <input
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className={className ?? inputCls}
    />
  );
}
