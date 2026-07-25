// 원본 타임라인 시간(초) → 영어판 워프 타임라인 시간(초) 매핑.
// build-mainclip-warp-en.mjs 가 만든 warp-plan.en.json 기반. 큐/시퀀스 재타이밍에 사용.
// (warp.ts 의 영어판 — 태국어와 계획이 달라 별도 파일. 로직은 동일.)
import plan from "./warp-plan.en.json";

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
