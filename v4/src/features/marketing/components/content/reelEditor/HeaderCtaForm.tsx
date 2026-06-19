// 헤더/CTA 편집 폼 (아코디언, 기본 접힘) — 인트로 카드 헤더(top/mark)·마크 색·CTA 문구.
// 텍스트 input 은 로컬 state 타이핑 + onBlur 1회 커밋(키스트로크 커밋 시 undo 스냅샷 소진). 색상은 즉시.
import { useState } from 'react';
import type { ReelLang, ReelScriptDoc } from '../../../types';
import { CommitInput } from './CommitInput';

const ACCENT = '#4A2D6B';

type Script = ReelScriptDoc['script'];

interface Props {
  doc: ReelScriptDoc;
  language: ReelLang;
  onPatchScript: (patch: Partial<Script>) => void;
}

export function HeaderCtaForm({ doc, language, onPatchScript }: Props) {
  const [open, setOpen] = useState(false);
  const script = doc.script;
  const header = script.header?.[language] ?? { top: '', mark: '' };
  const style = script.headerStyle ?? {};
  const cta = script.cta?.[language] ?? '';

  // 헤더 한 필드(top/mark) 커밋 — 다른 언어 헤더는 보존하며 현재 언어만 병합.
  const commitHeader = (field: 'top' | 'mark', value: string) => {
    onPatchScript({ header: { ...script.header, [language]: { ...header, [field]: value } } });
  };
  const commitStyle = (field: 'markBg' | 'markFg', value: string) => {
    onPatchScript({ headerStyle: { ...style, [field]: value } });
  };
  const commitCta = (value: string) => {
    onPatchScript({ cta: { ...(script.cta ?? {}), [language]: value } });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600"
      >
        <span>🏷️ 헤더 · CTA ({language})</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          {/* 인트로 헤더 — 상단 라인 + 강조 마크 */}
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-gray-500">헤더 상단</label>
            <CommitInput value={header.top} onCommit={(v) => commitHeader('top', v)} placeholder="우리 아이 키" />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-gray-500">헤더 강조(마크)</label>
            <CommitInput value={header.mark} onCommit={(v) => commitHeader('mark', v)} placeholder="언제 멈출까?" />
          </div>
          {/* 마크 색상 — 즉시 커밋 */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              마크 배경
              <input
                type="color"
                value={style.markBg ?? '#E0568A'}
                onChange={(e) => commitStyle('markBg', e.target.value)}
                className="h-6 w-8 cursor-pointer rounded border border-gray-200"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              마크 글자
              <input
                type="color"
                value={style.markFg ?? '#ffffff'}
                onChange={(e) => commitStyle('markFg', e.target.value)}
                className="h-6 w-8 cursor-pointer rounded border border-gray-200"
              />
            </label>
          </div>
          {/* CTA 문구 */}
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-gray-500">CTA 문구</label>
            <CommitInput value={cta} onCommit={commitCta} placeholder="지금 바로 확인하세요" />
          </div>
          {/* 2트랙 자막 토글 — 전 언어 공통(언어 독립 플래그) */}
          <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
            <input
              type="checkbox"
              checked={!!script.twoTrack}
              onChange={(e) => onPatchScript({ twoTrack: e.target.checked })}
              className="h-3.5 w-3.5 cursor-pointer"
            />
            2트랙 자막 (강조 상단 + 카라오케 하단) · 전 언어 공통
          </label>
          {/* 배경음악 볼륨 — 전 언어 공통 */}
          <label className="block text-[11px] font-semibold text-gray-600">
            <span className="mb-0.5 flex items-center justify-between">
              <span>🎵 배경음악 볼륨 · 전 언어 공통</span>
              <span style={{ color: ACCENT }}>{Math.round((script.bgmVolume ?? 0.15) * 100)}%</span>
            </span>
            <input
              type="range" min={0} max={0.4} step={0.01}
              value={script.bgmVolume ?? 0.15}
              onChange={(e) => onPatchScript({ bgmVolume: parseFloat(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </label>
          <p className="text-[11px]" style={{ color: ACCENT }}>
            편집은 입력 칸을 벗어날 때(blur) 저장됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
