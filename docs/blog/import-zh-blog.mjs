// _zh/out/{n}-{cn,ch}.json 검증 → marketing_articles.blog.{cn,ch} 병합 PATCH (기존 ko/en/th/vi 보존).
// 사용: node docs/blog/import-zh-blog.mjs --check   (검증만)
//       node docs/blog/import-zh-blog.mjs            (검증 + import + 확인)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const srcDir = join(here, "_zh", "src");
const outDir = join(here, "_zh", "out");
const env = {};
for (const l of readFileSync(join(root, "ai-server", ".env"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const U = env.SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY;
const rest = (p, o = {}) => fetch(`${U}/rest/v1/${p}`, { ...o, headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", ...(o.headers || {}) } });
const CHECK = process.argv.includes("--check");

const KEYS = ["h1", "seoTitle", "metaDescription", "slug", "primaryKeyword", "secondaryKeywords", "sections", "faq"];
const problems = [];
const docs = {}; // n -> {cn, ch}

function validate(a, ko, n, lang) {
  const tag = `#${n}.${lang}`;
  for (const k of KEYS) if (!(k in a)) problems.push(`${tag}: missing key ${k}`);
  if (!Array.isArray(a.sections) || a.sections.length !== ko.sections.length) problems.push(`${tag}: sections ${a.sections?.length} != ko ${ko.sections.length}`);
  if (!Array.isArray(a.faq) || a.faq.length !== ko.faq.length) problems.push(`${tag}: faq ${a.faq?.length} != ko ${ko.faq.length}`);
  if (a.slug !== ko.slug) problems.push(`${tag}: slug "${a.slug}" != ko "${ko.slug}"`);
  (a.sections || []).forEach((s, i) => {
    const k = ko.sections[i] || {};
    if (s.imageUrl !== k.imageUrl) problems.push(`${tag}: sec[${i}] imageUrl changed`);
    if (s.imagePrompt !== k.imagePrompt) problems.push(`${tag}: sec[${i}] imagePrompt changed`);
    if (!s.heading || !s.html) problems.push(`${tag}: sec[${i}] empty heading/html`);
    // 스크립트 확인(있을 때만): cn=简体 公分 금지 / ch=繁體 厘米 금지
    if (lang === "cn" && s.html.includes("公分")) problems.push(`${tag}: sec[${i}] cn 에 公分`);
    if (lang === "ch" && s.html.includes("厘米")) problems.push(`${tag}: sec[${i}] ch 에 厘米`);
  });
  (a.faq || []).forEach((f, i) => { if (!f.q || !f.a) problems.push(`${tag}: faq[${i}] empty`); });
}

for (let n = 1; n <= 62; n++) {
  const sf = join(srcDir, `${n}.json`);
  if (!existsSync(sf)) { problems.push(`#${n}: src 없음`); continue; }
  const ko = JSON.parse(readFileSync(sf, "utf8")).ko;
  const pair = {};
  for (const lang of ["cn", "ch"]) {
    const f = join(outDir, `${n}-${lang}.json`);
    if (!existsSync(f)) { problems.push(`#${n}.${lang}: out 없음`); continue; }
    let a; try { a = JSON.parse(readFileSync(f, "utf8")); } catch (e) { problems.push(`#${n}.${lang}: invalid JSON ${e.message}`); continue; }
    validate(a, ko, n, lang);
    pair[lang] = a;
  }
  if (pair.cn && pair.ch) docs[n] = pair;
}

console.log(`검증: ${Object.keys(docs).length}/62 토픽 cn+ch 준비됨, 문제 ${problems.length}건`);
if (problems.length) { problems.slice(0, 40).forEach((p) => console.log("  ⚠ " + p)); if (problems.length > 40) console.log(`  …외 ${problems.length - 40}건`); }
if (CHECK) { console.log("\n[--check] 무변경 종료."); process.exit(problems.length ? 1 : 0); }
if (problems.length) { console.log("\n문제 있어 import 중단."); process.exit(1); }

// import
const all = await (await rest("marketing_articles?select=id,sort_order,blog&order=sort_order.asc")).json();
const byOrder = new Map(all.map((a) => [a.sort_order, a]));
let patched = 0;
for (let n = 1; n <= 62; n++) {
  const a = byOrder.get(n); if (!a || !docs[n]) continue;
  const blog = { ...(a.blog || {}), cn: docs[n].cn, ch: docs[n].ch };
  const pr = await rest(`marketing_articles?id=eq.${a.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ blog }) });
  if (pr.ok) patched++; else console.log(`  PATCH FAIL #${n}: ${pr.status} ${(await pr.text()).slice(0, 120)}`);
}
console.log(`\nimported: ${patched}/62 rows`);

// verify
const v = await (await rest("marketing_articles?select=sort_order,blog&order=sort_order.asc")).json();
const langCount = {};
for (const a of v) for (const lang of Object.keys(a.blog || {})) langCount[lang] = (langCount[lang] || 0) + 1;
console.log("blog 언어별 보유 수:", JSON.stringify(langCount));
