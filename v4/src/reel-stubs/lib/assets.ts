// Railway 빌드 폴백 스텁 — 실제 구현은 remotion/src/lib/assets.ts (로컬 전용).
export function setAssetResolver(_fn: (p: string) => string): void {
  // no-op: 스텁 PresenterShort 는 에셋을 로드하지 않는다.
}
