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
/** 플레이헤드 프레임이 속한 청크 인덱스 — starts[i] ≤ frame 인 마지막 i (재생 중 선택 추종용). */
export function chunkIndexAtFrame(starts: number[], frame: number): number {
  for (let i = starts.length - 1; i >= 0; i--) {
    if (frame >= starts[i]) return i;
  }
  return 0;
}

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
/** 분수 좌표를 step(기본 0.01=1%) 격자에 스냅 + 0..1 clamp. */
export function snapFrac(v: number, step = 0.01): number {
  return clamp01(Math.round(v / step) * step);
}
export interface LabelXY { x: number; y: number }
type PosHolder = { x: number; y: number; pos?: Partial<Record<string, LabelXY>> };
/** 라벨의 현재 언어 위치 — pos[lang] 오버라이드 우선, 없으면 base x/y(전 언어 공통 시드). */
export function labelPos(label: PosHolder, lang: string): LabelXY {
  const p = label.pos?.[lang];
  return p ? { x: clamp01(p.x), y: clamp01(p.y) } : { x: clamp01(label.x), y: clamp01(label.y) };
}
/** 위치를 현재 언어에만 기록 — pos[lang]만 갱신, base·다른 언어 위치 보존(언어 간 연동 차단). */
export function setLabelPos<T extends PosHolder>(label: T, lang: string, x: number, y: number): T {
  return { ...label, pos: { ...label.pos, [lang]: { x: clamp01(x), y: clamp01(y) } } };
}
/** 현재 언어 라벨을 dx·dy(격자 칸 수)만큼 이동 — step 격자, pos[lang]만 갱신(타 언어 불변). */
export function nudgeLabel<T extends PosHolder>(label: T, lang: string, dx: number, dy: number, step = 0.01): T {
  const { x, y } = labelPos(label, lang);
  return setLabelPos(label, lang, x + dx * step, y + dy * step);
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

// ── 타임라인(멀티트랙) 좌표 — 시간축 위 위치는 전부 분수(0..1), px 매핑은 컴포넌트가 폭 곱함 ──
/** 청크 i 가 전체 시간축에서 차지하는 범위(분수). */
export function chunkFracRange(i: number, starts: number[], durs: number[], total: number): { leftFrac: number; widthFrac: number } {
  if (total <= 0) return { leftFrac: 0, widthFrac: 0 };
  return { leftFrac: starts[i] / total, widthFrac: durs[i] / total };
}
/** 레인 내 px → 전체 프레임(빈영역 클릭 시킹용). laneWidth=시간축(거터 제외) px. */
export function laneXToFrame(px: number, laneWidth: number, total: number): number {
  if (laneWidth <= 0) return 0;
  return Math.round(clamp01(px / laneWidth) * total);
}
/** durFrac=null(끝까지)을 (1-fromFrac)로 정규화. */
export function stickerFracRange(s: { fromFrac: number; durFrac: number | null }): { fromFrac: number; durFrac: number } {
  const fromFrac = clamp01(s.fromFrac);
  const durFrac = s.durFrac == null ? Math.max(0, 1 - fromFrac) : clamp01(s.durFrac);
  return { fromFrac, durFrac };
}
/** 스티커를 전체 시간축에서 어디에 그릴지(분수). chunkStart/chunkDur=프레임. */
export function stickerTimelineRange(
  s: { fromFrac: number; durFrac: number | null }, chunkStart: number, chunkDur: number, total: number,
): { leftFrac: number; widthFrac: number } {
  if (total <= 0) return { leftFrac: 0, widthFrac: 0 };
  const { fromFrac, durFrac } = stickerFracRange(s);
  return { leftFrac: (chunkStart + fromFrac * chunkDur) / total, widthFrac: (durFrac * chunkDur) / total };
}
export const STICKER_MIN_FRAC = 0.05; // 타임라인 최소 길이
/** 스티커 시간 드래그/트림 — 순수·결정적. pointerFracInChunk=청크 내 0..1(클램프 전 원시). */
export function resolveStickerTimeDrag(
  mode: 'move' | 'trim-left' | 'trim-right',
  pointerFracInChunk: number,
  orig: { fromFrac: number; durFrac: number },  // durFrac 은 호출 전 stickerFracRange 로 정규화된 값
  grabOffset: number,                            // move 전용: (pointerFracInChunk - fromFrac) at down. trim 무시
): { fromFrac: number; durFrac: number } {
  const p = clamp01(pointerFracInChunk);
  if (mode === 'move') {
    const from = Math.min(Math.max(0, p - grabOffset), 1 - orig.durFrac);
    return { fromFrac: from, durFrac: orig.durFrac };
  }
  if (mode === 'trim-left') {
    const end = orig.fromFrac + orig.durFrac;              // 오른쪽 끝 고정
    const from = Math.min(Math.max(0, p), end - STICKER_MIN_FRAC);
    return { fromFrac: from, durFrac: end - from };
  }
  // trim-right: 왼쪽 끝 고정
  const dur = Math.min(Math.max(STICKER_MIN_FRAC, p - orig.fromFrac), 1 - orig.fromFrac);
  return { fromFrac: orig.fromFrac, durFrac: dur };
}
/** 결정적 스키매틱 파형 — 청크 id 시드(0..1 막대 높이 bars 개). */
export function pseudoWaveform(chunkId: string, bars: number): number[] {
  let seed = 0;
  for (const ch of chunkId) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.25 + (seed % 1000) / 1000 * 0.7); // 0.25~0.95
  }
  return out;
}
