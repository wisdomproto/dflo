// 62토픽 ko 블로그 원본을 cn/ch transcreation 소스로 export.
// 출력: docs/blog/_zh/src/{n}.json = { n, topicTitle, ko: <full ko blog article> }
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const env = {};
for (const l of readFileSync(join(root, "ai-server", ".env"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const U = env.SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY;
const rest = (p) => fetch(`${U}/rest/v1/${p}`, { headers: { apikey: K, Authorization: `Bearer ${K}` } });

const srcDir = join(here, "_zh", "src");
mkdirSync(srcDir, { recursive: true });

const r = await rest("marketing_articles?select=sort_order,blog&order=sort_order.asc");
const all = await r.json();
if (!Array.isArray(all)) throw new Error(`query failed: ${JSON.stringify(all).slice(0, 200)}`);
let n = 0;
for (const a of all) {
  const ko = a.blog?.ko;
  if (!ko) { console.log(`#${a.sort_order}: blog.ko 없음, skip`); continue; }
  writeFileSync(join(srcDir, `${a.sort_order}.json`), JSON.stringify({ n: a.sort_order, topicTitle: ko.h1 || ko.seoTitle, ko }, null, 1), "utf8");
  n++;
}
console.log(`exported ${n} ko sources → ${srcDir}`);
// faq 구조 확인
const s1 = all.find((a) => a.sort_order === 1)?.blog?.ko;
console.log("\nfaq[0]:", JSON.stringify(s1?.faq?.[0]));
console.log("secondaryKeywords:", JSON.stringify(s1?.secondaryKeywords));
console.log("sections 수:", s1?.sections?.length, "| imageUrl 있는 섹션:", (s1?.sections || []).filter((x) => x.imageUrl).length);
