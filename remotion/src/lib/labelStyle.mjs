// 인서트 라벨 정적 스타일(폰트/크기/굵기/색/외각/그림자/pill) — 순수.
// InsertPanel 이 여기에 애니메이션(위치·opacity·scale)을 합성해 렌더.
// FONT_MAP 은 fonts.ts 패밀리 문자열과 동기(변경 시 양쪽 수정).
const FONT_MAP = {
  kr: "'Noto Sans KR', 'Noto Sans Thai', sans-serif",
  thai: "'Noto Sans Thai', 'Noto Sans KR', sans-serif",
  inter: "'Inter', sans-serif",
  sc: "'Noto Sans SC', 'Noto Sans KR', sans-serif",
  tc: "'Noto Sans TC', 'Noto Sans KR', sans-serif",
};

export function labelBoxStyle(L) {
  const style = {
    fontFamily: FONT_MAP[L.font] ?? FONT_MAP.kr,
    fontSize: L.size ?? 40,
    fontWeight: L.weight ?? 800,
    color: L.color ?? "#1f2430",
    whiteSpace: "pre",
    textAlign: "center",
    lineHeight: 1.15,
    textShadow: (L.shadow ?? !L.pill) ? "0 2px 10px rgba(0,0,0,0.18)" : "none",
  };
  if (L.stroke) {
    style.WebkitTextStroke = "2px " + L.stroke;
    style.paintOrder = "stroke fill";
  }
  if (L.pill) {
    style.background = L.pill;
    style.padding = "6px 18px";
    style.borderRadius = 14;
    style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
  }
  return style;
}
