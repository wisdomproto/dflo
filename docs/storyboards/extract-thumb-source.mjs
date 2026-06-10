// 62개 스토리보드 spec에서 썸네일(커버) 카피 생성에 필요한 최소 소스만 추출.
// 출력: docs/storyboards/_thumb-source.json  (6언어 transcreation 에이전트 입력용, 컴팩트)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const specDir = join(here, "specs");

const files = readdirSync(specDir).filter((f) => f.endsWith(".json"));
const out = [];
for (const f of files) {
  const s = JSON.parse(readFileSync(join(specDir, f), "utf8"));
  out.push({
    n: s.n,
    slug: s.slug,
    title: s.title,
    category: s.category,
    topicTitle: s.topicTitle,
    thumb: s.thumb,            // { kicker, subject, number, numLabel } — KO master
    hook: s.hook,
    misconception: s.misconception,
    message: s.message,
  });
}
out.sort((a, b) => a.n - b.n);
const dest = join(here, "_thumb-source.json");
writeFileSync(dest, JSON.stringify(out, null, 2), "utf8");
console.log(`extracted ${out.length} thumb sources → ${dest}`);
console.log(`n range: ${out[0].n}..${out[out.length - 1].n}`);
