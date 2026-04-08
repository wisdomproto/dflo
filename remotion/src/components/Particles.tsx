import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/constants";

const PARTICLE_COUNT = 10;
const PARTICLE_COLORS = [
  COLORS.accent,
  COLORS.teal,
  COLORS.tealDark,
  "#fbbf24",
  "#a78bfa",
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

type ParticlesProps = {
  startFrame: number;
  cx: number;
  cy: number;
};

export const Particles: React.FC<ParticlesProps> = ({ startFrame, cx, cy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = frame - startFrame;

  if (elapsed < 0 || elapsed > fps * 1) return null;

  const progress = interpolate(elapsed, [0, fps * 0.7], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle =
          (i / PARTICLE_COUNT) * Math.PI * 2 + seededRandom(i) * 0.5;
        const distance = interpolate(
          progress,
          [0, 1],
          [0, 80 + seededRandom(i + 10) * 70]
        );
        const size = interpolate(
          progress,
          [0, 0.3, 1],
          [0, 8 + seededRandom(i + 20) * 6, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const x = cx + Math.cos(angle) * distance;
        const y = cy + Math.sin(angle) * distance;
        const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity,
            }}
          />
        );
      })}
    </>
  );
};
