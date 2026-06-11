// 태국어 현지화: "한국 사회에서 키 1cm=얼마일까" 쇼츠.
// 음성/영상 = 한국어 클린 컷본 그대로(립싱크·TTS 없음). 그 위에 태국어 오버레이.
// - 헤더(지속) + 나레이션 자막(태국어) + 중앙 키워드 그래픽
// - 클린 컷본에 baked 된 한국어 문서(논문/연봉표)는 태국어 카드로 덮음(opaque cover)
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence,
  staticFile, useCurrentFrame, useVideoConfig, interpolate, spring,
} from "remotion";
import { ensureFonts, NOTO_SANS_THAI, INTER } from "../../lib/fonts";

ensureFonts();

export const FPS = 30;
export const ONECM_TH_DURATION = 1668; // ≈ 55.6s (클린 컷본 길이)

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sec = (s: number) => Math.round(s * FPS);
const TH = NOTO_SANS_THAI;
const stroke =
  "2px 2px 8px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.9)";
const CYAN = "#5fd3ff";
const YELLOW = "#FCE61A";

// 클린 컷본 레터박스: 영상 윈도우 = y 422~1492. 위/아래는 어두운 여백(헤더/로고 자리).
const WIN_TOP = 418;
const WIN_H = 1080;

// ── 지속 헤더 (상단 어두운 여백) ──────────────────────────────
const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const op =
    interpolate(frame, [0, 10], [0, 1], clamp) *
    interpolate(frame, [sec(50), sec(51.2)], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420, opacity: op }}>
      <div
        style={{
          position: "absolute", inset: 0,
          background:
            "linear-gradient(180deg, rgba(8,9,11,0.96) 0%, rgba(8,9,11,0.9) 60%, rgba(8,9,11,0) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute", top: 70, left: 40, right: 40,
          textAlign: "center", fontFamily: TH,
        }}
      >
        <div style={{ fontSize: 60, fontWeight: 900, color: "#fff", lineHeight: 1.28, textShadow: stroke }}>
          ความจริงอันน่าเศร้า
        </div>
        <div style={{ fontSize: 60, fontWeight: 900, color: "#fff", lineHeight: 1.28, textShadow: stroke }}>
          ของ "ส่วนสูง" ในสังคม
        </div>
        <div style={{ fontSize: 38, fontWeight: 600, color: "#d6d6d6", marginTop: 14, textShadow: stroke }}>
          ชีวิตที่เปลี่ยนด้วย 1 ซม.?
        </div>
      </div>
    </div>
  );
};

// ── 나레이션 자막 (하단, 로고 위) ─────────────────────────────
type Cap = { from: number; to: number; text: string; hl?: string; boxed?: boolean };
const Caption: React.FC<{ c: Cap }> = ({ c }) => {
  const frame = useCurrentFrame();
  const dur = sec(c.to) - sec(c.from);
  const op =
    interpolate(frame, [0, 6], [0, 1], clamp) *
    interpolate(frame, [dur - 7, dur], [1, 0], clamp);
  const parts = c.hl && c.text.includes(c.hl)
    ? (() => {
        const i = c.text.indexOf(c.hl!);
        return [c.text.slice(0, i), c.hl!, c.text.slice(i + c.hl!.length)];
      })()
    : null;
  return (
    <div
      style={{
        position: "absolute", left: 40, right: 40, top: 1360,
        transform: "translateY(-50%)", textAlign: "center",
        fontFamily: TH, opacity: op,
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: c.boxed ? "rgba(10,11,13,0.92)" : "transparent",
          borderRadius: 16,
          padding: c.boxed ? "12px 26px" : 0,
          boxShadow: c.boxed ? "0 6px 22px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", lineHeight: 1.42, textShadow: stroke }}>
          {parts ? (
            <>
              {parts[0]}
              <span style={{ color: CYAN }}>{parts[1]}</span>
              {parts[2]}
            </>
          ) : (
            c.text
          )}
        </div>
      </div>
    </div>
  );
};

// ── 중앙 키워드: ส่วนสูง 1 ซม. = ? วอน ────────────────────────
const BigCenter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13, mass: 0.6 } });
  const op = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute", top: 760, left: 0, right: 0, textAlign: "center",
        fontFamily: TH, opacity: op, transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
      }}
    >
      <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", textShadow: stroke, marginBottom: 10 }}>
        ในสังคมเกาหลี
      </div>
      <div style={{ fontSize: 92, fontWeight: 900, color: "#fff", textShadow: stroke, letterSpacing: -1 }}>
        ส่วนสูง 1 ซม. = ? <span style={{ color: YELLOW }}>วอน</span>
      </div>
    </div>
  );
};

