// 스토리보드 spec(docs/storyboards/specs/<n>.json) + 업로드된 인포그래픽(reel_assets)
//  → remotion/src/shorts/<slug>/script.json (PresenterShort 포맷) + public/images/<slug>/ig*.png 다운로드.
//   node scripts/storyboard-to-reel.mjs <n>      예: node scripts/storyboard-to-reel.mjs 2
//
// script.json = { slug, fps, title, headerStyle, header{lang}, cta{lang}, chunks[] }
//   chunk: { id, start, end, <lang>:narr, cap_<lang>:[..], hl_<lang>, [insert], [insertLabels] }
//   insertLabels x/y 는 pos 힌트 기반 러프 기본값 → 실제 이미지 보고 수동 보정.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const n = process.argv[2];
if (!n) { console.error("usage: node scripts/storyboard-to-reel.mjs <n>"); process.exit(1); }

const LANGS = ["ko", "th", "vi", "en", "cn", "ch"];
const CTA = {
  ko: "지금 바로 확인하세요", en: "Check it today", th: "เช็กเลยวันนี้",
  vi: "Kiểm tra ngay hôm nay", cn: "现在就来查查吧", ch: "現在就來查查吧",
};
const HEADER_STYLE = { markBg: "#E0568A", markFg: "#ffffff" };

const spec = JSON.parse(readFileSync(join(ROOT, "..", "docs", "storyboards", "specs", `${n}.json`), "utf8"));
const slug = spec.slug;

// time "0–3.5s" / "3.5–7s" → [start,end]
const parseTime = (t) => {
  const m = String(t).replace(/s/g, "").split(/[–-]/).map((x) => parseFloat(x.trim()));
  return [m[0] || 0, m[1] || (m[0] || 0) + 3.5];
};

// pos 힌트 → 러프 x/y (실제 이미지 보고 보정). 모르면 세로 스택 중앙.
function posToXY(pos, idx, total) {
  const p = String(pos || "");
  if (/노드|node/i.test(p)) { const k = (parseInt(p.replace(/\D/g, "")) || idx + 1); return { x: 0.14 + (k - 1) * 0.24, y: 0.72 }; }
  if (/상단|top|위/i.test(p)) return { x: 0.5, y: 0.12 };
  if (/하단|bottom|아래/i.test(p)) return { x: 0.5, y: 0.9 };
  if (/가운데|중앙|center|글로우/i.test(p)) return { x: 0.5, y: 0.52 };
  if (/화살표|arrow|끝|tip/i.test(p)) return { x: 0.72, y: 0.3 };
  // 기본: 세로 스택
  return { x: 0.5, y: total > 1 ? 0.32 + idx * (0.4 / Math.max(1, total - 1)) : 0.5 };
}

const igByScene = {};
for (const g of spec.infographics || []) igByScene[g.scene] = g;

const chunks = (spec.scenes || []).map((s) => {
  const [start, end] = parseTime(s.time);
  const ch = { id: s.id, start, end };
  for (const lang of LANGS) {
    const c = s.copy?.[lang];
    if (!c) continue;
    if (c.narr) ch[lang] = c.narr;
    if (c.cap) ch[`cap_${lang}`] = c.cap;
    if (c.hl) ch[`hl_${lang}`] = c.hl;
  }
  if (s.kind === "ig") {
    const g = igByScene[s.id];
    if (g) {
      ch.insert = `images/${slug}/ig${g.ig}.png`;
      const labels = g.labels || [];
      ch.insertLabels = labels.map((l, i) => {
        const { x, y } = posToXY(l.pos, i, labels.length);
        return { x, y, size: 44, weight: 800, color: i % 2 ? "#0d9488" : "#5b3fa6", ko: l.ko, en: l.en, th: l.th };
      });
    }
  }
  return ch;
});

const header = { ko: { top: spec.headerTop || "우리 아이 키", mark: spec.headerMark || "" } };
const cta = {};
for (const lang of LANGS) cta[lang] = CTA[lang];

const out = { slug, fps: 30, title: spec.title, _note: `자동 생성(storyboard-to-reel ${n}). insertLabels x/y 는 실제 이미지 보고 보정 필요.`, headerStyle: HEADER_STYLE, header, cta, chunks };

const SHORT_DIR = join(ROOT, "src", "shorts", slug);
mkdirSync(SHORT_DIR, { recursive: true });
writeFileSync(join(SHORT_DIR, "script.json"), JSON.stringify(out, null, 2));
console.log(`✓ script.json → src/shorts/${slug}/  (chunks ${chunks.length}, ig ${chunks.filter((c) => c.insert).length})`);

// ── 인포그래픽 이미지 다운로드 (reel_assets) ──
async function downloadImages() {
  const env = readFileSync(join(ROOT, "..", "v4", ".env.local"), "utf8");
  const url = (env.match(/VITE_SUPABASE_URL=(.*)/) || [])[1].trim();
  const key = (env.match(/VITE_SUPABASE_ANON_KEY=(.*)/) || [])[1].trim();
  const r = await fetch(`${url}/rest/v1/marketing_articles?sort_order=eq.${n}&select=reel_assets`, { headers: { apikey: key, Authorization: "Bearer " + key } });
  const rows = await r.json();
  const igs = rows?.[0]?.reel_assets?.infographics || {};
  const IMG_DIR = join(ROOT, "public", "images", slug);
  mkdirSync(IMG_DIR, { recursive: true });
  for (const [k, u] of Object.entries(igs)) {
    const res = await fetch(u);
    if (!res.ok) { console.log(`  ✗ ${k} download ${res.status}`); continue; }
    writeFileSync(join(IMG_DIR, `${k}.png`), Buffer.from(await res.arrayBuffer()));
    console.log(`  ✓ ${k}.png`);
  }
  const missing = (spec.infographics || []).map((g) => `ig${g.ig}`).filter((k) => !igs[k]);
  if (missing.length) console.log(`  ⚠️ 업로드 안 된 인포그래픽: ${missing.join(", ")}`);
}
downloadImages().catch((e) => { console.error("이미지 다운로드 실패:", e.message); process.exit(1); });
