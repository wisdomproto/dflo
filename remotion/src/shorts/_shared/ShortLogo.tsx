// 모든 쇼츠 하단 워터마크 (187 GROWUP 흰색 로고). 페이드인.
import { Img, staticFile, useCurrentFrame, interpolate } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const ShortLogo: React.FC<{ width?: number; bottom?: number; opacity?: number }> = ({
  width = 300,
  bottom = 66,
  opacity = 0.9,
}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [4, 18], [0, opacity], clamp);
  return (
    <div style={{ position: "absolute", bottom, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: op }}>
      <Img
        src={staticFile("images/logo_en_wh.png")}
        style={{ width, height: "auto", filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.7))" }}
      />
    </div>
  );
};