// ── baked 한국어 논문 → 태국어 리서치 카드 ───────────────────
const PaperCard: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute", top: WIN_TOP, left: 0, width: 1080, height: WIN_H,
        opacity: op, fontFamily: TH,
        background: "linear-gradient(180deg,#f6f4ee 0%,#efece4 100%)",
        boxShadow: "inset 0 0 120px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column", justifyContent: "flex-start",
        padding: "70px 70px 0",
      }}
    >
      <div
        style={{
          border: "3px solid #2b2b2b", borderRadius: 6, padding: "18px 24px",
          alignSelf: "center", marginBottom: 50, background: "#fff",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 900, color: "#1a1a1a", textAlign: "center" }}>
          ส่วนเพิ่มจากส่วนสูงในตลาดแรงงานเกาหลี
        </div>
      </div>
      <div style={{ fontSize: 38, fontWeight: 600, color: "#333", lineHeight: 1.6, marginBottom: 30 }}>
        ผลวิจัยพบว่ามี{" "}
        <span style={{ fontWeight: 900, color: "#111", fontFamily: INTER }}>"Height Premium"</span>{" "}
        อยู่จริง —
      </div>
      <div style={{ marginBottom: 36 }}>
        <span
          style={{
            fontSize: 46, fontWeight: 900, color: "#111", lineHeight: 1.7,
            background: "linear-gradient(transparent 55%, #ffe94d 55%)",
            boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", padding: "0 4px",
          }}
        >
          ส่วนสูงเพิ่มทุก 1 ซม. ค่าจ้างต่อชั่วโมงเพิ่มราว 1.5%
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 500, color: "#555", lineHeight: 1.55 }}>
        ผลนี้คงอยู่แม้ตัดอิทธิพลของฐานะครอบครัว การศึกษา และอาชีพออกแล้ว
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color: "#777", marginTop: 50, fontFamily: INTER }}>
        ที่มา: Park & Lee (2010), Height Premium in the Korean Labor Market
      </div>
    </div>
  );
};

// ── baked 한국어 연봉표 → 태국어 표 카드 ─────────────────────
const Cell: React.FC<{ children: React.ReactNode; head?: boolean; hl?: boolean; w?: number }> = ({
  children, head, hl, w,
}) => (
  <div
    style={{
      flex: w ? `0 0 ${w}px` : 1,
      padding: "12px 8px", textAlign: "center",
      borderRight: "1.5px solid #c9c4b8", borderBottom: "1.5px solid #c9c4b8",
      fontSize: head ? 26 : 28, fontWeight: head ? 900 : 600,
      color: "#1a1a1a", background: head ? "#e7e2d6" : hl ? "rgba(245,220,70,0.55)" : "transparent",
      fontFamily: INTER, display: "flex", alignItems: "center", justifyContent: "center",
    }}
  >
    {children}
  </div>
);
const TRow: React.FC<{ cells: React.ReactNode[]; head?: boolean; hl?: boolean }> = ({ cells, head, hl }) => (
  <div style={{ display: "flex" }}>
    {cells.map((c, i) => (
      <Cell key={i} head={head} hl={hl}>{c}</Cell>
    ))}
  </div>
);
const TableCard: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 8], [0, 1], clamp);
  const tbl = (rows: React.ReactNode) => (
    <div style={{ border: "1.5px solid #c9c4b8", borderRight: "none", borderBottom: "none", background: "#fbf9f3" }}>
      {rows}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute", top: WIN_TOP, left: 0, width: 1080, height: WIN_H,
        opacity: op, fontFamily: TH,
        background: "linear-gradient(180deg,#f6f4ee 0%,#eeebe2 100%)",
        display: "flex", flexDirection: "column", justifyContent: "flex-start",
        padding: "54px 46px 0",
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 900, color: "#1a1a1a", marginBottom: 12 }}>
        ตาราง 1: เงินเดือนเฉลี่ยโดยประมาณ ปี 2024 (ตามเพศ·ช่วงอายุ)
      </div>
      {tbl(
        <>
          <TRow head cells={["ช่วงอายุ", "ชาย (วอน)", "หญิง (วอน)"]} />
          <TRow cells={["20–29 ปี", "42,000,000", "35,000,000"]} />
          <TRow cells={["30–39 ปี", "58,000,000", "45,000,000"]} />
          <TRow cells={["40–49 ปี", "72,000,000", "52,000,000"]} />
        </>
      )}
      <div style={{ fontSize: 24, fontWeight: 500, color: "#555", lineHeight: 1.5, margin: "20px 0 26px" }}>
        จากอัตรา Height Premium (1.5%) คำนวณมูลค่าของส่วนสูง 1 ซม. ได้ดังนี้ (สูตร: เงินเดือนฐาน × 0.015)
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: "#1a1a1a", marginBottom: 12 }}>
        ตาราง 2: มูลค่าเงินเดือนของส่วนสูง 1 ซม. (ประมาณการ)
      </div>
      {tbl(
        <>
          <TRow head cells={["ช่วงอายุ", "ชาย (วอน)", "หญิง (วอน)"]} />
          <TRow cells={["20–29 ปี", "630,000", "525,000"]} />
          <TRow hl cells={["30–39 ปี", "870,000", "675,000"]} />
          <TRow hl cells={["40–49 ปี", "1,080,000", "780,000"]} />
        </>
      )}
    </div>
  );
};

