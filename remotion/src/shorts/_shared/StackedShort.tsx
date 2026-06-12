// 스택 레이아웃 쇼츠 — 헤더 / 자막 / 메인영상(B롤) 세로 3분할.
// 내레이션 해설형(누가 말하는 척 X). 영상은 받쳐주는 B롤. 음성은 화면 밖 내레이터(원장 클론).
//  - 메인영상 패널: 원본을 세로 크롭(CROP_Y~)으로 보여줘 상단 타이틀바·하단 브랜딩·교육 저자막을 크롭만으로 제거.
//  - 청크별 소스: lipsync=true(원장 클로즈업)면 립싱크 영상에서, 아니면 원본에서. → "원장 구간만 립싱크".
//  - 패널 내 잔여 한글은 panelMask(원본좌표 밴드) / 일러스트 라벨은 label_<lang>(원본좌표).
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

// 레이아웃 (1080×1920)
const HEADER_H = 270;             // 헤더 존
const CAP_TOP = 270, CAP_H = 330; // 자막 존
const PANEL_TOP = 600, PANEL_H = 720; // 메인영상 패널 (1:1, 크롭 소스 그대로)
const CROP_Y = 375;               // 원본 타이틀바(y40~370: 주우재도놀란+아침과밤+키논쟁서브) 아래. 패널은 원본 y375~1095 표시 (소스가 미리 크롭됨, 교육자막 y1100+ 도 제외)

type Timing = { id: string; durFrames: number; origStartF: number; rate: number };
type Script = {
  src: string;
  panelSrc?: string; // 패널 영역만 미리 크롭한 소스(원본 y CROP_Y~). 없으면 src
  header: Record<string, { top: string; mark: string }>;
  chunks: any[];
  headerStyle?: { markBg?: string; markFg?: string };
};

function hlLine(ln: string, hl?: string) {
  if (hl && ln.includes(hl)) {
    const i = ln.indexOf(hl);
    return (<>{ln.slice(0, i)}<span style={{ color: YELLOW }}>{hl}</span>{ln.slice(i + hl.length)}</>);
  }
  return <>{ln}</>;
}

