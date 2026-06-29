// 예측키 데모 광고 (한국) — 9:16 · 14초 · 3씬.
// ① 후크+동기(실사 1장) ② 계산기(앱 카드) → 결과+곡선+질병관리청 근거(차트 1번, 폼은 위로 빠짐) ③ CTA(187growup+연세새봄 위계).
// 의료광고 규정: 공포·골든타임·셀럽·효과보장 없음.
import {
  AbsoluteFill, Sequence, Img, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from "remotion";
import { ensureFonts, PRETENDARD } from "../lib/fonts";

ensureFonts();

export const CALC_DEMO_KR_DURATION = 420; // 14s @ 30fps
const S1_SRC = "ads/calc-demo-kr/s1.png";

const C = {
  hook1: "우리 아이, 다 크면", hook2: "몇 cm일까요?",
  motiveA: "지금 키만 알면, ", motiveB: "성인 예상 키", motiveC: "를 알 수 있어요",
  chip: "10초 · 무료", resultLabel: "성인 예상 키", resultSub: "cm",
  capA: "10초면 충분합니다", capB: "성인 예상 키, 바로 확인",
  chartTitle: "또래 백분위 성장곡선",
  dataBadge: "질병관리청 국가 성장 표준 데이터 기반",
  ctaLine1: "우리 아이 예상 키,", ctaLine2: "지금 무료로 확인하세요",
  ctaBtn: "무료로 측정하기", url: "dr187growup.com",
  disclaimer: "예상 키는 통계적 추정이며 개인차가 있습니다",
};

const B1 = "#667eea", B2 = "#764ba2", PURPLE = "#4A2D6B", CALC = "#0F6E56", YELLOW = "#ffd84a";
const KR = PRETENDARD;

const edgeFade = (f: number, len: number, fade = 7) =>
  interpolate(f, [0, fade, len - fade, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const CaptionBand: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(74,45,107,.92)", padding: "42px 60px 62px", textAlign: "center" }}>
    {children}
  </div>
);

// 백분위 성장곡선 — 국가 성장 표준 시각 (P5/50/95 + 예측선 173.6 별표)
const P50 = [[3, 96], [5, 110], [7, 121], [9, 132], [11, 143], [13, 155], [15, 166], [17, 170], [18, 171]];
const P95 = [[3, 107], [5, 122], [7, 134], [9, 146], [11, 158], [13, 170], [15, 178], [17, 181], [18, 183]];
const P5 = [[3, 86], [5, 99], [7, 109], [9, 119], [11, 129], [13, 141], [15, 153], [17, 158], [18, 159]];
const PRED = [[10, 140], [11, 147], [12, 152.5], [13, 158], [14, 163], [15, 168], [16, 170.5], [17, 172.3], [18, 173.6]];
const CW = 900, CH = 540, PADL = 70, PADR = 24, PADT = 24, PADB = 50, AX0 = 3, AX1 = 18, HY0 = 80, HY1 = 190;
const cx = (a: number) => PADL + ((a - AX0) / (AX1 - AX0)) * (CW - PADL - PADR);
const cy = (h: number) => PADT + ((HY1 - h) / (HY1 - HY0)) * (CH - PADT - PADB);
const poly = (pts: number[][]) => pts.map((p) => `${cx(p[0]).toFixed(1)},${cy(p[1]).toFixed(1)}`).join(" ");
const dpath = (pts: number[][]) => pts.map((p, i) => `${i ? "L" : "M"}${cx(p[0]).toFixed(1)} ${cy(p[1]).toFixed(1)}`).join(" ");

const GrowthChart: React.FC<{ prog: number }> = ({ prog }) => {
  const DASH = 1500;
  const last = PRED[PRED.length - 1];
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", display: "block" }}>
      {[100, 130, 160, 190].map((h) => (
        <g key={h}>
          <line x1={PADL} y1={cy(h)} x2={CW - PADR} y2={cy(h)} stroke="#eef0f4" strokeWidth={1.5} />
          <text x={PADL - 12} y={cy(h) + 8} textAnchor="end" fontSize={22} fill="#94a3b8" fontFamily="Inter, sans-serif">{h}</text>
        </g>
      ))}
      {[5, 10, 15, 18].map((a) => (
        <text key={a} x={cx(a)} y={CH - 12} textAnchor="middle" fontSize={22} fill="#94a3b8" fontFamily="Inter, sans-serif">{a}</text>
      ))}
      <polyline points={poly(P95)} fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth={3} strokeDasharray="8 8" />
      <polyline points={poly(P50)} fill="none" stroke="rgba(34,197,94,0.6)" strokeWidth={4} strokeDasharray="12 6" />
      <polyline points={poly(P5)} fill="none" stroke="rgba(59,130,246,0.35)" strokeWidth={3} strokeDasharray="8 8" />
      <path d={`${dpath(PRED)} L${cx(18).toFixed(1)} ${cy(HY0).toFixed(1)} L${cx(10).toFixed(1)} ${cy(HY0).toFixed(1)} Z`} fill="rgba(15,110,86,0.08)" opacity={prog} />
      <path d={dpath(PRED)} fill="none" stroke="#0F6E56" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={DASH} strokeDashoffset={DASH * (1 - prog)} />
      {prog > 0.05 && <circle cx={cx(10)} cy={cy(140)} r={11} fill="#0F6E56" />}
      {prog > 0.97 && <circle cx={cx(last[0])} cy={cy(last[1])} r={15} fill="#F59E0B" stroke="#fff" strokeWidth={3} />}
    </svg>
  );
};

// ── ① 후크 + 동기 ──
const S1HookMotive: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const zoom = interpolate(f, [0, 120], [1, 1.1], { extrapolateRight: "clamp" });
  const slam = spring({ frame: f - 6, fps, config: { damping: 9, stiffness: 200, mass: 0.6 } });
  const slamScale = interpolate(slam, [0, 1], [1.5, 1]);
  const motOp = interpolate(f, [58, 76], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#e7ddfb", opacity: edgeFade(f, 120) }}>
      <Img src={staticFile(S1_SRC)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 26%, transparent 24%, rgba(40,25,70,.5) 100%)" }} />
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, textAlign: "center", transform: `scale(${slamScale})`, opacity: slam }}>
        <div style={{ fontFamily: KR, fontSize: 82, fontWeight: 900, color: "#fff", textShadow: "0 6px 24px rgba(0,0,0,.55)", lineHeight: 1.18 }}>{C.hook1}</div>
        <div style={{ fontFamily: KR, fontSize: 100, fontWeight: 900, color: YELLOW, textShadow: "0 6px 24px rgba(0,0,0,.55)", lineHeight: 1.18 }}>{C.hook2}</div>
      </div>
      <CaptionBand>
        <div style={{ opacity: motOp, fontFamily: KR, fontSize: 56, fontWeight: 800, color: "#fff", lineHeight: 1.32 }}>
          {C.motiveA}<span style={{ color: YELLOW }}>{C.motiveB}</span>{C.motiveC}
        </div>
      </CaptionBand>
    </AbsoluteFill>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: KR, fontSize: 26, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>{children}</div>
);
const Field: React.FC<{ on: boolean; children: React.ReactNode }> = ({ on, children }) => (
  <div style={{ flex: 1, height: 76, borderRadius: 14, background: "#f6f7fb", border: `2px solid ${on ? CALC : "#e4e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: KR, fontSize: 30, color: on ? "#334155" : "#aab2c0", fontWeight: 600 }}>{children}</div>
);

// ── ② 계산기 → 결과(폼은 위로 빠지고 차트 크게) ──
const S2CalcData: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const yearIn = f > 14, monthIn = f > 22, dayIn = f > 30, heightIn = f > 40;
  const press = spring({ frame: f - 54, fps, config: { damping: 12, stiffness: 220 } });
  const btnScale = f > 54 && f < 68 ? interpolate(press, [0, 1], [0.94, 1]) : 1;
  const cardIn = interpolate(f, [0, 18], [40, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const formOut = interpolate(f, [56, 86], [0, -820], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const formOp = interpolate(f, [62, 86], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reveal = f >= 58;
  const revY = interpolate(f, [60, 86], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const revOp = interpolate(f, [62, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const num = interpolate(f, [70, 120], [0, 173.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const chartProg = interpolate(f, [92, 165], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const badgeOp = interpolate(f, [135, 155], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #f3eefb, #e7ddf6)", opacity: edgeFade(f, 210) }}>
      {/* 계산기 카드 — 계산 후 위로 빠짐 */}
      <div style={{ position: "absolute", top: 80, left: 56, right: 56, borderRadius: 40, background: "#fff", boxShadow: "0 22px 60px rgba(80,60,130,.20)", overflow: "hidden", transform: `translateY(${cardIn + formOut}px)`, opacity: formOp }}>
        <div style={{ height: 106, background: CALC, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 38px" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>187 GROWUP</div>
          <div style={{ background: "rgba(255,255,255,.18)", color: "#fff", fontFamily: KR, fontWeight: 800, fontSize: 26, padding: "7px 20px", borderRadius: 999 }}>{C.chip}</div>
        </div>
        <div style={{ padding: "34px 38px 38px" }}>
          <div style={{ marginBottom: 22 }}>
            <Label>성별</Label>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1, height: 76, borderRadius: 14, background: CALC, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: KR, fontSize: 30, fontWeight: 700 }}>👦 남자아이</div>
              <div style={{ flex: 1, height: 76, borderRadius: 14, background: "#eef0f4", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: KR, fontSize: 30 }}>👧 여자아이</div>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <Label>생년월일</Label>
            <div style={{ display: "flex", gap: 16 }}>
              <Field on={yearIn}>{yearIn ? "2015 ▾" : "년 ▾"}</Field>
              <Field on={monthIn}>{monthIn ? "5 ▾" : "월 ▾"}</Field>
              <Field on={dayIn}>{dayIn ? "12 ▾" : "일 ▾"}</Field>
            </div>
          </div>
          <div style={{ marginBottom: 28 }}>
            <Label>현재 키</Label>
            <div style={{ display: "flex" }}>
              <Field on={heightIn}>{heightIn ? "140 cm" : "cm"}</Field>
            </div>
          </div>
          <div style={{ height: 90, borderRadius: 18, background: CALC, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: KR, fontSize: 36, fontWeight: 800, transform: `scale(${btnScale})` }}>📊 예상 키 계산하기</div>
        </div>
      </div>
      {/* 결과 + 차트 — 폼 빠진 자리(중앙)로 크게 */}
      {reveal && (
        <div style={{ position: "absolute", top: 300, left: 50, right: 50, transform: `translateY(${revY}px)`, opacity: revOp }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 16, marginBottom: 14 }}>
            <div style={{ fontFamily: KR, fontSize: 34, color: CALC, fontWeight: 700 }}>{C.resultLabel}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 100, fontWeight: 900, color: CALC, lineHeight: 1 }}>{num.toFixed(1)}</div>
            <div style={{ fontFamily: KR, fontSize: 32, color: "#475569" }}>{C.resultSub}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 30, padding: "22px 22px 8px", boxShadow: "0 20px 52px rgba(80,60,130,.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 6 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: CALC, display: "inline-block" }} />
              <span style={{ fontFamily: KR, fontSize: 34, fontWeight: 800, color: "#1f2937" }}>{C.chartTitle}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, opacity: badgeOp }}>
              <div style={{ background: "#ecfdf5", border: `1.5px solid ${CALC}`, borderRadius: 999, padding: "7px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>📊</span>
                <span style={{ fontFamily: KR, fontSize: 25, fontWeight: 800, color: CALC }}>{C.dataBadge}</span>
              </div>
            </div>
            <GrowthChart prog={chartProg} />
          </div>
        </div>
      )}
      <CaptionBand>
        <div style={{ fontFamily: KR, fontSize: 56, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{f >= 60 ? C.capB : C.capA}</div>
      </CaptionBand>
    </AbsoluteFill>
  );
};

// ── ③ CTA (187growup 메인 + 연세새봄의원 보조, 흰색 위계) ──
const S3Cta: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 1 + Math.sin(f / 5) * 0.035;
  const logoOp = interpolate(f, [2, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const saebomOp = interpolate(f, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineY = interpolate(f, [14, 36], [28, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const lineOp = interpolate(f, [14, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(150deg, ${B1}, ${B2})`, opacity: edgeFade(f, 90), alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: KR }}>
      {/* 로고 위계: 187growup(메인) + 얇은 구분선 + 연세새봄의원(보조) */}
      <Img src={staticFile("images/logo_en_wh.png")} style={{ width: 500, objectFit: "contain", opacity: logoOp }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, marginTop: 30, marginBottom: 56, opacity: saebomOp }}>
        <span style={{ width: 340, height: 2, background: "rgba(255,255,255,.4)" }} />
        <Img src={staticFile("images/saebom-logo-wh.png")} style={{ height: 104, objectFit: "contain" }} />
      </div>
      <div style={{ textAlign: "center", transform: `translateY(${lineY}px)`, opacity: lineOp }}>
        <div style={{ fontSize: 62, fontWeight: 800, color: "#fff", lineHeight: 1.32 }}>{C.ctaLine1}</div>
        <div style={{ fontSize: 62, fontWeight: 900, color: "#fff", lineHeight: 1.32 }}>{C.ctaLine2}</div>
      </div>
      <div style={{ marginTop: 56, height: 124, padding: "0 64px", borderRadius: 62, background: YELLOW, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pulse})`, boxShadow: "0 14px 40px rgba(255,216,74,.5)" }}>
        <div style={{ fontSize: 46, fontWeight: 900, color: PURPLE }}>{C.ctaBtn} →</div>
      </div>
      <div style={{ marginTop: 40, fontFamily: "Inter, sans-serif", fontSize: 44, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>{C.url}</div>
      <div style={{ position: "absolute", bottom: 64, left: 60, right: 60, textAlign: "center" }}>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,.6)" }}>{C.disclaimer}</div>
      </div>
    </AbsoluteFill>
  );
};

export const CalcDemoKR: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence durationInFrames={120}><S1HookMotive /></Sequence>
    <Sequence from={120} durationInFrames={210}><S2CalcData /></Sequence>
    <Sequence from={330} durationInFrames={90}><S3Cta /></Sequence>
  </AbsoluteFill>
);
