// thumbs.json + Thumb.tsx와 동일한 폭/폰트 로직으로 레이아웃 위험을 계산 → 의심 (n,lang) 추출.
// 이미지 372장을 눈으로 다 보는 대신, 줄바꿈/오버플로 가능성이 있는 것만 풀해상도로 확인하기 위함.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const thumbs = JSON.parse(readFileSync(join(here, "..", "src", "shorts", "_thumbs", "thumbs.json"), "utf8"));

function estUnits(s) {
  let u = 0;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if ((c >= 0x0e31 && c <= 0x0e3a) || (c >= 0x0e47 && c <= 0x0e4e) || (c >= 0x0300 && c <= 0x036f)) continue; // 결합문자 0폭
    const cjk = (c >= 0x3000 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af) || (c >= 0x0e00 && c <= 0x0e7f) || (c >= 0xf900 && c <= 0xffef);
    if (cjk) u += 1.0;
    else if (ch === " ") u += 0.3;
    else if (/\d/.test(ch)) u += 0.6;
    else if (ch === "%") u += 0.64;
    else u += 0.56;
  }
  return Math.max(u, 1);
}
const numFs = (s) => Math.max(58, Math.min(470, Math.floor(920 / estUnits(s))));
const kickFs = (s) => { const u = estUnits(s); return u > 11 ? 36 : u > 8 ? 42 : 46; };
const subjFs = (s) => { const u = estUnits(s); return u > 13 ? 54 : u > 10 ? 62 : 74; };
const labelFs = (s) => { const u = estUnits(s); return u > 11 ? 56 : u > 8 ? 66 : 76; };

const INNER = 940;        // 컨테이너 inner width (1080 - padding 70*2)
const FRAME = 1040;       // 프레임 가장자리 안전선
const flagged = [];
let total = 0;
for (const n of Object.keys(thumbs).map(Number).sort((a, b) => a - b)) {
  for (const lang of ["ko", "th", "vi", "en", "cn", "ch"]) {
    const d = thumbs[n].langs[lang];
    if (!d) continue;
    total++;
    const f = [];
    const numW = estUnits(d.number) * numFs(d.number);
    const subW = estUnits(d.subject) * subjFs(d.subject);
    const labW = estUnits(d.numLabel) * labelFs(d.numLabel);
    const kicW = estUnits(d.kicker) * kickFs(d.kicker) + 76; // pill padding
    const tagW = estUnits(d.tagline) * tagWf(d.tagline);
    if (numW > 1000) f.push(`NUM_WIDE(${Math.round(numW)})`);
    if (subW > INNER) f.push(`SUBJ_2LINE(${Math.round(subW)})`);
    if (labW > INNER) f.push(`LABEL_2LINE(${Math.round(labW)})`);
    if (kicW > FRAME) f.push(`KICKER_WIDE(${Math.round(kicW)})`);
    if (tagW > INNER * 1.95) f.push(`TAG_3LINE(${Math.round(tagW)})`);
    if (f.length) flagged.push(`#${n} ${lang}: ${f.join(", ")}  [num="${d.number}" sub="${d.subject}" lab="${d.numLabel}"]`);
  }
}
function tagWf(s) { const u = estUnits(s); return u > 22 ? 34 : u > 16 ? 40 : 46; }

console.log(`analyzed ${total} covers; ${flagged.length} flagged:\n`);
flagged.forEach((x) => console.log(x));