// 자막 존 (영상 위가 아니라 자기 구역)
const CaptionZone: React.FC<{ c: any; lang: string }> = ({ c, lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines: string[] = c["cap_" + lang] || (c[lang] ? [c[lang]] : []);
  const hl: string = c["hl_" + lang] || "";
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const op = interpolate(frame, [0, 5], [0, 1], clamp) * interpolate(frame, [c.durFrames - 7, c.durFrames], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: CAP_TOP, left: 0, width: 1080, height: CAP_H, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR, padding: "0 54px", opacity: op, transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`, zIndex: 6 }}>
      {lines.map((ln, k) => (
        <div key={k} style={{ fontSize: 66, fontWeight: 900, color: "#fff", lineHeight: 1.34, textShadow: stroke }}>{hlLine(ln, hl)}</div>
      ))}
    </div>
  );
};

// 일러스트 한글 라벨 교체 (원본좌표 label.y → 패널 표시위치로 변환, 절대좌표)
const PanelLabel: React.FC<{ c: any; lang: string }> = ({ c, lang }) => {
  const label = (c["label_" + lang] || c.label) as { text: string; y: number; size?: number } | undefined;
  const frame = useCurrentFrame();
  if (!label) return null;
  const op = interpolate(frame, [0, 5], [0, 1], clamp) * interpolate(frame, [c.durFrames - 7, c.durFrames], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, top: label.y - CROP_Y + PANEL_TOP, width: 1080, textAlign: "center", opacity: op, fontFamily: NOTO_SANS_KR, zIndex: 2 }}>
      <span style={{ display: "inline-block", background: "rgb(12,13,15)", color: "#fff", fontWeight: 900, fontSize: label.size || 48, padding: "6px 20px", borderRadius: 12, textShadow: stroke }}>{label.text}</span>
    </div>
  );
};

// 하단 번역 자막 (도입부 풀스크린 클립용 — 한국어 음성 위에 영어 번역)
const BottomSub: React.FC<{ c: any; lang: string }> = ({ c, lang }) => {
  const frame = useCurrentFrame();
  const lines: string[] = c["cap_" + lang] || (c[lang] ? [c[lang]] : []);
  const op = interpolate(frame, [0, 5], [0, 1], clamp) * interpolate(frame, [c.durFrames - 7, c.durFrames], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", bottom: 250, left: 56, right: 56, textAlign: "center", fontFamily: NOTO_SANS_KR, opacity: op, zIndex: 6 }}>
      <div style={{ display: "inline-block", background: "rgba(8,9,11,0.84)", borderRadius: 16, padding: "16px 30px", boxShadow: "0 6px 26px rgba(0,0,0,0.5)" }}>
        {lines.map((ln, k) => (
          <div key={k} style={{ fontSize: 56, fontWeight: 800, color: "#fff", lineHeight: 1.3, textShadow: stroke }}>{ln}</div>
        ))}
      </div>
    </div>
  );
};

export const StackedShort: React.FC<{
  script: Script;
  timing: Timing[];
  lang: string;
  slug: string;
  lipsyncSrc?: string; // 원장 구간(lipsync:true) 끌어올 립싱크 영상. 없으면 전부 원본
}> = ({ script, timing, lang, slug, lipsyncSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = timing.map((t) => ({ ...t, ...(script.chunks.find((c) => c.id === t.id) || {}) }));
  const FROM: number[] = [];
  chunks.forEach((_, i) => { FROM[i] = i === 0 ? 0 : FROM[i - 1] + chunks[i - 1].durFrames; });
  const total = chunks.reduce((n, c) => n + c.durFrames, 0);
  const head = script.header[lang] || { top: "", mark: "" };
  const hs = script.headerStyle || {};
  const markBg = hs.markBg || YELLOW;
  const markFg = hs.markFg || "#111";

  // 교육부(첫 비-koAudio 청크) 시작 — 헤더/자막존은 이때부터(도입부는 풀스크린 클립이라 숨김), 헤더 애니메이션도 이 기준
  const eduIdx = chunks.findIndex((c) => !c.koAudio);
  const eduStart = eduIdx >= 0 ? FROM[eduIdx] : 0;
  const showStacked = frame >= eduStart;
  const ef = frame - eduStart;
  const tOp = interpolate(ef, [0, 8], [0, 1], clamp);
  const slam = spring({ frame: ef - 6, fps, config: { damping: 13, stiffness: 220, mass: 0.6 } });
  const markScale = 1.3 - 0.3 * slam;
  const markOp = interpolate(ef, [6, 12], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0d0f" }}>
      {/* ── 영상 레이어 ── 도입부(koAudio)=원본 풀프레임 그대로 / 교육부=크롭 패널(B롤) */}
      {chunks.map((c, i) => {
        if (c.koAudio) {
          // 도입부: 한국 연예인 클립 그대로(풀프레임), 한국어 음성, 영어 자막은 하단(BottomSub)
          return (
            <Sequence key={"v" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
              <OffthreadVideo src={staticFile(script.src)} muted startFrom={c.origStartF} playbackRate={1}
                style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, objectFit: "cover", zIndex: 1 }} />
            </Sequence>
          );
        }
        // 교육부: 크롭 패널. 소스(panelSrc/lipsyncSrc)는 미리 크롭. 립싱크는 옛 타이밍 기준 lipsyncFrom 에서 끌어옴
        const useLip = !!(c.lipsync && lipsyncSrc);
        const vsrc = useLip ? (lipsyncSrc as string) : (script.panelSrc || script.src);
        const startFrom = useLip ? (c.lipsyncFrom ?? FROM[i]) : c.origStartF;
        const rate = useLip ? 1 : c.rate;
        return (
          <Sequence key={"v" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
            <div style={{ position: "absolute", top: PANEL_TOP, left: 0, width: 1080, height: PANEL_H, background: "#000", zIndex: 0 }} />
            <OffthreadVideo src={staticFile(vsrc)} muted startFrom={startFrom} playbackRate={rate}
              style={{ position: "absolute", left: 0, top: PANEL_TOP, width: 1080, height: PANEL_H, objectFit: "cover", zIndex: 1 }} />
            {(c.panelMask as number[][] | undefined)?.map((b, bi) => (
              <div key={bi} style={{ position: "absolute", left: 0, top: PANEL_TOP + (b[0] - CROP_Y), width: 1080, height: b[1], background: "rgb(12,13,15)", zIndex: 2 }} />
            ))}
            <PanelLabel c={c} lang={lang} />
          </Sequence>
        );
      })}

      {/* ── 헤더 + 자막존 (교육부 동안만; 도입부는 풀스크린 클립이라 숨김) ── */}
      {showStacked && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: HEADER_H, background: "#0c0d0f", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: NOTO_SANS_KR, padding: "0 40px", zIndex: 5 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", textShadow: stroke, opacity: tOp, marginBottom: 14 }}>{head.top}</div>
            <div style={{ opacity: markOp, transform: `scale(${markScale})` }}>
              <span style={{ display: "inline", background: markBg, color: markFg, fontWeight: 900, fontSize: 66, padding: "6px 20px", borderRadius: 10 }}>{head.mark}</span>
            </div>
          </div>
          <div style={{ position: "absolute", top: CAP_TOP, left: 0, width: 1080, height: CAP_H, background: "#0c0d0f", zIndex: 5 }} />
        </>
      )}

      {/* ── 자막 ── 도입부=하단 번역자막 / 교육부=자막존 ── */}
      {chunks.map((c, i) => (
        <Sequence key={"cap" + c.id} from={FROM[i]} durationInFrames={c.durFrames} layout="none">
          {c.koAudio ? <BottomSub c={c} lang={lang} /> : <CaptionZone c={c} lang={lang} />}
        </Sequence>
      ))}

      <ShortLogo />

      {/* ── 오디오 ── */}
      <Audio src={staticFile("audio/bg1.mp3")} volume={(f) => interpolate(f, [0, 20, total - 30, total], [0, 0.06, 0.06, 0], clamp)} />
      {chunks.map((c, i) => (
        <Sequence key={"a" + c.id} from={FROM[i]} durationInFrames={c.durFrames}>
          {c.koAudio
            ? <Audio src={staticFile(`audio/shorts/${slug}/${slug}-ko.wav`)} startFrom={c.origStartF} />
            : <Audio src={staticFile(`audio/shorts/${slug}/${lang}/${c.id}.wav`)} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
