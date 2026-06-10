// 원본 타임라인 시간(초) → 워프된 새 타임라인 시간(초) 매핑.
// build-mainclip-warp.mjs가 만든 warp-plan.json 기반. 큐/시퀀스 시간 재계산에 사용.
import plan from "./warp-plan.json";

type Seg = { type: string; s: number; e: number; origDur: number; newDur: number };
const SEGS = plan.segments as Seg[];

export const NEW_TOTAL = plan.newTotal as number;

export function warpTime(t: number): number {
  let acc = 0;
  for (const s of SEGS) {
    if (t < s.e) {
      if (s.type === "skip") return acc; // 컷 구간 → 직전 위치로 붕괴
      const frac = Math.max(0, t - s.s) / s.origDur;
      return acc + frac * s.newDur;
    }
    if (s.type !== "skip") acc += s.newDur;
  }
  return acc;
}