// ── 나레이션 자막 데이터 (VTT 기준 → 태국어) ─────────────────
const CAPS: Cap[] = [
  { from: 0.2, to: 3.0, text: "ส่วนสูง 1 ซม. ของลูกเรา ในสังคมเกาหลี" },
  { from: 3.0, to: 6.2, text: "หากแปลงเป็นเงินเดือนในอนาคต จะมีค่าเท่าไหร่?" },
  { from: 6.2, to: 9.2, text: "มีงานวิจัยเผยว่า ส่วนสูงที่เพิ่มทุก 1 ซม." },
  { from: 9.2, to: 12.7, text: "เงินเดือนจะเพิ่มขึ้นเฉลี่ยราว 1.5%", hl: "1.5%", boxed: true },
  { from: 12.7, to: 15.2, text: "เราเรียกสิ่งนี้ว่า 'Height Premium'", hl: "Height Premium", boxed: true },
  { from: 15.2, to: 18.4, text: "เมื่อคำนวณจากเงินเดือนเฉลี่ยปี 2024", boxed: true },
  { from: 18.4, to: 21.1, text: "วัย 30+ ทุก 1 ซม. มีค่าราว 870,000 วอน", boxed: true, hl: "870,000 วอน" },
  { from: 21.1, to: 24.8, text: "และวัย 40+ มีค่ามากกว่า 1,000,000 วอน", boxed: true, hl: "1,000,000 วอน" },
  { from: 24.8, to: 29.4, text: "แค่สูงขึ้น 1 ซม. ก็มีค่าถึงราว 30 ล้านวอน", boxed: true, hl: "30 ล้านวอน" },
  { from: 29.4, to: 32.6, text: "ในอาชีพเฉพาะ เช่น ดารา นักกีฬา", hl: "ดารา นักกีฬา" },
  { from: 32.6, to: 35.8, text: "แค่สูงขึ้น 5 ซม. ก็มีค่าหลายร้อยล้านวอน", hl: "หลายร้อยล้านวอน" },
  { from: 35.8, to: 37.5, text: "ทำไมถึงเกิดปรากฏการณ์นี้?" },
  { from: 37.5, to: 40.7, text: "รายงานชี้ว่า ภาพลักษณ์เชิงบวกจากส่วนสูงที่ดี" },
  { from: 40.7, to: 44.1, text: "และความคาดหวังด้านภาวะผู้นำ คือสาเหตุหลัก", hl: "ภาวะผู้นำ" },
  { from: 44.1, to: 47.6, text: "ส่วนสูงไม่ใช่แค่เรื่องเงิน แต่คือสุขภาพ ความมั่นใจ" },
  { from: 47.6, to: 51.3, text: "และเชื่อมโยงลึกซึ้งกับภาพลักษณ์ เช่น ภาวะผู้นำ" },
  { from: 51.3, to: 55.3, text: "ส่วนสูงของลูก! ไม่ใช่แค่ตัวเลข แต่อาจคือความมั่นใจของลูก" },
];

export const OneCmTH: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 한국어 클린 컷본 (영상) + 한국어 오디오 유지 */}
      <OffthreadVideo src={staticFile("footage/1cm-clean.mp4")} muted />
      <Audio src={staticFile("footage/1cm-clean.mp4")} />

      {/* baked 한국어 문서 covering 카드 */}
      <Sequence from={sec(8.5)} durationInFrames={sec(15.6) - sec(8.5)}>
        <PaperCard />
      </Sequence>
      <Sequence from={sec(15.6)} durationInFrames={sec(28.6) - sec(15.6)}>
        <TableCard />
      </Sequence>

      {/* 중앙 키워드 */}
      <Sequence from={sec(3.0)} durationInFrames={sec(6.2) - sec(3.0)}>
        <BigCenter />
      </Sequence>

      {/* 나레이션 자막 */}
      {CAPS.map((c, i) => (
        <Sequence key={i} from={sec(c.from)} durationInFrames={sec(c.to) - sec(c.from)}>
          <Caption c={c} />
        </Sequence>
      ))}

      {/* 지속 헤더 */}
      <Header />
    </AbsoluteFill>
  );
};
