// Time-ranged overlay cues for the Thai clinic-process video.
// Times are in SECONDS (converted to frames at 30fps in the composition).
// Built cut-by-cut; only confirmed cuts are filled in.
import type { SubSeg, TitlePart } from "./overlays";

export type Cue =
  | { kind: "subtitle"; from: number; to: number; lines: SubSeg[][]; tone?: "white" | "cream" }
  | { kind: "title"; from: number; to: number; parts: TitlePart[]; fontSize?: number; y?: number }
  | { kind: "chip"; from: number; to: number; text: string }
  | { kind: "circle"; from: number; to: number; text: string; xPct: number; yPct: number; fontSize?: number; delay?: number }
  | { kind: "number"; from: number; to: number; value: string; xPct?: number; yPct?: number; size?: number }
  | { kind: "label"; from: number; to: number; text: string; xPct: number; yPct: number; fontSize?: number; align?: "left" | "center" | "right"; color?: string; outline?: string; width?: number }
  | { kind: "qcard"; from: number; to: number; lines: { t: string; strong?: boolean }[]; color?: string }
  | { kind: "qbar"; from: number; to: number; text: string }
  | { kind: "callout"; from: number; to: number; top: string; bottom: string; xPct: number; yPct: number; align?: "left" | "center" | "right"; bottomSize?: number; topSize?: number; color?: string; banner?: boolean; bannerW?: number; bannerH?: number; bannerBg?: string; bannerTextColor?: string };

// Watermark shows from this second to the end (footage starts ~8s).
export const WATERMARK_FROM = 8;

// Baked Korean cards in the clean footage to REMOVE in final assembly
// (decided with user: cut them). Each = [startSec, endSec].
//  - [49.7, 51.5] : "더 많은 실제 치료 후기?" promo card (process → Q&A break)
//  - (final outro card ~240s + ending infographic handled when those cuts land)
export const CUT_REGIONS: [number, number][] = [[49.7, 51.5]];

