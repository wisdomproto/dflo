// 62개 콘텐츠 × 6언어 = 372장 릴스 커버(썸네일) 일괄 렌더.
// 번들 1회 + 단일 'thumb' 컴포지션을 inputProps {n,lang} 로 반복 렌더 (브라우저 1개 공유, 동시성 3).
// 출력: remotion/out/marketing/thumbs/{n}-{lang}.png
// 사용: node scripts/render-thumbs.mjs            (전체 372)
//       node scripts/render-thumbs.mjs --sample   (검증용 소수)
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill, openBrowser } from "@remotion/renderer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const entry = join(root, "src", "index.ts");
const outDir = join(root, "out", "marketing", "thumbs");
mkdirSync(outDir, { recursive: true });

const LANGS = ["ko", "th", "vi", "en", "cn", "ch"];
const sample = process.argv.includes("--sample");
// 특정 잡만 (재렌더용): node render-thumbs.mjs 27:th 42:vi
const argJobs = process.argv.slice(2).filter((a) => /^\d+:/.test(a)).map((a) => { const [n, l] = a.split(":"); return [Number(n), l]; });

const jobs = [];
if (argJobs.length) {
  jobs.push(...argJobs);
} else if (sample) {
  // 다양한 케이스: 숫자형/단어형/이모지/긴 텍스트 + 중국어 간·번체 + 태국/베트남
  [[1, "ko"], [1, "cn"], [1, "ch"], [1, "th"], [2, "en"], [43, "vi"], [58, "ko"], [62, "th"]]
    .forEach((j) => jobs.push(j));
} else {
  for (let n = 1; n <= 62; n++) for (const l of LANGS) jobs.push([n, l]);
}

console.log(`bundling… (will render ${jobs.length} stills)`);
const serveUrl = await bundle({ entryPoint: entry, onProgress: () => {} });
console.log("bundled. opening browser…");

const browser = await openBrowser("chrome");

const CONC = 3;
let done = 0, fail = 0, i = 0;
async function worker() {
  while (i < jobs.length) {
    const [n, lang] = jobs[i++];
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const composition = await selectComposition({ serveUrl, id: "thumb", inputProps: { n, lang } });
        await renderStill({
          composition, serveUrl,
          output: join(outDir, `${n}-${lang}.png`),
          inputProps: { n, lang },
          imageFormat: "png",
          puppeteerInstance: browser,
        });
        ok = true;
      } catch (e) {
        if (attempt === 2) { fail++; console.log(`FAIL ${n}-${lang}: ${e && e.message ? e.message : e}`); }
      }
    }
    if (ok) done++;
    const t = done + fail;
    if (t % 20 === 0 || t === jobs.length) console.log(`  ${t}/${jobs.length} (${fail} fail)`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
await browser.close({ silent: true });
console.log(`\nDONE: ${done} rendered, ${fail} failed → ${outDir}`);
