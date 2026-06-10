// _thumbs/data/{1..62}.json 병합·검증 → _thumbs/thumbs.json (제네릭 커버 컴포지션이 import).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "src", "shorts", "_thumbs", "data");
const dest = join(here, "..", "src", "shorts", "_thumbs", "thumbs.json");

const LANGS = ["ko", "th", "vi", "en", "cn", "ch"];
const FIELDS = ["kicker", "subject", "number", "numLabel", "tagline"];
const merged = {};
const problems = [];

for (let n = 1; n <= 62; n++) {
  const f = join(dataDir, `${n}.json`);
  if (!existsSync(f)) { problems.push(`#${n}: MISSING file`); continue; }
  let j;
  try { j = JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { problems.push(`#${n}: invalid JSON (${e.message})`); continue; }
  if (!j.langs) { problems.push(`#${n}: no langs`); continue; }
  for (const L of LANGS) {
    const o = j.langs[L];
    if (!o) { problems.push(`#${n}.${L}: missing lang`); continue; }
    for (const fld of FIELDS) {
      if (!o[fld] || !String(o[fld]).trim()) problems.push(`#${n}.${L}.${fld}: empty`);
    }
  }
  merged[String(n)] = { slug: j.slug, langs: j.langs };
}

writeFileSync(dest, JSON.stringify(merged), "utf8");
console.log(`merged ${Object.keys(merged).length}/62 contents → thumbs.json`);
if (problems.length) {
  console.log(`\n⚠ PROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log("  " + p));
  process.exit(1);
} else {
  console.log("✓ validation OK — all 62 × 6 langs × 5 fields present");
}
