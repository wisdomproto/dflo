// Time-ranged overlay cues for the ENGLISH clinic-process video (MainClipEN).
// Timings, coordinates and styles are copied verbatim from cues.ts (Thai) — only the
// text is translated. Times are in SECONDS (converted to frames at 30fps).
//
// Voice/tone: male Korean doctor, professional. Keep on-screen text SHORT — English runs
// longer than Korean/Thai and these sit in fixed baked slots (bubbles, cards, banners).
import type { Cue } from "./cues";

// Watermark shows from this second to the end (footage starts ~8s).
export const WATERMARK_FROM = 8;

// Baked Korean cards in the clean footage to REMOVE in final assembly.
//  - [49.7, 51.5] : "더 많은 실제 치료 후기?" promo card (process → Q&A break)
export const CUT_REGIONS: [number, number][] = [[49.7, 51.5]];

export const CUES: Cue[] = [
  // ===== CUT 1 : 0:08–0:18 (clinic intro) =====
  {
    kind: "subtitle",
    from: 8.2,
    to: 11.0,
    tone: "white",
    lines: [[{ t: "Here at Yonsei Saebom Clinic," }]],
  },
  // Keyword labels sit on the baked translucent bubbles at a FIXED grid
  // (x ≈ 11.8 / 31.0 / 49.9 / 69.3 / 87.9, y ≈ 49.7); they scale in one by one.
  // ★ Keep each to 1–2 short words — the bubbles are small.
  { kind: "circle", from: 11.5, to: 15.35, text: "Hormones", xPct: 11.8, yPct: 49.7 },
  { kind: "circle", from: 12.5, to: 15.35, text: "Early puberty", xPct: 31.0, yPct: 49.7, fontSize: 24 },
  { kind: "circle", from: 13.2, to: 15.35, text: "Exercise", xPct: 49.9, yPct: 49.7 },
  { kind: "circle", from: 14.0, to: 15.35, text: "Posture", xPct: 69.3, yPct: 49.7 },
  { kind: "circle", from: 15.0, to: 15.35, text: "Sleep", xPct: 87.9, yPct: 49.7 },
  {
    kind: "subtitle",
    from: 11.0,
    to: 15.0,
    tone: "cream",
    lines: [
      [{ t: "we look after hormones, early puberty, exercise," }],
      [{ t: "posture and sleep," }],
    ],
  },
  {
    kind: "subtitle",
    from: 15.0,
    to: 18.3,
    tone: "white",
    lines: [[{ t: "to support healthy growth in children." }]],
  },
  {
    kind: "title",
    from: 15.9,
    to: 18.5,
    parts: [
      { t: "Balanced", style: "outline" },
      { t: "Healthy growth", style: "solid" },
    ],
  },

  // ===== CUT 2 : 0:18–0:51 (5-step exam process) =====
  { kind: "chip", from: 18.3, to: 50.8, text: "Our process" },

  // -- Step 01: history taking (0:18–0:26)
  { kind: "number", from: 18.5, to: 26.0, value: "01", xPct: 82, yPct: 58 },
  { kind: "label", from: 19.0, to: 26.0, text: "Medical history", xPct: 80, yPct: 71, fontSize: 34, align: "center" },
  {
    kind: "subtitle", from: 18.3, to: 26.0, tone: "white",
    lines: [
      [{ t: "On the first visit, we take a " }, { t: "detailed history", em: true }],
      [{ t: "— age, height, and family background." }],
    ],
  },

  // -- Step 02: BMI (0:26–0:30)
  { kind: "number", from: 26.0, to: 30.0, value: "02", xPct: 82, yPct: 58 },
  { kind: "label", from: 26.3, to: 30.0, text: "BMI check", xPct: 80, yPct: 71, fontSize: 38, align: "center" },
  {
    kind: "subtitle", from: 26.0, to: 30.0, tone: "white",
    lines: [
      [{ t: "We check " }, { t: "BMI", em: true }, { t: " for obesity," }],
      [{ t: "which helps predict early puberty." }],
    ],
  },

  // -- Step 03: full-body X-ray (0:30–0:37)
  { kind: "number", from: 30.0, to: 37.0, value: "03", xPct: 82, yPct: 58 },
  { kind: "label", from: 30.3, to: 37.0, text: "Full-body X-ray", xPct: 80, yPct: 71, fontSize: 34, align: "center" },
  {
    kind: "subtitle", from: 30.0, to: 37.0, tone: "white",
    lines: [
      [{ t: "A full-body X-ray", em: true }, { t: " shows bone age" }],
      [{ t: "and how far the growth plates have closed." }],
    ],
  },

  // -- Step 04: blood test + puberty staging (0:37–0:43)
  { kind: "number", from: 37.0, to: 43.0, value: "04", xPct: 82, yPct: 58 },
  { kind: "label", from: 37.3, to: 43.0, text: "Blood & puberty stage", xPct: 78, yPct: 71, fontSize: 28, align: "center" },
  {
    kind: "subtitle", from: 37.0, to: 43.0, tone: "white",
    lines: [
      [{ t: "Finally, " }, { t: "blood tests", em: true }, { t: " and a puberty assessment" }],
      [{ t: "check overall health." }],
    ],
  },

  // -- Step 05: conclusion — predicted height + tailored plan (0:43–0:51)
  { kind: "number", from: 43.0, to: 50.8, value: "05", xPct: 82, yPct: 58 },
  { kind: "label", from: 43.3, to: 50.8, text: "Treatment plan", xPct: 80, yPct: 71, fontSize: 34, align: "center" },
  {
    kind: "subtitle", from: 43.0, to: 50.8, tone: "white",
    lines: [
      [{ t: "From these results we predict " }, { t: "adult height", em: true }],
      [{ t: "and design a plan for that child." }],
    ],
  },

  // ===== CUT 3 : 0:51–1:09 (Q1 — what makes us different) =====
  {
    kind: "qcard", from: 51.6, to: 54.0,
    lines: [
      { t: "What makes" },
      { t: "Yonsei Saebom Clinic", strong: true },
      { t: "different?", strong: true },
    ],
  },
  { kind: "qbar", from: 54.0, to: 69.0, text: "What makes Yonsei Saebom Clinic different?" },
  {
    kind: "subtitle", from: 54.0, to: 56.2, tone: "white",
    lines: [[{ t: "What makes us different?" }]],
  },
  {
    kind: "subtitle", from: 56.2, to: 62.0, tone: "white",
    lines: [
      [{ t: "We don't manage " }, { t: "hormones", em: true }, { t: " alone." }],
      [{ t: "We also manage nutrition, sleep, exercise and puberty." }],
    ],
  },
  // 4 labels on the baked 2x2 image grid.
  { kind: "label", from: 58.3, to: 62.6, text: "Nutrition", xPct: 56.5, yPct: 29.6, fontSize: 40, color: "#ffffff", outline: "#E79A2B", width: 300 },
  { kind: "label", from: 58.9, to: 62.6, text: "Sleep", xPct: 79.2, yPct: 29.6, fontSize: 40, color: "#ffffff", outline: "#E79A2B", width: 300 },
  { kind: "label", from: 59.5, to: 62.6, text: "Posture", xPct: 56.5, yPct: 61.6, fontSize: 40, color: "#ffffff", outline: "#E79A2B", width: 300 },
  { kind: "label", from: 60.1, to: 62.6, text: "Puberty", xPct: 79.2, yPct: 61.6, fontSize: 40, color: "#ffffff", outline: "#E79A2B", width: 300 },
  {
    kind: "subtitle", from: 62.0, to: 69.0, tone: "white",
    lines: [
      [{ t: "Caring for every factor growth depends on, together" }],
      [{ t: "— that is " }, { t: "what sets us apart", em: true }, { t: "." }],
    ],
  },

  // ===== CUT 5 : 1:41–2:20 (Q3 — the right time to treat) =====
  {
    kind: "qcard", from: 101.0, to: 104.0,
    lines: [
      { t: "When is the best time" },
      { t: "to start growth", strong: true },
      { t: "treatment?", strong: true },
    ],
  },
  { kind: "qbar", from: 104.0, to: 140.0, text: "When is the best time for growth treatment?" },
  {
    kind: "subtitle", from: 104.0, to: 110.0, tone: "white",
    lines: [[{ t: "The right time to treat differs a little from child to child." }]],
  },
  {
    kind: "subtitle", from: 110.0, to: 114.0, tone: "white",
    lines: [[{ t: "For girls, plan treatment a little earlier than for boys." }]],
  },
  {
    kind: "subtitle", from: 114.0, to: 119.0, tone: "white",
    lines: [[{ t: "Girls", em: true }, { t: " — generally between ages 8 and 13." }]],
  },
  {
    kind: "subtitle", from: 119.0, to: 125.0, tone: "white",
    lines: [[{ t: "Boys", em: true }, { t: " — roughly between ages 9 and 15." }]],
  },
  {
    kind: "subtitle", from: 125.0, to: 128.0, tone: "white",
    lines: [[{ t: "But not for every child." }]],
  },
  {
    kind: "subtitle", from: 128.0, to: 131.5, tone: "white",
    lines: [[{ t: "If " }, { t: "early puberty", em: true }, { t: " is suspected," }]],
  },
  {
    kind: "subtitle", from: 131.5, to: 137.0, tone: "white",
    lines: [
      [{ t: "or if another condition" }],
      [{ t: "may be affecting growth," }],
    ],
  },
  {
    kind: "subtitle", from: 137.0, to: 140.0, tone: "white",
    lines: [[{ t: "treatment should begin somewhat earlier." }]],
  },
  // Kids-in-field section: bottom-left title + boy/girl age callouts (cover baked Korean).
  { kind: "callout", from: 115.5, to: 125.8, top: "In general", bottom: "the right window?", xPct: 21, yPct: 78, align: "left", bottomSize: 52 },
  { kind: "callout", from: 116.7, to: 125.5, top: "Girls", bottom: "ages 8–13", xPct: 86.5, yPct: 48, bottomSize: 46, banner: true, bannerW: 590, bannerH: 220 },
  { kind: "callout", from: 120.8, to: 125.5, top: "Boys", bottom: "ages 9–15", xPct: 17.5, yPct: 44, bottomSize: 46, banner: true, bannerW: 600, bannerH: 220 },

  // ===== CUT 6 : 2:20–2:44 (Q4 — if the window has passed) =====
  {
    kind: "qcard", from: 140.0, to: 143.0, color: "#ffffff",
    lines: [
      { t: "What if we missed" },
      { t: "the treatment", strong: true },
      { t: "window?", strong: true },
    ],
  },
  { kind: "qbar", from: 143.0, to: 164.0, text: "What if we missed the right treatment window?" },
  {
    kind: "subtitle", from: 143.0, to: 149.0, tone: "white",
    lines: [
      [{ t: "Even if that window has passed," }],
      [{ t: "there is " }, { t: "no need to worry too much", em: true }],
    ],
  },
  {
    kind: "subtitle", from: 149.0, to: 152.0, tone: "white",
    lines: [[{ t: "It depends how much growth plate is left," }]],
  },
  {
    kind: "subtitle", from: 152.0, to: 157.0, tone: "white",
    lines: [
      [{ t: "and " }, { t: "how many centimetres", em: true }, { t: " you hope for." }],
      [{ t: "We can still plan treatment." }],
    ],
  },
  {
    kind: "subtitle", from: 157.0, to: 164.0, tone: "white",
    lines: [
      [{ t: "Don't worry — see a doctor near you" }],
      [{ t: "and find out what is still possible." }],
    ],
  },

  // ===== CUT 7 : 2:44–3:10 (Q5 — how puberty affects growth) =====
  {
    kind: "qcard", from: 164.0, to: 167.0,
    lines: [
      { t: "How does puberty" },
      { t: "affect a child's", strong: true },
      { t: "growth?", strong: true },
    ],
  },
  { kind: "qbar", from: 167.0, to: 190.0, text: "How does puberty affect growth?" },
  {
    kind: "subtitle", from: 167.0, to: 174.0, tone: "white",
    lines: [
      [{ t: "When puberty begins," }],
      [{ t: "it affects growth in " }, { t: "two main ways", em: true }],
    ],
  },
  {
    kind: "subtitle", from: 174.0, to: 179.0, tone: "white",
    lines: [[{ t: "Early on, growth " }, { t: "speeds up steadily", em: true }]],
  },
  {
    kind: "subtitle", from: 179.0, to: 183.0, tone: "white",
    lines: [[{ t: "Then after about one to two years," }]],
  },
  {
    kind: "subtitle", from: 183.0, to: 190.0, tone: "white",
    lines: [
      [{ t: "the growth plates " }, { t: "close", em: true }],
      [{ t: "and growth slows down." }],
    ],
  },
  // Knee X-ray comparison (open / closed growth plate) — cover baked Korean labels.
  { kind: "callout", from: 185.0, to: 190.0, top: "Growth plate", bottom: "still open", xPct: 33, yPct: 71.5, bottomSize: 30, banner: true, bannerW: 430, bannerH: 165, bannerBg: "#d9cca6" },
  { kind: "callout", from: 185.0, to: 190.0, top: "Growth plate", bottom: "closed", xPct: 67, yPct: 71.5, bottomSize: 30, banner: true, bannerW: 430, bannerH: 165, bannerBg: "#d9cca6" },

  // ===== CLOSING : 3:11–3:58 (doctor's closing remarks) =====
  { kind: "subtitle", from: 191.2, to: 198.0, tone: "white", lines: [[{ t: "There is a window in your child's growth " }, { t: "that matters most", em: true }]] },
  { kind: "subtitle", from: 198.2, to: 208.0, tone: "white", lines: [[{ t: "If you are worried about your child's height, " }, { t: "don't leave it too late", em: true }]] },
  { kind: "subtitle", from: 209.2, to: 216.0, tone: "white", lines: [[{ t: "Checking and caring early" }], [{ t: "helps a child grow to their full potential." }]] },
  { kind: "subtitle", from: 217.2, to: 224.0, tone: "white", lines: [[{ t: "At " }, { t: "Yonsei Saebom Clinic", em: true }, { t: ", we follow your child's growth" }]] },
  { kind: "subtitle", from: 225.2, to: 232.0, tone: "white", lines: [[{ t: "with a treatment plan built for them," }], [{ t: "from detailed testing." }]] },
  { kind: "subtitle", from: 232.2, to: 238.5, tone: "white", lines: [[{ t: "Talk to us today, " }, { t: "for your child's growth ahead", em: true }]] },

  // ===== ENDING =====
  // The Korean outro ("search 187 성장클리닉 on Naver") means nothing to an English
  // audience, so the composition replaces that tail wholesale with the <ClosingCTAEn>
  // card (see MainClipEN.tsx) rather than covering it with cues here.
];
