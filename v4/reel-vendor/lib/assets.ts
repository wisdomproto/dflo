// 에셋 리졸버 — 렌더(remotion)는 staticFile 기본값, v4 Player는 setAssetResolver로 교체.
// http(s) URL은 passthrough. 로컬 경로 해석이 실제로 필요한 건 고정 에셋(로고·BGM)뿐.
import { staticFile } from "remotion";

let resolver: (p: string) => string = staticFile;

export const asset = (p: string): string =>
  p.startsWith("http://") || p.startsWith("https://") ? p : resolver(p);

export const setAssetResolver = (fn: (p: string) => string): void => {
  resolver = fn;
};
