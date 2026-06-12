// 릴 에디터 순수 유틸 — 좌표 2종 변환·타이밍 계산·렌더 kind 판정. React/IO 금지.
import type { ReelChunk, ReelLang, ReelRuntimeDoc, ReelTimingEntry } from '../types';

export const FALLBACK_CHUNK_FRAMES = 110; // timing 미생성 언어의 청크당 가정 길이
export const PANEL_TOP_FRAC = 300 / 1920; // PresenterShort PANEL_TOP/H 와 동기 (변경 시 양쪽 수정)
export const PANEL_H_FRAC = 1080 / 1920;
// 잡 active 상태 명시 나열 (스펙: 열거형 순서 의존 금지)
export const REEL_JOB_ACTIVE = ['queued', 'claimed', 'tts', 'lipsync', 'upload_preview', 'render', 'upload'] as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 청크별 프레임 길이 — timing 있으면 id 매칭, 없으면 110f 균등(제한 모드). */
export function chunkDurations(timing: ReelTimingEntry[] | undefined, chunks: ReelChunk[]): number[] {
  return chunks.map((c) => timing?.find((t) => t.id === c.id)?.durFrames ?? FALLBACK_CHUNK_FRAMES);
}
/** 청크 누적 시작 프레임. */
export function chunkStarts(durs: number[]): number[] {
  const out: number[] = [];
  durs.reduce((acc, d, i) => ((out[i] = acc), acc + d), 0);
  return out;
}
export const totalFrames = (durs: number[]): number => durs.reduce((a, b) => a + b, 0);

export interface RectLike { left: number; top: number; width: number; height: number }
/** 포인터 px → 전체 캔버스 분수 (스티커 좌표계). 래퍼는 aspect-ratio 9/16 고정 전제. */
export function pxToCanvasFrac(px: number, py: number, rect: RectLike): { x: number; y: number } {
  return { x: clamp01((px - rect.left) / rect.width), y: clamp01((py - rect.top) / rect.height) };
}
/** 포인터 px → 인서트 패널 존 분수 (insertLabels 좌표계 — y만 존 환산). */
export function pxToPanelFrac(px: number, py: number, rect: RectLike): { x: number; y: number } {
  const x = clamp01((px - rect.left) / rect.width);
  const y = clamp01((py - rect.top - rect.height * PANEL_TOP_FRAC) / (rect.height * PANEL_H_FRAC));
  return { x, y };
}
// 주의: stickerFrames(비율→프레임 클램프)는 여기 두지 않는다 — 단일 소스는 P4 의
// `@reel/shorts/_shared/StickerLayer`(remotion) export. v4 에서 필요하면 그것을 import(드리프트 차단).
/** 렌더 kind 판정 — 나레이션 vs 마지막 TTS 텍스트 비교. full 강제: timing/lipsync 부재 또는 forceFull. */
export function decideKind(args: {
  chunks: ReelChunk[]; lang: ReelLang; runtime: ReelRuntimeDoc | null; forceFull: boolean;
}): 'render' | 'full' {
  const { chunks, lang, runtime, forceFull } = args;
  const tts = runtime?.tts_text?.[lang];
  const hasTiming = (runtime?.timing?.[lang]?.length ?? 0) > 0;
  const hasLipsync = !!runtime?.preview?.[lang]?.lipsyncUrl;
  if (forceFull || !hasTiming || !hasLipsync || !tts) return 'full';
  for (const c of chunks) {
    const cur = c[lang];
    if (typeof cur === 'string' && cur !== (tts[c.id] ?? '')) return 'full';
  }
  return 'render';
}
/** 청크의 나레이션이 마지막 TTS와 다른가 (🎙 배지용). */
export function chunkTtsDirty(c: ReelChunk, lang: ReelLang, runtime: ReelRuntimeDoc | null): boolean {
  const cur = c[lang];
  if (typeof cur !== 'string') return false;
  const tts = runtime?.tts_text?.[lang];
  return !!tts && cur !== (tts[c.id] ?? '');
}
/** 불변 청크 패치. */
export function updateChunk(chunks: ReelChunk[], idx: number, patch: Partial<ReelChunk>): ReelChunk[] {
  return chunks.map((c, i) => (i === idx ? { ...c, ...patch } : c));
}
