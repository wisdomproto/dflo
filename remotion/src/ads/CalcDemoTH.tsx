// 예측키 데모 광고 릴스 (태국 트래픽) — 9:16 · 18초.
// 씬1·2 = AI 실사 이미지(사용자 제공) + 모션. 씬3 = 계산기 네이티브 데모.
// 씬4 = 원장·로고·클리닉(보유 자산). 씬5 = CTA 모션그래픽.
// 자막은 COPY[lang] 스왑 — 지금은 th. 이미지는 언어중립이라 다국어는 텍스트만 교체.
import {
  AbsoluteFill, Sequence, Img, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from "remotion";
import { ensureFonts, NOTO_SANS_THAI } from "../lib/fonts";

ensureFonts();

export const CALC_DEMO_TH_DURATION = 540; // 18s @ 30fps

// 사용자가 s1.jpg / s2.jpg 를 public/ads/calc-demo/ 에 넣으면 아래를 파일명으로 교체.
const S1_SRC: string | null = "ads/calc-demo/s1.png";
const S2_SRC: string | null = "ads/calc-demo/s2.png";

type Lang = "th" | "vi" | "en";
const COPY: Record<Lang, {
  hook1: string; hook2: string;
  reason1: string; reason2: string; reason3: string;
  chip: string; resultLabel: string; resultSub: string;
  s3capA: string; s3capB: string;
  trust1: string; trust2: string; trust3: string;
  cta: string;
}> = {
  th: {
    hook1: "ลูกจะสูงเท่าไหร่", hook2: "ตอนโต?",
    reason1: "เช็กก่อน", reason2: "แผ่นการเจริญเติบโต", reason3: "ปิด",
    chip: "30 วินาที · ฟรี", resultLabel: "ส่วนสูงตอนโตที่คาดการณ์", resultSub: "ซม. · เปอร์เซ็นไทล์ 69",
    s3capA: "กรอกแค่ 30 วินาที", s3capB: "รู้ส่วนสูงตอนโตของลูกทันที",
    trust1: "คลินิกเฉพาะทาง", trust2: "การเจริญเติบโต", trust3: "ย่านกังนัม เกาหลี",
    cta: "เช็กส่วนสูงของลูก ฟรีเลย →",
  },
  vi: {
    hook1: "Con sẽ cao", hook2: "bao nhiêu?",
    reason1: "Kiểm tra trước khi", reason2: "sụn tăng trưởng", reason3: "đóng lại",
    chip: "30 giây · Miễn phí", resultLabel: "Chiều cao trưởng thành dự đoán", resultSub: "cm · phân vị 69",
    s3capA: "Chỉ 30 giây nhập liệu", s3capB: "Biết ngay chiều cao trưởng thành của con",
    trust1: "Phòng khám chuyên", trust2: "tăng trưởng", trust3: "Gangnam, Hàn Quốc",
    cta: "Kiểm tra miễn phí ngay →",
  },
  en: {
    hook1: "How tall will", hook2: "your child be?",
    reason1: "Check before the", reason2: "growth plates", reason3: "close",
    chip: "30 sec · Free", resultLabel: "Predicted adult height", resultSub: "cm · 69th percentile",
    s3capA: "Just 30 seconds to enter", s3capB: "Instantly see their predicted height",
    trust1: "Growth specialist", trust2: "clinic in", trust3: "Gangnam, Korea",
    cta: "Check your child's height free →",
  },
};

const PURPLE = "#4A2D6B", B1 = "#667eea", B2 = "#764ba2", CALC = "#0F6E56", YELLOW = "#ffd84a";
const TH = NOTO_SANS_THAI;

// 씬 공통: 가장자리 페이드 (s = 길이프레임)
const edgeFade = (f: number, len: number, fade = 7) =>
  interpolate(f, [0, fade, len - fade, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 하단 자막 밴드
const CaptionBand: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = "rgba(74,45,107,.92)" }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: bg, padding: "48px 60px 70px", textAlign: "center" }}>
    {children}
  </div>
);

