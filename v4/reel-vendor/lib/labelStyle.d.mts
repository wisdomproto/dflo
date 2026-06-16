import type { CSSProperties } from "react";
export type LabelStyleInput = {
  font?: "kr" | "thai" | "inter" | "sc" | "tc";
  size?: number; weight?: number; color?: string; stroke?: string; shadow?: boolean; pill?: string;
};
export function labelBoxStyle(L: LabelStyleInput): CSSProperties;