export const CUES: Cue[] = [
  // ===== CUT 1 : 0:08–0:18 (clinic intro) =====
  {
    kind: "subtitle",
    from: 8.2,
    to: 11.0,
    tone: "white",
    lines: [[{ t: "ที่คลินิก Yonsei Saebom ของเรา" }]],
  },
  // Keyword labels = TEXT ONLY on the baked translucent bubbles. CV detection
  // shows the bubbles sit on a FIXED grid (x ≈ 11.8 / 31.0 / 49.9 / 69.3 / 87.9,
  // y ≈ 49.7) and only scale in one-by-one — they do NOT move. So one label per
  // keyword at its fixed spot, accumulating, all cut out at ~15.35s.
  { kind: "circle", from: 11.5, to: 15.35, text: "ดูแลฮอร์โมน", xPct: 11.8, yPct: 49.7 },
  { kind: "circle", from: 12.5, to: 15.35, text: "หนุ่มสาวก่อนวัย", xPct: 31.0, yPct: 49.7, fontSize: 26 },
  { kind: "circle", from: 13.2, to: 15.35, text: "ออกกำลังกาย", xPct: 49.9, yPct: 49.7 },
  { kind: "circle", from: 14.0, to: 15.35, text: "จัดรูปร่าง", xPct: 69.3, yPct: 49.7 },
  { kind: "circle", from: 15.0, to: 15.35, text: "การนอนหลับ", xPct: 87.9, yPct: 49.7 },
  {
    kind: "subtitle",
    from: 11.0,
    to: 15.0,
    tone: "cream",
    lines: [
      [{ t: "ผ่านการดูแลฮอร์โมน ภาวะหนุ่มสาวก่อนวัย การออกกำลังกาย" }],
      [{ t: "การจัดรูปร่าง และการนอนหลับ" }],
    ],
  },
  {
    kind: "subtitle",
    from: 15.0,
    to: 18.3,
    tone: "white",
    lines: [[{ t: "เราดูแลการเจริญเติบโตที่แข็งแรงของเด็ก ๆ" }]],
  },
  {
    kind: "title",
    from: 15.9,
    to: 18.5,
    parts: [
      { t: "สมดุล", style: "outline" },
      { t: "เติบโตอย่างแข็งแรง", style: "solid" },
    ],
  },

  // ===== CUT 2 : 0:18–0:51 (5-step exam process) =====
  // Persistent top-left category chip for the whole section.
  { kind: "chip", from: 18.3, to: 50.8, text: "ขั้นตอนการตรวจ" },

  // -- Step 01: 문진 차트 작성 (0:18–0:26)
  { kind: "number", from: 18.5, to: 26.0, value: "01", xPct: 82, yPct: 58 },
  { kind: "label", from: 19.0, to: 26.0, text: "ซักประวัติสุขภาพ", xPct: 80, yPct: 71, fontSize: 40, align: "center" },
  {
    kind: "subtitle", from: 18.3, to: 26.0, tone: "white",
    lines: [
      [{ t: "เมื่อมาครั้งแรก เราจะ" }, { t: "ซักประวัติอย่างละเอียด", em: true }],
      [{ t: "ทั้งอายุ ส่วนสูง และประวัติครอบครัว" }],
    ],
  },

  // -- Step 02: BMI 측정 (0:26–0:30)
  { kind: "number", from: 26.0, to: 30.0, value: "02", xPct: 82, yPct: 58 },
  { kind: "label", from: 26.3, to: 30.0, text: "วัดค่า BMI", xPct: 80, yPct: 71, fontSize: 40, align: "center" },
  {
    kind: "subtitle", from: 26.0, to: 30.0, tone: "white",
    lines: [
      [{ t: "ตรวจ " }, { t: "BMI", em: true }, { t: " เพื่อดูภาวะอ้วน" }],
      [{ t: "และทำนายการเป็นหนุ่มสาวก่อนวัย" }],
    ],
  },

  // -- Step 03: 전신 X-ray (0:30–0:37)
  { kind: "number", from: 30.0, to: 37.0, value: "03", xPct: 82, yPct: 58 },
  { kind: "label", from: 30.3, to: 37.0, text: "เอกซเรย์ทั้งตัว", xPct: 80, yPct: 71, fontSize: 40, align: "center" },
  {
    kind: "subtitle", from: 30.0, to: 37.0, tone: "white",
    lines: [
      [{ t: "เอกซเรย์ทั้งตัว", em: true }, { t: " เพื่อดูอายุกระดูก" }],
      [{ t: "และการปิดของแผ่นการเจริญเติบโต" }],
    ],
  },

  // -- Step 04: 피검사 + 사춘기 단계 평가 (0:37–0:43)
  { kind: "number", from: 37.0, to: 43.0, value: "04", xPct: 82, yPct: 58 },
  { kind: "label", from: 37.3, to: 43.0, text: "ตรวจเลือด & ประเมินวัย", xPct: 78, yPct: 71, fontSize: 36, align: "center" },
  {
    kind: "subtitle", from: 37.0, to: 43.0, tone: "white",
    lines: [
      [{ t: "สุดท้าย " }, { t: "ตรวจเลือด", em: true }, { t: " และประเมินระยะวัยหนุ่มสาว" }],
      [{ t: "เพื่อเช็กสุขภาพโดยรวม" }],
    ],
  },

  // -- Step 05: 결론 — 예상 키 + 맞춤 치료 (0:43–0:51)
  { kind: "number", from: 43.0, to: 50.8, value: "05", xPct: 82, yPct: 58 },
  { kind: "label", from: 43.3, to: 50.8, text: "วางแผนการรักษา", xPct: 80, yPct: 71, fontSize: 40, align: "center" },
  {
    kind: "subtitle", from: 43.0, to: 50.8, tone: "white",
    lines: [
      [{ t: "จากผลตรวจ เราจะทำนาย" }, { t: "ส่วนสูงเป้าหมาย", em: true }],
      [{ t: "และวางแผนการรักษาเฉพาะบุคคล" }],
    ],
  },

  // ===== CUT 3 : 0:51–1:09 (Q1 — 특별한 장점) =====
  // NOTE: baked Korean promo card at [49.7s–51.5s] is CUT in final assembly.
  {
    kind: "qcard", from: 51.6, to: 54.0,
    lines: [
      { t: "จุดเด่นพิเศษของ" },
      { t: "คลินิก Yonsei Saebom", strong: true },
      { t: "คืออะไร?", strong: true },
    ],
  },
  { kind: "qbar", from: 54.0, to: 69.0, text: "จุดเด่นพิเศษของคลินิก Yonsei Saebom คืออะไร?" },
  {
    kind: "subtitle", from: 54.0, to: 56.2, tone: "white",
    lines: [[{ t: "เรามีจุดเด่นที่พิเศษมากครับ" }]],
  },
  {
    kind: "subtitle", from: 56.2, to: 62.0, tone: "white",
    lines: [
      [{ t: "เราไม่ได้ดูแลแค่" }, { t: "ฮอร์โมน", em: true }, { t: " เท่านั้น" }],
      [{ t: "แต่ดูแลทั้งอาหาร การนอน การออกกำลังกาย และวัยหนุ่มสาว" }],
    ],
  },
  // 4 labels on the baked 2x2 image grid (음식/수면/체형/사춘기 관리).
  // KR style: white fill + gold outline, bold rounded, centered in each card.
  { kind: "label", from: 58.3, to: 62.6, text: "ดูแลอาหาร", xPct: 56.5, yPct: 29.6, fontSize: 42, color: "#ffffff", outline: "#E79A2B", width: 300 },
  { kind: "label", from: 58.9, to: 62.6, text: "ดูแลการนอน", xPct: 79.2, yPct: 29.6, fontSize: 42, color: "#ffffff", outline: "#E79A2B", width: 300 },
  { kind: "label", from: 59.5, to: 62.6, text: "ดูแลรูปร่าง", xPct: 56.5, yPct: 61.6, fontSize: 42, color: "#ffffff", outline: "#E79A2B", width: 300 },
  { kind: "label", from: 60.1, to: 62.6, text: "ดูแลวัยหนุ่มสาว", xPct: 79.2, yPct: 61.6, fontSize: 42, color: "#ffffff", outline: "#E79A2B", width: 300 },
  {
    kind: "subtitle", from: 62.0, to: 69.0, tone: "white",
    lines: [
      [{ t: "การดูแลทุกด้านที่จำเป็นต่อการเจริญเติบโตไปพร้อมกัน" }],
      [{ t: "คือ" }, { t: "จุดเด่นที่สุด", em: true }, { t: "ของเราครับ" }],
    ],
  },

  // ===== CUT 4 : 1:09–1:41 (Q2 — 운동·도수치료) =====
  // Q card sits over a dark floor-directory b-roll → white text.
  {
    kind: "qcard", from: 69.5, to: 72.0, color: "#ffffff",
    lines: [
      { t: "ทำไมต้องดูแล" },
      { t: "การออกกำลังกาย", strong: true },
      { t: "และกายภาพบำบัดไปด้วยกัน?", strong: true },
    ],
  },
  // 우측 층별 안내판 baked 한국어(3F 성장·체형 운동/부종·염증 케어, 2F 호르몬 특화 안내데스크) → 태국어 커버.
  // 거의 정지 b-roll → 벽톤 불투명 갈색 패널 + 금색 텍스트(원본 금색 톤 맞춤).
  { kind: "callout", from: 69.4, to: 72.1, top: "ศูนย์ออกกำลังกายการเติบโต·รูปร่าง", bottom: "ศูนย์ดูแลอาการบวม·อักเสบ", xPct: 72.0, yPct: 27.0, topSize: 27, bottomSize: 27, banner: true, bannerW: 890, bannerH: 245, bannerBg: "#3a322a", bannerTextColor: "#d8b66a" },
  { kind: "callout", from: 69.4, to: 72.1, top: "ศูนย์เฉพาะทางฮอร์โมน", bottom: "เคาน์เตอร์ประชาสัมพันธ์", xPct: 68.0, yPct: 74.0, topSize: 27, bottomSize: 27, banner: true, bannerW: 750, bannerH: 260, bannerBg: "#3a322a", bannerTextColor: "#d8b66a" },
  { kind: "qbar", from: 72.0, to: 101.0, text: "ทำไมต้องดูแลการออกกำลังกายและกายภาพบำบัดไปพร้อมกัน?" },
  {
    kind: "subtitle", from: 72.0, to: 76.0, tone: "white",
    lines: [[{ t: "ท่าทาง", em: true }, { t: "สำคัญมากต่อการเจริญเติบโตของเด็ก" }]],
  },
  {
    kind: "subtitle", from: 76.0, to: 79.0, tone: "white",
    lines: [[{ t: "การออกกำลังกายและกายภาพบำบัด มีบทบาทต่างกัน" }]],
  },
  // Two separate baked circles (도수 / 운동 = different roles) — add labels.
  { kind: "label", from: 76.2, to: 79.0, text: "บำบัด", xPct: 18, yPct: 58, fontSize: 42, color: "#27304d" },
  { kind: "label", from: 76.4, to: 79.0, text: "ออกกำลัง", xPct: 81, yPct: 58, fontSize: 42, color: "#27304d" },
  {
    kind: "subtitle", from: 79.0, to: 87.0, tone: "white",
    lines: [
      [{ t: "กายภาพบำบัด", em: true }, { t: " ช่วยแก้ปัญหาโครงกระดูกและเอ็น" }],
      [{ t: "เพื่อให้ร่างกายอยู่ในท่าทางที่ถูกต้อง" }],
    ],
  },
  {
    kind: "subtitle", from: 87.0, to: 90.0, tone: "white",
    lines: [[{ t: "แม้กายภาพบำบัดจะช่วยจัดท่าทางให้ถูกต้องแล้ว" }]],
  },
  {
    kind: "subtitle", from: 90.0, to: 95.0, tone: "white",
    lines: [
      [{ t: "แต่ต้องเสริม" }, { t: "กล้ามเนื้อ", em: true }, { t: "ด้วยการออกกำลังกาย" }],
      [{ t: "จึงจะรักษาท่าทางที่ถูกต้องไว้ได้" }],
    ],
  },
  {
    kind: "subtitle", from: 95.0, to: 101.0, tone: "white",
    lines: [
      [{ t: "คลินิกของเราใช้ทั้งกายภาพบำบัดและการออกกำลังกาย" }],
      [{ t: "เพื่อช่วยการเจริญเติบโตของเด็กให้ดียิ่งขึ้น" }],
    ],
  },
  // Venn-diagram graphic (도수 ∩ 운동) — circles are baked; add Thai labels + title.
  // Circle centers: left ~16%, right ~34%, y ~58%; title above the venn.
  { kind: "label", from: 96.3, to: 99.3, text: "การจัดท่าทางที่ถูกต้อง", xPct: 25, yPct: 28, fontSize: 50, color: "#27304d" },
  { kind: "label", from: 96.6, to: 99.3, text: "บำบัด", xPct: 19, yPct: 57, fontSize: 42, color: "#27304d" },
  { kind: "label", from: 96.8, to: 99.3, text: "ออกกำลัง", xPct: 33, yPct: 57, fontSize: 42, color: "#27304d" },

  // ===== CUT 5 : 1:41–2:20 (Q3 — 성장치료 적기) =====
  {
    kind: "qcard", from: 101.0, to: 104.0,
    lines: [
      { t: "ช่วงไหนเหมาะที่สุด" },
      { t: "ในการเริ่มรักษา", strong: true },
      { t: "การเจริญเติบโต?", strong: true },
    ],
  },
  { kind: "qbar", from: 104.0, to: 140.0, text: "ช่วงไหนเหมาะที่สุดในการรักษาการเจริญเติบโต?" },
  {
    kind: "subtitle", from: 104.0, to: 110.0, tone: "white",
    lines: [[{ t: "ช่วงเวลาที่เหมาะกับการรักษาของเด็กแต่ละคน ต่างกันเล็กน้อย" }]],
  },
  {
    kind: "subtitle", from: 110.0, to: 114.0, tone: "white",
    lines: [[{ t: "เด็กผู้หญิงควรวางแผนการรักษาให้เร็วกว่าเด็กผู้ชายเล็กน้อย" }]],
  },
  {
    kind: "subtitle", from: 114.0, to: 119.0, tone: "white",
    lines: [[{ t: "เด็กผู้หญิง", em: true }, { t: " โดยทั่วไปคือช่วงอายุ 8 ถึง 13 ปี" }]],
  },
  {
    kind: "subtitle", from: 119.0, to: 125.0, tone: "white",
    lines: [[{ t: "เด็กผู้ชาย", em: true }, { t: " ช่วงอายุประมาณ 9 ถึง 15 ปี คือช่วงที่เหมาะ" }]],
  },
  {
    kind: "subtitle", from: 125.0, to: 128.0, tone: "white",
    lines: [[{ t: "แต่ก็ไม่ได้ใช้เหมือนกันกับเด็กทุกคน" }]],
  },
  {
    kind: "subtitle", from: 128.0, to: 131.5, tone: "white",
    lines: [[{ t: "หากสงสัยว่าเด็กมี" }, { t: "ภาวะหนุ่มสาวก่อนวัย", em: true }]],
  },
  {
    kind: "subtitle", from: 131.5, to: 137.0, tone: "white",
    lines: [
      [{ t: "หรือสงสัยว่ามีความผิดปกติของการเจริญเติบโต" }],
      [{ t: "จากโรคอื่นที่เกี่ยวข้อง" }],
    ],
  },
  {
    kind: "subtitle", from: 137.0, to: 140.0, tone: "white",
    lines: [[{ t: "ควรเริ่มการรักษาให้เร็วกว่านี้เล็กน้อย" }]],
  },
  // Kids-in-field section (~115–126): bottom-left title (overlay) + boy/girl age
  // callouts (these COVER baked Korean labels → opaque banner mode).
  { kind: "callout", from: 115.5, to: 125.8, top: "โดยทั่วไป", bottom: "ช่วงรักษาที่เหมาะ?", xPct: 21, yPct: 78, align: "left", bottomSize: 56 },
  { kind: "callout", from: 116.7, to: 125.5, top: "เด็กผู้หญิง", bottom: "อายุ 8–13 ปี", xPct: 86.5, yPct: 48, bottomSize: 46, banner: true, bannerW: 590, bannerH: 220 },
  { kind: "callout", from: 120.8, to: 125.5, top: "เด็กผู้ชาย", bottom: "อายุ 9–15 ปี", xPct: 17.5, yPct: 44, bottomSize: 46, banner: true, bannerW: 600, bannerH: 220 },

  // ===== CUT 6 : 2:20–2:44 (Q4 — 치료 시기 놓쳤다면) =====
  // Q card over a dark hallway b-roll → white text.
  {
    kind: "qcard", from: 140.0, to: 143.0, color: "#ffffff",
    lines: [
      { t: "ถ้าพลาด" },
      { t: "ช่วงเวลารักษา", strong: true },
      { t: "ควรทำอย่างไร?", strong: true },
    ],
  },
  { kind: "qbar", from: 143.0, to: 164.0, text: "ถ้าพลาดช่วงเวลาที่เหมาะในการรักษา ควรทำอย่างไร?" },
  {
    kind: "subtitle", from: 143.0, to: 149.0, tone: "white",
    lines: [
      [{ t: "แม้จะพลาดช่วงเวลาที่เหมาะไป" }],
      [{ t: "ก็", }, { t: "ไม่ต้องกังวลมากเกินไป", em: true }],
    ],
  },
  {
    kind: "subtitle", from: 149.0, to: 152.0, tone: "white",
    lines: [[{ t: "ขึ้นอยู่กับว่าแผ่นการเจริญเติบโตเหลืออยู่มากแค่ไหน" }]],
  },
  {
    kind: "subtitle", from: 152.0, to: 157.0, tone: "white",
    lines: [
      [{ t: "และ" }, { t: "ส่วนสูงที่ต้องการ", em: true }, { t: "กี่เซนติเมตร" }],
      [{ t: "เราก็วางแผนการรักษาได้" }],
    ],
  },
  {
    kind: "subtitle", from: 157.0, to: 164.0, tone: "white",
    lines: [
      [{ t: "ไม่ต้องกังวลไป ลองไปพบแพทย์ใกล้บ้าน" }],
      [{ t: "เพื่อตรวจดูความเป็นไปได้ในการรักษา" }],
    ],
  },

  // ===== CUT 7 : 2:44–3:10 (Q5 — 사춘기가 성장에 주는 영향) =====
  // Q card over a light hallway b-roll → navy text.
  {
    kind: "qcard", from: 164.0, to: 167.0,
    lines: [
      { t: "เมื่อเข้าสู่วัยหนุ่มสาว" },
      { t: "ส่งผลต่อการเจริญเติบโต", strong: true },
      { t: "อย่างไร?", strong: true },
    ],
  },
  { kind: "qbar", from: 167.0, to: 190.0, text: "เมื่อเข้าสู่วัยหนุ่มสาว ส่งผลต่อการเจริญเติบโตอย่างไร?" },
  {
    kind: "subtitle", from: 167.0, to: 174.0, tone: "white",
    lines: [
      [{ t: "เมื่อเข้าสู่วัยหนุ่มสาว" }],
      [{ t: "จะส่งผลต่อการเจริญเติบโต " }, { t: "2 อย่างหลัก ๆ", em: true }],
    ],
  },
  {
    kind: "subtitle", from: 174.0, to: 179.0, tone: "white",
    lines: [[{ t: "ช่วงต้น ความเร็วในการเติบโตจะ" }, { t: "ค่อย ๆ เพิ่มขึ้น", em: true }]],
  },
  {
    kind: "subtitle", from: 179.0, to: 183.0, tone: "white",
    lines: [[{ t: "หลังจากผ่านไปประมาณ 1 ปีครึ่ง ถึง 2 ปี" }]],
  },
  {
    kind: "subtitle", from: 183.0, to: 190.0, tone: "white",
    lines: [
      [{ t: "แผ่นการเจริญเติบโตจะ" }, { t: "ปิดลง", em: true }],
      [{ t: "ทำให้ความเร็วในการเติบโตลดลง" }],
    ],
  },
  // Knee X-ray comparison (열린/닫힌 성장판) — baked Korean labels → cover (beige banner).
  { kind: "callout", from: 185.0, to: 190.0, top: "แผ่นการเจริญเติบโต", bottom: "ยังเปิดอยู่", xPct: 33, yPct: 71.5, bottomSize: 30, banner: true, bannerW: 430, bannerH: 165, bannerBg: "#d9cca6" },
  { kind: "callout", from: 185.0, to: 190.0, top: "แผ่นการเจริญเติบโต", bottom: "ปิดแล้ว", xPct: 67, yPct: 71.5, bottomSize: 30, banner: true, bannerW: 430, bannerH: 165, bannerBg: "#d9cca6" },

  // ===== CLOSING : 3:11–3:58 (원장 마무리 발언) — 더빙 나레이션 자막(n34~n39) =====
  { kind: "subtitle", from: 191.2, to: 198.0, tone: "white", lines: [[{ t: "การเจริญเติบโตของลูกน้อย " }, { t: "มีช่วงเวลาที่สำคัญที่สุด", em: true }]] },
  { kind: "subtitle", from: 198.2, to: 208.0, tone: "white", lines: [[{ t: "หากกังวลเรื่องส่วนสูงของลูก " }, { t: "อย่าปล่อยให้ช้าเกินไป", em: true }]] },
  { kind: "subtitle", from: 209.2, to: 216.0, tone: "white", lines: [[{ t: "การตรวจและดูแลตั้งแต่เนิ่น ๆ" }], [{ t: "ช่วยให้ลูกเติบโตได้เต็มศักยภาพ" }]] },
  { kind: "subtitle", from: 217.2, to: 224.0, tone: "white", lines: [[{ t: "ที่คลินิก " }, { t: "Yonsei Saebom", em: true }, { t: " ดูแลการเติบโตของลูกคุณ" }]] },
  { kind: "subtitle", from: 225.2, to: 232.0, tone: "white", lines: [[{ t: "ด้วยการวางแผนการรักษาเฉพาะบุคคล" }], [{ t: "จากผลตรวจอย่างละเอียด" }]] },
  { kind: "subtitle", from: 232.2, to: 238.5, tone: "white", lines: [[{ t: "ปรึกษาเราได้เลยวันนี้ " }, { t: "เพื่ออนาคตการเติบโตของลูกคุณ", em: true }]] },
];
