// 청크 스티커 오버레이 — 전체 캔버스(1080×1920) 분수 좌표, 비율 구간(fromFrac/durFrac), anim 코드 프리셋.
import { Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Gif } from "@remotion/gif";
import { asset } from "../../lib/assets";

type Sticker = { id: string; src: string; kind: "image" | "gif"; x: number; y: number; w: number; rot: number; fromFrac: number; durFrac: number | null; anim: "none" | "pop" | "float" | "pulse" | "shake"; loop?: boolean };

export const stickerFrames = (fromFrac: number, durFrac: number | null, durFrames: number) => {
  const from = Math.min(durFrames - 1, Math.max(0, Math.round(fromFrac * durFrames)));
  const dur = durFrac == null ? durFrames - from : Math.max(1, Math.min(durFrames - from, Math.round(durFrac * durFrames)));
  return { from, dur };
};

const One: React.FC<{ s: Sticker; dur: number }> = ({ s, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.6 } });
  const op = interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    * interpolate(frame, [dur - 6, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let scale = 1, dy = 0, rot = s.rot;
  if (s.anim === "pop") scale = interpolate(pop, [0, 1], [0.4, 1]);
  if (s.anim === "float") dy = Math.sin((frame / fps) * Math.PI * 1.4) * 12;
  if (s.anim === "pulse") scale = 1 + Math.sin((frame / fps) * Math.PI * 2.2) * 0.05;
  if (s.anim === "shake") rot = s.rot + Math.sin((frame / fps) * Math.PI * 7) * 2;
  const style: React.CSSProperties = {
    position: "absolute", left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: s.w * 1080,
    transform: `translate(-50%,-50%) rotate(${rot}deg) translateY(${dy}px) scale(${scale})`, opacity: op,
  };
  return s.kind === "gif"
    ? <Gif src={asset(s.src)} width={s.w * 1080} style={style} fit="contain" loopBehavior={s.loop === false ? "pause-after-finish" : "loop"} />
    : <Img src={asset(s.src)} style={style} />;
};

export const StickerLayer: React.FC<{ stickers: Sticker[]; durFrames: number }> = ({ stickers, durFrames }) => (
  <>
    {stickers.map((s) => {
      const { from, dur } = stickerFrames(s.fromFrac, s.durFrac, durFrames);
      return (
        <Sequence key={s.id} from={from} durationInFrames={dur} layout="none">
          <One s={s} dur={dur} />
        </Sequence>
      );
    })}
  </>
);
