// script.json + timing-<lang>.json → captions-<lang>.json (청크별 카라오케 구절).
// Usage: node scripts/gen-captions.mjs <slug> <lang>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { splitIntoPhrases, distributeFrames } from "./lib/captions.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [slug, lang] = process.argv.slice(2);
if (!slug || !lang) {
  console.error("Usage: node scripts/gen-captions.mjs <slug> <lang>");
  process.exit(1);
}

const base = join(here, "..", "src", "shorts", slug);
const script = JSON.parse(readFileSync(join(base, "script.json"), "utf8"));
const timing = JSON.parse(readFileSync(join(base, `timing-${lang}.json`), "utf8"));
const byId = Object.fromEntries(script.chunks.map((c) => [c.id, c]));

const out = {};
for (const t of timing) {
  const c = byId[t.id] || {};
  const phrases = splitIntoPhrases(c[lang] || "", lang);
  out[t.id] = distributeFrames(phrases, t.durFrames);
}

const dest = join(base, `captions-${lang}.json`);
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote ${dest} (${Object.keys(out).length} chunks)`);
