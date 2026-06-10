// _cn/out/{idx}.json 검증 → marketing_cardnews.{captions,hashtags_i18n}.cn + slides.texts.cn 병합 PATCH.
// 사용: node docs/cardnews/import-cn-cardnews.mjs --check  (검증만) | (인자없음) import
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outDir = join(here, "_cn", "out");
const env = {};
for (const l of readFileSync(join(root, "ai-server", ".env"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const U = env.SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY;
const rest = (p, o = {}) => fetch(`${U}/rest/v1/${p}`, { ...o, headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", ...(o.headers || {}) } });
const CHECK = process.argv.includes("--check");

// 간체에 섞이면 안 되는 고빈도 번체 전용 글자(있으면 변환 실패)
const TRAD = "個們來國時實樣這會學體與為開關對後從經過進還說區醫營機數質長點麼東車語讀門問間發現聲處當總應種華預顯類頭題願風飛飯養麵專轉觀價課";
const tradLeak = (s) => [...new Set([...(s || "")].filter((c) => TRAD.includes(c)))].join("");

const problems = [];
const docs = {};
const slideCn = new Map(); // slideId -> {headline,subtext}
for (let idx = 1; idx <= 62; idx++) {
  const f = join(outDir, `${idx}.json`);
  if (!existsSync(f)) { problems.push(`#${idx}: out 없음`); continue; }
  let d; try { d = JSON.parse(readFileSync(f, "utf8")); } catch (e) { problems.push(`#${idx}: invalid JSON ${e.message}`); continue; }
  if (!d.cardnewsId) problems.push(`#${idx}: cardnewsId 없음`);
  if (typeof d.captionCn !== "string") problems.push(`#${idx}: captionCn 없음`);
  if (typeof d.hashtagsCn !== "string") problems.push(`#${idx}: hashtagsCn 없음`);
  let leak = tradLeak(d.captionCn) + tradLeak(d.hashtagsCn);
  for (const s of d.slides || []) {
    if (!s.slideId || !s.cn) { problems.push(`#${idx}: slide 형식 오류`); continue; }
    leak += tradLeak(s.cn.headline) + tradLeak(s.cn.subtext);
    slideCn.set(s.slideId, { headline: s.cn.headline || "", subtext: s.cn.subtext || "" });
  }
  if (leak) problems.push(`#${idx}: 번체 잔류 "${[...new Set(leak)].join("")}"`);
  docs[idx] = d;
}

console.log(`검증: ${Object.keys(docs).length}/62 카드뉴스, 슬라이드 cn ${slideCn.size}개, 문제 ${problems.length}건`);
if (problems.length) problems.slice(0, 30).forEach((p) => console.log("  ⚠ " + p));
if (CHECK) { console.log("\n[--check] 무변경 종료."); process.exit(problems.length ? 1 : 0); }
if (problems.length) { console.log("\n문제 있어 import 중단."); process.exit(1); }

// import
const cards = await (await rest("marketing_cardnews?select=id,captions,hashtags_i18n")).json();
const cardById = new Map(cards.map((c) => [c.id, c]));
let cPatched = 0;
for (const idx of Object.keys(docs)) {
  const d = docs[idx]; const c = cardById.get(d.cardnewsId);
  if (!c) { console.log(`  #${idx}: cardnewsId DB에 없음`); continue; }
  const captions = { ...(c.captions || {}), cn: d.captionCn };
  const hashtags_i18n = { ...(c.hashtags_i18n || {}), cn: d.hashtagsCn };
  const pr = await rest(`marketing_cardnews?id=eq.${c.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ captions, hashtags_i18n }) });
  if (pr.ok) cPatched++; else console.log(`  cardnews PATCH FAIL #${idx}: ${pr.status}`);
}

const slides = await (await rest("marketing_cardnews_slides?select=id,texts")).json();
let sPatched = 0, sEmpty = 0;
for (const s of slides) {
  const cn = slideCn.get(s.id) || { headline: "", subtext: "" };
  if (!slideCn.has(s.id)) sEmpty++;
  const texts = { ...(s.texts || {}), cn };
  const pr = await rest(`marketing_cardnews_slides?id=eq.${s.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ texts }) });
  if (pr.ok) sPatched++; else console.log(`  slide PATCH FAIL ${s.id}: ${pr.status}`);
}
console.log(`\nimported: 카드뉴스 ${cPatched}/62, 슬라이드 ${sPatched}/${slides.length} (빈 cn ${sEmpty}개)`);

// verify
const v = await (await rest("marketing_cardnews?select=captions,hashtags_i18n")).json();
const cap = {}, ht = {};
for (const r of v) { for (const k of Object.keys(r.captions || {})) if (r.captions[k]?.trim()) cap[k] = (cap[k] || 0) + 1; for (const k of Object.keys(r.hashtags_i18n || {})) if (r.hashtags_i18n[k]?.trim()) ht[k] = (ht[k] || 0) + 1; }
console.log("캡션 언어별:", JSON.stringify(cap));
console.log("해시태그 언어별:", JSON.stringify(ht));
const vs = await (await rest("marketing_cardnews_slides?select=texts")).json();
const tx = {};
for (const r of vs) for (const k of Object.keys(r.texts || {})) tx[k] = (tx[k] || 0) + 1;
console.log("슬라이드 texts 언어별:", JSON.stringify(tx));
