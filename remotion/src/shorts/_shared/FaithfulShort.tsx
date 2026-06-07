// 범용 쇼츠 충실판 컴포지션 — script.json + timing-<lang>.json 으로 구동.
// videoMode: "perchunk"(원본 footage 청크별, 프리뷰·립싱크입력) | "linear"(립싱크 완성본 선형재생)
// overlays/audio 토글로 프리뷰 / 립싱크입력(footage only) / 최종 을 한 컴포넌트로.
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence,
  staticFile, spring, useCurrentFrame, useVideoConfig, interpolate,
} from "remotion";
import { ensureFonts, NOTO_SANS_KR } from "../../lib/fonts";
import { ShortLogo } from "./ShortLogo";

ensureFonts();
const YELLOW = "#FCE61A";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const stroke = "2px 2px 7px rgba(0,0,0,0.92), 0 0 16px rgba(0,0,0,0.7)";

type Timing = { id: string; durFrames: number; origStartF: number; rate: number };
type Script = { src: string; header: Record<string, { top: string; mark: string }>; chunks: any[] };

const fill = { position: "absolute", width: "100%", height: "100%", objectFit: "cover" } as const;

function hlLine(ln: string, hl?: string) {
  if (hl && ln.includes(hl)) {
    const i = ln.indexOf(hl);
    return (
      <>
        {ln.slice(0, i)}
        <span style={{ color: YELLOW }}>{hl}</span>
        {ln.slice(i + hl.length)}
      </>
    );
  }
  return <>{ln}</>;
}

const Caption: React.FC<{ c: any; lang: string }> = ({ c, lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines: string[] = c["cap_" + lang] || (c[lang] ? [c[lang]] : []);
  const hl: string = c["hl_" + lang] || "";
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const op =
    interpolate(frame, [0, 5], [0, 1], clamp) *
    interpolate(frame, [c.durFrames - 7, c.durFrames], [1, 0], clamp);
  const cover = c.cover as number[] | undefined; // [top, height] 전체폭 덮개 (넓은 한글 자막용)
  return (
    <>
      {cover && (
        <div style={{ position: "absolute", left: 22, right: 22, top: cover[0], height: cover[1], background: "rgb(12,13,15)", borderRadius: 26, opacity: op, boxShadow: "0 6px 26px rgba(0,0,0,0.5)" }} />
      )}
      <div style={{ position: "absolute", top: c.capY ?? 830, left: 40, right: 40, textAlign: "center", fontFamily: NOTO_SANS_KR, opacity: op, transform: `translateY(-50%) scale(${interpolate(pop, [0, 1], [0.72, 1])})` }}>
        <div style={{ display: "inline-flex", flexDirection: "column", justifyContent: "center", minHeight: cover ? 0 : (c.capH || 0), background: cover ? "transparent" : "rgba(8,9,11,0.96)", borderRadius: 22, padding: cover ? "4px 16px" : "38px 36px", backdropFilter: cover ? "none" : "blur(10px)", WebkitBackdropFilter: cover ? "none" : "blur(10px)", boxShadow: cover ? "none" : "0 6px 26px rgba(0,0,0,0.55)" }}>
          {lines.map((ln, k) => (
            <div key={k} style={{ fontSize: 58, fontWeight: 900, color: "#fff", lineHeight: 1.38, textShadow: stroke }}>
              {hlLine(ln, hl)}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export const FaithfulShort: React.FC<{
  script: Script;
  timing: Timing[];
  lang: string;
  slug: string;
  videoMode?: "perchunk" | "linear";
  videoSrc?: string;
  overlays?: boolean;
  audio?: boolean;
}> = ({ script, timing, lang, slug, videoMode = "perchunk", videoSrc, overlays = true, audio = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = timing.map((t) => ({ ...t, ...(script.chunks.find((c) => c.id === t.id) || {}) }));
  const FROM: number[] = [];
  chunks.forEach((c, i) => { FROM[i] = i === 0 ? 0 : FROM[i - 1] + chunks[i - 1].durFrames; });
  const total = chunks.reduce((n, c) => n + c.durFrames, 0);
  const head = script.header[lang] || { top: "", mark: "" };

  const tOp = interpolate(frame, [0, 8], [0, 1], clamp);
  const slam = spring({ frame: frame - 6, fps, config: { damping: 13, stiffness: 220, mass: 0.6 } });
  const markScale = 1.3 - 0.3 * slam;
  const markOp = interpolate(frame, [6, 12], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 영상 레이어 */}
      {videoMode === "linear" && videoSrc ? (
        <OffthreadVideo src={staticFile(videoSrc)} muted style={fill} />
      ) : (
        chunks.map((c, i) => (
          <Sequence key={"v" + c.id} from={FROM[i]} durationInFrames={c.durFrames}>
            <OffthreadVideo src={staticFile(script.src)} muted startFrom={c.origStartF} playbackRate={c.rate}
              style={{ position: "absolute", width: "104%", height: "104%", left: "-2%", top: "-2%", objectFit: "cover" }} />
          </Sequence>
        ))
      )}

      {overlays && (
        <>
          {/* 상단 제목 스크림 + 현지어 제목 */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 580, background: "linear-gradient(180deg, rgba(8,9,11,1) 0%, rgba(8,9,11,1) 82%, rgba(8,9,11,0) 100%)" }} />
          <div style={{ position: "absolute", top: 30, left: 30, right: 30, height: 430, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", textShadow: stroke, opacity: tOp, marginBottom: 20 }}>{head.top}</div>
            <div style={{ opacity: markOp, transform: `scale(${markScale})`, lineHeight: 1.5 }}>
              <span style={{ display: "inline", background: YELLOW, color: "#111", fontWeight: 900, fontSize: 78, padding: "8px 22px", borderRadius: 10, WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}>{head.mark}</span>
            </div>
          </div>

          {chunks.map((c, i) => (
            <Sequence key={"cap" + c.id} from={FROM[i]} durationInFrames={c.durFrames}>
              <Caption c={c} lang={lang} />
            </Sequence>
          ))}

          <ShortLogo />
        </>
      )}

      {audio && (
        <>
          <Audio src={staticFile("audio/bg1.mp3")} volume={(f) => interpolate(f, [0, 20, total - 30, total], [0, 0.06, 0.06, 0], clamp)} />
          {chunks.map((c, i) => (
            <Sequence key={"a" + c.id} from={FROM[i]}>
              <Audio src={staticFile(`audio/shorts/${slug}/${lang}/${c.id}.wav`)} />
            </Sequence>
          ))}
        </>
      )}
    </AbsoluteFill>
  );
};

export const shortDuration = (timing: Timing[]) => timing.reduce((n, t) => n + t.durFrames, 0);
