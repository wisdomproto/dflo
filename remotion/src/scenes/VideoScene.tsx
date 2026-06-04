// Reusable full-bleed video scene with an optional eyebrow + caption overlay.
// Used by the KR marketing reel for S3 (growingup / 통합 치료) and S4 (celeb-reel).
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { COLORS } from "../lib/constants";
import { ensureFonts, NOTO_SANS_KR } from "../lib/fonts";

ensureFonts();

type Props = {
  src: string; // staticFile path, e.g. "videos/growingup.mp4"
  eyebrow?: string;
  caption?: string; // supports "\n"; last line painted in accent
  objectFit?: "cover" | "contain";
  playbackRate?: number; // >1 speeds up (e.g. fit a 9.6s clip into 6s)
};

export const VideoScene: React.FC<Props> = ({
  src,
  eyebrow,
  caption,
  objectFit = "cover",
  playbackRate = 1,
}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const txtO = interpolate(frame, [14, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const txtY = interpolate(frame, [14, 28], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lines = caption ? caption.split("\n") : [];
  const hasText = Boolean(eyebrow || caption);

  return (
    <AbsoluteFill style={{ background: "#15131f", opacity: enter }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        playbackRate={playbackRate}
        style={{ width: "100%", height: "100%", objectFit }}
      />

      {hasText && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 40%, rgba(21,19,28,0.96) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 210,
              left: 60,
              right: 60,
              textAlign: "center",
              opacity: txtO,
              transform: `translateY(${txtY}px)`,
            }}
          >
            {eyebrow && (
              <div
                style={{
                  fontFamily: NOTO_SANS_KR,
                  fontSize: 36,
                  fontWeight: 700,
                  color: COLORS.accent,
                  marginBottom: 18,
                  textShadow: "0 4px 20px rgba(0,0,0,0.7)",
                }}
              >
                {eyebrow}
              </div>
            )}
            {lines.map((ln, i) => (
              <div
                key={i}
                style={{
                  fontFamily: NOTO_SANS_KR,
                  fontSize: 58,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.4,
                  textShadow: "0 4px 24px rgba(0,0,0,0.75)",
                }}
              >
                {ln}
              </div>
            ))}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