// ── 씬1: 후크 (이미지 줌인 + 텍스트 슬램) ──
const S1Hook: React.FC<{ c: typeof COPY.th }> = ({ c }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const zoom = interpolate(f, [0, 75], [1, 1.12], { extrapolateRight: "clamp" });
  const slam = spring({ frame: f - 6, fps, config: { damping: 9, stiffness: 200, mass: 0.6 } });
  const slamScale = interpolate(slam, [0, 1], [1.5, 1]);
  return (
    <AbsoluteFill style={{ background: "#e7ddfb", opacity: edgeFade(f, 75) }}>
      {S1_SRC ? (
        <Img src={staticFile(S1_SRC)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(160deg,#f3eefb,#e2d6f7)`, alignItems: "center", justifyContent: "center", transform: `scale(${zoom})` }}>
          <div style={{ fontSize: 46, opacity: .5 }}>📷</div>
          <div style={{ fontFamily: TH, fontSize: 34, color: "#9b8cc0", fontWeight: 700, marginTop: 12 }}>씬1 이미지 자리</div>
          <div style={{ fontFamily: TH, fontSize: 24, color: "#b6a9d6", marginTop: 6 }}>부모가 아이 키 재기 · s1.jpg</div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 38%, transparent 30%, rgba(40,25,70,.35) 100%)" }} />
      <div style={{ position: "absolute", top: 110, left: 0, right: 0, textAlign: "center", transform: `scale(${slamScale})`, opacity: slam }}>
        <div style={{ fontFamily: TH, fontSize: 96, fontWeight: 900, color: "#fff", textShadow: "0 6px 24px rgba(0,0,0,.4)", lineHeight: 1.1 }}>{c.hook1}</div>
        <div style={{ fontFamily: TH, fontSize: 96, fontWeight: 900, color: YELLOW, textShadow: "0 6px 24px rgba(0,0,0,.4)", lineHeight: 1.1 }}>{c.hook2}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── 씬2: 동기 (이미지 팬업 + 화살표 + 자막) ──
const S2Reason: React.FC<{ c: typeof COPY.th }> = ({ c }) => {
  const f = useCurrentFrame();
  const pan = interpolate(f, [0, 75], [0, -70], { extrapolateRight: "clamp" });
  const zoom = interpolate(f, [0, 75], [1.06, 1.14], { extrapolateRight: "clamp" });
  const arrow = interpolate(f, [18, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: "#ece4f7", opacity: edgeFade(f, 75) }}>
      {S2_SRC ? (
        <Img src={staticFile(S2_SRC)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 26%", transform: `scale(${zoom})` }} />
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(160deg,#f6f1fb,#ece4f7)`, alignItems: "center", justifyContent: "center", transform: `translateY(${pan}px) scale(${zoom})` }}>
          <div style={{ fontSize: 46, opacity: .5 }}>📷</div>
          <div style={{ fontFamily: TH, fontSize: 34, color: "#9b8cc0", fontWeight: 700, marginTop: 12 }}>씬2 이미지 자리</div>
          <div style={{ fontFamily: TH, fontSize: 24, color: "#b6a9d6", marginTop: 6 }}>부모+아이 · 벽 키표시 · s2.jpg</div>
        </AbsoluteFill>
      )}
      {/* 하단 그라데이션 — 바닥 여백을 자막으로 자연스럽게 */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 62%, rgba(74,45,107,.42) 100%)" }} />
      {/* 성장 화살표 */}
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <path d="M820 1150 L820 560" stroke="#10a572" strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray="600" strokeDashoffset={600 * (1 - arrow)} />
        <path d="M790 600 L820 552 L850 600" stroke="#10a572" strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={arrow} />
      </svg>
      <CaptionBand>
        <div style={{ fontFamily: TH, fontSize: 64, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>
          {c.reason1} {c.reason2} <span style={{ color: YELLOW }}>{c.reason3}</span>
        </div>
      </CaptionBand>
    </AbsoluteFill>
  );
};

// 성장 차트 (결과) — 백분위 곡선(5/50/95) + 예측선 18세 173.6 별표. 실제 결과 차트 재현.
const P50 = [[3, 96], [5, 110], [7, 121], [9, 132], [11, 143], [13, 155], [15, 166], [17, 170], [18, 171]];
const P95 = [[3, 107], [5, 122], [7, 134], [9, 146], [11, 158], [13, 170], [15, 178], [17, 181], [18, 183]];
const P5 = [[3, 86], [5, 99], [7, 109], [9, 119], [11, 129], [13, 141], [15, 153], [17, 158], [18, 159]];
const PRED = [[10, 140], [11, 147], [12, 152.5], [13, 158], [14, 163], [15, 168], [16, 170.5], [17, 172.3], [18, 173.6]];
const CW = 900, CH = 600, PADL = 70, PADR = 24, PADT = 26, PADB = 52, AX0 = 3, AX1 = 18, HY0 = 80, HY1 = 190;
const cx = (a: number) => PADL + ((a - AX0) / (AX1 - AX0)) * (CW - PADL - PADR);
const cy = (h: number) => PADT + ((HY1 - h) / (HY1 - HY0)) * (CH - PADT - PADB);
const poly = (pts: number[][]) => pts.map((p) => `${cx(p[0]).toFixed(1)},${cy(p[1]).toFixed(1)}`).join(" ");
const dpath = (pts: number[][]) => pts.map((p, i) => `${i ? "L" : "M"}${cx(p[0]).toFixed(1)} ${cy(p[1]).toFixed(1)}`).join(" ");

const GrowthChart: React.FC<{ f: number }> = ({ f }) => {
  const prog = interpolate(f, [82, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
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
        <text key={a} x={cx(a)} y={CH - 14} textAnchor="middle" fontSize={22} fill="#94a3b8" fontFamily="Inter, sans-serif">{a}</text>
      ))}
      <polyline points={poly(P95)} fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth={3} strokeDasharray="8 8" />
      <polyline points={poly(P50)} fill="none" stroke="rgba(34,197,94,0.6)" strokeWidth={4} strokeDasharray="12 6" />
      <polyline points={poly(P5)} fill="none" stroke="rgba(59,130,246,0.35)" strokeWidth={3} strokeDasharray="8 8" />
      <path d={`${dpath(PRED)} L${cx(18).toFixed(1)} ${cy(HY0).toFixed(1)} L${cx(10).toFixed(1)} ${cy(HY0).toFixed(1)} Z`} fill="rgba(15,110,86,0.08)" opacity={prog} />
      <path d={dpath(PRED)} fill="none" stroke="#0F6E56" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={DASH} strokeDashoffset={DASH * (1 - prog)} />
      {prog > 0.05 && <circle cx={cx(10)} cy={cy(140)} r={11} fill="#0F6E56" />}
      {prog > 0.97 && (
        <g transform={`translate(${cx(last[0])},${cy(last[1])})`}>
          <circle r={15} fill="#F59E0B" stroke="#fff" strokeWidth={3} />
        </g>
      )}
    </svg>
  );
};

// ── 씬3: 계산기 데모 (네이티브, 폼 → 결과+성장차트) ──
const S3Calc: React.FC<{ c: typeof COPY.th }> = ({ c }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const yearIn = f > 14, monthIn = f > 22, dayIn = f > 30, heightIn = f > 40;
  const press = spring({ frame: f - 54, fps, config: { damping: 12, stiffness: 220 } });
  const btnScale = f > 54 && f < 68 ? interpolate(press, [0, 1], [0.94, 1]) : 1;
  const reveal = f >= 58; // 계산 후 결과+차트가 폼 "아래"에 등장
  const revY = interpolate(f, [58, 78], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const revOp = interpolate(f, [58, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const num = interpolate(f, [64, 108], [0, 173.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const Field: React.FC<{ x: number; w: number; on: boolean; children: React.ReactNode }> = ({ x, w, on, children }) => (
    <div style={{ position: "absolute", left: x, width: w, height: 80, borderRadius: 16, background: "#f4f6fb", border: `2px solid ${on ? CALC : "#e2e6ee"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TH, fontSize: 32, color: on ? "#334155" : "#aab2c0", fontWeight: 600 }}>{children}</div>
  );
  return (
    <AbsoluteFill style={{ background: "#fff", opacity: edgeFade(f, 180) }}>
      {/* header */}
      <div style={{ height: 120, background: CALC, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>187 GROWUP</div>
        <div style={{ background: "rgba(255,255,255,.18)", color: "#fff", fontFamily: TH, fontWeight: 800, fontSize: 28, padding: "8px 22px", borderRadius: 999 }}>{c.chip}</div>
      </div>
      {/* form — 항상 보임 (결과는 그 아래에) */}
      <div style={{ position: "relative", margin: "44px 70px 0", height: 446 }}>
        <div style={{ position: "absolute", left: 0, width: 440, height: 80, borderRadius: 16, background: CALC, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: TH, fontSize: 32, fontWeight: 700 }}>👦 เด็กชาย</div>
        <div style={{ position: "absolute", left: 460, width: 440, height: 80, borderRadius: 16, background: "#eef0f4", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: TH, fontSize: 32 }}>👧 เด็กหญิง</div>
        <div style={{ position: "absolute", top: 112, left: 0, right: 0, height: 80 }}>
          <Field x={0} w={285} on={yearIn}>{yearIn ? "2015 ▾" : "ปี ▾"}</Field>
          <Field x={307} w={285} on={monthIn}>{monthIn ? "5 ▾" : "เดือน ▾"}</Field>
          <Field x={614} w={286} on={dayIn}>{dayIn ? "12 ▾" : "วัน ▾"}</Field>
        </div>
        <div style={{ position: "absolute", top: 224, left: 0, right: 0, height: 80 }}>
          <Field x={0} w={900} on={heightIn}>{heightIn ? "140 ซม." : "0.0"}</Field>
        </div>
        <div style={{ position: "absolute", top: 340, left: 0, width: 900, height: 90, borderRadius: 18, background: CALC, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: TH, fontSize: 38, fontWeight: 800, transform: `scale(${btnScale})` }}>📊 คำนวณ</div>
      </div>
      {/* 결과 + 성장 차트 — 폼 "아래"에 등장 */}
      {reveal && (
        <div style={{ position: "absolute", top: 640, left: 60, right: 60, transform: `translateY(${revY}px)`, opacity: revOp }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 18 }}>
            <div style={{ fontFamily: TH, fontSize: 32, color: CALC, fontWeight: 700 }}>{c.resultLabel}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 88, fontWeight: 900, color: CALC, lineHeight: 1 }}>{num.toFixed(1)}</div>
            <div style={{ fontFamily: TH, fontSize: 30, color: "#475569" }}>{c.resultSub}</div>
          </div>
          <div style={{ marginTop: 10, background: "#fff", border: "2px solid #eef0f4", borderRadius: 24, padding: "18px 16px 6px", boxShadow: "0 10px 28px rgba(40,30,70,.07)" }}>
            <GrowthChart f={f} />
          </div>
        </div>
      )}
      {/* 하단 자막 — 데모 설명 (결과 뜨면 문구 전환) */}
      <CaptionBand>
        <div style={{ fontFamily: TH, fontSize: 60, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{f >= 58 ? c.s3capB : c.s3capA}</div>
      </CaptionBand>
    </AbsoluteFill>
  );
};

// ── 씬4: 신뢰 (원장 + 로고 + 클리닉 + KR 핀) ──
const S4Trust: React.FC<{ c: typeof COPY.th }> = ({ c }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const logoOp = interpolate(f, [4, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pin = spring({ frame: f - 24, fps, config: { damping: 8, stiffness: 180 } });
  const docY = interpolate(f, [0, 35], [40, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ opacity: edgeFade(f, 105) }}>
      {/* clinic bg, dimmed */}
      <Img src={staticFile("images/clinic-interior.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(f, [0, 105], [1.05, 1.12])})` }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(74,45,107,.55), rgba(74,45,107,.82))" }} />
      {/* logo */}
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", opacity: logoOp }}>
        <Img src={staticFile("images/logo_en_wh.png")} style={{ width: 520, objectFit: "contain" }} />
      </div>
      {/* doctor cutout */}
      <Img src={staticFile("images/doctor_rmbg.png")} style={{ position: "absolute", bottom: 360, left: "50%", width: 560, transform: `translateX(-50%) translateY(${docY}px)`, objectFit: "contain" }} />
      {/* KR flag pin (이모지 대신 실제 이미지 — 헤드리스 폴백 방지) */}
      <Img src={staticFile("images/flags/kr.png")} style={{ position: "absolute", top: 520, right: 210, width: 110, borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,.3)", transform: `scale(${pin})`, opacity: pin }} />
      <CaptionBand>
        <div style={{ fontFamily: TH, fontSize: 56, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>{c.trust1} {c.trust2}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ fontFamily: TH, fontSize: 56, fontWeight: 800, color: YELLOW, lineHeight: 1.3 }}>{c.trust3}</div>
          <Img src={staticFile("images/flags/kr.png")} style={{ width: 64, borderRadius: 6 }} />
        </div>
      </CaptionBand>
    </AbsoluteFill>
  );
};

// ── 씬5: CTA ──
const S5Cta: React.FC<{ c: typeof COPY.th }> = ({ c }) => {
  const f = useCurrentFrame();
  const pulse = 1 + Math.sin(f / 5) * 0.035;
  const phoneY = interpolate(f, [0, 24], [50, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const swipe = (f % 30) / 30;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(150deg, ${B1}, ${B2})`, opacity: edgeFade(f, 105), alignItems: "center" }}>
      {/* phone mockup — 결과 + 성장 차트 */}
      <div style={{ marginTop: 165, width: 448, height: 900, borderRadius: 58, background: "#fff", border: "9px solid #2c2640", boxShadow: "0 24px 60px rgba(0,0,0,.3)", transform: `translateY(${phoneY}px)`, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 64 }}>
        <div style={{ fontFamily: TH, fontSize: 26, color: CALC, fontWeight: 700 }}>{c.resultLabel}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 92, fontWeight: 900, color: CALC, lineHeight: 1 }}>173.6<span style={{ fontFamily: TH, fontSize: 30 }}> ซม.</span></div>
        <div style={{ width: 384, marginTop: 10, background: "#fff", border: "2px solid #eef0f4", borderRadius: 18, padding: "12px 10px 2px" }}>
          <GrowthChart f={999} />
        </div>
      </div>
      {/* logo */}
      <Img src={staticFile("images/logo_en_wh.png")} style={{ position: "absolute", top: 90, width: 360, objectFit: "contain" }} />
      {/* CTA button */}
      <div style={{ position: "absolute", bottom: 360, left: 70, right: 70, height: 130, borderRadius: 65, background: YELLOW, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pulse})`, boxShadow: "0 14px 36px rgba(255,216,74,.5)" }}>
        <div style={{ fontFamily: TH, fontSize: 48, fontWeight: 900, color: PURPLE }}>{c.cta}</div>
      </div>
      {/* swipe up hint */}
      <div style={{ position: "absolute", bottom: 180, left: 0, right: 0, textAlign: "center", opacity: 0.9, transform: `translateY(${interpolate(swipe, [0, 1], [0, -18])}px)` }}>
        <div style={{ fontSize: 56, color: "#fff" }}>↑</div>
      </div>
    </AbsoluteFill>
  );
};

export const CalcDemoTH: React.FC<{ lang?: Lang }> = ({ lang = "th" }) => {
  const c = COPY[lang] ?? COPY.th;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={75}><S1Hook c={c} /></Sequence>
      <Sequence from={75} durationInFrames={75}><S2Reason c={c} /></Sequence>
      <Sequence from={150} durationInFrames={180}><S3Calc c={c} /></Sequence>
      <Sequence from={330} durationInFrames={105}><S4Trust c={c} /></Sequence>
      <Sequence from={435} durationInFrames={105}><S5Cta c={c} /></Sequence>
    </AbsoluteFill>
  );
};
